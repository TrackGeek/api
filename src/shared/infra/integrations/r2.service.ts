import { randomUUID } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

export interface R2UploadOptions {
  key?: string;
  contentType?: string;
  cacheControl?: string;
}

interface R2Config {
  bucketName: string;
  publicUrl: string;
  client: S3Client;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  async upload(buffer: Buffer, options: R2UploadOptions = {}): Promise<string> {
    const key = options.key ?? `images/${randomUUID()}.webp`;

    try {
      const { bucketName, client } = this.getConfig();

      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: options.contentType ?? "application/octet-stream",
          CacheControl: options.cacheControl ?? "public, max-age=31536000, immutable",
        }),
      );

      return this.getObjectUrl(key);
    } catch (error) {
      this.logger.error("Failed to upload image to R2", error instanceof Error ? error.stack : error);
      throw new AppException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const { bucketName, client } = this.getConfig();
      await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;

      if (status === 404 || name === "NotFound" || name === "NoSuchKey") return false;

      this.logger.error("Failed to check R2 object", error instanceof Error ? error.stack : error);
      throw new AppException(ERROR_CODES.FAILED_TO_UPLOAD_IMAGE);
    }
  }

  getObjectUrl(key: string): string {
    const { publicUrl } = this.getConfig();
    return `${publicUrl}/${key}`;
  }

  private getConfig(): R2Config {
    const accountId = this.getRequired("R2_ACCOUNT_ID");
    const accessKeyId = this.getRequired("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.getRequired("R2_SECRET_ACCESS_KEY");
    const bucketName = this.getRequired("R2_BUCKET_NAME");
    const publicUrl = this.getRequired("R2_PUBLIC_URL").replace(/\/+$/, "");

    this.client ??= new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

    return { bucketName, publicUrl, client: this.client };
  }

  private getRequired(name: string): string {
    const value = this.configService.get<string>(name)?.trim();
    if (!value) throw new Error(`${name} is required when R2 image storage is used`);
    return value;
  }
}
