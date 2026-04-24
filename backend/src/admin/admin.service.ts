import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfDay   = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, premiumUsers, totalQuestions,
      pendingPayments, pendingGroupPayments,
      todayRegistrations, weekRegistrations,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      this.prisma.user.count({ where: { role: 'PREMIUM' } }),
      this.prisma.question.count({ where: { isActive: true } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'PENDING', planType: 'GROUP' } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    ]);

    const [
      totalAttempts, completedAttempts,
      totalAnswers, correctAnswers,
      revenueTotal, revenueMonth,
      activeUsersWeek, avgScore,
    ] = await Promise.all([
      this.prisma.attempt.count(),
      this.prisma.attempt.count({ where: { isCompleted: true } }),
      this.prisma.userAnswer.count(),
      this.prisma.userAnswer.count({ where: { isCorrect: true } }),
      this.prisma.payment.aggregate({ where: { status: 'VALIDATED' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'VALIDATED', validatedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.attempt.findMany({ where: { startedAt: { gte: startOfWeek } }, distinct: ['userId'], select: { userId: true } }).then((r) => r.length),
      this.prisma.attempt.aggregate({ where: { isCompleted: true, totalQ: { gt: 0 } }, _avg: { score: true } }),
    ]);

    return {
      totalUsers, premiumUsers, totalQuestions,
      pendingPayments, pendingGroupPayments,
      todayRegistrations, weekRegistrations,
      totalAttempts, completedAttempts,
      completionRate: totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
      totalAnswers, correctAnswers,
      accuracyRate: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      revenueTotal: revenueTotal._sum.amount ?? 0,
      revenueMonth: revenueMonth._sum.amount ?? 0,
      avgScore: Math.round(((avgScore._avg.score ?? 0)) * 10) / 10,
      conversionRate: totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0,
      activeUsersWeek,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string, planType?: string) {
    const where: any = { role: { not: 'ADMIN' } };
    if (planType) {
      where.payments = { some: { status: 'VALIDATED', planType } };
    }
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
    const [user, totalAnswers, correctAnswers, favorites, lastAttempt, attemptsByTheme] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, fullName: true, phone: true,
          role: true, subscriptionEnd: true, isActive: true, createdAt: true,
          gender: true, profession: true, wilaya: true, pseudo: true,
          _count: { select: { attempts: true, favorites: true } },
          attempts: {
            orderBy: { startedAt: 'desc' },
            take: 20,
            select: {
              id: true, mode: true, score: true, totalQ: true, correctQ: true,
              timeTaken: true, isCompleted: true, startedAt: true, completedAt: true,
              subThemeId: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true, amount: true, status: true, paymentMethod: true,
              operator: true, receiptUrl: true, createdAt: true,
              validatedAt: true, rejectionReason: true, planType: true,
            },
          },
          trustedDevices: {
            where: { isActive: true },
            orderBy: { lastUsedAt: 'desc' },
            select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
          },
        } as any,
      }),
      this.prisma.userAnswer.count({ where: { userId } }),
      this.prisma.userAnswer.count({ where: { userId, isCorrect: true } }),
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.attempt.findFirst({ where: { userId }, orderBy: { startedAt: 'desc' }, select: { startedAt: true } }),
      this.prisma.attempt.groupBy({
        by: ['subThemeId'],
        where: { userId, isCompleted: true },
        _count: { _all: true },
        _avg: { score: true },
        orderBy: { _count: { subThemeId: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrichir les sous-thèmes (pour les attempts et le top)
    const allSubThemeIds = [
      ...attemptsByTheme.map((a) => a.subThemeId),
      ...(user?.attempts ?? []).map((a: any) => a.subThemeId),
    ].filter(Boolean) as string[];
    const uniqueIds = [...new Set(allSubThemeIds)];
    const subThemes = uniqueIds.length
      ? await this.prisma.subTheme.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, name: true, theme: { select: { name: true } } },
        })
      : [];
    const subThemeMap = Object.fromEntries(subThemes.map((s) => [s.id, s]));

    const avgScore = (user?.attempts ?? []).filter((a: any) => a.isCompleted && a.totalQ > 0)
      .reduce((acc: any, a: any, _: any, arr: any) => acc + a.score / arr.length, 0) ?? 0;

    const attempts = (user?.attempts ?? []).map((a: any) => ({
      ...a,
      subTheme: subThemeMap[a.subThemeId] ?? null,
    }));

    return {
      ...user,
      attempts,
      activity: {
        totalAnswers,
        correctAnswers,
        accuracyRate: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        favorites,
        lastSeen: lastAttempt?.startedAt ?? null,
        avgScore: Math.round(avgScore * 10) / 10,
        topSubThemes: attemptsByTheme.map((a) => ({
          subTheme: subThemeMap[a.subThemeId!] ?? null,
          attempts: a._count._all,
          avgScore: Math.round(((a._avg.score ?? 0)) * 10) / 10,
        })),
      },
    };
  }

  async revokeUserDevice(deviceId: string) {
    return (this.prisma as any).trustedDevice.update({
      where: { id: deviceId },
      data: { isActive: false },
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

  async changeUserPassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }

  async resetUserSubscription(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'FREE', subscriptionEnd: null },
    });
  }

  async grantPremium(userId: string, days: number) {
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + days);
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'PREMIUM', subscriptionEnd },
    });
  }

  async getQuestions(page = 1, limit = 20, themeId?: string, search?: string, subThemeId?: string, language?: string) {
    const where: any = {};
    if (subThemeId) {
      where.subThemeId = subThemeId;
    } else {
      const subFilter: any = {};
      if (themeId) subFilter.themeId = themeId;
      if (language) subFilter.theme = { language };
      if (Object.keys(subFilter).length) where.subTheme = subFilter;
    }
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

  async deleteAllThemes() {
    await this.prisma.question.deleteMany({});
    await this.prisma.subTheme.deleteMany({});
    const { count } = await this.prisma.theme.deleteMany({});
    return { deleted: count };
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

  async getGroups() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'VALIDATED', planType: 'GROUP' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, subscriptionEnd: true } },
        groupInvites: true,
      },
      orderBy: { validatedAt: 'desc' },
    });

    const allEmails = payments.flatMap((p) => (p as any).groupInvites.map((i: any) => i.email));
    const memberUsers = allEmails.length
      ? await this.prisma.user.findMany({
          where: { email: { in: allEmails } },
          select: { id: true, fullName: true, email: true, subscriptionEnd: true },
        })
      : [];
    const userByEmail = Object.fromEntries(memberUsers.map((u) => [u.email, u]));

    return payments.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      groupSize: p.groupSize,
      validatedAt: p.validatedAt,
      organizer: p.user,
      members: p.groupInvites.map((inv: any) => ({
        email: inv.email,
        isUsed: inv.isUsed,
        user: userByEmail[inv.email] ?? null,
      })),
    }));
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

  async importFromParser(parserData: any, language = 'FR') {
    let themesCreated = 0;
    let subThemesCreated = 0;
    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (const themeData of parserData.themes) {
      const theme = await this.prisma.theme.upsert({
        where: { name: themeData.name },
        update: { language },
        create: { name: themeData.name, language },
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
