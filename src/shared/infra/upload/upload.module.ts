import { Global, Module } from "@nestjs/common";

import { UploadService } from "./upload.service";
import { UploadController } from './upload.controller';

@Global()
@Module({
  imports: [],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
