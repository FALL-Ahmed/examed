import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, premiumUsers, totalQuestions, pendingPayments, todayRegistrations] =
      await Promise.all([
        this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
        this.prisma.user.count({ where: { role: 'PREMIUM' } }),
        this.prisma.question.count({ where: { isActive: true } }),
        this.prisma.payment.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

    return { totalUsers, premiumUsers, totalQuestions, pendingPayments, todayRegistrations };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const where: any = { role: { not: 'ADMIN' } };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, phone: true,
          role: true, subscriptionEnd: true, isActive: true, createdAt: true,
          _count: { select: { attempts: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, subscriptionEnd: true, isActive: true, createdAt: true,
        gender: true, profession: true, wilaya: true, pseudo: true,
        _count: { select: { attempts: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, amount: true, status: true, paymentMethod: true,
            operator: true, receiptUrl: true, createdAt: true,
            validatedAt: true, rejectionReason: true,
          },
        },
      } as any,
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }

  async resetUserSubscription(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'FREE', subscriptionEnd: null },
    });
  }

  async getQuestions(page = 1, limit = 20, themeId?: string, search?: string) {
    const where: any = {};
    if (themeId) where.subTheme = { themeId };
    if (search) where.text = { contains: search, mode: 'insensitive' };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { subTheme: { include: { theme: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return { questions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateQuestion(id: string, data: any) {
    return this.prisma.question.update({ where: { id }, data });
  }

  async deleteQuestion(id: string) {
    return this.prisma.question.update({ where: { id }, data: { isActive: false } });
  }

  async deleteAllQuestions() {
    const { count } = await this.prisma.question.deleteMany({});
    return { deleted: count };
  }
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getSettings() {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async getUserAnalytics() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: { role: true, gender: true, wilaya: true, profession: true } as any,
    });

    const group = (field: string) => {
      const map: Record<string, number> = {};
      users.forEach((u: any) => {
        const key = u[field] || null;
        map[key] = (map[key] || 0) + 1;
      });
      return Object.entries(map)
        .map(([key, count]) => ({ [field]: key === 'null' ? null : key, _count: { _all: count } }))
        .sort((a, b) => b._count._all - a._count._all);
    };

    return {
      byGender:     group('gender'),
      byWilaya:     group('wilaya').slice(0, 10),
      byProfession: group('profession').slice(0, 10),
      byRole:       group('role'),
    };
  }

  async importFromParser(parserData: any) {
    let themesCreated = 0;
    let subThemesCreated = 0;
    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (const themeData of parserData.themes) {
      const theme = await this.prisma.theme.upsert({
        where: { name: themeData.name },
        update: {},
        create: { name: themeData.name },
      });
      themesCreated++;

      for (const subData of themeData.subThemes) {
        const sub = await this.prisma.subTheme.upsert({
          where: { themeId_name: { themeId: theme.id, name: subData.name } },
          update: {},
          create: { name: subData.name, themeId: theme.id },
        });
        subThemesCreated++;

        for (const qData of subData.questions) {
          if (!qData.text || qData.text.trim().length < 5) continue;

          const existing = await this.prisma.question.findFirst({
            where: { text: qData.text.trim(), subThemeId: sub.id },
          });
          if (existing) { questionsSkipped++; continue; }

          await this.prisma.question.create({
            data: {
              text: qData.text,
              choiceA: qData.choiceA || '',
              choiceB: qData.choiceB || '',
              choiceC: qData.choiceC || '',
              choiceD: qData.choiceD || '',
              choiceE: qData.choiceE || '',
              correctAnswer: qData.correctAnswer,
              explanation: qData.explanation || '',
              imageUrl: qData.imageUrl || null,
              subThemeId: sub.id,
            },
          });
          questionsCreated++;
        }
      }
    }

    return { themesCreated, subThemesCreated, questionsCreated, questionsSkipped };
  }
}
