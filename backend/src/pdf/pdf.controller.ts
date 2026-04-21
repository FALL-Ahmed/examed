import {
  Controller, Post, UploadedFile, UseGuards, UseInterceptors, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PdfService } from './pdf.service';
import { AdminService } from '../admin/admin.service';

@ApiTags('PDF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('pdf')
export class PdfController {
  constructor(
    private pdfService: PdfService,
    private adminService: AdminService,
  ) {}

  @Post('preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async preview(@UploadedFile() file: Express.Multer.File) {
    return this.pdfService.parseAndPreview(file.buffer, file.originalname);
  }

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async importPdf(@UploadedFile() file: Express.Multer.File) {
    const parsed = await this.pdfService.parseAndImport(file.buffer, file.originalname);
    const imported = await this.adminService.importFromParser(parsed);
    return { parsed: parsed.stats, imported };
  }

  @Post('text-preview')
  async textPreview(@Body('text') text: string) {
    return this.pdfService.parseTextPreview(text);
  }

  @Post('text-import')
  async textImport(@Body('text') text: string) {
    const parsed = await this.pdfService.parseTextImport(text);
    const imported = await this.adminService.importFromParser(parsed);
    return { parsed: parsed.stats, imported };
  }

  @Post('ar-text-preview')
  async arTextPreview(@Body('text') text: string) {
    return this.pdfService.parseArTextPreview(text);
  }

  @Post('ar-text-import')
  async arTextImport(@Body('text') text: string) {
    const parsed = await this.pdfService.parseArTextImport(text);
    const imported = await this.adminService.importFromParser(parsed);
    return { parsed: parsed.stats, imported };
  }
}
