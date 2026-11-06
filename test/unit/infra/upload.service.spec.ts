import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { UploadService } from "@/shared/infra/upload/upload.service";

const integrationsService = {
  imgbb: { upload: vi.fn() },
  r2: { upload: vi.fn() },
};
const httpService = { get: vi.fn() };
let provider = "imgbb";
const configService = {
  get: vi.fn((_key: string, defaultValue?: string) => provider || defaultValue),
};

async function createPng(): Promise<Buffer> {
  return sharp({ create: { width: 2, height: 2, channels: 3, background: "#10b981" } })
    .png()
    .toBuffer();
}

describe("UploadService", () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = "imgbb";
    service = new UploadService(integrationsService as any, httpService as any, configService as any);
  });

  it("uses ImgBB by default without converting the buffer", async () => {
    provider = "";
    const buffer = Buffer.from("original");
    integrationsService.imgbb.upload.mockResolvedValue("https://i.ibb.co/image.png");

    await expect(service.uploadFromBuffer(buffer)).resolves.toBe("https://i.ibb.co/image.png");
    expect(integrationsService.imgbb.upload).toHaveBeenCalledWith(buffer);
    expect(integrationsService.r2.upload).not.toHaveBeenCalled();
  });

  it("converts images to WebP before uploading to R2", async () => {
    provider = "r2";
    integrationsService.r2.upload.mockResolvedValue("https://images.trackgeek.test/image.webp");

    await expect(service.uploadFromBuffer(await createPng())).resolves.toBe("https://images.trackgeek.test/image.webp");

    const [buffer, options] = integrationsService.r2.upload.mock.calls[0];
    await expect(sharp(buffer).metadata()).resolves.toMatchObject({ format: "webp" });
    expect(options).toEqual({ contentType: "image/webp" });
    expect(integrationsService.imgbb.upload).not.toHaveBeenCalled();
  });

  it("rejects invalid image data when R2 is selected", async () => {
    provider = "r2";

    await expect(service.uploadFromBuffer(Buffer.from("not-an-image"))).rejects.toBeInstanceOf(AppException);
    expect(integrationsService.r2.upload).not.toHaveBeenCalled();
  });

  it("rejects an unsupported storage provider", async () => {
    provider = "other";

    await expect(service.uploadFromBuffer(Buffer.from("image"))).rejects.toBeInstanceOf(AppException);
  });
});
