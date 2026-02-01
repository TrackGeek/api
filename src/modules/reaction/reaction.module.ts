import { Module } from '@nestjs/common';
import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';
import { PrismaModule } from '@/shared/infra/prisma/prisma.module';
import { CacheModule } from '@/shared/infra/cache/cache.module';
import { UserModule } from '../user/auth.module';

@Module({
  imports: [PrismaModule, CacheModule, UserModule],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
