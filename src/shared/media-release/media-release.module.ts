import { Global, Module } from "@nestjs/common";

import { MediaReleaseService } from "./media-release.service";

@Global()
@Module({
  providers: [MediaReleaseService],
  exports: [MediaReleaseService],
})
export class MediaReleaseModule {}
