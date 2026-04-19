import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionsService } from './questions.service';

@ApiTags('Questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get('practice')
  getPractice(
    @Req() req: any,
    @Query('themeId') themeId?: string,
    @Query('subThemeId') subThemeId?: string,
    @Query('count') count?: string,
  ) {
    return this.questionsService.getForPractice(req.user.sub, req.user.role, {
      themeId,
      subThemeId,
      count: count ? parseInt(count) : 1,
    });
  }

  @Get('mistakes')
  getMistakes(@Req() req: any) {
    return this.questionsService.getMistakes(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }
}
