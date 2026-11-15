export type TitleLanguage = "romaji" | "native" | "english";
export type MediaTitleRecord = Record<string, unknown>;

export function mediaTitleKey(record: MediaTitleRecord, parentKey = ""): string | null {
  if (typeof record.title !== "string" || !("imageUrl" in record || "titles" in record)) return null;
  const anime = parentKey === "anime" || record.type === "ANIME";
  const manga = !anime && (parentKey === "manga" || "anilistId" in record);
  if (manga && Number.isInteger(record.anilistId)) return `manga:anilist:${record.anilistId}`;
  if (Number.isInteger(record.malId)) return `${manga ? "manga" : "anime"}:mal:${record.malId}`;
  return null;
}

export function mapMediaTitles(
  value: unknown,
  transform: (record: MediaTitleRecord, key: string) => MediaTitleRecord,
  parentKey = "",
): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => mapMediaTitles(item, transform, parentKey));
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const record = value as MediaTitleRecord;
  const result = Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, mapMediaTitles(item, transform, key)]),
  );
  const key = mediaTitleKey(record, parentKey);
  return key ? transform(result, key) : result;
}

export function preferredMediaTitle(record: MediaTitleRecord, language: TitleLanguage, anime: boolean): string {
  const titles = Array.isArray(record.titles) ? record.titles : [];
  const find = (types: string[]) => {
    for (const type of types) {
      const entry = titles.find(
        (value) =>
          value &&
          typeof value === "object" &&
          value.type === type &&
          typeof value.title === "string" &&
          value.title.trim(),
      );
      if (entry) return entry.title.trim() as string;
    }
    return undefined;
  };
  const romaji = find(anime ? ["Romaji", "Default"] : ["Romaji"]);
  const preferred =
    language === "english" ? find(["English"]) : language === "native" ? find(["Native", "Japanese"]) : romaji;
  return preferred ?? romaji ?? String(record.title ?? "");
}
