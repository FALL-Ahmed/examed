import {
  Controller, Post, Get, Delete, Body, Req, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshDto, ResetPasswordDto, VerifyDeviceDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: any) {
    const deviceId = req.headers['x-device-id'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return this.authService.login(dto.email, dto.password, { deviceId, userAgent, ip });
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto, @Req() req: any) {
    const deviceId = req.headers['x-device-id'] || 'unknown';
    return this.authService.refresh(dto.refreshToken, deviceId);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.sub, req.user.deviceId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getSessions(@Req() req: any) {
    return this.authService.getSessions(req.user.sub);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeSession(@Req() req: any, @Param('id') id: string) {
    return this.authService.revokeSession(req.user.sub, id);
  }

  // ──── DEVICE TRUST ENDPOINTS ────

  @Post('devices/verify')
  @HttpCode(200)
  verifyDevice(@Body() dto: VerifyDeviceDto) {
    return this.authService.verifyDevice(dto);
  }

  @Get('devices/trusted')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getTrustedDevices(@Req() req: any) {
    return this.authService.getTrustedDevices(req.user.sub);
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeTrustedDevice(@Req() req: any, @Param('id') id: string) {
    return this.authService.revokeTrustedDevice(req.user.sub, id);
  }

  @Get('check-invite')
  checkGroupInvite(@Query('email') email: string) {
    return this.authService.checkGroupInvite(email);
  }
}
