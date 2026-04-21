import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SettingsController } from './settings.controller';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PaymentsModule, StorageModule],
  providers: [AdminService],
  controllers: [AdminController, SettingsController],
  exports: [AdminService],
})
export class AdminModule {}
