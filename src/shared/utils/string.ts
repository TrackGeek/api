export function toCamelCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1).replace(/\s/g, '');
}