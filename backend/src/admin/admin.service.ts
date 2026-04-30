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

  async getLeaderboard(sortBy: 'accuracy' | 'total' | 'score' = 'accuracy', limit = 100) {
    const [totalByUser, correctByUser, attemptsByUser, users] = await Promise.all([
      this.prisma.userAnswer.groupBy({ by: ['userId'], _count: { _all: true } }),
      this.prisma.userAnswer.groupBy({ by: ['userId'], where: { isCorrect: true }, _count: { _all: true } }),
      this.prisma.attempt.groupBy({
        by: ['userId'],
        where: { isCompleted: true },
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const totalMap   = Object.fromEntries(totalByUser.map((r) => [r.userId, r._count._all]));
    const correctMap = Object.fromEntries(correctByUser.map((r) => [r.userId, r._count._all]));
    const attemptMap = Object.fromEntries(attemptsByUser.map((r) => [r.userId, { count: r._count._all, avg: r._avg.score ?? 0 }]));

    const withStats = users
      .map((u) => {
        const total   = totalMap[u.id]   ?? 0;
        const correct = correctMap[u.id] ?? 0;
        const att     = attemptMap[u.id] ?? { count: 0, avg: 0 };
        return {
          ...u,
          totalAnswers:      total,
          correctAnswers:    correct,
          accuracyRate:      total > 0 ? Math.round((correct / total) * 100) : 0,
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
               COUNT(DISTINCT ua."userId") AS users,
               COUNT(ua.id) AS answers
        FROM "UserAnswer" ua
        JOIN "Question" q  ON ua."questionId" = q.id
        JOIN "SubTheme" st ON q."subThemeId"  = st.id
        JOIN "Theme"    th ON st."themeId"    = th.id
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
      SELECT st.name        AS subtheme,
             th.name        AS theme,
             th.language,
             COUNT(ua.id)                AS total_answers,
             COUNT(DISTINCT ua."userId") AS distinct_users,
             COALESCE(AVG(a.score), 0)   AS avg_score,
             COUNT(DISTINCT a.id)        AS sessions
      FROM "UserAnswer" ua
      JOIN "Question" q  ON ua."questionId" = q.id
      JOIN "SubTheme" st ON q."subThemeId"  = st.id
      JOIN "Theme"    th ON st."themeId"    = th.id
      LEFT JOIN "Attempt" a ON ua."attemptId" = a.id AND a."isCompleted" = true
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

  async getFreeTrialStats() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await this.prisma.freeTrialEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

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
        ? Math.round((sessions.reduce((sum, s) => sum + s.maxQ, 0) / totalSessions) * 10) / 10
        : 0;
      const maxQ = Math.max(...themeEvents.map((e) => e.questionN), 1);
      const completions = sessions.filter((s) => s.maxQ >= maxQ).length;

      const funnel = Array.from({ length: maxQ }, (_, i) => ({
        q: i + 1,
        count: sessions.filter((s) => s.maxQ >= i + 1).length,
      }));

      const totalAnswers = themeEvents.length;
      const correctAnswers = themeEvents.filter((e) => e.isCorrect).length;
      const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      // Répartition par source (par session unique)
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
        theme,
        totalSessions,
        avgQuestions,
        completionRate: totalSessions > 0 ? Math.round((completions / totalSessions) * 100) : 0,
        successRate,
        funnel,
        langSplit: {
          fr: new Set(themeEvents.filter((e) => e.lang === 'fr').map((e) => e.sessionId)).size,
          ar: new Set(themeEvents.filter((e) => e.lang === 'ar').map((e) => e.sessionId)).size,
        },
        sourceSplit,
      };
    });

    // Entonnoir global (tous thèmes)
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

    const leads = await this.prisma.freeTrialLead.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { phone: true, theme: true, lang: true, createdAt: true },
    });

    return { byTheme, globalFunnel, totalSessions: allBySession.size, period: '30 derniers jours', leads };
  }
}
