import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Themes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('themes')
export class ThemesController {
  constructor(private themesService: ThemesService) {}

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.themesService.findAll(lang ? lang.toUpperCase() : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }
}
