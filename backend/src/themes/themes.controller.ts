import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
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
  findAll(@Req() req: any, @Query('lang') lang?: string) {
    return this.themesService.findAll(lang ? lang.toUpperCase() : undefined, req.user?.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }
}
