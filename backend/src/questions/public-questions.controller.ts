import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

// Noms de thèmes accessibles gratuitement (matching partiel, insensible à la casse)
const FREE_THEME_KEYWORDS = ['maladies infectieuses', 'infectieuses', 'anatomie', 'الأمراض المعدية', 'التشريح'];

@Controller('questions/free-trial')
export class PublicQuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  getFreeTrial(@Query('theme') theme: string, @Query('lang') lang: string) {
    return this.questionsService.getFreeTrial(theme || 'paludisme', lang || 'fr');
  }

  // Endpoint public pour la page /free-practice
  @Get('practice')
  getFreePractice(
    @Query('themeId') themeId: string,
    @Query('themeName') themeName: string,
    @Query('count') count: string,
    @Query('lang') lang: string,
    @Query('subThemeId') subThemeId?: string,
  ) {
    const name = (themeName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const isAllowed = FREE_THEME_KEYWORDS.some((k) => {
      const kn = k.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return name.includes(kn);
    });
    if (!isAllowed && !themeId) {
      throw new Error('Thème non disponible en accès gratuit');
    }
    return this.questionsService.getFreePracticeQuestions(themeId, themeName, parseInt(count) || 10, lang, subThemeId);
  }

  @Post('event')
  trackEvent(@Body() dto: { sessionId: string; theme: string; lang: string; source: string; questionN: number; isCorrect: boolean }) {
    return this.questionsService.trackFreeTrialEvent(dto);
  }

  @Post('lead')
  saveLead(@Body() dto: { sessionId: string; phone: string; theme: string; lang: string; source: string }) {
    return this.questionsService.saveFreeTrialLead(dto);
  }
}
