import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const base = process.env.DATABASE_URL ?? '';
    const sep = base.includes('?') ? '&' : '?';
    super({ datasources: { db: { url: base + sep + 'connection_limit=10&pool_timeout=20&pgbouncer=true' } } });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
