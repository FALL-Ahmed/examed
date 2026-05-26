import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
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
      this.prisma.attempt.aggregate({ where: { isCompleted: true }, _sum: { totalQ: true } }).then((r) => r._sum.totalQ ?? 0),
      this.prisma.attempt.aggregate({ where: { isCompleted: true }, _sum: { correctQ: true } }).then((r) => r._sum.correctQ ?? 0),
      this.prisma.payment.aggregate({ where: { status: 'VALIDATED', amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'VALIDATED', amount: { gt: 0 }, validatedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
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

  async getUsers(page = 1, limit = 20, search?: string, planType?: string, expiringSoon?: boolean) {
    const where: any = { role: { not: 'ADMIN' } };
    if (planType) {
      where.payments = { some: { status: 'VALIDATED', planType } };
    }
    if (expiringSoon) {
      const now = new Date();
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.subscriptionEnd = { gte: now, lte: in7days };
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
          payments: {
            where: { status: 'VALIDATED' },
            orderBy: { validatedAt: 'desc' },
            take: 1,
            select: { operator: true, planType: true },
          },
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
              subThemeId: true, themeId: true,
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

    // Enrichir les sous-thèmes et thèmes (pour les attempts et le top)
    const allSubThemeIds = [
      ...attemptsByTheme.map((a) => a.subThemeId),
      ...(user?.attempts ?? []).map((a: any) => a.subThemeId),
    ].filter(Boolean) as string[];
    const allThemeIds = (user?.attempts ?? []).map((a: any) => a.themeId).filter(Boolean) as string[];

    const [subThemes, themes] = await Promise.all([
      allSubThemeIds.length
        ? this.prisma.subTheme.findMany({
            where: { id: { in: [...new Set(allSubThemeIds)] } },
            select: { id: true, name: true, theme: { select: { id: true, name: true, language: true } } },
          })
        : [],
      allThemeIds.length
        ? this.prisma.theme.findMany({
            where: { id: { in: [...new Set(allThemeIds)] } },
            select: { id: true, name: true, language: true },
          })
        : [],
    ]);
    const subThemeMap = Object.fromEntries(subThemes.map((s) => [s.id, s]));
    const themeMap = Object.fromEntries(themes.map((t) => [t.id, t]));

    const avgScore = (user?.attempts ?? []).filter((a: any) => a.isCompleted && a.totalQ > 0)
      .reduce((acc: any, a: any, _: any, arr: any) => acc + a.score / arr.length, 0) ?? 0;

    const attempts = (user?.attempts ?? []).map((a: any) => ({
      ...a,
      subTheme: subThemeMap[a.subThemeId] ?? null,
      theme: a.subThemeId ? (subThemeMap[a.subThemeId]?.theme ?? null) : (themeMap[a.themeId] ?? null),
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

  async changeUserEmail(userId: string, newEmail: string) {
    const email = newEmail.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) throw new Error('Email déjà utilisé');
    return this.prisma.user.update({ where: { id: userId }, data: { email } });
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

  async bulkGrantPremium(ids: string[], days: number) {
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + days);
    const { count } = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role: 'PREMIUM', subscriptionEnd },
    });
    return { updated: count };
  }

  async getQuestions(page = 1, limit = 20, themeId?: string, search?: string, subThemeId?: string, language?: string, target?: string) {
    const where: any = {};
    if (subThemeId) {
      where.subThemeId = subThemeId;
    } else {
      const subFilter: any = {};
      if (themeId) subFilter.themeId = themeId;
      const themeFilter: any = {};
      if (language) themeFilter.language = language;
      if (target) themeFilter.target = target;
      if (Object.keys(themeFilter).length) subFilter.theme = themeFilter;
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

  async deleteAllQuestions(target?: string) {
    if (target) {
      const themes = await this.prisma.theme.findMany({ where: { target }, select: { id: true } });
      const subThemes = await this.prisma.subTheme.findMany({
        where: { themeId: { in: themes.map(t => t.id) } },
        select: { id: true },
      });
      const { count } = await this.prisma.question.deleteMany({ where: { subThemeId: { in: subThemes.map(s => s.id) } } });
      return { deleted: count };
    }
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

  async getLeaderboard(sortBy: 'accuracy' | 'total' | 'score' = 'accuracy', limit = 100) {
    // totalQ/correctQ stockés dans Attempt à la complétion — résistent à la suppression des questions
    const [attemptsByUser, users] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['userId'],
        where: { isCompleted: true },
        _count: { _all: true },
        _avg: { score: true },
        _sum: { totalQ: true, correctQ: true },
      }),
      this.prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const attemptMap = Object.fromEntries(
      attemptsByUser.map((r) => [r.userId, {
        count:   r._count._all,
        avg:     r._avg.score ?? 0,
        total:   r._sum.totalQ ?? 0,
        correct: r._sum.correctQ ?? 0,
      }]),
    );

    const withStats = users
      .map((u) => {
        const att = attemptMap[u.id] ?? { count: 0, avg: 0, total: 0, correct: 0 };
        return {
          ...u,
          totalAnswers:      att.total,
          correctAnswers:    att.correct,
          accuracyRate:      att.total > 0 ? Math.round((att.correct / att.total) * 100) : 0,
          completedAttempts: att.count,
          avgScore:          Math.round(att.avg * 10) / 10,
        };
      })
      .filter((u) => u.totalAnswers > 0);

    // Bayesian Average : score = (avgScore × sessions + globalMoy × C) / (sessions + C)
    // C = 5 (poids de méfiance — équivaut à 5 sessions fictives à la moyenne globale)
    const C = 5;
    const usersWithSessions = withStats.filter((u) => u.completedAttempts > 0);
    const globalAvg = usersWithSessions.length > 0
      ? usersWithSessions.reduce((sum, u) => sum + u.avgScore, 0) / usersWithSessions.length
      : 50;

    const ranked = withStats
      .map((u) => ({
        ...u,
        bayesianScore: Math.round(
          ((u.avgScore * u.completedAttempts + globalAvg * C) / (u.completedAttempts + C)) * 10,
        ) / 10,
      }))
      .sort((a, b) => {
        if (sortBy === 'total') return b.totalAnswers - a.totalAnswers;
        if (sortBy === 'score') return b.avgScore - a.avgScore;
        // Par défaut : Bayesian score, égalité résolue par nombre de sessions puis de bonnes réponses
        if (b.bayesianScore !== a.bayesianScore) return b.bayesianScore - a.bayesianScore;
        if (b.completedAttempts !== a.completedAttempts) return b.completedAttempts - a.completedAttempts;
        return b.correctAnswers - a.correctAnswers;
      })
      .slice(0, limit);

    return ranked.map((u, i) => ({ ...u, rank: i + 1 }));
  }

  async getUserAnalytics() {
    const [users, operatorStats, langStats] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { role: true, gender: true, wilaya: true, profession: true } as any,
      }),
      this.prisma.payment.groupBy({
        by: ['operator'],
        where: { status: 'VALIDATED' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<{ language: string; users: bigint; answers: bigint }[]>`
        SELECT th.language,
               COUNT(DISTINCT a."userId") AS users,
               SUM(a."totalQ")            AS answers
        FROM "Attempt" a
        JOIN "Theme" th ON a."themeId" = th.id
        WHERE a."isCompleted" = true
          AND a."themeId" IS NOT NULL
        GROUP BY th.language
      `,
    ]);

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

    const byOperator = operatorStats
      .filter((o) => o.operator)
      .map((o) => ({ operator: o.operator, count: o._count._all, total: o._sum.amount ?? 0 }))
      .sort((a, b) => b.count - a.count);

    const byLanguage = langStats.map((r) => ({
      language: r.language,
      users: Number(r.users),
      answers: Number(r.answers),
    }));

    const themeStats = await this.prisma.$queryRaw<{
      subtheme: string; theme: string; language: string; total_answers: bigint;
      distinct_users: bigint; avg_score: number; sessions: bigint;
    }[]>`
      SELECT COALESCE(st.name, th.name) AS subtheme,
             th.name                    AS theme,
             th.language,
             SUM(a."totalQ")                AS total_answers,
             COUNT(DISTINCT a."userId")     AS distinct_users,
             COALESCE(AVG(a.score), 0)      AS avg_score,
             COUNT(a.id)                    AS sessions
      FROM "Attempt" a
      LEFT JOIN "SubTheme" st ON a."subThemeId" = st.id
      JOIN "Theme"    th ON COALESCE(st."themeId", a."themeId") = th.id
      WHERE a."isCompleted" = true
        AND (a."subThemeId" IS NOT NULL OR a."themeId" IS NOT NULL)
      GROUP BY st.id, st.name, th.name, th.language
      ORDER BY total_answers DESC
      LIMIT 20
    `;

    const byTheme = themeStats.map((r) => ({
      subtheme:      r.subtheme,
      theme:         r.theme,
      language:      r.language,
      totalAnswers:  Number(r.total_answers),
      distinctUsers: Number(r.distinct_users),
      avgScore:      Math.round(Number(r.avg_score) * 10) / 10,
      sessions:      Number(r.sessions),
      avgPerSession: Number(r.sessions) > 0
        ? Math.round(Number(r.total_answers) / Number(r.sessions))
        : Number(r.total_answers),
    }));

    return {
      byGender:     group('gender'),
      byWilaya:     group('wilaya').slice(0, 10),
      byProfession: group('profession').slice(0, 10),
      byRole:       group('role'),
      byOperator,
      byLanguage,
      byTheme,
    };
  }

  async importFromParser(parserData: any, language = 'FR', target = 'INFIRMIER') {
    let themesCreated = 0;
    let subThemesCreated = 0;
    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (const themeData of parserData.themes) {
      const theme = await this.prisma.theme.upsert({
        where: { name_language_target: { name: themeData.name, language, target } },
        update: {},
        create: { name: themeData.name, language, target },
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

  async getSessions() {
    const sessions = await this.prisma.session.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const normalizeIp = (ip: string): string => {
      if (!ip) return ip;
      // Convertir IPv4-mappée-en-IPv6 : ::ffff:1.2.3.4 → 1.2.3.4
      if (ip.startsWith('::ffff:')) return ip.slice(7);
      return ip;
    };

    const isPublicIp = (ip: string): boolean => {
      const n = normalizeIp(ip);
      if (!n || n === 'unknown' || n === '::1' || n === 'localhost') return false;
      const parts = n.split('.').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) return false; // IPv6 pur = traité comme privé
      const [a, b] = parts;
      // Exclure toutes les plages privées / CGNAT / spéciales
      return !(
        a === 127 ||                           // loopback
        a === 10 ||                            // RFC 1918
        (a === 172 && b >= 16 && b <= 31) ||   // RFC 1918
        (a === 192 && b === 168) ||            // RFC 1918
        (a === 100 && b >= 64 && b <= 127) ||  // RFC 6598 CGNAT (opérateurs mobiles)
        (a === 169 && b === 254) ||            // link-local
        a === 0
      );
    };

    // Collecter uniquement les IP publiques pour la géolocalisation
    const publicIps = new Set<string>();
    for (const s of sessions) {
      if (s.user?.role === 'ADMIN') continue;
      const n = normalizeIp(s.ipAddress);
      if (isPublicIp(n)) publicIps.add(n);
    }

    const geoMap = new Map<string, { country: string; city: string; countryCode: string; lat: number; lon: number }>();
    if (publicIps.size > 0) {
      try {
        const ipList = [...publicIps].slice(0, 100);
        const { data: geoData } = await axios.post<any[]>(
          'http://ip-api.com/batch?fields=status,country,countryCode,city,lat,lon,query',
          ipList.map((ip) => ({ query: ip })),
          { timeout: 5000 },
        );
        for (const r of geoData) {
          if (r.status === 'success') {
            geoMap.set(r.query, { country: r.country, city: r.city, countryCode: r.countryCode, lat: r.lat, lon: r.lon });
          }
        }
      } catch {} // ip-api.com est optionnel
    }

    const userMap = new Map<string, {
      user: { id: string; fullName: string; email: string; role: string };
      sessions: typeof sessions;
      uniqueDeviceIds: Set<string>;
      allUniqueIps: Set<string>;
      lastActive: Date;
    }>();

    for (const s of sessions) {
      if (!s.userId || !s.user || s.user.role === 'ADMIN') continue;
      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, { user: s.user, sessions: [], uniqueDeviceIds: new Set(), allUniqueIps: new Set(), lastActive: s.lastActive });
      }
      const entry = userMap.get(s.userId)!;
      entry.sessions.push(s);
      if (s.deviceId) entry.uniqueDeviceIds.add(s.deviceId);
      const n = normalizeIp(s.ipAddress);
      if (n && n !== 'unknown') entry.allUniqueIps.add(n);
      if (s.lastActive > entry.lastActive) entry.lastActive = s.lastActive;
    }

    const getDeviceFamily = (deviceInfo: string): string => {
      const info = (deviceInfo || '').toLowerCase();
      if (info.includes('ios') || info.includes('iphone') || info.includes('ipad')) return 'iOS';
      if (info.includes('android')) return 'Android';
      if (info.includes('windows')) return 'Windows';
      if (info.includes('mac')) return 'Mac';
      if (info.includes('linux')) return 'Linux';
      return 'other';
    };

    const users = Array.from(userMap.values())
      .map((entry) => {
        const activeSessions = entry.sessions.filter((s) => s.isActive).length;
        // Familles d'appareils vus dans les 7 derniers jours
        const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = entry.sessions.filter((s) => s.lastActive > cutoff7d);
        const deviceFamilies = new Set(recentSessions.map((s) => getDeviceFamily(s.deviceInfo || '')));
        // Suspect = 3 familles distinctes (iOS + Android + Windows) récemment actives
        const suspicious = deviceFamilies.size >= 3 && activeSessions >= 1;
        return {
        userId: entry.user.id,
        fullName: entry.user.fullName,
        email: entry.user.email,
        role: entry.user.role,
        sessionCount: entry.sessions.length,
        uniqueDeviceCount: entry.uniqueDeviceIds.size,
        uniqueIpCount: entry.allUniqueIps.size,
        activeSessions,
        suspicious,
        lastActive: entry.lastActive,
        uniqueIpList: [...entry.allUniqueIps].map((ip) => ({
          ip,
          isPrivate: !isPublicIp(ip),
          geo: geoMap.get(ip) ?? null,
        })),
        recentSessions: entry.sessions.slice(0, 10).map((s) => {
          const n = normalizeIp(s.ipAddress);
          return {
            id: s.id,
            ipAddress: n,
            isPrivate: !isPublicIp(n),
            geo: geoMap.get(n) ?? null,
            deviceInfo: s.deviceInfo,
            createdAt: s.createdAt,
            lastActive: s.lastActive,
            isActive: s.isActive,
          };
        }),
        };
      })
      .sort((a, b) => b.uniqueDeviceCount - a.uniqueDeviceCount);

    return {
      total: users.length,
      suspicious: users.filter((u) => u.suspicious).length,
      users,
    };
  }

  async getFreeTrialStats(opts: { startDate?: string; endDate?: string; compareStart?: string; compareEnd?: string } = {}) {
    const parseRange = (start?: string, end?: string) => {
      const from = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = end ? new Date(end + 'T23:59:59.999Z') : new Date();
      from.setHours(0, 0, 0, 0);
      return { from, to };
    };

    const main = parseRange(opts.startDate, opts.endDate);
    const cmp = opts.compareStart ? parseRange(opts.compareStart, opts.compareEnd) : null;
    const [mainResult, compareResult] = await Promise.all([
      this.buildPeriodStats(main.from, main.to),
      cmp ? this.buildPeriodStats(cmp.from, cmp.to) : Promise.resolve(null),
    ]);

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return {
      ...mainResult,
      period: `${fmt(main.from)} → ${fmt(main.to)}`,
      compare: compareResult,
    };
  }

  private async buildPeriodStats(from: Date, to: Date) {
    const [events, leads] = await Promise.all([
      this.prisma.freeTrialEvent.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.freeTrialLead.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'desc' },
        select: { phone: true, theme: true, lang: true, createdAt: true },
      }),
    ]);

    const themeKeys = [...new Set(events.map((e) => e.theme))].sort();

    const byTheme = themeKeys.map((theme) => {
      const themeEvents = events.filter((e) => e.theme === theme);
      const bySession = new Map<string, { maxQ: number; correct: number; total: number }>();

      for (const e of themeEvents) {
        const s = bySession.get(e.sessionId) ?? { maxQ: 0, correct: 0, total: 0 };
        if (e.questionN > s.maxQ) s.maxQ = e.questionN;
        s.total++;
        if (e.isCorrect) s.correct++;
        bySession.set(e.sessionId, s);
      }

      const sessions = [...bySession.values()];
      const totalSessions = sessions.length;
      const avgQuestions = totalSessions > 0
        ? Math.round((sessions.reduce((sum, s) => sum + s.maxQ, 0) / totalSessions) * 10) / 10 : 0;
      const maxQ = Math.max(...themeEvents.map((e) => e.questionN), 1);
      const completions = sessions.filter((s) => s.maxQ >= maxQ).length;
      const funnel = Array.from({ length: maxQ }, (_, i) => ({
        q: i + 1,
        count: sessions.filter((s) => s.maxQ >= i + 1).length,
      }));
      const totalAnswers = themeEvents.length;
      const correctAnswers = themeEvents.filter((e) => e.isCorrect).length;
      const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      const sourceMap = new Map<string, Set<string>>();
      for (const e of themeEvents) {
        if (!e.source || e.source === 'direct') continue;
        if (!sourceMap.has(e.source)) sourceMap.set(e.source, new Set());
        sourceMap.get(e.source)!.add(e.sessionId);
      }
      const sourceSplit = [...sourceMap.entries()]
        .map(([source, sessions]) => ({ source, count: sessions.size }))
        .sort((a, b) => b.count - a.count);

      return {
        theme, totalSessions, avgQuestions,
        completionRate: totalSessions > 0 ? Math.round((completions / totalSessions) * 100) : 0,
        successRate, funnel,
        langSplit: {
          fr: new Set(themeEvents.filter((e) => e.lang === 'fr').map((e) => e.sessionId)).size,
          ar: new Set(themeEvents.filter((e) => e.lang === 'ar').map((e) => e.sessionId)).size,
        },
        sourceSplit,
      };
    });

    // Entonnoir global
    const allBySession = new Map<string, number>();
    for (const e of events) {
      const cur = allBySession.get(e.sessionId) ?? 0;
      if (e.questionN > cur) allBySession.set(e.sessionId, e.questionN);
    }
    const allSessions = [...allBySession.values()];
    const globalMaxQ = events.length > 0 ? Math.max(...events.map((e) => e.questionN)) : 10;
    const globalFunnel = Array.from({ length: globalMaxQ }, (_, i) => ({
      q: i + 1,
      count: allSessions.filter((m) => m >= i + 1).length,
    }));

    // Stats journalières
    const dailyMap = new Map<string, { sessions: Set<string>; completions: number; leads: number }>();
    for (const e of events) {
      const day = e.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { sessions: new Set(), completions: 0, leads: 0 });
      dailyMap.get(day)!.sessions.add(e.sessionId);
    }
    for (const lead of leads) {
      const day = lead.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { sessions: new Set(), completions: 0, leads: 0 });
      dailyMap.get(day)!.leads++;
    }
    const dailyStats = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, sessions: v.sessions.size, leads: v.leads }));

    return { byTheme, globalFunnel, totalSessions: allBySession.size, leads, dailyStats };
  }

  async getFreePracticeStats(params?: { startDate?: string; endDate?: string; target?: string }) {
    const from = params?.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = params?.endDate ? new Date(params.endDate + 'T23:59:59') : new Date();
    const since = from;
    const dateFilter = { gte: from, lte: to };

    const targetFilter =
      params?.target === 'SAGE_FEMME' ? { themeId: 'sf-free' } :
      params?.target === 'INFIRMIER'  ? { themeId: { not: 'sf-free' } } :
      {};

    const events = await (this.prisma as any).freePracticeEvent.findMany({
      where: { createdAt: dateFilter, ...targetFilter },
      orderBy: { createdAt: 'asc' },
    });

    // Mapping AR→FR (même thème, deux langues)
    const AR_TO_FR: Record<string, string> = {
      'الأمراض المعدية': 'LES MALADIES INFECTIEUSES',
      'التشريح وعلم وظائف الأعضاء (Anatomie et Physiologie)': 'ANATOMIE ET PHYSIOLOGIE',
      'طب القلب والأوعية الدموية': 'CARDIOLOGIE',
      'الغدد الصماء': 'ENDOCRINOLOGIE',
      'طب الأطفال': 'PEDIATRIE',
      'علم الأعصاب': 'NEUROLOGIE',
      'أمراض الجهاز الهضمي': 'GASTROLOGIE',
      'الطوارئ الجراحية': 'URGENCES CHIRURGICALES',
      'جراحة العظام والحروق': 'ORTHOPEDIE',
      'الدوائية والعلاج': 'PHARMACOLOGIE',
      'السيميولوجيا': 'SEMIOLOGIE',
      'الممارسة التمريضية': 'PRATIQUE DE LA SCIENCE INFIRMIERE',
    };
    const norm = (s: string) => s.normalize('NFC').trim();
    const AR_TO_FR_NORM = Object.fromEntries(Object.entries(AR_TO_FR).map(([k, v]) => [norm(k), v]));
    const canonicalName = (name: string) => AR_TO_FR_NORM[norm(name)] ?? name;

    const buildThemeStats = (te: any[], displayName: string) => {
      const sessions = new Map<string, { completed: boolean; answered: number; correct: number; maxQ: number }>();
      for (const e of te) {
        const s = sessions.get(e.sessionId) ?? { completed: false, answered: 0, correct: 0, maxQ: 0 };
        if (e.eventType === 'complete') s.completed = true;
        if (e.eventType === 'answer') {
          s.answered++;
          if (e.isCorrect) s.correct++;
          if ((e.questionN ?? 0) > s.maxQ) s.maxQ = e.questionN ?? 0;
        }
        sessions.set(e.sessionId, s);
      }
      const arr = [...sessions.values()];
      const total = arr.length;
      const completed = arr.filter((s) => s.completed).length;
      const totalAnswers = arr.reduce((sum, s) => sum + s.answered, 0);
      const totalCorrect = arr.reduce((sum, s) => sum + s.correct, 0);
      const frCount = new Set(te.filter((e: any) => e.lang === 'fr').map((e: any) => e.sessionId)).size;
      const arCount = new Set(te.filter((e: any) => e.lang === 'ar').map((e: any) => e.sessionId)).size;
      const ctaClicks = new Set(te.filter((e: any) => e.eventType === 'cta_click').map((e: any) => e.sessionId)).size;
      const maxQ = arr.length > 0 ? Math.max(...arr.map((s) => s.maxQ)) : 0;
      const questionFunnel = maxQ > 0
        ? Array.from({ length: maxQ }, (_, i) => ({
            q: i + 1,
            count: arr.filter((s) => s.maxQ >= i + 1).length,
          }))
        : [];
      // Sous-thèmes imbriqués dans ce thème
      const stEvents = te.filter((e: any) => e.subThemeName);
      const stNames = [...new Set<string>(stEvents.map((e: any) => e.subThemeName as string))];
      const subThemes = stNames.map((subThemeName) => {
        const se = stEvents.filter((e: any) => e.subThemeName === subThemeName);
        const stSessions = new Set(se.map((e: any) => e.sessionId));
        const stCompleted = new Set(se.filter((e: any) => e.eventType === 'complete').map((e: any) => e.sessionId));
        const stAnswers = se.filter((e: any) => e.eventType === 'answer');
        const stMaxQ = se.reduce((m: number, e: any) => Math.max(m, e.questionN ?? 0), 0);
        const stFunnel = stMaxQ > 0
          ? Array.from({ length: stMaxQ }, (_, i) => ({
              q: i + 1,
              count: new Set(se.filter((e: any) => (e.questionN ?? 0) >= i + 1).map((e: any) => e.sessionId)).size,
            }))
          : [];
        return {
          subThemeName,
          totalSessions: stSessions.size,
          completionRate: stSessions.size > 0 ? Math.round((stCompleted.size / stSessions.size) * 100) : 0,
          successRate: stAnswers.length > 0 ? Math.round((stAnswers.filter((e: any) => e.isCorrect).length / stAnswers.length) * 100) : 0,
          questionFunnel: stFunnel,
        };
      }).sort((a, b) => b.totalSessions - a.totalSessions);

      return {
        themeName: displayName,
        totalSessions: total,
        completions: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        successRate: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
        ctaClicks,
        conversionRate: total > 0 ? Math.round((ctaClicks / total) * 100) : 0,
        langSplit: { fr: frCount, ar: arCount },
        questionFunnel,
        subThemes,
      };
    };

    // Grouper tous les événements par nom canonique (AR traduit en FR)
    const canonicalNames = [...new Set<string>(events.map((e: any) => canonicalName(e.themeName)))];
    const byTheme = canonicalNames.map((cName) => {
      const te = events.filter((e: any) => canonicalName(e.themeName) === cName);
      return buildThemeStats(te, cName);
    }).sort((a, b) => b.totalSessions - a.totalSessions);

    // Entonnoir global (toutes sessions confondues)
    const allSessionsMaxQ = new Map<string, number>();
    for (const e of events) {
      if (e.eventType === 'answer' && (e.questionN ?? 0) > 0) {
        const prev = allSessionsMaxQ.get(e.sessionId) ?? 0;
        if ((e.questionN ?? 0) > prev) allSessionsMaxQ.set(e.sessionId, e.questionN ?? 0);
      }
    }
    const globalMaxQ = allSessionsMaxQ.size > 0 ? Math.max(...allSessionsMaxQ.values()) : 0;
    const globalFunnel = globalMaxQ > 0
      ? Array.from({ length: globalMaxQ }, (_, i) => ({
          q: i + 1,
          count: [...allSessionsMaxQ.values()].filter((maxQ) => maxQ >= i + 1).length,
        }))
      : [];

    // Stats journalières
    const dailyMap = new Map<string, Set<string>>();
    for (const e of events) {
      const day = (e.createdAt as Date).toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, new Set());
      dailyMap.get(day)!.add(e.sessionId);
    }
    const dailyStats = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sessions]) => ({ date, sessions: sessions.size }));

    const totalSessions = new Set(events.map((e: any) => e.sessionId)).size;
    const totalCompleted = new Set(events.filter((e: any) => e.eventType === 'complete').map((e: any) => e.sessionId)).size;
    const totalCtaClicks = new Set(events.filter((e: any) => e.eventType === 'cta_click').map((e: any) => e.sessionId)).size;

    // Inscriptions issues de free-practice (source = 'free-practice', 30 derniers jours)
    const [registrations, validatedPayments, waLeads, utmBreakdown] = await Promise.all([
      this.prisma.user.count({ where: { source: 'free-practice', createdAt: dateFilter } }),
      this.prisma.payment.count({
        where: { status: 'VALIDATED', createdAt: dateFilter, user: { source: 'free-practice' } },
      }),
      (this.prisma as any).freeTrialLead.findMany({
        where: { source: 'free-practice', createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
        select: { phone: true, theme: true, lang: true, createdAt: true },
      }),
      (this.prisma as any).user.groupBy({
        by: ['utmSource'],
        where: { createdAt: dateFilter },
        _count: { id: true },
      }),
    ]);

    const utmStats = (utmBreakdown as any[])
      .map((r: any) => ({ source: r.utmSource ?? 'direct', count: r._count.id }))
      .sort((a: any, b: any) => b.count - a.count);

    return {
      byTheme,

      globalFunnel,
      dailyStats,
      totalSessions,
      completionRate: totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0,
      totalCtaClicks,
      ctaRate: totalSessions > 0 ? Math.round((totalCtaClicks / totalSessions) * 100) : 0,
      registrations,
      registrationRate: totalCtaClicks > 0 ? Math.round((registrations / totalCtaClicks) * 100) : 0,
      validatedPayments,
      paymentRate: registrations > 0 ? Math.round((validatedPayments / registrations) * 100) : 0,
      waLeads,
      utmStats,
    };
  }

  async trackPdfDownload(userId: string, filename: string) {
    return this.prisma.pdfDownload.create({
      data: { userId, filename },
    });
  }

  async getPdfDownloads(filename?: string) {
    return this.prisma.pdfDownload.findMany({
      where: filename ? { filename } : undefined,
      orderBy: { downloadedAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, profession: true, wilaya: true } },
      },
      take: 200,
    });
  }
}
