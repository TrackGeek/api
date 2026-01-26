import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Injectable } from "@nestjs/common";

@Injectable()
export class R2Service {
	private readonly s3: S3Client;

	constructor() {
		this.s3 = new S3Client({
			region: "auto",
			endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: process.env.R2_ACCESS_KEY_ID!,
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
			},
		});
	}

	async uploadObject(
		bucket: string,
		key: string,
		body: Buffer | Uint8Array | Blob | string,
	) {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
		});

		await this.s3.send(command);
	}

	async getObjectUrl(
		bucket: string,
		key: string,
		expiresIn: number = 3600,
	): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		const url = await getSignedUrl(this.s3, command, { expiresIn });

		return url;
	}

	async deleteObject(bucket: string, key: string) {
		const command = new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		await this.s3.send(command);
	}
}
