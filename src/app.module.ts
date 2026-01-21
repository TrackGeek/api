import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ResendModule } from 'nestjs-resend';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    ResendModule.forRoot({ apiKey: process.env.RESEND_API_KEY! }),
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
