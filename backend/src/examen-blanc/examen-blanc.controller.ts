import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ExamenBlancService } from './examen-blanc.service';

@ApiTags('Examen Blanc')
@Controller('examen-blanc')
export class ExamenBlancController {
  constructor(private service: ExamenBlancService) {}

  @Get('current')
  getCurrentSession() {
    return this.service.getCurrentSession();
  }

  @Post('register')
  register(@Body() body: { nom: string; prenom: string; telephone: string; ville: string; examenBlancId: string; lang: string }) {
    return this.service.register(body);
  }

  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.service.getSession(sessionId);
  }

  @Post('session/:sessionId/answer')
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { questionId: string; reponse: string; tempsReponse?: number },
  ) {
    return this.service.submitAnswer(sessionId, body);
  }

  @Post('session/:sessionId/finish')
  finish(@Param('sessionId') sessionId: string, @Body() body: { tabSwitches?: number }) {
    return this.service.finish(sessionId, body.tabSwitches ?? 0);
  }

  @Get('session/:sessionId/results')
  getResults(@Param('sessionId') sessionId: string) {
    return this.service.getResults(sessionId);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('id') id?: string) {
    return this.service.getLeaderboard(id);
  }

  @Post('recover')
  recover(@Body() body: { telephone: string }) {
    return this.service.recoverSession(body.telephone);
  }

  // Admin routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/sessions')
  adminGetSessions() {
    return this.service.getSessions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/sessions')
  adminCreateSession(@Body() body: any) {
    return this.service.createSession(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/sessions/:id/stats')
  adminGetStats(@Param('id') id: string, @Query('lang') lang?: 'fr' | 'ar') {
    return this.service.getSessionStats(id, lang);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/sessions/:id')
  adminUpdateSession(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSession(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/participants')
  adminGetParticipants() {
    return this.service.getAllParticipants();
  }
}
