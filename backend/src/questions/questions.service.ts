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
    language?: string;
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
    if (opts.subThemeId) {
      where.subThemeId = opts.subThemeId;
    } else {
      const subFilter: any = {};
      if (opts.themeId) subFilter.themeId = opts.themeId;
      if (opts.language) subFilter.theme = { language: opts.language };
      if (Object.keys(subFilter).length) where.subTheme = subFilter;
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
    language?: string;
  }) {
    if (userRole === 'FREE') {
      throw new ForbiddenException({
        message: 'Le mode série nécessite un abonnement Premium',
        code: 'PREMIUM_REQUIRED',
      });
    }

    const where: any = { isActive: true };
    const subFilter: any = {};
    if (opts.themeId) subFilter.themeId = opts.themeId;
    if (opts.language) subFilter.theme = { language: opts.language };
    if (Object.keys(subFilter).length) where.subTheme = subFilter;

    // Mélanger aléatoirement
    const questions = await this.prisma.question.findMany({
      where,
      include: { subTheme: { include: { theme: true } } },
    });

    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, opts.count);
  }

  async getFreeTrial(themeName: string) {
    const normalized = themeName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Mapping: clé frontend → filtre DB
    const THEME_MAP: Record<string, { field: 'subTheme' | 'theme'; keyword: string }> = {
      paludisme: { field: 'subTheme', keyword: 'paludisme' },
      lavage:    { field: 'subTheme', keyword: 'lavage' },
      pediatrie: { field: 'theme',    keyword: 'pediatrie' },
    };

    const entry = Object.entries(THEME_MAP).find(([k]) => normalized.includes(k));
    if (!entry) throw new Error('Thème non disponible en essai gratuit');

    const [, { field, keyword }] = entry;

    const where = field === 'subTheme'
      ? { isActive: true, subTheme: { name: { contains: keyword, mode: 'insensitive' as const } } }
      : { isActive: true, subTheme: { theme: { name: { contains: keyword, mode: 'insensitive' as const } } } };

    return this.prisma.question.findMany({
      where,
      take: 10,
      include: { subTheme: { include: { theme: true } } },
    });
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

  async toggleFavorite(userId: string, questionId: string) {
    const existing = await (this.prisma as any).favorite.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) {
      await (this.prisma as any).favorite.delete({ where: { userId_questionId: { userId, questionId } } });
      return { favorited: false };
    }
    await (this.prisma as any).favorite.create({ data: { userId, questionId } });
    return { favorited: true };
  }

  async getFavorites(userId: string) {
    const favs = await (this.prisma as any).favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { question: { include: { subTheme: { include: { theme: true } } } } },
    });
    return favs.map((f: any) => f.question);
  }

  async getFavoriteIds(userId: string) {
    const favs = await (this.prisma as any).favorite.findMany({
      where: { userId },
      select: { questionId: true },
    });
    return favs.map((f: any) => f.questionId);
  }
}
