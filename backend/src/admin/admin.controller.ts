import 'multer';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
  UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private paymentsService: PaymentsService,
    private storageService: StorageService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getUserAnalytics();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('planType') planType?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      planType,
    );
  }

  @Get('groups')
  getGroups() {
    return this.adminService.getGroups();
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Put('users/:id/toggle')
  toggleUser(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Put('users/:id/reset-subscription')
  resetSubscription(@Param('id') id: string) {
    return this.adminService.resetUserSubscription(id);
  }

  @Get('questions')
  getQuestions(
    @Query('page') page?: string,
    @Query('themeId') themeId?: string,
    @Query('subThemeId') subThemeId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getQuestions(page ? parseInt(page) : 1, 20, themeId, search, subThemeId);
  }

  @Put('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateQuestion(id, body);
  }

  @Post('questions/:id/image')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadQuestionImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const url = await this.storageService.uploadImage(file);
    if (!url) throw new BadRequestException('Échec de l\'upload');
    await this.adminService.updateQuestion(id, { imageUrl: url });
    return { imageUrl: url };
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.adminService.deleteQuestion(id);
  }

  @Delete('questions')
  deleteAllQuestions() {
    return this.adminService.deleteAllQuestions();
  }

  @Delete('themes')
  deleteAllThemes() {
    return this.adminService.deleteAllThemes();
  }

  @Get('payments/pending')
  getPendingPayments() {
    return this.paymentsService.getPendingPaymentsWithInvites();
  }

  @Post('payments/:id/validate')
  validatePayment(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.validatePayment(id, req.user.sub);
  }

  @Post('payments/:id/reject')
  rejectPayment(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.paymentsService.rejectPayment(id, req.user.sub, body.reason);
  }

  @Post('import')
  importData(@Body() body: any) {
    return this.adminService.importFromParser(body);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  setSetting(@Param('key') key: string, @Body() body: { value: string }) {
    return this.adminService.setSetting(key, body.value);
  }
}
