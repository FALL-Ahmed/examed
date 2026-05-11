import { Module } from '@nestjs/common';
import { DownloadController } from './download.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DownloadController],
})
export class DownloadModule {}
