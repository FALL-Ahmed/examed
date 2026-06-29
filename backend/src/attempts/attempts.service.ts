import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { UsersService } from '../users/users.service';

// +1/c par bonne réponse cochée, -1/w par mauvaise cochée, score par question peut être négatif (conforme barème officiel)
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

@Injectable()
export class AttemptsService {
  constructor(
    private prisma: PrismaService,
    private questionsService: QuestionsService,
    private usersService: UsersService,
  ) {}

  async startAttempt(userId: string, userRole: string, dto: {
    mode: 'PRACTICE' | 'EXAM' | 'REVIEW' | 'FAVORITES';
    themeId?: string;
    themeIds?: string[];
    excludeAnsweredToday?: boolean;
    subThemeId?: string;
    subThemeIds?: string[];
    count?: number;
    durationMinutes?: number;
    questionIds?: string[];
    language?: string;
  }) {
    let questions: any[] = [];

    if (dto.mode === 'FAVORITES') {
      if (!dto.questionIds?.length) throw new BadRequestException('Aucun favori');
      questions = await this.prisma.question.findMany({
        where: { id: { in: dto.questionIds }, isActive: true },
        include: { subTheme: { include: { theme: true } } },
      });
    } else if (dto.mode === 'EXAM') {
      questions = await this.questionsService.getForExam(userId, userRole, {
        themeId: dto.themeId,
        count: dto.count || 20,
        language: dto.language,
      });
    } else if (dto.mode === 'REVIEW') {
      if (dto.questionIds?.length) {
        questions = await this.prisma.question.findMany({
          where: { id: { in: dto.questionIds }, isActive: true },
          include: { subTheme: { include: { theme: true } } },
        });
      } else {
        questions = await this.questionsService.getMistakes(userId);
        if (!questions.length) throw new BadRequestException('Aucune erreur à réviser');
        questions = questions.slice(0, dto.count || 20);
      }
    } else {
      // PRACTICE
      if (userRole === 'FREE') {
        const dailyCount = await this.usersService.checkAndResetDailyCount(userId);
        if (dailyCount >= 3) {
          throw new ForbiddenException({ message: 'Quota journalier atteint', code: 'QUOTA_EXCEEDED' });
        }
      }
      // Valider que le thème appartient au bon target selon la profession
      if (dto.themeId) {
        const theme = await this.prisma.theme.findUnique({ where: { id: dto.themeId }, select: { target: true } });
        if (theme) {
          const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profession: true } });
          const isSF = user?.profession === 'sage_femme';
          if (theme.target === 'SAGE_FEMME' && !isSF) throw new ForbiddenException('Thème non autorisé pour votre profil');
          if (theme.target === 'INFIRMIER' && isSF) throw new ForbiddenException('Thème non autorisé pour votre profil');
        }
      }
      questions = await this.questionsService.getForPractice(userId, 'ADMIN', {
        themeId: dto.themeId,
        themeIds: dto.themeIds,
        subThemeId: dto.subThemeId,
        subThemeIds: dto.subThemeIds,
        count: dto.count || 1,
        language: dto.language,
        excludeAnsweredToday: dto.excludeAnsweredToday,
      });
    }

    if (!questions.length) throw new BadRequestException('Aucune question disponible');

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        mode: (dto.mode === 'FAVORITES' ? 'PRACTICE' : dto.mode) as any,
        themeId: dto.themeId,
        subThemeId: dto.subThemeId,
        totalQ: questions.length,
        timeLimit: dto.durationMinutes ? dto.durationMinutes * 60 : null,
      },
    });

    return {
      attemptId: attempt.id,
      mode: attempt.mode,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        choiceE: q.choiceE,
        imageUrl: q.imageUrl,
        subTheme: q.subTheme?.name,
        theme: q.subTheme?.theme?.name,
        isMultiple: q.correctAnswer.split(',').length > 1,
      })),
      timeLimit: attempt.timeLimit,
      startedAt: attempt.startedAt,
    };
  }

  async submitAnswer(userId: string, attemptId: string, dto: {
    questionId: string;
    answer: string;
  }) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId, isCompleted: false },
    });
    if (!attempt) throw new NotFoundException('Tentative introuvable ou déjà terminée');

    const question = await this.prisma.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException('Question introuvable');

    const normalize = (s: string) => s.toUpperCase().split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
    const isCorrect = normalize(dto.answer) === normalize(question.correctAnswer);
    const partialScore = computePartialScore(dto.answer, question);

    await this.prisma.userAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: {
        userId,
        questionId: dto.questionId,
        attemptId,
        userAnswer: dto.answer.toUpperCase(),
        isCorrect,
        partialScore,
      },
      update: {
        userAnswer: dto.answer.toUpperCase(),
        isCorrect,
        partialScore,
        answeredAt: new Date(),
      },
    });

    // En mode PRACTICE, incrémenter compteur FREE
    if (attempt.mode === 'PRACTICE') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user.role === 'FREE') {
        await this.usersService.incrementDailyCount(userId);
      }
    }

    return {
      isCorrect,
      partialScore,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      imageUrl: question.imageUrl,
    };
  }

  async finishAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: { answers: true },
    });
    if (!attempt) throw new NotFoundException('Tentative introuvable');

    const correctQ = attempt.answers.filter((a) => a.isCorrect).length;
    const timeTaken = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    const rawScore = attempt.answers.reduce((sum, a) => sum + a.partialScore, 0);
    const score = attempt.totalQ > 0 ? Math.round((rawScore / attempt.totalQ) * 1000) / 10 : 0;

    return this.prisma.attempt.update({
      where: { id: attemptId },
      data: { correctQ, score, timeTaken, isCompleted: true, completedAt: new Date() },
    });
  }

  async getAttemptReview(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: {
          include: {
            question: {
              include: { subTheme: { include: { theme: true } } },
            },
          },
          orderBy: { answeredAt: 'asc' },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Tentative introuvable');

    const rawScore = attempt.answers.reduce((sum, a) => sum + a.partialScore, 0);

    const normAnswer = (s: string) => s.toUpperCase().split(',').map(x => x.trim()).filter(Boolean).sort().join(',');

    return {
      id: attempt.id,
      mode: attempt.mode,
      score: attempt.score,
      rawScore: Math.round(rawScore * 100) / 100,
      correctQ: attempt.correctQ,
      totalQ: attempt.totalQ,
      timeTaken: attempt.timeTaken,
      completedAt: attempt.completedAt,
      questions: attempt.answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.text,
        choiceA: a.question.choiceA,
        choiceB: a.question.choiceB,
        choiceC: a.question.choiceC,
        choiceD: a.question.choiceD,
        choiceE: a.question.choiceE,
        userAnswer: a.userAnswer,
        correctAnswer: a.question.correctAnswer,
        isCorrect: normAnswer(a.userAnswer) === normAnswer(a.question.correctAnswer),
        partialScore: a.partialScore,
        explanation: a.question.explanation,
        imageUrl: a.question.imageUrl,
        theme: a.question.subTheme.theme.name,
        subTheme: a.question.subTheme.name,
      })),
    };
  }

  async getUserHistory(userId: string) {
    return this.prisma.attempt.findMany({
      where: { userId, isCompleted: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        mode: true,
        score: true,
        correctQ: true,
        totalQ: true,
        timeTaken: true,
        startedAt: true,
        completedAt: true,
        themeId: true,
      },
    });
  }

  async getWeakTheme(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profession: true } });
    const userTarget = user?.profession === 'sage_femme' ? 'SAGE_FEMME' : 'INFIRMIER';

    // Utilise les réponses → question → sous-thème → thème pour avoir les vrais IDs actuels
    const answers = await this.prisma.userAnswer.findMany({
      where: {
        userId,
        attempt: { isCompleted: true, mode: { in: ['PRACTICE', 'EXAM'] } },
        question: { subTheme: { theme: { target: userTarget } } },
      },
      select: {
        isCorrect: true,
        question: {
          select: {
            subTheme: { select: { theme: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { answeredAt: 'desc' },
      take: 500,
    });

    const map: Record<string, { themeId: string; name: string; correct: number; total: number }> = {};
    for (const a of answers) {
      const theme = a.question?.subTheme?.theme;
      if (!theme) continue;
      if (!map[theme.id]) map[theme.id] = { themeId: theme.id, name: theme.name, correct: 0, total: 0 };
      map[theme.id].total++;
      if (a.isCorrect) map[theme.id].correct++;
    }

    const ranked = Object.values(map)
      .filter((t) => t.total >= 5)
      .map((t) => ({
        themeId: t.themeId,
        name: t.name,
        avgScore: Math.round((t.correct / t.total) * 100),
        sessions: t.total,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    if (!ranked.length) return null;
    return ranked[0];
  }

  async getThemeProgress(userId: string, themeId?: string, subThemeId?: string, excludeId?: string) {
    const where: any = { userId, isCompleted: true, mode: { in: ['PRACTICE', 'EXAM'] } };
    if (excludeId) where.id = { not: excludeId };
    if (subThemeId) where.subThemeId = subThemeId;
    else if (themeId) where.themeId = themeId;

    const attempts = await this.prisma.attempt.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { id: true, score: true, correctQ: true, totalQ: true, completedAt: true },
    });

    return { attempts };
  }
}
