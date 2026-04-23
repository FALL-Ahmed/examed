import { Controller, Get, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions/free-trial')
export class PublicQuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  getFreeTrial(@Query('theme') theme: string) {
    return this.questionsService.getFreeTrial(theme || 'paludisme');
  }
}
