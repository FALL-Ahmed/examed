import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KeepaliveService {
  private readonly logger = new Logger(KeepaliveService.name);

  constructor(private prisma: PrismaService) {}

  // Ping la DB toutes les 96h pour éviter la mise en veille Supabase (pause après 7j d'inactivité)
  @Cron('0 0 */4 * *')
  async pingDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('Supabase keepalive ping OK');
    } catch (e) {
      this.logger.error('Supabase keepalive ping échoué', e);
    }
  }
}
