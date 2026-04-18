export type CampaignMemberRole = "dm" | "player";

export interface CampaignSettings {
  allowed_sources: string[];
  house_rules: string;
  optional_rules: {
    flanking?: boolean;
    hero_points?: boolean;
    slow_natural_healing?: boolean;
    variant_encumbrance?: boolean;
  };
}

export interface Campaign {
  id: string;
  name: string;
  dmId: string;
  inviteCode: string | null;
  settings: CampaignSettings;
  createdAt: Date;
}

export interface CampaignMember {
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  joinedAt: Date;
}
