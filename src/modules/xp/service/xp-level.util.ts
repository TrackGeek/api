import { CONTENT_XP_BASE, GLOBAL_XP_BASE, XP_CURVE_EXPONENT } from "@/shared/constants/xp";

export type LevelProgress = {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  percentage: number;
};

export function xpForLevel(level: number, base = GLOBAL_XP_BASE): number {
  if (level <= 1) return 0;

  return Math.floor(base * (level - 1) ** XP_CURVE_EXPONENT);
}

export function levelFromXp(totalXp: number, base = GLOBAL_XP_BASE): number {
  if (totalXp <= 0) return 1;

  const level = Math.floor((totalXp / base) ** (1 / XP_CURVE_EXPONENT)) + 1;

  if (xpForLevel(level + 1, base) <= totalXp) return level + 1;
  if (xpForLevel(level, base) > totalXp) return level - 1;

  return level;
}

export function levelProgress(totalXp: number, base = GLOBAL_XP_BASE): LevelProgress {
  const level = levelFromXp(totalXp, base);
  const floor = xpForLevel(level, base);
  const ceiling = xpForLevel(level + 1, base);
  const span = ceiling - floor;

  return {
    level,
    totalXp,
    currentLevelXp: totalXp - floor,
    nextLevelXp: span,
    percentage: span > 0 ? Math.min(100, parseFloat((((totalXp - floor) / span) * 100).toFixed(1))) : 100,
  };
}

export function contentLevelFromXp(xp: number): number {
  return levelFromXp(xp, CONTENT_XP_BASE);
}

export function contentLevelProgress(xp: number): LevelProgress {
  return levelProgress(xp, CONTENT_XP_BASE);
}
