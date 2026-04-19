import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const FREE_DAILY_LIMIT = 3;

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async getForPractice(userId: string, userRole: string, opts: {
    themeId?: string;
    subThemeId?: string;
    count?: number;
  }) {
    // Vérifier quota FREE
    if (userRole === 'FREE') {
      const count = await this.usersService.checkAndResetDailyCount(userId);
      if (count >= FREE_DAILY_LIMIT) {
        throw new ForbiddenException({
          message: 'Quota journalier atteint',
          code: 'QUOTA_EXCEEDED',
          limit: FREE_DAILY_LIMIT,
        });
      }
    }

    const where: any = { isActive: true };
    if (opts.subThemeId) where.subThemeId = opts.subThemeId;
    else if (opts.themeId) {
      where.subTheme = { themeId: opts.themeId };
    }

    const total = await this.prisma.question.count({ where });
    const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, total - (opts.count || 1))));

    return this.prisma.question.findMany({
      where,
      take: opts.count || 1,
      skip,
      include: { subTheme: { include: { theme: true } } },
    });
  }

  async getForExam(userId: string, userRole: string, opts: {
    themeId?: string;
    count: number;
  }) {
    if (userRole === 'FREE') {
      throw new ForbiddenException({
        message: 'Le mode série nécessite un abonnement Premium',
        code: 'PREMIUM_REQUIRED',
      });
    }

    const where: any = { isActive: true };
    if (opts.themeId) where.subTheme = { themeId: opts.themeId };

    // Mélanger aléatoirement
    const questions = await this.prisma.question.findMany({
      where,
      include: { subTheme: { include: { theme: true } } },
    });

    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, opts.count);
  }

  async getMistakes(userId: string) {
    // Questions ratées: dernière réponse incorrecte
    const wrongAnswers = await this.prisma.userAnswer.findMany({
      where: { userId, isCorrect: false },
      orderBy: { answeredAt: 'desc' },
      distinct: ['questionId'],
      include: {
        question: {
          include: { subTheme: { include: { theme: true } } },
        },
      },
    });

    return wrongAnswers.map((a) => a.question);
  }

  async findOne(id: string) {
    return this.prisma.question.findUnique({
      where: { id },
      include: { subTheme: { include: { theme: true } } },
    });
  }
}
