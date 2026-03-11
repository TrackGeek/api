export function filtersToString(filters: Record<string, any>) {
  const filterStr = Object.entries(filters)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(":");

  return filterStr ? `:${filterStr}` : "";
}
