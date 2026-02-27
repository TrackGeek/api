import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ResendModule } from "nestjs-resend";
import { EmailService } from "./email.service";

@Global()
@Module({
  imports: [
    ResendModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get<string>("RESEND_API_KEY")!,
      }),
    }),
  ],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
