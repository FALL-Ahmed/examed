import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Get('me/stats')
  getStats(@Req() req: any) {
    return this.usersService.getStats(req.user.sub);
  }

  @Post('track-pdf')
  trackPdf(@Req() req: any, @Body() body: { filename: string; source?: string }) {
    return this.usersService.trackPdfDownload(req.user.sub, body.filename || 'fiche-memo.pdf', body.source || 'app');
  }
}
