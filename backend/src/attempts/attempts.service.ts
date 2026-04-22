import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { UsersService } from '../users/users.service';

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
    subThemeId?: string;
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
      questions = await this.questionsService.getMistakes(userId);
      if (!questions.length) throw new BadRequestException('Aucune erreur à réviser');
      questions = questions.slice(0, dto.count || 20);
    } else {
      // PRACTICE
      if (userRole === 'FREE') {
        const dailyCount = await this.usersService.checkAndResetDailyCount(userId);
        if (dailyCount >= 3) {
          throw new ForbiddenException({ message: 'Quota journalier atteint', code: 'QUOTA_EXCEEDED' });
        }
      }
      questions = await this.questionsService.getForPractice(userId, 'ADMIN', {
        themeId: dto.themeId,
        subThemeId: dto.subThemeId,
        count: dto.count || 1,
        language: dto.language,
      });
    }

    if (!questions.length) throw new BadRequestException('Aucune question disponible');

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        mode: (dto.mode === 'FAVORITES' ? 'PRACTICE' : dto.mode) as any,
        themeId: dto.themeId,
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

    // Vérifier timeout
    if (attempt.timeLimit) {
      const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
      if (elapsed > attempt.timeLimit + 30) { // 30s de grâce
        await this.finishAttempt(userId, attemptId);
        throw new BadRequestException('Temps écoulé');
      }
    }

    const question = await this.prisma.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException('Question introuvable');

    // Comparer les réponses (supporte réponses multiples "A,B,C")
    const normalize = (s: string) => s.toUpperCase().split(',').map(x => x.trim()).sort().join(',');
    const isCorrect = normalize(dto.answer) === normalize(question.correctAnswer);

    const answer = await this.prisma.userAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: {
        userId,
        questionId: dto.questionId,
        attemptId,
        userAnswer: dto.answer.toUpperCase(),
        isCorrect,
      },
      update: {
        userAnswer: dto.answer.toUpperCase(),
        isCorrect,
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
    const score = attempt.totalQ > 0 ? Math.round((correctQ / attempt.totalQ) * 100) : 0;

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

    return {
      id: attempt.id,
      mode: attempt.mode,
      score: attempt.score,
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
        isCorrect: a.isCorrect,
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
}
