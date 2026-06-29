import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FALLBACK_AVG = 68;
const BUCKET_MINS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

// Distribution normale simulée (utilisée quand pas assez de données)
const SIMULATED_H = [4, 7, 12, 20, 31, 45, 61, 77, 89, 97, 100, 91, 75, 54, 33, 17, 6];

function buildDistribution(scores: number[], real: boolean) {
  if (!real) {
    return BUCKET_MINS.map((min, i) => ({ min, h: SIMULATED_H[i] }));
  }
  const counts = BUCKET_MINS.map((min) =>
    scores.filter((s) => min === 100 ? s >= 100 : s >= min && s < min + 5).length
  );
  const maxCount = Math.max(...counts, 1);
  return BUCKET_MINS.map((min, i) => ({ min, h: Math.round((counts[i] / maxCount) * 100) }));
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getNational(userScore: number, themeId?: string, subThemeId?: string) {
    const where: any = { isCompleted: true };
    if (subThemeId) where.subThemeId = subThemeId;
    else if (themeId) where.themeId = themeId;

    const attempts = await this.prisma.attempt.findMany({
      where,
      select: { score: true },
    });

    const scores = attempts.map((a) => a.score).sort((a, b) => a - b);
    const total = scores.length;
    const hasRealData = total >= 10;

    let avg: number;
    let percentile: number;

    if (hasRealData) {
      avg = Math.round(scores.reduce((s, v) => s + v, 0) / total);
      const below = scores.filter((s) => s <= userScore).length;
      percentile = Math.round((below / total) * 100);
    } else {
      avg = FALLBACK_AVG;
      percentile = Math.min(95, Math.round((userScore / 100) * 85));
    }

    const distribution = buildDistribution(scores, hasRealData);

    return { avg, percentile, total, estimated: !hasRealData, distribution };
  }

  async getPreparationStats(userId: string, lang?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profession: true } });
    const prof = user?.profession || '';
    const target = prof.includes('sage_femme') ? 'SAGE_FEMME'
      : prof.includes('biologiste') ? 'BIOLOGISTE'
      : 'INFIRMIER';

    const language = (lang || 'FR').toUpperCase() as 'FR' | 'AR';

    // Total questions pour la profession et la langue
    const totalQ = await this.prisma.question.count({
      where: { subTheme: { theme: { target, isPublished: true, language } } },
    });

    // Total fiches mémo pour la langue
    const totalFiches = await this.prisma.ficheMemo.count({
      where: { target, isVisible: true, lang: language },
    });

    // Questions répondues depuis le début de la journée courante
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const questionsAnswered = await this.prisma.userAnswer.count({
      where: { userId, answeredAt: { gte: startOfToday } },
    });

    const qPerDay = Math.ceil(totalQ / 3);
    const fichesPerDay = Math.ceil(totalFiches / 3);

    return { totalQ, qPerDay, totalFiches, fichesPerDay, questionsAnswered, target };
  }

  async getMyRank(userId: string) {
    const C = 5; // même constante que le leaderboard admin

    const grouped = await this.prisma.attempt.groupBy({
      by: ['userId'],
      where: { isCompleted: true },
      _count: { _all: true },
      _avg: { score: true },
    });

    if (grouped.length === 0) return { rank: null, total: 0, globalScore: 0 };

    const entries = grouped.map((g) => ({
      userId: g.userId,
      avgScore: g._avg.score ?? 0,
      sessions: g._count._all,
    }));

    const total = entries.length;
    const globalAvg = entries.reduce((s, e) => s + e.avgScore, 0) / total;

    // Score bayésien identique au leaderboard admin
    const ranked = entries
      .map((e) => ({
        ...e,
        bayesian: (e.avgScore * e.sessions + globalAvg * C) / (e.sessions + C),
      }))
      .sort((a, b) => b.bayesian - a.bayesian);

    const idx = ranked.findIndex((e) => e.userId === userId);
    if (idx === -1) return { rank: null, total, globalScore: 0 };

    return {
      rank: idx + 1,
      total,
      globalScore: Math.round(ranked[idx].avgScore),
    };
  }
}
