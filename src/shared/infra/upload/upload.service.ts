import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

import { IntegrationsService } from "../integrations/integrations.service";

@Injectable()
export class UploadService {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly httpService: HttpService,
  ) {}

  async uploadFromUrl(imageUrl: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.get(imageUrl, {
        responseType: "arraybuffer",
      }),
    );

    const buffer = Buffer.from(response.data, "binary");

    return this.integrationsService.imgbb.upload(buffer);
  }

  async uploadFromBuffer(buffer: Buffer): Promise<string> {
    return this.integrationsService.imgbb.upload(buffer);
  }
}
