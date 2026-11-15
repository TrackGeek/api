import { addDays, startOfDayInTimeZone } from "@/shared/utils/date";

interface ReleaseCheckSchedule {
  now: Date;
  timeZone: string;
  nextAirDate?: string | Date | null;
  lastAirDate?: string | Date | null;
  active?: boolean;
}

export function getNextReleaseCheckAt({ now, timeZone, nextAirDate, lastAirDate, active }: ReleaseCheckSchedule) {
  const next = nextAirDate ? new Date(nextAirDate) : null;
  const last = lastAirDate ? new Date(lastAirDate) : null;
  const recent = last && last >= addDays(now, -14);
  const days = active || recent || (next && next >= now && next <= addDays(now, 1)) ? 1 : 7;
  const scheduled = startOfDayInTimeZone(addDays(now, days), timeZone);
  const releaseDay = next && Number.isFinite(next.getTime()) ? startOfDayInTimeZone(next, timeZone) : null;

  return releaseDay && releaseDay > now && releaseDay < scheduled ? releaseDay : scheduled;
}
