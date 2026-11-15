import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { type MediaTitleRecord, mapMediaTitles, preferredMediaTitle, type TitleLanguage } from "./media-title-response";

@Injectable()
export class MediaTitleService {
  constructor(private readonly database: DatabaseService) {}

  async localize(data: unknown, language: TitleLanguage) {
    const missing = new Set<string>();
    mapMediaTitles(data, (record, key) => {
      if (!Array.isArray(record.titles) && (language !== "romaji" || key.startsWith("manga:"))) missing.add(key);
      return record;
    });
    const ids = (prefix: string) =>
      [...missing].filter((key) => key.startsWith(prefix)).map((key) => Number(key.slice(prefix.length)));
    const animeIds = ids("anime:mal:");
    const mangaIds = ids("manga:anilist:");
    const mangaMalIds = ids("manga:mal:");
    const [animes, mangas] = await Promise.all([
      animeIds.length
        ? this.database.anime.findMany({
            where: { malId: { in: animeIds } },
            select: { malId: true, title: true, titles: true },
          })
        : [],
      mangaIds.length || mangaMalIds.length
        ? this.database.manga.findMany({
            where: { OR: [{ anilistId: { in: mangaIds } }, { malId: { in: mangaMalIds } }] },
            select: { anilistId: true, malId: true, title: true, titles: true },
          })
        : [],
    ]);
    const stored = new Map<string, MediaTitleRecord>();
    for (const anime of animes) stored.set(`anime:mal:${anime.malId}`, anime);
    for (const manga of mangas) {
      if (manga.anilistId != null) stored.set(`manga:anilist:${manga.anilistId}`, manga);
      if (manga.malId != null) stored.set(`manga:mal:${manga.malId}`, manga);
    }
    return mapMediaTitles(data, (record, key) => {
      const source = Array.isArray(record.titles) ? record : (stored.get(key) ?? record);
      const anime = key.startsWith("anime:");
      return {
        ...record,
        title: preferredMediaTitle(source, language, anime),
        titleRomaji: preferredMediaTitle(source, "romaji", anime),
      };
    });
  }
}
