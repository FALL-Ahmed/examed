import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  subscribe(@Body() body: { endpoint: string; p256dh: string; auth: string }) {
    return this.pushService.subscribe(body.endpoint, body.p256dh, body.auth);
  }

  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(body.endpoint);
  }
}
