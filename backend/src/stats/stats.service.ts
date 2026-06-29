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

    // Thèmes publiés triés → on aplatit au niveau SOUS-THÈME pour une coupe fine
    // (un seul gros thème peut contenir plusieurs centaines de questions, ce qui
    // empêche une répartition équilibrée si on découpe au niveau thème entier).
    const themes = await this.prisma.theme.findMany({
      where: { target, isPublished: true, language },
      select: {
        subThemes: {
          select: { _count: { select: { questions: true } } },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    const flatQs = themes.flatMap(t => t.subThemes.map(st => st._count.questions));
    const cumQ = flatQs.reduce((acc, q) => { acc.push((acc[acc.length - 1] ?? 0) + q); return acc; }, [] as number[]);
    const totalQ = cumQ[cumQ.length - 1] ?? 0;
    // Trouver les points de coupe (au niveau sous-thème) pour équilibrer les questions par jour
    let split1 = 1, minDiff1 = Infinity;
    for (let i = 0; i < flatQs.length - 2; i++) {
      const d = Math.abs(cumQ[i] - totalQ / 3);
      if (d < minDiff1) { minDiff1 = d; split1 = i + 1; }
    }
    let split2 = split1 + 1, minDiff2 = Infinity;
    for (let i = split1; i < flatQs.length - 1; i++) {
      const d = Math.abs(cumQ[i] - (2 * totalQ) / 3);
      if (d < minDiff2) { minDiff2 = d; split2 = i + 1; }
    }
    const qPerDayArr = [
      flatQs.slice(0, split1).reduce((s, q) => s + q, 0),
      flatQs.slice(split1, split2).reduce((s, q) => s + q, 0),
      flatQs.slice(split2).reduce((s, q) => s + q, 0),
    ];

    // Total fiches mémo pour la langue
    const totalFiches = await this.prisma.ficheMemo.count({
      where: { target, isVisible: true, lang: language },
    });
    const fichesPerDay = Math.ceil(totalFiches / 3);

    // Questions répondues depuis le début de la journée courante
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const questionsAnswered = await this.prisma.userAnswer.count({
      where: { userId, answeredAt: { gte: startOfToday } },
    });

    return { totalQ, qPerDay: qPerDayArr, totalFiches, fichesPerDay, questionsAnswered, target };
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
