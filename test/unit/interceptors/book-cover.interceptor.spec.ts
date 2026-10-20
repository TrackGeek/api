import { lastValueFrom, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookCoverInterceptor } from "@/modules/book/interceptor/book-cover.interceptor";

const service = { resolveCovers: vi.fn() };
const auth = { api: { getSession: vi.fn() } };
const response = { setHeader: vi.fn() };
const context = (language?: string) => ({
  getType: () => "http",
  switchToHttp: () => ({
    getRequest: () => ({ get: () => language, headers: {} }),
    getResponse: () => response,
  }),
});

describe("BookCoverInterceptor", () => {
  let interceptor: BookCoverInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    interceptor = new BookCoverInterceptor(service as any, auth as any);
    auth.api.getSession.mockResolvedValue({ user: { id: "viewer" } });
    service.resolveCovers.mockResolvedValue(new Map([[1, { editionId: 9, imageUrl: "personal.jpg", custom: true }]]));
  });

  it("resolves covers for the viewer, even when viewing another user's library", async () => {
    const data = { userId: "library-owner", book: { hardcoverId: 1, imageUrl: "default.jpg" } };
    const result = await lastValueFrom(interceptor.intercept(context("pt-PT") as any, { handle: () => of(data) }));
    expect(service.resolveCovers).toHaveBeenCalledWith([1], "pt-PT", "viewer");
    expect(result).toMatchObject({ book: { imageUrl: "personal.jpg", customCoverEditionId: 9 } });
    expect(data.book.imageUrl).toBe("default.jpg");
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
  });

  it("supports anonymous visitors", async () => {
    auth.api.getSession.mockResolvedValue(null);
    await lastValueFrom(
      interceptor.intercept(context("pt-BR") as any, {
        handle: () => of({ hardcoverId: 1, imageUrl: "default.jpg" }),
      }),
    );
    expect(service.resolveCovers).toHaveBeenCalledWith([1], "pt-BR", undefined);
  });

  it("skips unrelated responses and requests without a site language", async () => {
    await lastValueFrom(interceptor.intercept(context("pt-PT") as any, { handle: () => of({ anime: { malId: 1 } }) }));
    await lastValueFrom(
      interceptor.intercept(context() as any, { handle: () => of({ hardcoverId: 1, imageUrl: "default.jpg" }) }),
    );
    expect(service.resolveCovers).not.toHaveBeenCalled();
    expect(auth.api.getSession).not.toHaveBeenCalled();
  });
});
