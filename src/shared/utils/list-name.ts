const LIST_TYPE_SUFFIX_PATTERN = /\s*\((?:tv shows?|movies?|games?|mangas?|animes?|books?)\)\s*$/i;

/**
 * Lists are unique per (userId, name), so users split the same list across content types by suffixing
 * the name with the type — "My favorites (Games)" / "My favorites (Movies)". This returns the shared base name.
 */
export function stripListTypeSuffix(name: string) {
  const stripped = name.replace(LIST_TYPE_SUFFIX_PATTERN, "").trim();

  return stripped || name.trim();
}
