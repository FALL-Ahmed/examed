import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_FILES = new Set(['fiche-memo.pdf']);

@Controller('download')
export class DownloadController {
  constructor(private prisma: PrismaService) {}

  // Appelé par le middleware Next.js pour logger sans rediriger
  @Get('track/:filename')
  async trackDownload(
    @Param('filename') filename: string,
    @Query('source') source: string,
    @Req() req: any,
  ) {
    if (!ALLOWED_FILES.has(filename)) return { ok: false };

    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

    await this.prisma.pdfDownload.create({
      data: { userId: null, filename, source: source || 'direct', ipAddress: ip },
    }).catch(() => {});

    return { ok: true };
  }
}
