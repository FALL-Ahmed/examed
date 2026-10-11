import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FreemiumService } from './freemium.service';

// Public — la page d'inscription affiche l'option « Essai gratuit » seulement si la campagne est ouverte
@Controller('freemium')
export class FreemiumController {
  constructor(private freemium: FreemiumService) {}

  @Get('status')
  status() {
    return this.freemium.getPublicStatus();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/freemium')
export class FreemiumAdminController {
  constructor(private freemium: FreemiumService) {}

  @Get()
  async overview() {
    const [config, themes] = await Promise.all([this.freemium.getConfig(), this.freemium.getContentTree()]);
    return { config, open: this.freemium.isOpen(config), themes };
  }

  @Put('config')
  updateConfig(@Body() dto: { enabled: boolean; startDate: string; endDate: string }) {
    return this.freemium.updateConfig(dto);
  }

  @Put('subthemes')
  setSubThemes(@Body() dto: { subThemeIds: string[]; isFreemium: boolean }) {
    return this.freemium.setSubThemes(dto.subThemeIds, dto.isFreemium);
  }

  @Get('users')
  users() {
    return this.freemium.getUsers();
  }

  @Get('stats')
  stats(@Query('days') days?: string) {
    const n = Math.min(90, Math.max(7, parseInt(days ?? '30', 10) || 30));
    return this.freemium.getStats(n);
  }
}
