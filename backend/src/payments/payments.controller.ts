import 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { Controller, Post, Get, Body, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');

class SubmitPaymentDto {
  @Type(() => Number) @IsNumber() amount: number;
  @IsString() @IsIn(['MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER']) paymentMethod: string;
  @IsString() @IsOptional() operator?: string;
  @IsString() @IsOptional() notes?: string;
  @IsOptional() @Type(() => Number) @IsNumber() durationDays?: number;
}

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('receipt', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      cb(null, allowed.includes(file.mimetype));
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['amount', 'paymentMethod'],
      properties: {
        amount: { type: 'number' },
        paymentMethod: { type: 'string', enum: ['MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'] },
        operator: { type: 'string' },
        notes: { type: 'string' },
        receipt: { type: 'string', format: 'binary' },
      },
    },
  })
  submit(
    @Req() req: any,
    @Body() dto: SubmitPaymentDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.paymentsService.submitPayment(req.user.sub, dto, receipt);
  }

  @Get('me')
  getMyPayments(@Req() req: any) {
    return this.paymentsService.getMyPayments(req.user.sub);
  }
}
