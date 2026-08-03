export function toCamelCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1).replace(/\s/g, "");
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseIdFromSlug(slug: string): number | null {
  const id = Number.parseInt(slug, 10);

  return Number.isNaN(id) ? null : id;
}
