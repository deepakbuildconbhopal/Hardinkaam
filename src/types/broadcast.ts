export type BroadcastAudience =
  | 'all'
  | 'customer'
  | 'service_man'
  | 'franchise'
  | 'brand_promoter';

export type BroadcastMessageType = 'festival' | 'announcement' | 'alert' | 'offer';

export type BroadcastTheme = 'golden' | 'saffron' | 'emerald' | 'crimson' | 'royal_blue';

export interface AdminBroadcastMessage {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  type: BroadcastMessageType;
  theme: BroadcastTheme;
  emoji: string;
  actionLabel?: string;
  actionUrlOrTab?: string;
  displayMode: 'popup_and_banner' | 'popup_only' | 'banner_only';
  isActive: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface BroadcastPreset {
  id: string;
  name: string;
  type: BroadcastMessageType;
  theme: BroadcastTheme;
  emoji: string;
  defaultTitle: string;
  defaultBody: string;
  defaultAudience: BroadcastAudience;
  defaultActionLabel: string;
}
