import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Themes')
@Controller('themes')
export class ThemesController {
  constructor(private themesService: ThemesService) {}

  // Public — accessible sans auth (pour la page pratique gratuite)
  @Get('public')
  findAllPublic(@Query('lang') lang?: string) {
    return this.themesService.findAll(lang ? lang.toUpperCase() : undefined, undefined);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any, @Query('lang') lang?: string) {
    return this.themesService.findAll(lang ? lang.toUpperCase() : undefined, req.user?.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }
}
