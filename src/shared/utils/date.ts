const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, number>>((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = Number(part.value);
    }

    return accumulator;
  }, {});

  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const offset = getTimeZoneOffsetMs(date, timeZone);
  const shifted = new Date(date.getTime() + offset);
  const midnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());

  return new Date(midnight - offset);
}

export function endOfDayInTimeZone(date: Date, timeZone: string): Date {
  return new Date(startOfDayInTimeZone(date, timeZone).getTime() + MS_PER_DAY - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Chave YYYY-MM-DD do dia UTC. Usada como sourceKey de streak e como corte do teto diário.
export function utcDayKey(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

// Dias inteiros entre dois instantes, comparando meia-noite UTC de cada um.
export function diffUtcDays(from: Date, to: Date): number {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / MS_PER_DAY);
}
