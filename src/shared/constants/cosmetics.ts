import { CosmeticType } from "@prisma/generated/enums";

export type CosmeticUnlock =
  | { type: "default" }
  | { type: "level"; value: number }
  | { type: "mission"; key: string }
  | { type: "purchase"; price: number };

export type Cosmetic = {
  key: string;
  // Hex para ProfileColor (Profile.color guarda o hex); igual à key nos demais
  // tipos, cujo visual vive no web mapeado pela key.
  value: string;
  unlock: CosmeticUnlock;
};

// A cor default do Profile (schema.prisma: Profile.color) precisa estar sempre
// destravada, senão um usuário novo já nasce com um valor inválido.
export const DEFAULT_PROFILE_COLOR = "#10b981";

// Cores sólidas são todas livres: o perfil aceita qualquer hex (custom color),
// então o catálogo de sólidas existe só como preset de UX. Gradientes são os
// únicos itens pagos deste tipo e vivem em Profile.color como `gradient:<key>`.
export const PROFILE_GRADIENT_PREFIX = "gradient:";

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const PROFILE_COLORS: Cosmetic[] = [
  { key: "emerald", value: DEFAULT_PROFILE_COLOR, unlock: { type: "default" } },
  { key: "slate", value: "#64748b", unlock: { type: "default" } },
  { key: "blue", value: "#3b82f6", unlock: { type: "default" } },
  { key: "rose", value: "#f43f5e", unlock: { type: "default" } },
  { key: "amber", value: "#f59e0b", unlock: { type: "default" } },
  { key: "violet", value: "#8b5cf6", unlock: { type: "default" } },
  { key: "cyan", value: "#06b6d4", unlock: { type: "default" } },
  { key: "fuchsia", value: "#d946ef", unlock: { type: "default" } },
  { key: "gold", value: "#eab308", unlock: { type: "default" } },
  { key: "crimson", value: "#dc2626", unlock: { type: "default" } },
  { key: "obsidian", value: "#27272a", unlock: { type: "default" } },
  { key: "otaku", value: "#ff6b9d", unlock: { type: "default" } },
  { key: "critic", value: "#14b8a6", unlock: { type: "default" } },
  { key: "omnivore", value: "#a855f7", unlock: { type: "default" } },
  { key: "devoted", value: "#f97316", unlock: { type: "default" } },
  { key: "graphite", value: "#374151", unlock: { type: "default" } },
  { key: "ruby", value: "#e11d48", unlock: { type: "default" } },
  { key: "sapphire", value: "#2563eb", unlock: { type: "default" } },
  { key: "jade", value: "#059669", unlock: { type: "default" } },
  { key: "sunset", value: "#fb923c", unlock: { type: "default" } },
  { key: "orchid", value: "#c026d3", unlock: { type: "default" } },
  { key: "dusk", value: `${PROFILE_GRADIENT_PREFIX}dusk`, unlock: { type: "purchase", price: 200 } },
  { key: "oceanic", value: `${PROFILE_GRADIENT_PREFIX}oceanic`, unlock: { type: "purchase", price: 200 } },
  { key: "sunrise", value: `${PROFILE_GRADIENT_PREFIX}sunrise`, unlock: { type: "purchase", price: 250 } },
  { key: "nebula", value: `${PROFILE_GRADIENT_PREFIX}nebula`, unlock: { type: "purchase", price: 300 } },
  { key: "aurora_flow", value: `${PROFILE_GRADIENT_PREFIX}aurora_flow`, unlock: { type: "purchase", price: 400 } },
  { key: "prism", value: `${PROFILE_GRADIENT_PREFIX}prism`, unlock: { type: "purchase", price: 550 } },
];

export const AVATAR_FRAMES: Cosmetic[] = [
  { key: "none", value: "none", unlock: { type: "default" } },
  { key: "glow", value: "glow", unlock: { type: "purchase", price: 100 } },
  { key: "neon", value: "neon", unlock: { type: "purchase", price: 150 } },
  { key: "gold_ring", value: "gold_ring", unlock: { type: "purchase", price: 250 } },
  { key: "rose_petals", value: "rose_petals", unlock: { type: "purchase", price: 250 } },
  { key: "aurora", value: "aurora", unlock: { type: "purchase", price: 400 } },
  { key: "obsidian_ring", value: "obsidian_ring", unlock: { type: "purchase", price: 550 } },
];

export const PROFILE_TITLES: Cosmetic[] = [
  { key: "none", value: "none", unlock: { type: "default" } },
  { key: "collector", value: "collector", unlock: { type: "purchase", price: 60 } },
  { key: "night_owl", value: "night_owl", unlock: { type: "purchase", price: 60 } },
  { key: "binge_watcher", value: "binge_watcher", unlock: { type: "purchase", price: 90 } },
  { key: "page_turner", value: "page_turner", unlock: { type: "purchase", price: 90 } },
  { key: "trendsetter", value: "trendsetter", unlock: { type: "purchase", price: 150 } },
  { key: "veteran", value: "veteran", unlock: { type: "purchase", price: 200 } },
  { key: "curator", value: "curator", unlock: { type: "purchase", price: 250 } },
  { key: "legend", value: "legend", unlock: { type: "purchase", price: 400 } },
  { key: "founder", value: "founder", unlock: { type: "purchase", price: 600 } },
];

export const BANNER_EFFECTS: Cosmetic[] = [
  { key: "none", value: "none", unlock: { type: "default" } },
  { key: "gradient_wave", value: "gradient_wave", unlock: { type: "purchase", price: 180 } },
  { key: "particles", value: "particles", unlock: { type: "purchase", price: 280 } },
  { key: "scanlines", value: "scanlines", unlock: { type: "purchase", price: 280 } },
  { key: "vignette_glow", value: "vignette_glow", unlock: { type: "purchase", price: 380 } },
  { key: "aurora_sky", value: "aurora_sky", unlock: { type: "purchase", price: 500 } },
];

export const COSMETIC_CATALOGS: Record<CosmeticType, Cosmetic[]> = {
  [CosmeticType.ProfileColor]: PROFILE_COLORS,
  [CosmeticType.AvatarFrame]: AVATAR_FRAMES,
  [CosmeticType.ProfileTitle]: PROFILE_TITLES,
  [CosmeticType.BannerEffect]: BANNER_EFFECTS,
};

export const COSMETICS_BY_KEY = Object.fromEntries(
  Object.entries(COSMETIC_CATALOGS).map(([type, items]) => [type, new Map(items.map((item) => [item.key, item]))]),
) as Record<CosmeticType, Map<string, Cosmetic>>;

// Profile.color guarda o hex, então a validação de cor busca pelo value.
export const PROFILE_COLORS_BY_VALUE = new Map(PROFILE_COLORS.map((cosmetic) => [cosmetic.value, cosmetic]));

export type CosmeticUnlockState = {
  level: number;
  completedMissionKeys: Set<string>;
  // Chaves compostas `${type}:${key}` das compras do usuário.
  ownedKeys: Set<string>;
};

export function isCosmeticUnlocked(type: CosmeticType, cosmetic: Cosmetic, state: CosmeticUnlockState): boolean {
  switch (cosmetic.unlock.type) {
    case "default":
      return true;
    case "level":
      return state.level >= cosmetic.unlock.value;
    case "mission":
      return state.completedMissionKeys.has(cosmetic.unlock.key);
    case "purchase":
      return state.ownedKeys.has(`${type}:${cosmetic.key}`);
  }
}
