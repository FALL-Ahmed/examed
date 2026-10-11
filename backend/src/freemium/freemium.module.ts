import { Module } from '@nestjs/common';
import { FreemiumService } from './freemium.service';
import { FreemiumController, FreemiumAdminController } from './freemium.controller';

@Module({
  providers: [FreemiumService],
  controllers: [FreemiumController, FreemiumAdminController],
  exports: [FreemiumService],
})
export class FreemiumModule {}
