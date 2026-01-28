import { ERROR_CODES } from "@/config/errors.config";
import { HttpService } from "@nestjs/axios";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ImgBBService {
	private readonly logger = new Logger(ImgBBService.name);

	constructor(private readonly httpService: HttpService) {}

	get baseUrl() {
		return "https://api.imgbb.com/1/";
	}

	async upload(buffer: Buffer) {
		try {
			const apiKey = process.env.IMGBB_API_KEY;

			const url = `${this.baseUrl}upload?key=${apiKey}`;

			const formData = new FormData();

			formData.append("image", buffer.toString("base64"));

			const response = await this.httpService.axiosRef.post(url, formData);

			return response.data?.data?.image?.url;
		} catch (error) {
			throw new BadRequestException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
		}
	}
}
