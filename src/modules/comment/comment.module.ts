import { Module } from '@nestjs/common';

import { CommentService } from './comment.service';
import { PrismaModule } from '@/shared/infra/prisma/prisma.module';
import { CacheModule } from '@/shared/infra/cache/cache.module';
import { CommentController } from './comment.controller';
import { UserModule } from '../user/auth.module';

@Module({
  imports: [PrismaModule, CacheModule, UserModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService]
})
export class CommentModule {}
