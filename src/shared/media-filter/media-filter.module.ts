import { Global, Module } from "@nestjs/common";

import { MediaFilterService } from "./media-filter.service";

@Global()
@Module({
  providers: [MediaFilterService],
  exports: [MediaFilterService],
})
export class MediaFilterModule {}
