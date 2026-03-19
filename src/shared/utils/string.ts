export function toCamelCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1).replace(/\s/g, "");
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
