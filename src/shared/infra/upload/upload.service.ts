import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

import { IntegrationsService } from "../integrations/integrations.service";
import { convertImageToWebp, WEBP_CONTENT_TYPE } from "./image-converter";

@Injectable()
export class UploadService {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async uploadFromUrl(imageUrl: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.get(imageUrl, {
        responseType: "arraybuffer",
      }),
    );

    const buffer = Buffer.from(response.data, "binary");

    return this.uploadFromBuffer(buffer);
  }

  async uploadFromBuffer(buffer: Buffer): Promise<string> {
    const provider = this.configService.get<string>("IMAGE_STORAGE_PROVIDER", "imgbb").toLowerCase();

    if (provider === "imgbb") return this.integrationsService.imgbb.upload(buffer);

    if (provider === "r2") {
      try {
        const webp = await convertImageToWebp(buffer);
        return await this.integrationsService.r2.upload(webp, { contentType: WEBP_CONTENT_TYPE });
      } catch (error) {
        if (error instanceof AppException) throw error;
        throw new AppException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
      }
    }

    throw new AppException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
  }
}
