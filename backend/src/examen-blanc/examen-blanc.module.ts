import { Module } from '@nestjs/common';
import { ExamenBlancService } from './examen-blanc.service';
import { ExamenBlancController } from './examen-blanc.controller';

@Module({
  providers: [ExamenBlancService],
  controllers: [ExamenBlancController],
  exports: [ExamenBlancService],
})
export class ExamenBlancModule {}
