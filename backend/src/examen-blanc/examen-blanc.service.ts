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

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function normalizePhone(phone: string): string {
  // Convertir chiffres arabes-indiens (٠-٩) en ASCII
  let p = (phone ?? '').replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)));
  // Supprimer tout sauf les chiffres (retire +, espaces, tirets, caractères RTL, etc.)
  p = p.replace(/\D/g, '');
  // Retirer les préfixes internationaux mauritaniens
  if (p.startsWith('00222')) p = p.slice(5);
  else if (p.startsWith('0222')) p = p.slice(4);
  else if (p.startsWith('222')) p = p.slice(3);
  // Retirer le 0 local si 9 chiffres (ex: 044259204)
  if (p.length === 9 && p.startsWith('0')) p = p.slice(1);
  // Si encore trop long (ex: 2233690460 mal saisi), prendre les 8 derniers chiffres
  if (p.length > 8) p = p.slice(-8);
  return p; // 8 chiffres locaux
}

@Injectable()
export class ExamenBlancService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSession(target = 'INFIRMIER') {
    const session = await db(this.prisma).examenBlanc.findFirst({
      where: { isActive: true, target },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const stats = {
      participants: 0,
      completed: 0,
      totalAllTime: await db(this.prisma).examenBlancParticipant.count({ where: { isCompleted: true, isTest: false } }),
    };

    if (session) {
      stats.participants = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: session.id, isTest: false } });
      stats.completed = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: session.id, isCompleted: true, isTest: false } });
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
        requiresAccount: session.requiresAccount ?? false,
      } : null,
      stats,
    };
  }

  async adminTestSession(examenBlancId: string, lang: 'fr' | 'ar' = 'fr') {
    const session = await db(this.prisma).examenBlanc.findUnique({ where: { id: examenBlancId } });
    if (!session) throw new NotFoundException('Session introuvable');

    const allIds: string[] = lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;
    const questionIds = allIds.slice(0, session.totalQ);
    if (!questionIds?.length) throw new BadRequestException(`Aucune question disponible en ${lang.toUpperCase()}`);

    const sessionId = `eb_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await db(this.prisma).examenBlancParticipant.create({
      data: {
        examenBlancId,
        nom: 'Admin',
        prenom: 'Test',
        telephone: '00000000',
        ville: 'Test',
        lang,
        sessionId,
        isTest: true,
      },
    });

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, isActive: true },
      select: { id: true, text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, imageUrl: true, correctAnswer: true, subTheme: { select: { name: true, theme: { select: { name: true } } } } },
    });

    const ordered = questionIds
      .map((id: string) => questions.find((q: any) => q.id === id))
      .filter(Boolean);

    return {
      sessionId,
      examenBlancId: session.id,
      isTest: true,
      durationMin: session.durationMin,
      totalQ: session.totalQ,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      resultsAt: session.resultsAt,
      startedAt: new Date(),
      participant: { nom: 'Admin', prenom: 'Test', ville: 'Test' },
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

  async setContacted(id: string, contacted: boolean) {
    return this.prisma.examenBlancParticipant.update({
      where: { id },
      data: { contacted },
      select: { id: true, contacted: true },
    });
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
      select: { id: true, text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, imageUrl: true, correctAnswer: true, subTheme: { select: { name: true, theme: { select: { name: true } } } } },
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
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville, telephone: participant.telephone },
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

  async registerFromAccount(userId: string, dto: { examenBlancId: string; lang: string; telephone?: string }) {
    const user = await db(this.prisma).user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const parts = (user.fullName || '').trim().split(' ');
    const prenom = parts[0] || user.fullName;
    const nom = parts.slice(1).join(' ') || prenom;

    return this.register({
      nom,
      prenom,
      telephone: dto.telephone || user.phone || '',
      ville: user.wilaya || '',
      examenBlancId: dto.examenBlancId,
      lang: dto.lang,
    });
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
      select: { id: true, text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, imageUrl: true, correctAnswer: true, subTheme: { select: { name: true, theme: { select: { name: true } } } } },
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
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville, telephone: participant.telephone },
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
    // Session test supprimée de la DB — laisser passer gracieusement
    if (!participant && sessionId.startsWith('eb_test_')) {
      return { completed: true, isTest: true, resultsAt: new Date(0) };
    }
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
    if (!participant && sessionId.startsWith('eb_test_')) {
      return { isTestExpired: true };
    }
    if (!participant) throw new NotFoundException('Session introuvable');
    if (!participant.isCompleted) throw new BadRequestException('Examen non terminé');

    const now = new Date();
    const resultsAt = new Date(participant.examenBlanc.resultsAt);
    if (now < resultsAt && !participant.isTest) return {
      locked: true,
      resultsAt: participant.examenBlanc.resultsAt,
      score: participant.score,
      rawScore: participant.rawScore,
      totalQ: participant.examenBlanc.totalQ,
      answeredQ: participant.reponses.length,
      correctQ: participant.reponses.filter((r: any) => r.isCorrect).length,
      timeTaken: participant.timeTaken,
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville, telephone: participant.telephone },
    };

    // Marquer comme vu si pas encore fait
    if (!participant.resultsViewedAt) {
      await db(this.prisma).examenBlancParticipant.update({
        where: { id: participant.id },
        data: { resultsViewedAt: new Date() },
      });
    }

    const session = participant.examenBlanc;
    const lang = participant.lang || 'fr';
    const [allCompleted, totalRegistered] = await Promise.all([
      db(this.prisma).examenBlancParticipant.findMany({
        where: { examenBlancId: participant.examenBlancId, isCompleted: true, isTest: false },
        orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
        select: { id: true, score: true },
      }),
      db(this.prisma).examenBlancParticipant.count({
        where: { examenBlancId: participant.examenBlancId, isTest: false },
      }),
    ]);

    const classement = allCompleted.findIndex((p: any) => p.id === participant.id) + 1;
    const total = totalRegistered;
    const allScores = allCompleted.map((p: any) => p.score ?? 0);

    const questionIds: string[] = lang === 'ar' ? session.questionIdsAr : session.questionIdsFr;
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, imageUrl: true, correctAnswer: true, explanation: true, subTheme: { select: { name: true, theme: { select: { name: true } } } } },
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
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville, telephone: participant.telephone },
      score: participant.score,
      rawScore: participant.rawScore,
      classement,
      totalParticipants: total,
      completedParticipants: allCompleted.length,
      percentile: allCompleted.length > 1 ? Math.round(((allCompleted.length - classement) / (allCompleted.length - 1)) * 100) : 100,
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
      where: { examenBlancId: sessionId, isCompleted: true, isTest: false },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
      take: 100,
      select: { id: true, nom: true, prenom: true, ville: true, score: true, timeTaken: true },
    });

    const total = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: sessionId, isCompleted: true, isTest: false } });

    const cityBreakdown = await db(this.prisma).examenBlancParticipant.groupBy({
      by: ['ville'], where: { examenBlancId: sessionId, isCompleted: true, isTest: false },
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

  async getMySessions(participantId: string) {
    const me = await db(this.prisma).examenBlancParticipant.findUnique({
      where: { id: participantId },
      select: { telephone: true },
    });
    if (!me) return [];

    const all = await db(this.prisma).examenBlancParticipant.findMany({
      where: { telephone: me.telephone, isCompleted: true, isTest: false },
      include: { examenBlanc: { select: { id: true, title: true, target: true, endsAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const results = [];
    for (const p of all) {
      const above = await db(this.prisma).examenBlancParticipant.count({
        where: {
          examenBlancId: p.examenBlancId,
          isCompleted: true,
          isTest: false,
          OR: [
            { score: { gt: p.score } },
            { score: p.score, timeTaken: { lt: p.timeTaken } },
          ],
        },
      });
      const total = await db(this.prisma).examenBlancParticipant.count({
        where: { examenBlancId: p.examenBlancId, isCompleted: true, isTest: false },
      });
      results.push({
        sessionId: p.sessionId,
        title: p.examenBlanc?.title,
        target: p.examenBlanc?.target,
        score: p.score,
        rank: above + 1,
        total,
        date: p.examenBlanc?.endsAt,
      });
    }
    return results;
  }

  async recoverSession(telephone: string) {
    const participant = await db(this.prisma).examenBlancParticipant.findFirst({
      where: { telephone: telephone.trim() },
      orderBy: [{ isCompleted: 'desc' }, { createdAt: 'desc' }],
      include: { examenBlanc: true },
    });
    if (!participant) throw new NotFoundException('Aucun participant trouvé avec ce numéro');

    // Réinitialiser le timer si l'examen n'est pas encore commencé/terminé
    if (!participant.isCompleted) {
      await db(this.prisma).examenBlancParticipant.update({
        where: { id: participant.id },
        data: { createdAt: new Date() },
      });
      participant.createdAt = new Date();
    }

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
      participant: { nom: participant.nom, prenom: participant.prenom, ville: participant.ville, telephone: participant.telephone },
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

  async getFichesPreview(target: string, lang: string) {
    const fiches = await db(this.prisma).ficheMemo.findMany({
      where: {
        isVisible: true,
        target: target?.toUpperCase() || 'INFIRMIER',
        lang: lang?.toUpperCase() || 'FR',
      },
      select: { id: true, title: true, fileUrl: true },
      orderBy: { createdAt: 'asc' },
    });
    return fiches;
  }

  async logFicheDownload(dto: { ficheTitle: string; participantId?: string; prenom?: string; nom?: string; telephone?: string; ville?: string; target?: string; lang?: string; sessionTitle?: string }) {
    await db(this.prisma).ebFicheDownload.create({ data: dto });
    return { ok: true };
  }

  async getFicheDownloads() {
    const rows = await db(this.prisma).ebFicheDownload.findMany({
      orderBy: { downloadedAt: 'desc' },
      take: 2000,
    });

    // Enrichir les anciens enregistrements sans téléphone via ExamenBlancParticipant
    const missing = rows.filter((r: any) => !r.telephone && (r.prenom || r.nom));
    if (missing.length > 0) {
      const names = missing.map((r: any) => ({ prenom: r.prenom, nom: r.nom }));
      const participants = await db(this.prisma).examenBlancParticipant.findMany({
        where: {
          OR: names.map((n: any) => ({ prenom: n.prenom, nom: n.nom })),
          isTest: false,
        },
        select: { prenom: true, nom: true, telephone: true, ville: true },
        distinct: ['prenom', 'nom', 'telephone'],
      });
      const phoneMap = new Map<string, string>();
      for (const p of participants) {
        const key = `${p.prenom}:${p.nom}`;
        if (!phoneMap.has(key) && p.telephone) phoneMap.set(key, p.telephone);
      }
      for (const r of rows as any[]) {
        if (!r.telephone && (r.prenom || r.nom)) {
          r.telephone = phoneMap.get(`${r.prenom}:${r.nom}`) || null;
        }
      }
    }

    // Déduplique : une seule entrée par (participantId|telephone + ficheTitle)
    const seen = new Set<string>();
    return rows.filter((r: any) => {
      const key = `${r.participantId || r.telephone || r.prenom}:${r.ficheTitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async generateQuestions(totalQ = 80, lang: 'FR' | 'AR' = 'FR', target = 'INFIRMIER'): Promise<string[]> {
    // Sessions précédentes du plus ancien au plus récent (même target)
    const previousSessions = await db(this.prisma).examenBlanc.findMany({
      where: { target },
      orderBy: { createdAt: 'asc' },
      select: { questionIdsFr: true, questionIdsAr: true },
    });

    const usedAge = new Map<string, number>();
    previousSessions.forEach((s: any, idx: number) => {
      const ids: string[] = lang === 'FR' ? s.questionIdsFr : s.questionIdsAr;
      ids.forEach(id => usedAge.set(id, idx));
    });

    const freshness = (id: string): number => usedAge.has(id) ? usedAge.get(id)! : Infinity;
    const byFreshness = (a: string, b: string) => {
      const fa = freshness(a), fb = freshness(b);
      if (fa === fb) return Math.random() - 0.5;
      if (fa === Infinity) return -1;
      if (fb === Infinity) return 1;
      return fa - fb;
    };

    const allSubThemes = await this.prisma.subTheme.findMany({
      where: { theme: { language: lang, target } },
      include: {
        theme: { select: { name: true } },
        questions: {
          where: { isActive: true, explanation: { not: '' } },
          select: { id: true },
        },
      },
    });

    const available = allSubThemes.filter((st: any) => st.questions.length > 0);

    // Pour SAGE_FEMME : quotas fixes par sous-thème (nouvelle distribution)
    if (target === 'SAGE_FEMME') {
      const pick = (matcher: (subName: string, themeName: string) => boolean, n: number): string[] => {
        const pool: string[] = [];
        for (const st of available) {
          const s = st.name.toLowerCase();
          const t = (st.theme?.name ?? '').toLowerCase();
          if (matcher(s, t)) pool.push(...st.questions.map((q: any) => q.id));
        }
        pool.sort(byFreshness);
        return pool.slice(0, n);
      };

      const sfSelected = [
        // CAS CLINIQUE (حالة سريرية) — 29 Q
        ...pick((_s, t) => t.includes('cas clinique') || t.includes('حالة سريرية'), 29),
        // IST (الأمراض المنقولة جنسياً) — 4 Q
        ...pick((s) => /infections? sexuellement|IST\b|الأمراض المنقولة جنسياً/i.test(s), 4),
        // Leucorrhées (الإفرازات المهبلية) — 3 Q
        ...pick((s) => /leucorrh|الإفرازات المهبلية/i.test(s), 3),
        // Soins néonataux (رعاية حديثي الولادة) — 3 Q
        ...pick((_s, t) => /soins.n[ée]onataux|n[ée]onataux|رعاية حديثي الولادة/i.test(t + ' ' + _s), 3),
        // Grossesse gémellaire (الحمل المتعدد) — 3 Q
        ...pick((s) => /grossesse g[ée]mellaire|الحمل المتعدد/i.test(s), 3),
        // Placenta (المشيمة) — 2 Q
        ...pick((s) => /placenta|المشيمة/i.test(s), 2),
        // Liquide amniotique (السائل الأمنيوسي) — 2 Q
        ...pick((s) => /liquide amniotique|السائل الأمنيوسي/i.test(s), 2),
        // Hémorragie grossesse (النزيف والحمل) — 2 Q
        ...pick((s) => /h[ée]morragie.*grossesse|النزيف والحمل/i.test(s), 2),
        // Fièvre grossesse (الحمى أثناء الحمل) — 2 Q
        ...pick((s) => /fi[èe]vre.*grossesse|الحمى أثناء الحمل/i.test(s), 2),
        // Hypertension (ارتفاع ضغط الدم) — 2 Q
        ...pick((s) => /hypertension.*grossesse|ارتفاع ضغط الدم والحمل/i.test(s), 2),
        // RPM (تمزق الأغشية) — 2 Q
        ...pick((s) => /rupture pr[ée]matur[ée]|RPM|تمزق الأغشية/i.test(s), 2),
        // Accouchement (فصل الولادة) — 2 Q
        ...pick((s) => /l.?accouchement|فصل الولادة/i.test(s), 2),
        // Dystocie (عسر الولادة) — 2 Q
        ...pick((s) => /dystocie|عسر الولادة/i.test(s), 2),
      ];

      // Dédoublonner
      const seen = new Set<string>();
      const deduped = sfSelected.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });

      return deduped.sort(() => Math.random() - 0.5).slice(0, totalQ);
    }

    // BIOLOGISTE : questions fixes + sous-thèmes ciblés
    if (target === 'BIOLOGISTE') {
      // Quotas fixes par sous-thème — total = 60 questions
      const BIO_QUOTAS: Record<string, number> = {
        // Hématologie — 9Q
        'QUALIFICATION BIOLOGIQUE DU DON':                                    5,
        'HÉMOSTASE ET COAGULATION':                                           4,
        // Biochimie — 10Q (1Q par sous-thème)
        'ANALYSES QUALITATIVES DES URINES':                                   1,
        'BILAN HÉPATIQUE ET BILIRUBINE':                                      1,
        'BILAN LIPIDIQUE (CHOLESTÉROL ET TRIGLYCÉRIDES)':                     1,
        'CALCULS ET UNITÉS (SYSTÈME INTERNATIONAL)':                          1,
        'ENZYMOLOGIE CLINIQUE':                                               1,
        'FONCTION RÉNALE (URÉE, CRÉATININE, ACIDE URIQUE)':                  1,
        'GÉNÉRALITÉS ET CONDITIONS DE PRÉLÈVEMENT':                           1,
        'MÉTABOLISME DES GLUCIDES (GLUCOSE)':                                 1,
        'PROTÉINES ET ALBUMINE':                                              1,
        'ÉLECTROLYTES ET ÉLÉMENTS MINÉRAUX':                                  1,
        // Immunologie / Sérologie — 2Q
        'GROUPES SANGUINS ET TRANSFUSION (SÉROLOGIE ÉRYTHROCYTAIRE)':        1,
        'TESTS SÉROLOGIQUES (AGGLUTINATION ET PRÉCIPITATION)':                1,
        // Bactériologie — 10Q
        'HÉMOCULTURE ET SÉROLOGIE':                                           3,
        'EXAMEN CYTO-BACTÉRIOLOGIQUE DES URINES (ECBU) ET DU LCR':          4,
        'COPROCULTURE ET PATHOGÈNES ÉPIDÉMIQUES':                             3,
        // Parasitologie — 8Q
        'GÉNÉRALITÉS':                                                        4,
        'PARASITES DU SANG, DE LA PEAU ET DES URINES':                       4,
        // Procédures générales — 3Q
        'MESURE ET DISTRIBUTION DES LIQUIDES':                                1,
        'CENTRIFUGATION':                                                     1,
        'UTILISATION DU MICROSCOPE':                                          1,
        // Biologie moléculaire — 7Q
        'STRUCTURES ET PROPRIÉTÉS DES ACIDES NUCLÉIQUES':                    2,
        'LA RÉPLICATION DE L\'ADN':                                           2,
        'TRANSCRIPTION':                                                      1,
        'MATURATION DES ARN':                                                 1,
        'LA TRADUCTION':                                                      1,
        // Techniques de biologie moléculaire — 8Q
        'ÉLECTROPHORÈSE':                                                     2,
        'PCR':                                                                3,
        'EXTRACTION ET PURIFICATION DES ACIDES NUCLÉIQUES':                  3,
        // Virologie — 3Q
        'TECHNIQUES DE DÉTECTION DIRECTE ET MOLÉCULAIRE':                    3,
      };
      const bioAvailable = available.filter((st: any) => BIO_QUOTAS[st.name.toUpperCase()] !== undefined);
      const selected: string[] = [];
      for (const st of bioAvailable) {
        const nameUp = (st as any).name.toUpperCase();
        const quota = BIO_QUOTAS[nameUp];
        const allIds: string[] = (st as any).questions.map((q: any) => q.id);
        const poolIds = allIds.sort(byFreshness);
        selected.push(...poolIds.slice(0, quota));
      }
      return selected.sort(() => Math.random() - 0.5).slice(0, totalQ);
    }

    // INFIRMIER : quotas fixes par sous-thème
    if (target === 'INFIRMIER') {
      const pick = (matcher: (subName: string, themeName: string) => boolean, n: number): string[] => {
        const pool: string[] = [];
        for (const st of available) {
          const s = st.name.toLowerCase();
          const t = ((st as any).theme?.name ?? '').toLowerCase();
          if (matcher(s, t)) pool.push(...(st as any).questions.map((q: any) => q.id));
        }
        pool.sort(byFreshness);
        return pool.slice(0, n);
      };

      const infSelected = lang === 'AR' ? [
        // CAS CLINIQUE AR (حالة سريرية) — 26 Q
        ...pick((_s, t) => t.includes('حالة سريرية'), 26),
        // Diphtérie AR (الدفتيريا) — 2 Q
        ...pick((s) => s.includes('الدفتيريا'), 2),
        // Paludisme AR (الملاريا) — 2 Q
        ...pick((s) => s.includes('الملاريا'), 2),
        // IST / VIH / Syphilis AR (الأمراض المنقولة جنسياً) — 3 Q
        ...pick((s) => s.includes('المنقولة جنسياً') || s.includes('المنقولة جنسيا'), 3),
        // Sonde urinaire AR (قسطرة المسالك البولية) — 3 Q
        ...pick((s) => s.includes('قسطرة المسالك البولية'), 3),
        // Diabète AR (السكري) — 2 Q (pas l'insuline)
        ...pick((s) => /^السكري/.test(s), 2),
        // Fracture AR (الكسور) — 1 Q
        ...pick((s) => s.includes('الكسور'), 1),
        // Transfusion AR (نقل الدم) — 3 Q
        ...pick((s) => s.includes('نقل الدم'), 3),
        // Tuberculose AR (السل) — 2 Q
        ...pick((s) => s.includes('السل'), 2),
        // Pharmacologie AR (الدوائية والعلاج) — 4 Q
        ...pick((_s, t) => t.includes('الدوائية'), 4),
        // Pédiatrie AR (طب الأطفال) — 2 Q
        ...pick((_s, t) => t.includes('طب الأطفال'), 2),
        // Sémiologie digestif AR (سيميولوجيا الجهاز الهضمي) — 3 Q
        ...pick((s) => s.includes('سيميولوجيا الجهاز الهضمي'), 3),
        // Sonde nasogastrique AR (الأنابيب الأنفية) — 2 Q
        ...pick((s) => s.includes('الأنابيب الأنفية'), 2),
        // HTA AR (ارتفاع ضغط الدم — cardiologie uniquement) — 2 Q
        ...pick((s, t) => t.includes('طب القلب') && s.includes('ارتفاع ضغط الدم'), 2),
        // Infection des parties molles AR (عدوى الأنسجة الرخوة) — 3 Q
        ...pick((s) => s.includes('عدوى الأنسجة الرخوة'), 3),
      ] : [
        // CAS CLINIQUE FR — 26 Q
        ...pick((_s, t) => t === 'cas clinique', 26),
        // Diphtérie FR — 2 Q
        ...pick((s) => /diphterie/i.test(s), 2),
        // Paludisme FR — 2 Q
        ...pick((s) => /paludisme/i.test(s), 2),
        // IST / VIH / Syphilis FR (infections sexuellement transmissibles) — 3 Q
        ...pick((s) => /infections?.+sexuellement|transmissibles/i.test(s), 3),
        // Sonde urinaire FR — 3 Q
        ...pick((s) => /sondes?.+urinaires?/i.test(s), 3),
        // Diabète FR — 2 Q
        ...pick((s) => /^diabete/i.test(s), 2),
        // Fracture FR — 1 Q
        ...pick((s) => /^fracture/i.test(s), 1),
        // Transfusion FR — 3 Q
        ...pick((s) => /^transfusion/i.test(s), 3),
        // Tuberculose FR — 2 Q
        ...pick((s) => /tuberculose/i.test(s), 2),
        // Pharmacologie FR — 3 Q
        ...pick((_s, t) => /pharmacologie/i.test(t), 3),
        // Pédiatrie FR — 2 Q
        ...pick((_s, t) => /p[ée]diatrie/i.test(t), 2),
        // Sémiologie de l'appareil digestif FR — 3 Q
        ...pick((s, t) => /semiologie/i.test(t) && /digestif/i.test(s), 3),
        // Sonde nasogastrique FR — 2 Q
        ...pick((s) => /nasogastrique/i.test(s), 2),
        // HTA FR (urgence hypertensive) — 2 Q
        ...pick((s) => /hta|urgence hypertensive/i.test(s), 2),
        // Oxygénothérapie FR — 2 Q
        ...pick((s) => /oxygenoth/i.test(s), 2),
        // Infection des parties molles FR — 2 Q
        ...pick((s) => /parties molles/i.test(s), 2),
      ];

      const seen = new Set<string>();
      const deduped = infSelected.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });
      return deduped.sort(() => Math.random() - 0.5).slice(0, totalQ);
    }

    // Fallback générique : 1 question par sous-thème + pool
    const selected: string[] = [];
    const pool: string[] = [];
    for (const st of available) {
      const sorted = [...(st as any).questions.map((q: any) => q.id)].sort(byFreshness);
      selected.push(sorted[0]);
      if (sorted.length > 1) pool.push(...sorted.slice(1));
    }
    const needed = totalQ - selected.length;
    if (needed > 0 && pool.length > 0) {
      pool.sort(byFreshness);
      selected.push(...pool.slice(0, Math.min(needed, pool.length)));
    }
    return selected.sort(() => Math.random() - 0.5).slice(0, totalQ);
  }

  // Examen blanc INFIRMIER — quotas fixes par catégorie
  // 45 Cas Clinique + 5 Sémiologie + 2 Transfusion + 3 Anatomie + 5 Pharmacologie = 60 QCM
  async generateInfirmierQuotaQuestions(totalQ = 60, lang: 'FR' | 'AR' = 'FR'): Promise<string[]> {
    const target = 'INFIRMIER';
    const previousSessions = await db(this.prisma).examenBlanc.findMany({
      where: { target },
      orderBy: { createdAt: 'asc' },
      select: { questionIdsFr: true, questionIdsAr: true },
    });
    const usedAge = new Map<string, number>();
    previousSessions.forEach((s: any, idx: number) => {
      const ids: string[] = lang === 'FR' ? s.questionIdsFr : s.questionIdsAr;
      ids.forEach(id => usedAge.set(id, idx));
    });
    const freshness = (id: string): number => usedAge.has(id) ? usedAge.get(id)! : Infinity;
    const byFreshness = (a: string, b: string) => {
      const fa = freshness(a), fb = freshness(b);
      if (fa === fb) return Math.random() - 0.5;
      if (fa === Infinity) return -1;
      if (fb === Infinity) return 1;
      return fa - fb;
    };

    const allSubThemes = await this.prisma.subTheme.findMany({
      where: { theme: { language: lang, target } },
      include: {
        theme: { select: { name: true } },
        questions: {
          where: { isActive: true, explanation: { not: '' } },
          select: { id: true },
        },
      },
    });
    const available = allSubThemes.filter((st: any) => st.questions.length > 0);

    const pick = (matcher: (subName: string, themeName: string) => boolean, n: number): string[] => {
      const pool: string[] = [];
      for (const st of available) {
        const s = st.name.toLowerCase();
        const t = (st.theme?.name ?? '').toLowerCase();
        if (matcher(s, t)) pool.push(...st.questions.map((q: any) => q.id));
      }
      pool.sort(byFreshness);
      return pool.slice(0, n);
    };

    let selected: string[];

    if (lang === 'AR') {
      selected = [
        ...pick((_s, t) => t === 'حالة سريرية', 45),
        ...pick((_s, t) => t === 'السيميولوجيا', 5),
        ...pick((s) => s.includes('نقل الدم'), 2),
        ...pick((_s, t) => t.includes('التشريح'), 3),
        ...pick((_s, t) => t === 'الدوائية والعلاج', 5),
      ];
    } else {
      selected = [
        ...pick((_s, t) => t === 'cas clinique', 45),
        ...pick((_s, t) => t === 'semiologie', 5),
        ...pick((s) => s === 'transfusion', 2),
        ...pick((_s, t) => t === 'anatomie et physiologie', 3),
        ...pick((_s, t) => t === 'pharmacologie', 5),
      ];
    }

    const seen = new Set<string>();
    const deduped = selected.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });
    return deduped.sort(() => Math.random() - 0.5).slice(0, totalQ);
  }

  // Examen blanc SAGE_FEMME — programme complémentaire
  // 30 CAS CLINIQUE + 5 RÉANIMATION NOUVEAU NÉ + 3 PRÉVENTION CANCER COL + 22 DÉCLENCHEMENT/TOCOLYSE/GROSSESSE GÉMELLAIRE/LIQUIDE AMNIOTIQUE/MANŒUVRES
  async generateComplementQuestions(totalQ = 60, lang: 'FR' | 'AR' = 'FR'): Promise<string[]> {
    const target = 'SAGE_FEMME';
    const previousSessions = await db(this.prisma).examenBlanc.findMany({
      where: { target },
      orderBy: { createdAt: 'asc' },
      select: { questionIdsFr: true, questionIdsAr: true },
    });
    const usedAge = new Map<string, number>();
    previousSessions.forEach((s: any, idx: number) => {
      const ids: string[] = lang === 'FR' ? s.questionIdsFr : s.questionIdsAr;
      ids.forEach(id => usedAge.set(id, idx));
    });
    const freshness = (id: string): number => usedAge.has(id) ? usedAge.get(id)! : Infinity;
    const byFreshness = (a: string, b: string) => {
      const fa = freshness(a), fb = freshness(b);
      if (fa === fb) return Math.random() - 0.5;
      if (fa === Infinity) return -1;
      if (fb === Infinity) return 1;
      return fa - fb;
    };

    const allSubThemes = await this.prisma.subTheme.findMany({
      where: { theme: { target, language: lang } },
      include: {
        theme: { select: { name: true } },
        questions: {
          where: { isActive: true, explanation: { not: '' } },
          select: { id: true },
        },
      },
    });
    const available = allSubThemes.filter((st: any) => st.questions.length > 0);

    const pick = (matcher: (subName: string, themeName: string) => boolean, n: number): string[] => {
      const pool: string[] = [];
      for (const st of available) {
        const s = st.name.toLowerCase();
        const t = (st.theme?.name ?? '').toLowerCase();
        if (matcher(s, t)) pool.push(...st.questions.map((q: any) => q.id));
      }
      pool.sort(byFreshness);
      return pool.slice(0, n);
    };

    let selected: string[];

    if (lang === 'AR') {
      selected = [
        // 30 CAS CLINIQUE AR — tous sous-thèmes de حالة سريرية
        ...pick((_s, t) => t === 'حالة سريرية', 30),
        // 5 RÉANIMATION — رعاية حديثي الولادة والإنعاش
        ...pick((s) => s.includes('رعاية حديثي الولادة'), 5),
        // 3 PRÉVENTION CANCER COL — سرطان عنق الرحم
        ...pick((s) => s.includes('سرطان'), 3),
        // 22 MIXED — تحفيز/تثبيط/مستويات/مخاض تجريبي/حمل متعدد/سائل أمنيوسي/مناورات
        ...pick((s) => /تحفيز المخاض|المخاض التجريبي|تثبيط المخاض|مستويات الخداج|الحمل المتعدد|السائل الأمنيوسي|المناورات في طب التوليد/.test(s), 22),
      ];
    } else {
      selected = [
        // 30 CAS CLINIQUE (tous sous-thèmes sauf Infections/Manœuvres qui vont dans le groupe 22)
        ...pick((s, t) => t === 'cas clinique' && !/d[ée]clenchement|tocolyse|man[oœ]uvre|infection/i.test(s), 30),
        // 5 RÉANIMATION DU NOUVEAU NÉ
        ...pick((s) => /soins.?n[ée]onataux|r[ée]animation/i.test(s), 5),
        // 3 PRÉVENTION CANCER DU COL
        ...pick((s) => /pr[ée]vention.*cancer|cancer.*col/i.test(s), 3),
        // 22 DÉCLENCHEMENT / ÉPREUVE UTÉRINE / TOCOLYSE / GROSSESSE GÉMELLAIRE / LIQUIDE AMNIOTIQUE / MANŒUVRES
        ...pick((s) => /d[ée]clenchement|[ée]preuve.?ut[ée]rine|tocolyse|grossesse.?g[ée]mellaire|liquide.?amniotique|man[oœ]uvre/i.test(s), 22),
      ];
    }

    const seen = new Set<string>();
    const deduped = selected.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });
    return deduped.sort(() => Math.random() - 0.5).slice(0, totalQ);
  }

  async generateSmartQuestions(
    totalQ: number,
    lang: 'FR' | 'AR',
    target: string,
    criteria: 'best' | 'worst',
    fromLastN: number,
  ): Promise<string[]> {
    // Build score map from last N sessions
    const scoreMap = new Map<string, number>();
    const lastSessions = await db(this.prisma).examenBlanc.findMany({
      where: { target },
      orderBy: { createdAt: 'desc' },
      take: fromLastN,
      select: { id: true },
    });

    if (lastSessions.length > 0) {
      const sessionIds = lastSessions.map((s: any) => s.id);
      const participants = await db(this.prisma).examenBlancParticipant.findMany({
        where: { examenBlancId: { in: sessionIds }, isCompleted: true, isTest: false, lang: lang.toLowerCase() },
        select: { id: true },
      });
      if (participants.length > 0) {
        const participantIds = participants.map((p: any) => p.id);
        const responses = await db(this.prisma).examenBlancReponse.findMany({
          where: { participantId: { in: participantIds } },
          select: { questionId: true, partialScore: true },
        });
        const acc = new Map<string, { sum: number; count: number }>();
        for (const r of responses) {
          if (!acc.has(r.questionId)) acc.set(r.questionId, { sum: 0, count: 0 });
          const e = acc.get(r.questionId)!;
          e.sum += r.partialScore;
          e.count++;
        }
        for (const [id, s] of acc) scoreMap.set(id, s.sum / s.count);
      }
    }

    // Sort by score: known questions ranked by criteria, unknowns ranked last
    const byScore = (a: string, b: string): number => {
      const hasA = scoreMap.has(a), hasB = scoreMap.has(b);
      if (!hasA && !hasB) return Math.random() - 0.5;
      if (!hasA) return 1;
      if (!hasB) return -1;
      return criteria === 'best'
        ? scoreMap.get(b)! - scoreMap.get(a)!
        : scoreMap.get(a)! - scoreMap.get(b)!;
    };

    const allSubThemes = await this.prisma.subTheme.findMany({
      where: { theme: { language: lang, target } },
      include: {
        theme: { select: { name: true } },
        questions: {
          where: { isActive: true, explanation: { not: '' } },
          select: { id: true },
        },
      },
    });
    const available = allSubThemes.filter((st: any) => st.questions.length > 0);

    // BIOLOGISTE smart : sous-thèmes ciblés, ordonnés par score (les plus faibles en priorité)
    if (target === 'BIOLOGISTE') {
      const BIO_SUBTHEMES = new Set([
        // Hématologie
        'QUALIFICATION BIOLOGIQUE DU DON',
        'HÉMOSTASE ET COAGULATION',
        // Biochimie
        'ANALYSES QUALITATIVES DES URINES',
        'BILAN HÉPATIQUE ET BILIRUBINE',
        'BILAN LIPIDIQUE (CHOLESTÉROL ET TRIGLYCÉRIDES)',
        'CALCULS ET UNITÉS (SYSTÈME INTERNATIONAL)',
        'ENZYMOLOGIE CLINIQUE',
        'FONCTION RÉNALE (URÉE, CRÉATININE, ACIDE URIQUE)',
        'GÉNÉRALITÉS ET CONDITIONS DE PRÉLÈVEMENT',
        'MÉTABOLISME DES GLUCIDES (GLUCOSE)',
        'PROTÉINES ET ALBUMINE',
        'ÉLECTROLYTES ET ÉLÉMENTS MINÉRAUX',
        // Immunologie / Sérologie
        'GROUPES SANGUINS ET TRANSFUSION (SÉROLOGIE ÉRYTHROCYTAIRE)',
        'TESTS SÉROLOGIQUES (AGGLUTINATION ET PRÉCIPITATION)',
        // Bactériologie
        'HÉMOCULTURE ET SÉROLOGIE',
        'EXAMEN CYTO-BACTÉRIOLOGIQUE DES URINES (ECBU) ET DU LCR',
        'COPROCULTURE ET PATHOGÈNES ÉPIDÉMIQUES',
        // Parasitologie
        'GÉNÉRALITÉS',
        'PARASITES DU SANG, DE LA PEAU ET DES URINES',
        // Procédures générales
        'MESURE ET DISTRIBUTION DES LIQUIDES',
        'CENTRIFUGATION',
        'UTILISATION DU MICROSCOPE',
        // Biologie moléculaire
        'STRUCTURES ET PROPRIÉTÉS DES ACIDES NUCLÉIQUES',
        "LA RÉPLICATION DE L'ADN",
        'TRANSCRIPTION',
        'MATURATION DES ARN',
        'LA TRADUCTION',
        // Techniques de biologie moléculaire
        'ÉLECTROPHORÈSE',
        'PCR',
        'EXTRACTION ET PURIFICATION DES ACIDES NUCLÉIQUES',
        // Virologie
        'TECHNIQUES DE DÉTECTION DIRECTE ET MOLÉCULAIRE',
      ]);
      const bioAvailable = available.filter((st: any) => BIO_SUBTHEMES.has(st.name.toUpperCase()));
      const selected: string[] = [];
      const pool: string[] = [];
      for (const st of bioAvailable) {
        const sorted = [...st.questions.map((q: any) => q.id)].sort(byScore);
        if (sorted.length > 0) selected.push(sorted[0]);
        if (sorted.length > 1) pool.push(...sorted.slice(1));
      }
      const needed = totalQ - selected.length;
      if (needed > 0 && pool.length > 0) {
        pool.sort(byScore);
        selected.push(...pool.slice(0, Math.min(needed, pool.length)));
      }
      return selected.sort(() => Math.random() - 0.5).slice(0, totalQ);
    }

    // INFIRMIER / SAGE_FEMME smart: 1 question per sub-theme (best/worst score), then fill pool
    const selected: string[] = [];
    const pool: string[] = [];
    for (const st of available) {
      const sorted = [...st.questions.map((q: any) => q.id)].sort(byScore);
      selected.push(sorted[0]);
      if (sorted.length > 1) pool.push(...sorted.slice(1));
    }
    const needed = totalQ - selected.length;
    if (needed > 0 && pool.length > 0) {
      pool.sort(byScore);
      selected.push(...pool.slice(0, Math.min(needed, pool.length)));
    }
    return selected.sort(() => Math.random() - 0.5).slice(0, totalQ);
  }

  async getSmartPreview(target: string, totalQ: number, criteria: 'best' | 'worst', fromLastN: number) {
    const lastSessions = await db(this.prisma).examenBlanc.findMany({
      where: { target },
      orderBy: { createdAt: 'desc' },
      take: fromLastN,
      select: { id: true, title: true, createdAt: true },
    });

    if (lastSessions.length === 0) return { sessionCount: 0, responseCount: 0, uniqueQuestions: 0, avgScore: 0, sessions: [] };

    const sessionIds = lastSessions.map((s: any) => s.id);

    const participants = await db(this.prisma).examenBlancParticipant.findMany({
      where: { examenBlancId: { in: sessionIds }, isCompleted: true, isTest: false },
      select: { id: true },
    });

    const participantIds = participants.map((p: any) => p.id);

    const responses = participantIds.length > 0
      ? await db(this.prisma).examenBlancReponse.findMany({
          where: { participantId: { in: participantIds } },
          select: { questionId: true, partialScore: true },
        })
      : [];

    const qMap = new Map<string, { sum: number; count: number }>();
    for (const r of responses) {
      if (!qMap.has(r.questionId)) qMap.set(r.questionId, { sum: 0, count: 0 });
      const e = qMap.get(r.questionId)!;
      e.sum += r.partialScore;
      e.count++;
    }

    const sorted = Array.from(qMap.entries())
      .map(([id, s]) => ({ id, avg: s.sum / s.count, count: s.count }))
      .sort((a, b) => criteria === 'best' ? b.avg - a.avg : a.avg - b.avg);

    const selected = sorted.slice(0, totalQ);
    const avgScore = selected.length > 0 ? selected.reduce((s, q) => s + q.avg, 0) / selected.length : 0;

    return {
      sessionCount: lastSessions.length,
      participantCount: participants.length,
      responseCount: responses.length,
      uniqueQuestions: qMap.size,
      selectedCount: selected.length,
      avgScore,
      sessions: lastSessions.map((s: any) => ({ id: s.id, title: s.title, createdAt: s.createdAt })),
    };
  }

  async createSession(dto: {
    title?: string; descriptionFr?: string; descriptionAr?: string;
    startsAt: string; endsAt: string; resultsAt?: string;
    totalQ?: number; durationMin?: number; target?: string;
    selectionMode?: 'auto' | 'smart' | 'complement' | 'infirmier-quota';
    smartCriteria?: 'best' | 'worst';
    smartFromLastN?: number;
  }) {
    const selectionMode = dto.selectionMode ?? 'auto';
    const totalQ = dto.totalQ ?? (selectionMode === 'infirmier-quota' ? 60 : 80);
    const target = selectionMode === 'complement' ? 'SAGE_FEMME' : selectionMode === 'infirmier-quota' ? 'INFIRMIER' : (dto.target?.toUpperCase() || 'INFIRMIER');
    const smartCriteria = dto.smartCriteria ?? 'best';
    const smartFromLastN = dto.smartFromLastN ?? 3;

    let questionIdsFr: string[];
    let questionIdsAr: string[];

    if (selectionMode === 'infirmier-quota') {
      // 45 Cas Clinique + 5 Sémiologie + 2 Transfusion + 3 Anatomie + 5 Pharmacologie = 60 QCM
      [questionIdsFr, questionIdsAr] = await Promise.all([
        this.generateInfirmierQuotaQuestions(totalQ, 'FR'),
        this.generateInfirmierQuotaQuestions(totalQ, 'AR'),
      ]);
    } else if (selectionMode === 'complement') {
      // Programme complémentaire SAGE_FEMME — target forcé SAGE_FEMME, FR + AR
      [questionIdsFr, questionIdsAr] = await Promise.all([
        this.generateComplementQuestions(totalQ, 'FR'),
        this.generateComplementQuestions(totalQ, 'AR'),
      ]);
    } else if (selectionMode === 'smart') {
      [questionIdsFr, questionIdsAr] = await Promise.all([
        this.generateSmartQuestions(totalQ, 'FR', target, smartCriteria, smartFromLastN),
        this.generateSmartQuestions(totalQ, 'AR', target, smartCriteria, smartFromLastN),
      ]);
    } else if (target === 'BIOLOGISTE') {
      // Biologiste : tout le contenu est en FR uniquement
      questionIdsFr = await this.generateQuestions(totalQ, 'FR', 'BIOLOGISTE');
      questionIdsAr = [...questionIdsFr];
    } else {
      [questionIdsFr, questionIdsAr] = await Promise.all([
        this.generateQuestions(totalQ, 'FR', target),
        this.generateQuestions(totalQ, 'AR', target),
      ]);
    }
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
        target,
        isActive: true,
      },
    });
  }

  async getSessions() {
    const sessions = await db(this.prisma).examenBlanc.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: { where: { isTest: false } } } } },
    });
    const raw: any[] = await this.prisma.$queryRaw`SELECT id, "requiresAccount" FROM "ExamenBlanc"`;
    const raMap = Object.fromEntries(raw.map((r: any) => [r.id, r.requiresAccount]));
    return sessions.map((s: any) => ({ ...s, requiresAccount: raMap[s.id] ?? false, participantCount: s._count.participants }));
  }

  async getSessionStats(id: string, lang?: 'fr' | 'ar') {
    const session = await db(this.prisma).examenBlanc.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session introuvable');

    const where: any = { examenBlancId: id, isTest: false };
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

    // Histogram combiné FR+AR toujours
    const totalFr = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: id, lang: 'fr', isTest: false } });
    const totalAr = await db(this.prisma).examenBlancParticipant.count({ where: { examenBlancId: id, lang: 'ar', isTest: false } });

    const allCompleted = lang
      ? await db(this.prisma).examenBlancParticipant.findMany({ where: { examenBlancId: id, isCompleted: true, isTest: false } })
      : completed;
    const allScores = lang ? allCompleted.map((p: any) => p.score ?? 0) : scores;
    const histogramAll = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: allScores.filter((s: number) => (i === 0 ? s < 10 : s >= i * 10) && (i === 9 ? s <= 100 : s < (i + 1) * 10)).length,
    }));

    // Stats par question — questions les plus ratées
    const participantIds = completed.map((p: any) => p.id);
    const allReponses = participantIds.length > 0
      ? await db(this.prisma).examenBlancReponse.findMany({
          where: { participantId: { in: participantIds } },
          select: { questionId: true, isCorrect: true, partialScore: true },
        })
      : [];

    const qMap = new Map<string, { full: number; partial: number; negative: number; total: number; sumPartial: number }>();
    for (const r of allReponses) {
      if (!qMap.has(r.questionId)) qMap.set(r.questionId, { full: 0, partial: 0, negative: 0, total: 0, sumPartial: 0 });
      const e = qMap.get(r.questionId)!;
      e.total++;
      e.sumPartial += r.partialScore;
      if (r.partialScore >= 1) e.full++;
      else if (r.partialScore > 0) e.partial++;
      else if (r.partialScore < 0) e.negative++;
    }

    const questionIds = [...qMap.keys()];
    const questions = questionIds.length > 0
      ? await this.prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, text: true, correctAnswer: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, explanation: true, subTheme: { select: { name: true, theme: { select: { name: true } } } } },
        })
      : [];

    const qTextMap = new Map(questions.map((q: any) => [q.id, q]));

    // Index de chaque question dans la liste FR (position dans l'examen)
    const qIndexFr = new Map<string, number>(
      (session.questionIdsFr as string[]).map((id: string, i: number) => [id, i + 1])
    );

    const questionStats = [...qMap.entries()]
      .map(([qId, data]) => {
        const q: any = qTextMap.get(qId);
        return {
          questionId: qId,
          numQuestion: qIndexFr.get(qId) ?? null,
          text: q?.text ?? '—',
          theme: q?.subTheme?.theme?.name ?? '—',
          subTheme: q?.subTheme?.name ?? '—',
          correctAnswer: q?.correctAnswer ?? '',
          choiceA: q?.choiceA ?? '', choiceB: q?.choiceB ?? '', choiceC: q?.choiceC ?? '',
          choiceD: q?.choiceD ?? '', choiceE: q?.choiceE ?? null,
          explanation: q?.explanation ?? null,
          total: data.total,
          fullPct: Math.round((data.full / data.total) * 100),
          partialPct: Math.round((data.partial / data.total) * 100),
          negativePct: Math.round((data.negative / data.total) * 100),
          zeroPct: Math.round(((data.total - data.full - data.partial - data.negative) / data.total) * 100),
          avgPartial: Math.round((data.sumPartial / data.total) * 1000) / 1000,
        };
      })
      .filter(q => q.fullPct < 100)
      .sort((a, b) => a.avgPartial - b.avgPartial)
      .slice(0, 30);

    // Croiser les participants avec les autres sessions (par téléphone)
    const phones = allParticipants.map((p: any) => p.telephone).filter(Boolean);
    const otherSessionParticipants = phones.length > 0
      ? await db(this.prisma).examenBlancParticipant.findMany({
          where: { telephone: { in: phones }, examenBlancId: { not: id }, isTest: false },
          select: { telephone: true, examenBlanc: { select: { title: true, id: true } } },
        })
      : [];

    const phoneToSessions: Record<string, { title: string; id: string }[]> = {};
    for (const p of otherSessionParticipants) {
      if (!phoneToSessions[p.telephone]) phoneToSessions[p.telephone] = [];
      const already = phoneToSessions[p.telephone].find((s: any) => s.id === p.examenBlanc.id);
      if (!already) phoneToSessions[p.telephone].push({ title: p.examenBlanc.title, id: p.examenBlanc.id });
    }

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
      histogramAll,
      topParticipants: completed.slice(0, 20).map((p: any, i: number) => ({
        rank: i + 1, ...p,
        previousSessions: phoneToSessions[p.telephone] ?? [],
      })),
      questionStats,
    };
  }

  async getAppUsersWithExamStatus() {
    const [users, allParticipants] = await Promise.all([
      this.prisma.user.findMany({
        where: { phone: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, phone: true, fullName: true, email: true, role: true, wilaya: true, createdAt: true, subscriptionEnd: true },
      }),
      db(this.prisma).examenBlancParticipant.findMany({
        where: { isTest: false },
        select: {
          telephone: true, isCompleted: true, score: true, createdAt: true,
          examenBlanc: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Map: normalized phone → list of exam sessions
    const examMap: Record<string, any[]> = {};
    for (const p of allParticipants) {
      const norm = normalizePhone(p.telephone ?? '');
      if (!norm || norm.length < 7) continue;
      if (!examMap[norm]) examMap[norm] = [];
      // deduplicate by session id
      if (!examMap[norm].find((e: any) => e.sessionId === p.examenBlanc.id)) {
        examMap[norm].push({
          sessionId: p.examenBlanc.id,
          sessionTitle: p.examenBlanc.title,
          isCompleted: p.isCompleted,
          score: p.score,
          date: p.createdAt,
        });
      }
    }

    return users
      .filter((u: any) => {
        const norm = normalizePhone(u.phone ?? '');
        return norm.length >= 7; // exclure les numéros invalides (ex: emails stockés comme phone)
      })
      .map((u: any) => {
        const norm = normalizePhone(u.phone ?? '');
        const exams = examMap[norm] ?? [];
        return {
          id: u.id,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          role: u.role,
          wilaya: u.wilaya,
          createdAt: u.createdAt,
          subscriptionEnd: u.subscriptionEnd,
          hasExam: exams.length > 0,
          exams,
        };
      });
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
    const anyDto = dto as any;
    if (anyDto.requiresAccount !== undefined) {
      await this.prisma.$executeRaw`UPDATE "ExamenBlanc" SET "requiresAccount" = ${anyDto.requiresAccount} WHERE id = ${id}`;
    }
    if (Object.keys(data).length === 0) return { id };
    return db(this.prisma).examenBlanc.update({ where: { id }, data });
  }

  async getUniqueLeads() {
    const [participants, users] = await Promise.all([
      db(this.prisma).examenBlancParticipant.findMany({
        where: { isTest: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, examenBlancId: true, nom: true, prenom: true, telephone: true,
          ville: true, lang: true, score: true, isCompleted: true, contacted: true,
          submittedAt: true, createdAt: true,
          examenBlanc: { select: { title: true, target: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { phone: { not: null } },
        select: { phone: true, fullName: true, role: true },
      }),
    ]);

    const phoneToUser: Record<string, any> = {};
    const nameToUser: Record<string, any> = {};
    users.forEach((u: any) => {
      const phoneKey = normalizePhone(u.phone ?? '');
      if (phoneKey) phoneToUser[phoneKey] = u;
      // Indexer aussi par mots du nom triés (gère ordre inversé nom/prénom)
      const nameKey = (u.fullName ?? '').toLowerCase().split(/\s+/).filter(Boolean).sort().join('|');
      if (nameKey) nameToUser[nameKey] = u;
    });

    // Group by normalized phone
    const grouped: Record<string, {
      telephone: string; nom: string; prenom: string; ville: string; lang: string;
      sessions: { examenBlancId: string; title: string; target: string; score: number | null; isCompleted: boolean; date: Date }[];
      contacted: boolean; lastDate: Date;
    }> = {};

    for (const p of participants) {
      const key = normalizePhone(p.telephone ?? '') || p.telephone || p.id;
      if (!grouped[key]) {
        grouped[key] = {
          telephone: p.telephone ?? '',
          nom: p.nom, prenom: p.prenom, ville: p.ville, lang: p.lang,
          sessions: [], contacted: false, lastDate: p.createdAt,
        };
      }
      grouped[key].sessions.push({
        examenBlancId: p.examenBlancId,
        title: p.examenBlanc?.title ?? '',
        target: p.examenBlanc?.target ?? '',
        score: p.score, isCompleted: p.isCompleted,
        date: p.submittedAt ?? p.createdAt,
      });
      if (p.contacted) grouped[key].contacted = true;
      if (p.createdAt > grouped[key].lastDate) {
        grouped[key].lastDate = p.createdAt;
        grouped[key].nom = p.nom;
        grouped[key].prenom = p.prenom;
        grouped[key].ville = p.ville;
        grouped[key].lang = p.lang;
      }
    }

    return Object.entries(grouped).map(([key, g]) => {
      const professions = [...new Set(g.sessions.map(s => s.target))];
      const completedSessions = g.sessions.filter(s => s.isCompleted).length;
      const leadNameKey = `${g.nom ?? ''} ${g.prenom ?? ''}`.toLowerCase().split(/\s+/).filter(Boolean).sort().join('|');
      const matched = phoneToUser[normalizePhone(g.telephone ?? '')] ?? (leadNameKey ? nameToUser[leadNameKey] : undefined);
      return {
        telephone: g.telephone,
        nom: g.nom, prenom: g.prenom, ville: g.ville, lang: g.lang,
        sessionsCount: g.sessions.length,
        completedCount: completedSessions,
        professions,
        sessions: g.sessions,
        contacted: g.contacted,
        isRegistered: !!matched,
        registeredUser: matched ?? null,
        lastDate: g.lastDate,
      };
    }).sort((a, b) => b.sessionsCount - a.sessionsCount || b.lastDate.getTime() - a.lastDate.getTime());
  }

  async getAllParticipants() {
    const [participants, users] = await Promise.all([
      db(this.prisma).examenBlancParticipant.findMany({
        where: { isTest: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, examenBlancId: true, nom: true, prenom: true, telephone: true, ville: true,
          lang: true, score: true, timeTaken: true, isCompleted: true, tricherie: true, submittedAt: true, createdAt: true,
          resultsViewedAt: true, contacted: true,
          examenBlanc: { select: { title: true, id: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { phone: { not: null } },
        select: { phone: true, fullName: true, role: true },
      }),
    ]);

    const phoneToUser: Record<string, any> = {};
    users.forEach((u: any) => {
      if (u.phone) {
        const key = normalizePhone(u.phone);
        if (key) phoneToUser[key] = u;
      }
    });

    // Compute classement per session (all langs combined, completed only)
    const bySession: Record<string, any[]> = {};
    participants.forEach((p: any) => {
      if (!bySession[p.examenBlancId]) bySession[p.examenBlancId] = [];
      bySession[p.examenBlancId].push(p);
    });
    const rankMap: Record<string, { classement: number; totalParticipants: number }> = {};
    Object.values(bySession).forEach((group: any[]) => {
      const completed = [...group].filter(p => p.isCompleted).sort((a, b) => (b.score ?? -999) - (a.score ?? -999));
      const total = group.length;
      completed.forEach((p, i) => { rankMap[p.id] = { classement: i + 1, totalParticipants: total }; });
    });

    const result = participants.map((p: any) => {
      const matched = phoneToUser[normalizePhone(p.telephone ?? '')];
      const rank = rankMap[p.id] ?? null;
      return { ...p, isRegistered: !!matched, registeredUser: matched ?? null, classement: rank?.classement ?? null, totalParticipants: rank?.totalParticipants ?? null };
    });

    // Trier par classement croissant (non classés à la fin)
    return result.sort((a: any, b: any) => {
      if (a.classement == null && b.classement == null) return 0;
      if (a.classement == null) return 1;
      if (b.classement == null) return -1;
      return a.classement - b.classement;
    });
  }
}
