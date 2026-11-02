import type { PSNProfile, PSNTrophyCounts, PSNTrophyTitle } from "@/shared/infra/integrations/psn.service";

export interface PsnTrophySummary {
  level: number;
  progress: number;
  tier: number;
  earnedTrophies: PSNTrophyCounts;
}

export interface PsnTrophies {
  linked: boolean;
  expired: boolean;
  profile: PSNProfile | null;
  summary: PsnTrophySummary | null;
  recentTitles: PSNTrophyTitle[];
  updatedAt: string | null;
}

export interface PsnAccountStatus {
  onlineId: string;
  avatarUrl: string | null;
  expired: boolean;
}
