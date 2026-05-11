import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_FILES = new Set(['fiche-memo.pdf']);

@Controller('download')
export class DownloadController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // Appelé par le middleware Next.js pour logger sans rediriger
  @Get('track/:filename')
  async trackDownload(
    @Param('filename') filename: string,
    @Query('source') source: string,
    @Req() req: any,
  ) {
    if (!ALLOWED_FILES.has(filename)) return { ok: false };

    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

    // Tenter d'identifier l'utilisateur via le token JWT transmis par le middleware
    let userId: string | null = null;
    const token = req.headers['x-auth-token'];
    if (token) {
      try {
        const payload = this.jwt.verify(token);
        userId = payload.sub ?? null;
      } catch {}
    }

    // Déduplication : ignorer si même identifiant dans les 5 dernières secondes
    const since = new Date(Date.now() - 60000);
    const existing = await this.prisma.pdfDownload.findFirst({
      where: {
        filename,
        downloadedAt: { gte: since },
        ...(userId ? { userId } : { ipAddress: ip }),
      },
    });
    if (existing) return { ok: true, deduplicated: true };

    await this.prisma.pdfDownload.create({
      data: { userId, filename, source: source || 'direct', ipAddress: ip },
    }).catch(() => {});

    return { ok: true };
  }
}
