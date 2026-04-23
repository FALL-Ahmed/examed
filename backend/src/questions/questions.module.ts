import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { PublicQuestionsController } from './public-questions.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [QuestionsService],
  controllers: [PublicQuestionsController, QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}
