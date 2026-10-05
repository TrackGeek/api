import { throwError } from "rxjs";
import { expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { AnilistService } from "@/shared/infra/integrations/anilist.service";

it("preserves AniList rate limits so importer can wait instead of failing as service unavailable", async () => {
  const http = { post: vi.fn().mockReturnValue(throwError(() => ({ response: { status: 429 } }))) };
  const cache = { get: vi.fn().mockResolvedValue(null) };
  const service = new AnilistService(http as any, cache as any);
  await expect(service.getMangaById(10)).rejects.toEqual(new AppException(ERROR_CODES.RATE_LIMIT_EXCEEDED));
});
