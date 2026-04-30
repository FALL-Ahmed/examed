import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    let user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, subscriptionEnd: true, createdAt: true,
        dailyQuestionCount: true, lastQuestionDate: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Auto-expiry: downgrade PREMIUM users whose subscription has ended
    if (user.role === 'PREMIUM' && user.subscriptionEnd && user.subscriptionEnd < new Date()) {
      await this.prisma.user.update({ where: { id }, data: { role: 'FREE' } });
      user = { ...user, role: 'FREE' };
    }

    return user;
  }

  async getStats(userId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId, isCompleted: true },
      include: {
        answers: {
          include: {
            question: {
              include: { subTheme: { include: { theme: true } } },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const totalAttempts = attempts.length;
    const totalQuestions = attempts.reduce((s, a) => s + a.totalQ, 0);
    const totalCorrect = attempts.reduce((s, a) => s + a.correctQ, 0);
    const globalScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Stats par thème (barème partiel)
    const themeMap: Record<string, { name: string; language: string; total: number; rawScore: number }> = {};
    for (const attempt of attempts) {
      for (const answer of attempt.answers) {
        const theme = answer.question.subTheme.theme;
        if (!themeMap[theme.name]) themeMap[theme.name] = { name: theme.name, language: theme.language, total: 0, rawScore: 0 };
        themeMap[theme.name].total++;
        // Pour les anciennes réponses sans barème (partialScore=0), on utilise isCorrect comme fallback
        themeMap[theme.name].rawScore += answer.partialScore > 0 ? answer.partialScore : (answer.isCorrect ? 1 : 0);
      }
    }

    const themeStats = Object.values(themeMap).map((t) => ({
      name: t.name,
      language: t.language,
      total: t.total,
      score: t.total > 0 ? Math.round((t.rawScore / t.total) * 1000) / 10 : 0,
    }));

    // Historique des 30 derniers jours
    const history = attempts.slice(0, 30).map((a) => ({
      date: a.startedAt,
      score: a.score,
      mode: a.mode,
      totalQ: a.totalQ,
      correctQ: a.correctQ,
    }));

    return { globalScore, totalAttempts, totalQuestions, totalCorrect, themeStats, history };
  }

  async checkAndResetDailyCount(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.lastQuestionDate || user.lastQuestionDate < today) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { dailyQuestionCount: 0, lastQuestionDate: new Date() },
      });
      return 0;
    }
    return user.dailyQuestionCount;
  }

  async incrementDailyCount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { dailyQuestionCount: { increment: 1 } },
    });
  }
}
