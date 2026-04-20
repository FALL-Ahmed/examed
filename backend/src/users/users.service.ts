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

    // Stats par thème
    const themeMap: Record<string, { name: string; total: number; correct: number }> = {};
    for (const attempt of attempts) {
      for (const answer of attempt.answers) {
        const themeName = answer.question.subTheme.theme.name;
        if (!themeMap[themeName]) themeMap[themeName] = { name: themeName, total: 0, correct: 0 };
        themeMap[themeName].total++;
        if (answer.isCorrect) themeMap[themeName].correct++;
      }
    }

    const themeStats = Object.values(themeMap).map((t) => ({
      ...t,
      score: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
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
