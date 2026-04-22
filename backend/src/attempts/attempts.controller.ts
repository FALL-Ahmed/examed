import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttemptsService } from './attempts.service';

class StartAttemptDto {
  @IsIn(['PRACTICE', 'EXAM', 'REVIEW'])
  mode: 'PRACTICE' | 'EXAM' | 'REVIEW';

  @IsOptional() @IsString()
  themeId?: string;

  @IsOptional() @IsString()
  subThemeId?: string;

  @IsOptional() @IsNumber()
  count?: number;

  @IsOptional() @IsNumber()
  durationMinutes?: number;

  @IsOptional() @IsString()
  language?: string;
}

class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;
}

@ApiTags('Attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private attemptsService: AttemptsService) {}

  @Post('start')
  start(@Req() req: any, @Body() dto: StartAttemptDto) {
    return this.attemptsService.startAttempt(req.user.sub, req.user.role, dto);
  }

  @Post(':id/answer')
  answer(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitAnswerDto) {
    return this.attemptsService.submitAnswer(req.user.sub, id, dto);
  }

  @Post(':id/finish')
  finish(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.finishAttempt(req.user.sub, id);
  }

  @Get(':id/review')
  review(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.getAttemptReview(req.user.sub, id);
  }

  @Get('history/me')
  history(@Req() req: any) {
    return this.attemptsService.getUserHistory(req.user.sub);
  }
}
