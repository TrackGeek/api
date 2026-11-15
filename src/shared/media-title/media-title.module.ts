import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MediaTitleInterceptor } from "./media-title.interceptor";
import { MediaTitleService } from "./media-title.service";

@Module({
  providers: [MediaTitleService, { provide: APP_INTERCEPTOR, useClass: MediaTitleInterceptor }],
})
export class MediaTitleModule {}
