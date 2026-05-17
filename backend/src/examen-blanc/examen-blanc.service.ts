import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function computePartialScore(userAnswer: string, question: {
  correctAnswer: string; choiceA: string; choiceB: string;
  choiceC: string; choiceD: string; choiceE: string;
}): number {
  const correct = question.correctAnswer.toUpperCase().split(',').map(s => s.trim());
  const allOptions = ['A', 'B', 'C', 'D', 'E'].filter(o => question[`choice${o}` as keyof typeof question] !== '');
  const wrong = allOptions.filter(o => !correct.includes(o));
  const selected = userAnswer.toUpperCase().split(',').map(s => s.trim());
  const c = correct.length;
  const w = wrong.length;
  const correctSelected = selected.filter(o => correct.includes(o)).length;
  const wrongSelected = selected.filter(o => wrong.includes(o)).length;
  const raw = (c > 0 ? correctSelected / c : 0) - (w > 0 ? wrongSelected / w : 0);
  return Math.round(raw * 1000) / 1000;
}

const db = (prisma: PrismaService) => prisma as any;

@Injectable()
export class ExamenBlancService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSession() {
    const session = await db(this.prisma).examenBlanc.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const stats = {
      participants: 0,
      completed: 0,
      totalAllTime: await db(this.prisma).examenBlancParticipant.count({ where: { isCompleted: true } }),
    };

    if (session) {
      stats.participants = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: session.id } });
      stats.completed = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: session.id, isCompleted: true } });
    }

    return {
      session: session ? {
        id: session.id,
        title: session.title,
        descriptionFr: session.descriptionFr,
        descriptionAr: session.descriptionAr,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        resultsAt: session.resultsAt,
        totalQ: session.totalQ,
        durationMin: session.durationMin,
        isOpen: now >= new Date(session.startsAt) && now <= new Date(session.endsAt),
        isClosed: now > new Date(session.endsAt),
        isResultsReady: now >= new Date(session.resultsAt),
      } : null,
      stats,
    };
  }

  async register(dto: { nom: string; prenom: string; telephone: string; ville: string; examenBlancId: string; lang: string }) {
    const session = await db(this.prisma).examenBlanc.findUnique({ where: { id: dto.examenBlancId } });
    if (!session) throw new NotFoundException('Session introuvable');
    if (!session.isActive) throw new BadRequestException('Cette session est fermée');

    const now = new Date();
    if (now < new Date(session.startsAt)) throw new BadRequestException("L'examen n'est pas encore ouvert");
    if (now > new Date(session.endsAt)) throw new BadRequestException('Les inscriptions sont fermées');

    const lang = dto.lang === 'ar' ? 'ar' : 'fr';
    const allIds: string[] = lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;
    const questionIds = allIds.slice(0, session.totalQ);

    if (!questionIds?.length) throw new BadRequestException(`Aucune question disponible en ${lang.toUpperCase()}`);

    const sessionId = `eb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const participant = await db(this.prisma).examenBlancParticipant.create({
      data: {
        examenBlancId: dto.examenBlancId,
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
        telephone: dto.telephone.trim(),
        ville: dto.ville,
        lang,
        sessionId,
      },
    });

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, isActive: true },
      include: { subTheme: { include: { theme: true } } },
    });

    const ordered = questionIds
      .map((id: string) => questions.find((q: any) => q.id === id))
      .filter(Boolean);

    return {
      sessionId: participant.sessionId,
      participantId: participant.id,
      examenBlancId: session.id,
      durationMin: session.durationMin,
      totalQ: session.totalQ,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      resultsAt: session.resultsAt,
      startedAt: participant.createdAt,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville },
      questions: ordered.map((q: any, idx: number) => ({
        index: idx,
        id: q.id,
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        choiceE: q.choiceE,
        imageUrl: q.imageUrl || null,
        isMultiple: q.correctAnswer.split(',').length > 1,
        subTheme: q.subTheme?.name || null,
        theme: q.subTheme?.theme?.name || null,
      })),
    };
  }

  async getSession(sessionId: string) {
    const participant = await db(this.prisma).examenBlancParticipant.findUnique({
      where: { sessionId },
      include: {
        examenBlanc: true,
        reponses: { select: { questionId: true, reponse: true } },
      },
    });
    if (!participant) throw new NotFoundException('Session introuvable');

    const session = participant.examenBlanc;
    const questionIds: string[] = participant.lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, isActive: true },
      include: { subTheme: { include: { theme: true } } },
    });

    const answersMap: Record<string, string> = {};
    participant.reponses.forEach((r: any) => { answersMap[r.questionId] = r.reponse; });

    const ordered = (questionIds as string[])
      .map((id: string) => questions.find((q: any) => q.id === id))
      .filter(Boolean);

    return {
      sessionId: participant.sessionId,
      participantId: participant.id,
      examenBlancId: session.id,
      isCompleted: participant.isCompleted,
      durationMin: session.durationMin,
      totalQ: session.totalQ,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      resultsAt: session.resultsAt,
      startedAt: participant.createdAt,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville },
      questions: ordered.map((q: any, idx: number) => ({
        index: idx,
        id: q.id,
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        choiceE: q.choiceE,
        imageUrl: q.imageUrl || null,
        isMultiple: q.correctAnswer.split(',').length > 1,
        subTheme: q.subTheme?.name || null,
        theme: q.subTheme?.theme?.name || null,
        savedAnswer: answersMap[q.id] || null,
      })),
    };
  }

  async submitAnswer(sessionId: string, dto: { questionId: string; reponse: string; tempsReponse?: number }) {
    const participant = await db(this.prisma).examenBlancParticipant.findUnique({
      where: { sessionId },
      include: { examenBlanc: true },
    });
    if (!participant) throw new NotFoundException('Session introuvable');
    if (participant.isCompleted) throw new BadRequestException('Examen déjà terminé');

    const session = participant.examenBlanc;
    const elapsed = (Date.now() - new Date(participant.createdAt).getTime()) / 1000;
    if (elapsed > session.durationMin * 60 + 60) throw new BadRequestException('Temps écoulé');

    const questionIds: string[] = (participant.lang === 'ar' ? session.questionIdsAr : session.questionIdsFr).slice(0, session.totalQ);
    if (!questionIds.includes(dto.questionId))
      throw new BadRequestException('Question invalide');

    const question = await this.prisma.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException('Question introuvable');

    const normalize = (s: string) => s.toUpperCase().split(',').map(x => x.trim()).sort().join(',');
    const isCorrect = normalize(dto.reponse) === normalize(question.correctAnswer);
    const partialScore = computePartialScore(dto.reponse, question);

    await db(this.prisma).examenBlancReponse.upsert({
      where: { participantId_questionId: { participantId: participant.id, questionId: dto.questionId } },
      create: { participantId: participant.id, questionId: dto.questionId, reponse: dto.reponse.toUpperCase(), isCorrect, partialScore, tempsReponse: dto.tempsReponse },
      update: { reponse: dto.reponse.toUpperCase(), isCorrect, partialScore, answeredAt: new Date() },
    });

    return { saved: true };
  }

  async finish(sessionId: string, tabSwitches: number = 0) {
    const participant = await db(this.prisma).examenBlancParticipant.findUnique({
      where: { sessionId },
      include: { examenBlanc: true, reponses: true },
    });
    if (!participant) throw new NotFoundException('Session introuvable');
    if (participant.isCompleted) return { alreadyCompleted: true, resultsAt: participant.examenBlanc.resultsAt };

    const session = participant.examenBlanc;
    const rawScore = participant.reponses.reduce((sum: number, r: any) => sum + r.partialScore, 0);
    const score = session.totalQ > 0 ? Math.round((rawScore / session.totalQ) * 1000) / 10 : 0;
    const elapsed = Math.floor((Date.now() - new Date(participant.createdAt).getTime()) / 1000);
    const timeTaken = Math.min(elapsed, session.durationMin * 60);

    await db(this.prisma).examenBlancParticipant.update({
      where: { id: participant.id },
      data: { score, rawScore, timeTaken, isCompleted: true, tricherie: tabSwitches >= 5, tabSwitches, submittedAt: new Date() },
    });

    return { completed: true, resultsAt: session.resultsAt };
  }

  async getResults(sessionId: string) {
    const participant = await db(this.prisma).examenBlancParticipant.findUnique({
      where: { sessionId },
      include: { examenBlanc: true, reponses: true },
    });
    if (!participant) throw new NotFoundException('Session introuvable');
    if (!participant.isCompleted) throw new BadRequestException('Examen non terminé');

    const now = new Date();
    const resultsAt = new Date(participant.examenBlanc.resultsAt);
    if (now < resultsAt) return {
      locked: true,
      resultsAt: participant.examenBlanc.resultsAt,
      score: participant.score,
      rawScore: participant.rawScore,
      totalQ: participant.examenBlanc.totalQ,
      answeredQ: participant.reponses.length,
      correctQ: participant.reponses.filter((r: any) => r.isCorrect).length,
      timeTaken: participant.timeTaken,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville },
    };

    const session = participant.examenBlanc;
    const lang = participant.lang || 'fr';
    const allCompleted = await db(this.prisma).examenBlancParticipant.findMany({
      where: { examenBlancId: participant.examenBlancId, isCompleted: true, lang },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
      select: { id: true, score: true },
    });

    const classement = allCompleted.findIndex((p: any) => p.id === participant.id) + 1;
    const total = allCompleted.length;
    const allScores = allCompleted.map((p: any) => p.score ?? 0);

    const questionIds: string[] = lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { subTheme: { include: { theme: true } } },
    });

    const answersMap: Record<string, any> = {};
    participant.reponses.forEach((r: any) => { answersMap[r.questionId] = r; });

    const themeStats: Record<string, { name: string; correct: number; total: number }> = {};
    const questionDetails = (questionIds as string[]).map((id: string) => {
      const q = questions.find((q: any) => q.id === id);
      const answer = answersMap[id];
      if (!q) return null;
      const theme = (q as any).subTheme?.theme?.name || 'Autre';
      if (!themeStats[theme]) themeStats[theme] = { name: theme, correct: 0, total: 0 };
      themeStats[theme].total++;
      if (answer?.isCorrect) themeStats[theme].correct++;
      return {
        id: q.id, text: q.text, choiceA: q.choiceA, choiceB: q.choiceB, choiceC: q.choiceC,
        choiceD: q.choiceD, choiceE: q.choiceE, correctAnswer: q.correctAnswer,
        explanation: q.explanation, imageUrl: q.imageUrl,
        theme, subTheme: (q as any).subTheme?.name,
        userAnswer: answer?.reponse || null,
        isCorrect: answer?.isCorrect ?? false,
        partialScore: answer?.partialScore ?? 0,
      };
    }).filter(Boolean);

    const histogram = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: allScores.filter((s: number) => s >= i * 10 && (i === 9 ? s <= (i + 1) * 10 : s < (i + 1) * 10)).length,
    }));

    return {
      locked: false,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville },
      score: participant.score,
      rawScore: participant.rawScore,
      classement,
      totalParticipants: total,
      percentile: total > 1 ? Math.round(((total - classement) / (total - 1)) * 100) : 100,
      timeTaken: participant.timeTaken,
      correctQ: participant.reponses.filter((r: any) => r.isCorrect).length,
      totalQ: session.totalQ,
      answeredQ: participant.reponses.length,
      themeStats: Object.values(themeStats).map(ts => ({
        ...ts,
        pct: ts.total > 0 ? Math.round((ts.correct / ts.total) * 100) : 0,
      })),
      histogram,
      questions: questionDetails,
    };
  }

  async getLeaderboard(examenBlancId?: string) {
    let sessionId = examenBlancId;
    if (!sessionId) {
      const last = await db(this.prisma).examenBlanc.findFirst({
        where: { isActive: false },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      sessionId = last?.id;
    }
    if (!sessionId) {
      const active = await db(this.prisma).examenBlanc.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true, resultsAt: true, title: true } });
      if (!active) return { participants: [], total: 0 };
      sessionId = active.id;
    }

    const session = await db(this.prisma).examenBlanc.findUnique({
      where: { id: sessionId }, select: { resultsAt: true, title: true },
    });
    if (!session) return { participants: [], total: 0 };
    if (new Date() < new Date(session.resultsAt)) return { locked: true, resultsAt: session.resultsAt, participants: [] };

    const participants = await db(this.prisma).examenBlancParticipant.findMany({
      where: { examenBlancId: sessionId, isCompleted: true },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
      take: 100,
      select: { id: true, nom: true, prenom: true, ville: true, score: true, timeTaken: true },
    });

    const total = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: sessionId, isCompleted: true } });

    const cityBreakdown = await db(this.prisma).examenBlancParticipant.groupBy({
      by: ['ville'], where: { examenBlancId: sessionId, isCompleted: true },
      _count: { id: true }, orderBy: { _count: { id: 'desc' } },
    });

    return {
      locked: false,
      sessionTitle: session.title,
      participants: participants.map((p: any, i: number) => ({
        rank: i + 1,
        nom: `${p.prenom} ${p.nom.charAt(0)}.`,
        ville: p.ville,
        score: p.score,
        timeTaken: p.timeTaken,
      })),
      total,
      cityBreakdown: cityBreakdown.map((c: any) => ({ ville: c.ville, count: c._count.id })),
    };
  }

  async recoverSession(telephone: string) {
    const participant = await db(this.prisma).examenBlancParticipant.findFirst({
      where: { telephone: telephone.trim() },
      orderBy: { createdAt: 'desc' },
      include: { examenBlanc: true },
    });
    if (!participant) throw new NotFoundException('Aucun participant trouvé avec ce numéro');

    const session = participant.examenBlanc;
    const questionIds: string[] = participant.lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;

    const [questions, reponses] = await Promise.all([
      this.prisma.question.findMany({
        where: { id: { in: questionIds }, isActive: true },
        include: { subTheme: { include: { theme: true } } },
      }),
      db(this.prisma).examenBlancReponse.findMany({ where: { participantId: participant.id } }),
    ]);

    const answers: Record<string, string> = {};
    reponses.forEach((r: any) => { answers[r.questionId] = r.reponse; });

    const ordered = questionIds
      .map((id: string) => questions.find((q: any) => q.id === id))
      .filter(Boolean);

    return {
      sessionId: participant.sessionId,
      participantId: participant.id,
      examenBlancId: session.id,
      durationMin: session.durationMin,
      totalQ: session.totalQ,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      resultsAt: session.resultsAt,
      startedAt: participant.createdAt,
      isCompleted: participant.isCompleted,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville },
      questions: ordered.map((q: any, idx: number) => ({
        index: idx, id: q.id, text: q.text,
        choiceA: q.choiceA, choiceB: q.choiceB, choiceC: q.choiceC, choiceD: q.choiceD, choiceE: q.choiceE,
        imageUrl: q.imageUrl || null,
        isMultiple: q.correctAnswer.split(',').length > 1,
        subTheme: q.subTheme?.name || null,
        theme: q.subTheme?.theme?.name || null,
        savedAnswer: answers[q.id] || null,
      })),
      answers,
    };
  }

  async generateQuestions(totalQ = 80, lang: 'FR' | 'AR' = 'FR'): Promise<string[]> {
    const subThemes = await this.prisma.subTheme.findMany({
      where: { theme: { language: lang } },
      include: {
        questions: {
          where: { isActive: true, explanation: { not: '' } },
          select: { id: true },
        },
      },
    });

    const available = subThemes.filter(st => st.questions.length > 0);
    const selected: string[] = [];
    const pool: string[] = [];

    for (const st of available) {
      const shuffled = [...st.questions].sort(() => Math.random() - 0.5);
      selected.push(shuffled[0].id);
      if (shuffled.length > 1) pool.push(...shuffled.slice(1).map(q => q.id));
    }

    const needed = totalQ - selected.length;
    if (needed > 0 && pool.length > 0) {
      const shuffledPool = pool.sort(() => Math.random() - 0.5);
      selected.push(...shuffledPool.slice(0, Math.min(needed, shuffledPool.length)));
    }

    return selected.sort(() => Math.random() - 0.5).slice(0, totalQ);
  }

  async createSession(dto: {
    title?: string; descriptionFr?: string; descriptionAr?: string;
    startsAt: string; endsAt: string; resultsAt?: string;
    totalQ?: number; durationMin?: number;
  }) {
    const totalQ = dto.totalQ ?? 80;
    const [questionIdsFr, questionIdsAr] = await Promise.all([
      this.generateQuestions(totalQ, 'FR'),
      this.generateQuestions(totalQ, 'AR'),
    ]);
    const endsAt = new Date(dto.endsAt);
    const resultsAt = dto.resultsAt ? new Date(dto.resultsAt) : new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);

    return db(this.prisma).examenBlanc.create({
      data: {
        title: dto.title || 'Examen Blanc National',
        descriptionFr: dto.descriptionFr,
        descriptionAr: dto.descriptionAr,
        startsAt: new Date(dto.startsAt),
        endsAt,
        resultsAt,
        questionIdsFr,
        questionIdsAr,
        totalQ,
        durationMin: dto.durationMin ?? 120,
        isActive: true,
      },
    });
  }

  async getSessions() {
    const sessions = await db(this.prisma).examenBlanc.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: true } } },
    });
    return sessions.map((s: any) => ({ ...s, participantCount: s._count.participants }));
  }

  async getSessionStats(id: string, lang?: 'fr' | 'ar') {
    const session = await db(this.prisma).examenBlanc.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session introuvable');

    const where: any = { examenBlancId: id };
    if (lang) where.lang = lang;

    const allParticipants = await db(this.prisma).examenBlancParticipant.findMany({
      where,
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
    });

    const completed = allParticipants.filter((p: any) => p.isCompleted);
    const scores = completed.map((p: any) => p.score ?? 0);
    const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

    const cityBreakdown = await db(this.prisma).examenBlancParticipant.groupBy({
      by: ['ville'], where,
      _count: { id: true }, orderBy: { _count: { id: 'desc' } },
    });

    const histogram = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: scores.filter((s: number) => s >= i * 10 && (i === 9 ? s <= (i + 1) * 10 : s < (i + 1) * 10)).length,
    }));

    // Always provide per-lang totals for context
    const totalFr = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: id, lang: 'fr' } });
    const totalAr = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: id, lang: 'ar' } });

    return {
      session,
      lang: lang ?? 'all',
      langCounts: { fr: totalFr, ar: totalAr },
      stats: {
        total: allParticipants.length,
        completed: completed.length,
        completionRate: allParticipants.length ? Math.round((completed.length / allParticipants.length) * 100) : 0,
        avgScore: Math.round(avgScore * 10) / 10,
        maxScore: scores.length ? Math.max(...scores) : 0,
        passRate: scores.length ? Math.round(scores.filter((s: number) => s >= 50).length / scores.length * 100) : 0,
        tricherieCount: completed.filter((p: any) => p.tricherie).length,
      },
      cityBreakdown: cityBreakdown.map((c: any) => ({ ville: c.ville, count: c._count.id })),
      histogram,
      topParticipants: completed.slice(0, 20).map((p: any, i: number) => ({ rank: i + 1, ...p })),
    };
  }

  async updateSession(id: string, dto: { title?: string; descriptionFr?: string; descriptionAr?: string; startsAt?: string; endsAt?: string; resultsAt?: string; isActive?: boolean; durationMin?: number; totalQ?: number }) {
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.descriptionFr !== undefined) data.descriptionFr = dto.descriptionFr;
    if (dto.descriptionAr !== undefined) data.descriptionAr = dto.descriptionAr;
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    if (dto.resultsAt) data.resultsAt = new Date(dto.resultsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.totalQ !== undefined) data.totalQ = dto.totalQ;
    return db(this.prisma).examenBlanc.update({ where: { id }, data });
  }

  async getAllParticipants() {
    return db(this.prisma).examenBlancParticipant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nom: true, prenom: true, telephone: true, ville: true,
        lang: true, score: true, isCompleted: true, tricherie: true, submittedAt: true, createdAt: true,
        examenBlanc: { select: { title: true, id: true } },
      },
    });
  }
}
