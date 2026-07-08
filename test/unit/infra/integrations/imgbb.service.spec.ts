import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { IMGBBService } from "@/shared/infra/integrations/imgbb.service";

const mockHttpService = {
  post: vi.fn(),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue("fake-imgbb-key"),
};

describe("IMGBBService", () => {
  let service: IMGBBService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IMGBBService(mockConfigService as any, mockHttpService as any);
  });

  describe("upload", () => {
    it("should upload a buffer and return the image URL", async () => {
      const buffer = Buffer.from("fake-image-data");
      const imageUrl = "https://i.ibb.co/abc123/image.jpg";

      mockHttpService.post.mockReturnValue(of({ data: { data: { image: { url: imageUrl } } } }));

      const result = await service.upload(buffer);

      expect(result).toBe(imageUrl);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "https://api.imgbb.com/1/upload",
        expect.any(FormData),
        expect.objectContaining({
          params: { key: "fake-imgbb-key" },
        }),
      );
    });

    it("should throw AppException when the HTTP request fails", async () => {
      const buffer = Buffer.from("bad-data");

      mockHttpService.post.mockReturnValue(throwError(() => new Error("Network error")));

      await expect(service.upload(buffer)).rejects.toBeInstanceOf(AppException);
    });
  });
});
