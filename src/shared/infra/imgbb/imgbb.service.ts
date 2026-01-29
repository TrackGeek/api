import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class ImgBBService {
	private readonly logger = new Logger(ImgBBService.name);

	private readonly IMGBB_API_URL = "https://api.imgbb.com/1";

	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
	) {}

	async uploadFromUrl(imageUrl: string) {
		const response = await firstValueFrom(
			this.httpService.get(imageUrl, {
				responseType: "arraybuffer",
			}),
		);

		const buffer = Buffer.from(response.data, "binary");

		return this.uploadFromBuffer(buffer);
	}

	async uploadFromBuffer(buffer: Buffer) {
		try {
			const formData = new FormData();

			formData.append("image", buffer.toString("base64"));

			const response = await firstValueFrom(
				this.httpService.post(`${this.IMGBB_API_URL}/upload`, formData, {
					params: {
						key: this.configService.get<string>("IMGBB_API_KEY"),
					},
				}),
			);

			return response.data?.data?.image?.url;
		} catch (error) {
			this.logger.error("Failed to upload image to ImgBB", error);

			throw new AppException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
		}
	}
}
