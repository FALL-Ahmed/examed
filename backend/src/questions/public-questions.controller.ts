import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions/free-trial')
export class PublicQuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  getFreeTrial(@Query('theme') theme: string, @Query('lang') lang: string) {
    return this.questionsService.getFreeTrial(theme || 'paludisme', lang || 'fr');
  }

  @Post('event')
  trackEvent(@Body() dto: { sessionId: string; theme: string; lang: string; questionN: number; isCorrect: boolean }) {
    return this.questionsService.trackFreeTrialEvent(dto);
  }
}
