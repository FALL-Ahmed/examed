import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private paymentsService: PaymentsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Put('users/:id/toggle')
  toggleUser(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Get('questions')
  getQuestions(
    @Query('page') page?: string,
    @Query('themeId') themeId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getQuestions(page ? parseInt(page) : 1, 20, themeId, search);
  }

  @Put('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.adminService.deleteQuestion(id);
  }

  @Get('payments/pending')
  getPendingPayments() {
    return this.paymentsService.getPendingPayments();
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
