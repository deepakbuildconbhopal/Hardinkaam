export type AdLanguage =
  | 'auto'
  | 'hi'
  | 'en'
  | 'hinglish'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'bn'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'or'
  | 'ur';

export type AdVoiceOption = 'ai_female' | 'ai_male' | 'recorded' | 'uploaded' | 'singing';
export type AdFormat = 'auto' | '9:16' | '16:9' | '1:1';
export type AdDuration = 15 | 30 | 60 | 90 | 120;

export interface AIAvatarProfile {
  id: string;
  name: string;
  roleTitle: string; // e.g. "Lead Service Expert", "Customer Trust Anchor", "Bhopal Operations Host"
  gender: 'female' | 'male' | 'neutral';
  referenceVideoUrl?: string;
  previewImageUrl: string;
  avatarVideoUrl?: string;
  speechModelStyle: string; // 'professional' | 'friendly' | 'energetic' | 'authoritative'
  preferredVoiceURI?: string;
  voicePitch?: number;
  voiceRate?: number;
  qualityScore: number; // 0 - 100
  analysis: {
    faceQuality: 'excellent' | 'good' | 'fair';
    lighting: 'studio' | 'natural' | 'adequate';
    audioQuality: 'high' | 'moderate' | 'clean';
    resolution: string;
    speechClarity: 'crisp' | 'clear' | 'acceptable';
  };
  consentVerified: boolean;
  isApproved: boolean;
  createdAt: string;
}

export type AvatarUsageMode =
  | 'auto' // intelligently intro, midway highlight, and outro
  | 'presenter' // standard presenter presence across key beats
  | 'intro' // hook & problem statement scene
  | 'outro' // final call to action & helpline scene
  | 'selected_scenes' // user-designated scenes
  | 'full'; // every scene has avatar video / overlay

export type AvatarPlacement =
  | 'center_speaker' // Full frame or centered avatar
  | 'pip_bottom_right' // Picture-in-picture round or card bottom right
  | 'pip_bottom_left' // Picture-in-picture bottom left
  | 'split_side' // Split screen with B-roll / service demonstration
  | 'lower_third_host'; // Lower-third animated host

export interface AdStudioScene {
  id: string;
  sceneNumber: number;
  durationSeconds: number;
  title: string;
  subtitle: string;
  badge: string;
  visualPrompt: string;
  cameraMovement: 'slow_zoom_in' | 'pan_right' | 'cinematic_push' | 'static_hero' | 'fade_reveal';
  voiceoverText: string;
  captionText: string;
  ctaText?: string;
  highlightColor: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  transition: 'fade' | 'zoom' | 'slide' | 'cut';
  // AI Avatar scene integration
  hasAvatar?: boolean;
  avatarPlacement?: AvatarPlacement;
  avatarVideoUrl?: string;
  avatarApproved?: boolean;
  avatarScriptPrompt?: string;
}

export interface AudioDirectorSettings {
  voiceStyle: string;
  musicMood: string;
  musicTempoBpm: number;
  musicIntensity: 'subtle' | 'medium' | 'high' | 'festive';
  duckingSpeechLevel: number;
  duckingSilenceLevel: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  suggestedSfx: string[];
}

export interface AdStudioProject {
  id: string;
  createdAt: string;
  userPrompt: string;
  adTitle: string;
  hookLine: string;
  advertisingStrategy: string;
  targetAudience: string;
  language: AdLanguage;
  voiceLanguage: string;
  captionLanguage: string;
  scriptLanguage: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  totalDurationSeconds: number;
  voiceOption: AdVoiceOption;
  voiceGender: 'male' | 'female';
  voiceStyle: string;
  fullVoiceoverScript: string;
  scenes: AdStudioScene[];
  audioDirector: AudioDirectorSettings;
  branding: {
    brandName: string;
    tagline: string;
    helpline: string;
    websiteUrl: string;
    cityTarget: string;
    verifiedBadgeText: string;
    satisfactionGuaranteeText: string;
    showWatermark: boolean;
  };
  socialPublish: {
    instagramReelCaption: string;
    youtubeShortsTitle: string;
    youtubeDescription: string;
    whatsAppBroadcastText: string;
    hashtags: string[];
  };
  avatarConfiguration?: {
    enabled: boolean;
    avatarId: string;
    avatarName: string;
    avatarPreviewUrl: string;
    usageMode: AvatarUsageMode;
    avatarLanguage: AdLanguage;
    avatarVoiceStyle: string;
    avatarTone: string;
  };
  languageVersions?: Record<string, {
    adTitle: string;
    hookLine: string;
    fullVoiceoverScript: string;
    scenes: Array<{
      id: string;
      title: string;
      subtitle: string;
      voiceoverText: string;
      captionText: string;
      ctaText?: string;
    }>;
    socialPublish: {
      instagramReelCaption: string;
      youtubeShortsTitle: string;
      whatsAppBroadcastText: string;
    };
  }>;
}

export const LANGUAGE_LABELS: Record<AdLanguage, string> = {
  auto: 'Auto Detect',
  hi: 'Hindi (हिन्दी)',
  en: 'English',
  hinglish: 'Hinglish (बोलचाल हिंदी-इंग्लिश)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  or: 'Odia (ଓଡ଼ିଆ)',
  ur: 'Urdu (اردو)',
};
