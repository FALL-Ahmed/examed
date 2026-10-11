import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveRole } from '../common/utils/role.utils';

export interface FreemiumConfig {
  enabled: boolean;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD (inclus)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class FreemiumService {
  constructor(private prisma: PrismaService) {}

  async getConfig(): Promise<FreemiumConfig> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['FREEMIUM_ENABLED', 'FREEMIUM_START', 'FREEMIUM_END'] } },
    });
    const get = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
    return {
      enabled: get('FREEMIUM_ENABLED') === 'true',
      startDate: get('FREEMIUM_START'),
      endDate: get('FREEMIUM_END'),
    };
  }

  // Fin de campagne = fin de journée (UTC, = heure de Nouakchott)
  endOf(config: FreemiumConfig): Date | null {
    return config.endDate ? new Date(`${config.endDate}T23:59:59.999Z`) : null;
  }

  isOpen(config: FreemiumConfig, now = new Date()): boolean {
    if (!config.enabled || !config.startDate || !config.endDate) return false;
    const start = new Date(`${config.startDate}T00:00:00.000Z`);
    const end = this.endOf(config)!;
    return now >= start && now <= end;
  }

  async getPublicStatus() {
    const config = await this.getConfig();
    const open = this.isOpen(config);
    return { open, endDate: open ? config.endDate : null };
  }

  async updateConfig(dto: { enabled: boolean; startDate: string; endDate: string }) {
    if (!DATE_RE.test(dto.startDate ?? '') || !DATE_RE.test(dto.endDate ?? '')) {
      throw new BadRequestException('Dates invalides (format AAAA-MM-JJ)');
    }
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }
    const config: FreemiumConfig = { enabled: !!dto.enabled, startDate: dto.startDate, endDate: dto.endDate };
    await this.prisma.$transaction([
      ...[
        ['FREEMIUM_ENABLED', String(config.enabled)],
        ['FREEMIUM_START', config.startDate!],
        ['FREEMIUM_END', config.endDate!],
      ].map(([key, value]) =>
        this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
      // Aligne la fin d'essai de tous les comptes freemium sur la campagne (prolongation ou arrêt)
      this.prisma.user.updateMany({
        where: { role: 'FREEMIUM' },
        data: { subscriptionEnd: config.enabled ? this.endOf(config) : new Date() },
      }),
    ]);
    return this.getConfig();
  }

  // Arbre thèmes → sous-thèmes avec le nombre de questions et l'état freemium
  async getContentTree() {
    const themes = await this.prisma.theme.findMany({
      select: {
        id: true, name: true, language: true, target: true, order: true, isPublished: true,
        subThemes: {
          select: {
            id: true, name: true, order: true, isFreemium: true,
            _count: { select: { questions: { where: { isActive: true } } } },
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ target: 'asc' }, { language: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
    return themes.map((t) => ({
      ...t,
      subThemes: t.subThemes.map((s) => ({ id: s.id, name: s.name, isFreemium: s.isFreemium, questions: s._count.questions })),
    }));
  }

  async setSubThemes(subThemeIds: string[], isFreemium: boolean) {
    if (!Array.isArray(subThemeIds) || !subThemeIds.length) return { updated: 0 };
    const { count } = await this.prisma.subTheme.updateMany({
      where: { id: { in: subThemeIds } },
      data: { isFreemium: !!isFreemium },
    });
    return { updated: count };
  }

  // Statistiques de l'essai gratuit : conversion Premium + activité (questions répondues)
  async getStats(days = 30) {
    const users = await this.prisma.user.findMany({
      where: { freemiumAt: { not: null } },
      select: {
        id: true, fullName: true, email: true, phone: true, profession: true,
        role: true, subscriptionEnd: true, freemiumAt: true,
        payments: { select: { status: true, createdAt: true, validatedAt: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { freemiumAt: 'desc' },
    });
    const ids = users.map((u) => u.id);
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const since = new Date(startOfToday.getTime() - (days - 1) * 86400000);
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [totals, corrects, today, daily] = ids.length
      ? await Promise.all([
          this.prisma.userAnswer.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true }, _max: { answeredAt: true } }),
          this.prisma.userAnswer.groupBy({ by: ['userId'], where: { userId: { in: ids }, isCorrect: true }, _count: { _all: true } }),
          this.prisma.userAnswer.groupBy({ by: ['userId'], where: { userId: { in: ids }, answeredAt: { gte: startOfToday } }, _count: { _all: true } }),
          this.prisma.$queryRaw<{ day: Date; answers: bigint; users: bigint }[]>`
            SELECT date_trunc('day', "answeredAt") AS day, COUNT(*) AS answers, COUNT(DISTINCT "userId") AS users
            FROM "UserAnswer"
            WHERE "userId" IN (${Prisma.join(ids)}) AND "answeredAt" >= ${since}
            GROUP BY 1 ORDER BY 1`,
        ])
      : [[], [], [], []];

    const totalBy = new Map(totals.map((t) => [t.userId, t]));
    const correctBy = new Map(corrects.map((c) => [c.userId, c._count._all]));
    const todayBy = new Map(today.map((t) => [t.userId, t._count._all]));

    const rows = users.map((u) => {
      const t = totalBy.get(u.id);
      const answered = t?._count._all ?? 0;
      const converted = u.role === 'PREMIUM';
      // Conversion = premier paiement validé après l'inscription à l'essai (sinon activation manuelle)
      const paid = u.payments.find((p) => p.status === 'VALIDATED' && p.validatedAt && p.validatedAt >= u.freemiumAt!);
      const pending = u.payments.some((p) => p.status === 'PENDING');
      const status = converted ? 'CONVERTED'
        : pending ? 'PAYMENT_PENDING'
        : u.role === 'FREEMIUM' && effectiveRole(u) === 'FREEMIUM' ? 'ACTIVE'
        : 'EXPIRED';
      return {
        id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, profession: u.profession,
        freemiumAt: u.freemiumAt, status,
        convertedAt: converted ? paid?.validatedAt ?? null : null,
        answered,
        correct: correctBy.get(u.id) ?? 0,
        today: todayBy.get(u.id) ?? 0,
        lastActivity: t?._max.answeredAt ?? null,
      };
    });

    // Série quotidienne complète (jours sans activité = 0)
    const byDay = new Map(daily.map((d) => [new Date(d.day).toISOString().slice(0, 10), d]));
    const signupsByDay = new Map<string, number>();
    const conversionsByDay = new Map<string, number>();
    for (const r of rows) {
      const k = r.freemiumAt!.toISOString().slice(0, 10);
      signupsByDay.set(k, (signupsByDay.get(k) ?? 0) + 1);
      if (r.convertedAt) {
        const c = r.convertedAt.toISOString().slice(0, 10);
        conversionsByDay.set(c, (conversionsByDay.get(c) ?? 0) + 1);
      }
    }
    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
      const d = byDay.get(date);
      return {
        date,
        answers: Number(d?.answers ?? 0),
        activeUsers: Number(d?.users ?? 0),
        signups: signupsByDay.get(date) ?? 0,
        conversions: conversionsByDay.get(date) ?? 0,
      };
    });

    const converted = rows.filter((r) => r.status === 'CONVERTED').length;
    const totalAnswers = rows.reduce((n, r) => n + r.answered, 0);
    return {
      kpis: {
        signups: rows.length,
        converted,
        conversionRate: rows.length ? Math.round((converted / rows.length) * 1000) / 10 : 0,
        paymentPending: rows.filter((r) => r.status === 'PAYMENT_PENDING').length,
        active7d: rows.filter((r) => r.lastActivity && r.lastActivity >= weekAgo).length,
        neverAnswered: rows.filter((r) => r.answered === 0).length,
        totalAnswers,
        answersToday: rows.reduce((n, r) => n + r.today, 0),
        avgAnswers: rows.length ? Math.round(totalAnswers / rows.length) : 0,
      },
      series,
      users: rows,
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: 'FREEMIUM' },
      select: { id: true, fullName: true, email: true, phone: true, profession: true, createdAt: true, subscriptionEnd: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = users.map((u) => u.id);
    const answers = ids.length
      ? await this.prisma.userAnswer.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } })
      : [];
    const countById = new Map(answers.map((a) => [a.userId, a._count._all]));
    return users.map((u) => ({ ...u, answered: countById.get(u.id) ?? 0 }));
  }
}
