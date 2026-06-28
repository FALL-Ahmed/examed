import { Controller, Get, Post, Put, Patch, Param, Body, Query, Req, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
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
  getCurrentSession(@Query('target') target?: string) {
    return this.service.getCurrentSession(target?.toUpperCase() || 'INFIRMIER');
  }

  @Post('register')
  register(@Body() body: { nom: string; prenom: string; telephone: string; ville: string; examenBlancId: string; lang: string }) {
    return this.service.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register-from-account')
  registerFromAccount(@Req() req: any, @Body() body: { examenBlancId: string; lang: string; telephone?: string }) {
    return this.service.registerFromAccount(req.user.sub, body);
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

  @Get('history')
  getHistory(@Query('target') target: string, @Query('telephone') telephone?: string) {
    return this.service.getHistory(target?.toUpperCase() || 'INFIRMIER', telephone);
  }

  @Post('register-past')
  registerPast(@Body() body: { nom: string; prenom: string; telephone: string; ville: string; examenBlancId: string; lang: string }) {
    return this.service.registerPast(body);
  }

  @Post('recover')
  recover(@Body() body: { telephone: string }) {
    return this.service.recoverSession(body.telephone);
  }

  @Post('fiche-download')
  logFicheDownload(@Body() body: { ficheTitle: string; participantId?: string; prenom?: string; nom?: string; telephone?: string; ville?: string; target?: string; lang?: string; sessionTitle?: string }) {
    return this.service.logFicheDownload(body);
  }

  @Get('fiches-preview')
  getFichesPreview(@Query('target') target: string, @Query('lang') lang: string) {
    return this.service.getFichesPreview(target, lang);
  }

  @Get('my-sessions')
  getMySessions(@Query('participantId') participantId: string) {
    return this.service.getMySessions(participantId);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/unique-leads')
  adminGetUniqueLeads() {
    return this.service.getUniqueLeads();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/app-users')
  adminGetAppUsers() {
    return this.service.getAppUsersWithExamStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/smart-preview')
  adminSmartPreview(
    @Query('target') target = 'INFIRMIER',
    @Query('totalQ') totalQ = '80',
    @Query('criteria') criteria = 'best',
    @Query('fromLastN') fromLastN = '3',
  ) {
    return this.service.getSmartPreview(
      target.toUpperCase(),
      parseInt(totalQ),
      (criteria === 'worst' ? 'worst' : 'best') as 'best' | 'worst',
      parseInt(fromLastN),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/test-session')
  adminTestSession(@Body() body: { examenBlancId: string; lang?: 'fr' | 'ar' }) {
    return this.service.adminTestSession(body.examenBlancId, body.lang ?? 'fr');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/participants/:id/contacted')
  toggleContacted(@Param('id') id: string, @Body() body: { contacted: boolean }) {
    return this.service.setContacted(id, body.contacted);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/fiche-downloads')
  adminFicheDownloads() {
    return this.service.getFicheDownloads();
  }
}
