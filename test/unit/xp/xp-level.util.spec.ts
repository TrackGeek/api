import { describe, expect, it } from "vitest";
import { contentLevelFromXp, levelFromXp, levelProgress, xpForLevel } from "@/modules/xp/service/xp-level.util";
import { CONTENT_XP_BASE, GLOBAL_XP_BASE } from "@/shared/constants/xp";

describe("xp-level.util", () => {
  it("level 1 custa 0 xp", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(0)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-10)).toBe(1);
  });

  it("a curva é estritamente crescente", () => {
    for (let level = 2; level <= 200; level++) {
      expect(xpForLevel(level)).toBeGreaterThan(xpForLevel(level - 1));
    }
  });

  it("levelFromXp é a inversa exata de xpForLevel", () => {
    for (let level = 1; level <= 200; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
    }
  });

  it("um xp abaixo do limiar ainda é o level anterior", () => {
    for (let level = 2; level <= 200; level++) {
      expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it("vale para as duas bases", () => {
    for (const base of [GLOBAL_XP_BASE, CONTENT_XP_BASE]) {
      for (let level = 1; level <= 200; level++) {
        expect(levelFromXp(xpForLevel(level, base), base)).toBe(level);
      }
    }
  });

  it("a base por mídia progride mais rápido que a global", () => {
    expect(contentLevelFromXp(3000)).toBeGreaterThan(levelFromXp(3000));
  });

  it("levelProgress reporta a fatia dentro do level atual", () => {
    const atFloor = levelProgress(xpForLevel(10));

    expect(atFloor.level).toBe(10);
    expect(atFloor.currentLevelXp).toBe(0);
    expect(atFloor.percentage).toBe(0);
    expect(atFloor.nextLevelXp).toBe(xpForLevel(11) - xpForLevel(10));

    const midway = levelProgress(xpForLevel(10) + Math.floor(atFloor.nextLevelXp / 2));

    expect(midway.level).toBe(10);
    expect(midway.percentage).toBeGreaterThan(45);
    expect(midway.percentage).toBeLessThan(55);
  });
});
