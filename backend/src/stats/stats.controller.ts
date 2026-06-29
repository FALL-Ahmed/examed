import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('national')
  getNational(
    @Query('score') score: string,
    @Query('themeId') themeId?: string,
    @Query('subThemeId') subThemeId?: string,
  ) {
    return this.statsService.getNational(parseFloat(score) || 0, themeId, subThemeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-rank')
  getMyRank(@Req() req: any) {
    return this.statsService.getMyRank(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preparation')
  getPreparation(@Req() req: any, @Query('lang') lang?: string) {
    return this.statsService.getPreparationStats(req.user.sub, lang);
  }
}
