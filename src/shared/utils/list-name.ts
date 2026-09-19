const LIST_TYPE_SUFFIX_PATTERN = /\s*\((?:tv shows?|movies?|games?|mangas?|animes?|books?)\)\s*$/i;

export function stripListTypeSuffix(name: string) {
  const stripped = name.replace(LIST_TYPE_SUFFIX_PATTERN, "").trim();

  return stripped || name.trim();
}
