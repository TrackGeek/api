import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "@/shared/exceptions/app.exceptions";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
  },
  PutObjectCommand: class {
    constructor(readonly input: Record<string, unknown>) {}
  },
  HeadObjectCommand: class {
    constructor(readonly input: Record<string, unknown>) {}
  },
}));

import { R2Service } from "@/shared/infra/integrations/r2.service";

const environment: Record<string, string> = {
  R2_ACCOUNT_ID: "account-id",
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
  R2_BUCKET_NAME: "trackgeek",
  R2_PUBLIC_URL: "https://images.trackgeek.test/",
};

const configService = {
  get: vi.fn((key: string) => environment[key]),
};

describe("R2Service", () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service(configService as any);
  });

  it("uploads WebP objects and returns the public URL without a trailing slash", async () => {
    const body = Buffer.from("webp-data");
    send.mockResolvedValue({});

    const result = await service.upload(body, {
      key: "migrations/imgbb/hash.webp",
      contentType: "image/webp",
    });

    expect(result).toBe("https://images.trackgeek.test/migrations/imgbb/hash.webp");
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: "trackgeek",
      Key: "migrations/imgbb/hash.webp",
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("returns false only when the object does not exist", async () => {
    send.mockRejectedValueOnce({ name: "NotFound", $metadata: { httpStatusCode: 404 } });
    await expect(service.objectExists("missing.webp")).resolves.toBe(false);

    send.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(service.objectExists("forbidden.webp")).rejects.toBeInstanceOf(AppException);
  });

  it("fails without leaking credentials when configuration is missing", async () => {
    configService.get.mockReturnValueOnce("");

    await expect(service.upload(Buffer.from("image"))).rejects.toBeInstanceOf(AppException);
    expect(send).not.toHaveBeenCalled();
  });
});
