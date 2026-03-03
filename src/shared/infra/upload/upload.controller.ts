import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { UploadService } from './upload.service';
import { imageConfig } from './upload.config';

@Controller("upload")
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @UseInterceptors(FileInterceptor("file", imageConfig))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = await this.uploadService.uploadFromBuffer(file.buffer);
    
    return { imageUrl };
  }
}
