import { beforeEach, describe, expect, it, vi } from "vitest";
import { MangaService } from "@/modules/manga/service/manga.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

describe("MangaService", () => {
  const database = {
    manga: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  const anilist = { getMangaById: vi.fn(), getMangaByMalId: vi.fn() };
  const service = new MangaService(database as any, { anilist } as any, {} as any);
  const details = { anilistId: 30013, malId: 11, title: "Naruto", publishedFrom: null };
  const stored = { ...details, id: "manga-1" };

  beforeEach(() => {
    vi.resetAllMocks();
    database.manga.findUnique.mockResolvedValue(null);
    database.manga.findFirst.mockResolvedValue(null);
    database.manga.create.mockResolvedValue(stored);
    database.manga.update.mockResolvedValue(stored);
    anilist.getMangaByMalId.mockResolvedValue(details);
  });

  it("returns an existing MAL match without looking up the same number as an AniList ID", async () => {
    database.manga.findUnique.mockResolvedValue(stored);

    expect(await service.getMangaByMalId(11)).toEqual(stored);
    expect(database.manga.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { malId: 11 } });
    expect(anilist.getMangaByMalId).not.toHaveBeenCalled();
    expect(anilist.getMangaById).not.toHaveBeenCalled();
  });

  it("resolves missing MAL entries through AniList's MAL lookup and stores both IDs", async () => {
    expect(await service.getMangaByMalId(11)).toEqual(stored);
    expect(anilist.getMangaByMalId).toHaveBeenCalledExactlyOnceWith(11);
    expect(anilist.getMangaById).not.toHaveBeenCalled();
    expect(database.manga.create).toHaveBeenCalledExactlyOnceWith({
      data: { anilistId: 30013, malId: 11, title: "Naruto", lastRefreshedAt: expect.any(Date) },
    });
  });

  it("adopts an existing AniList row while preserving its internal ID and user records", async () => {
    database.manga.findFirst.mockResolvedValue({ id: "manga-1" });

    expect(await service.getMangaByMalId(11)).toEqual(stored);
    expect(database.manga.create).not.toHaveBeenCalled();
    expect(database.manga.update).toHaveBeenCalledWith({
      where: { id: "manga-1" },
      data: expect.objectContaining({ anilistId: 30013, malId: 11 }),
    });
  });

  it("propagates missing MAL matches without creating a manga", async () => {
    const error = new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    anilist.getMangaByMalId.mockRejectedValue(error);

    await expect(service.getMangaByMalId(11)).rejects.toBe(error);
    expect(database.manga.create).not.toHaveBeenCalled();
  });

  it("attaches an AniList ID to legacy MAL rows without replacing their internal ID", async () => {
    database.manga.findUnique.mockResolvedValue({ ...stored, anilistId: null });
    database.manga.findFirst.mockResolvedValue({ id: "manga-1" });

    expect(await service.getMangaByMalId(11)).toEqual(stored);
    expect(anilist.getMangaByMalId).toHaveBeenCalledExactlyOnceWith(11);
    expect(database.manga.create).not.toHaveBeenCalled();
    expect(database.manga.update).toHaveBeenCalledWith({
      where: { id: "manga-1" },
      data: expect.objectContaining({ anilistId: 30013, malId: 11 }),
    });
  });
});
