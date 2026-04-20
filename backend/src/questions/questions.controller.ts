import { Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
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

  @Get('favorites')
  getFavorites(@Req() req: any) {
    return this.questionsService.getFavorites(req.user.sub);
  }

  @Get('favorites/ids')
  getFavoriteIds(@Req() req: any) {
    return this.questionsService.getFavoriteIds(req.user.sub);
  }

  @Post(':id/favorite')
  toggleFavorite(@Req() req: any, @Param('id') id: string) {
    return this.questionsService.toggleFavorite(req.user.sub, id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }
}
