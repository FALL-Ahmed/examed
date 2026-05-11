import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DownloadController } from './download.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'default_secret' }),
  ],
  controllers: [DownloadController],
})
export class DownloadModule {}
