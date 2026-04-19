import { Module } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { QuestionsModule } from '../questions/questions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [QuestionsModule, UsersModule],
  providers: [AttemptsService],
  controllers: [AttemptsController],
})
export class AttemptsModule {}
