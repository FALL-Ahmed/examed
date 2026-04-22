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
    const imported = await this.adminService.importFromParser(parsed, 'FR');
    return { parsed: parsed.stats, imported };
  }

  @Post('text-preview')
  async textPreview(@Body('text') text: string) {
    return this.pdfService.parseTextPreview(text);
  }

  @Post('text-import')
  async textImport(@Body('text') text: string) {
    const parsed = await this.pdfService.parseTextImport(text);
    const imported = await this.adminService.importFromParser(parsed, 'FR');
    return { parsed: parsed.stats, imported };
  }

  @Post('ar-text-preview')
  async arTextPreview(@Body('text') text: string) {
    return this.pdfService.parseArTextPreview(text);
  }

  @Post('ar-text-import')
  async arTextImport(@Body('text') text: string) {
    const parsed = await this.pdfService.parseArTextImport(text);
    const imported = await this.adminService.importFromParser(parsed, 'AR');
    return { parsed: parsed.stats, imported };
  }

  @Post('json-preview')
  async jsonPreview(@Body() body: Record<string, any>) {
    const parsed = this.pdfService.parseJsonImport(body);
    const detectedLang = /[؀-ۿ]/.test(JSON.stringify(body).slice(0, 500)) ? 'AR' : 'FR';
    return {
      stats: { ...parsed.stats, language: detectedLang },
      themes: parsed.themes.slice(0, 3).map((t: any) => ({
        name: t.name,
        subThemes: t.subThemes.slice(0, 2).map((s: any) => ({
          name: s.name,
          questions: s.questions.slice(0, 2),
          totalQuestions: s.questions.length,
        })),
      })),
    };
  }

  @Post('json-import')
  async jsonImport(@Body() body: Record<string, any>) {
    const detectedLang = /[؀-ۿ]/.test(JSON.stringify(body).slice(0, 500)) ? 'AR' : 'FR';
    const parsed = this.pdfService.parseJsonImport(body);
    const imported = await this.adminService.importFromParser(parsed, detectedLang);
    return { parsed: { ...parsed.stats, language: detectedLang }, imported };
  }
}
