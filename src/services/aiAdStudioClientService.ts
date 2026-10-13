import {
  AdStudioProject,
  AdLanguage,
  AdVoiceOption,
  AdFormat,
  AdDuration,
  AIAvatarProfile,
  AvatarUsageMode,
  AvatarPlacement,
  LANGUAGE_LABELS,
} from '../types/aiAdStudio';

export type {
  AdStudioProject,
  AdStudioScene,
  AdLanguage,
  AdVoiceOption,
  AdFormat,
  AdDuration,
  AIAvatarProfile,
  AvatarUsageMode,
  AvatarPlacement,
  AudioDirectorSettings,
} from '../types/aiAdStudio';

export { LANGUAGE_LABELS };

export interface GenerateAdParams {
  prompt: string;
  language?: AdLanguage;
  duration?: AdDuration;
  voiceOption?: AdVoiceOption;
  voiceStyle?: string;
  format?: AdFormat;
  bgmStyle?: string;
  location?: string;
  includeAvatar?: boolean;
  avatarId?: string;
  avatarUsageMode?: AvatarUsageMode;
  avatarPlacement?: AvatarPlacement;
}

export async function requestGenerateAdStudioProject(
  params: GenerateAdParams
): Promise<AdStudioProject> {
  const res = await fetch('/api/marketing/ai-ad-studio/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.project) {
    throw new Error(data.error || 'Failed to generate ad project.');
  }

  return data.project as AdStudioProject;
}

export async function requestFetchAIAvatars(): Promise<AIAvatarProfile[]> {
  const res = await fetch('/api/marketing/ai-ad-studio/avatars');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch avatars.');
  }
  return data.avatars;
}

export async function requestCreateAIAvatar(params: {
  name: string;
  roleTitle?: string;
  gender?: 'female' | 'male' | 'neutral';
  referenceVideoUrl?: string;
  speechModelStyle?: string;
  consentVerified: boolean;
}): Promise<AIAvatarProfile> {
  const res = await fetch('/api/marketing/ai-ad-studio/avatars/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.avatar) {
    throw new Error(data.error || 'Failed to create AI Avatar.');
  }
  return data.avatar;
}

export async function requestTranslateAdVersion(
  project: AdStudioProject,
  targetLanguage: AdLanguage
): Promise<NonNullable<AdStudioProject['languageVersions']>[string]> {
  const res = await fetch('/api/marketing/ai-ad-studio/translate-version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, targetLanguage }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.version) {
    throw new Error(data.error || 'Failed to translate ad version.');
  }

  return data.version;
}

// ==========================================
// Web Audio API Synthesizer & BGM Engine
// ==========================================
class WebAudioDirector {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private timer: number | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMusicVolume(volume: number) { // 0 to 1
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Applies auto-ducking to the music track
   * When voice is speaking: lowers music to duckLevel (e.g. 0.12)
   * When voice stops: smoothly restores music to normal (e.g. 0.38)
   */
  public duckMusic(isSpeaking: boolean, duckLevel = 0.12, normalLevel = 0.38) {
    if (this.musicGain && this.ctx) {
      const target = isSpeaking ? duckLevel : normalLevel;
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Starts rhythm and melody background loops tailored to the ad style
   */
  public startBgm(style: string = 'corporate') {
    this.stopBgm();
    this.init();
    if (!this.ctx || !this.musicGain) return;

    this.isPlaying = true;
    let step = 0;

    // Tempo mapping
    const bpm = style === 'folk_acoustic' || style === 'indian_folk' ? 128 : style === 'energetic' ? 124 : 112;
    const intervalMs = (60 / bpm / 2) * 1000; // Eighth-note rhythm

    // Musical chord frequencies (Pentatonic / Major / Folk)
    const baseFreqs =
      style === 'folk_acoustic' || style === 'indian_folk'
        ? [293.66, 329.63, 369.99, 440.0, 493.88, 587.33] // D Major / Folk
        : style === 'cinematic'
        ? [220.0, 261.63, 329.63, 392.0, 440.0] // A minor
        : [261.63, 329.63, 392.0, 523.25, 659.25]; // C Major commercial upbeat

    const playStep = () => {
      if (!this.isPlaying || !this.ctx || !this.musicGain) return;

      const now = this.ctx.currentTime;

      // Kick / Dholak bass on beats 0, 4
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.16);
      }

      // Snare / Hi-hat / Shaker click
      if (step % 2 === 1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.07);
      }

      // Melodic notes / Chords
      if (step % 2 === 0) {
        const noteFreq = baseFreqs[(step / 2) % baseFreqs.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = style === 'cinematic' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        const dur = style === 'cinematic' ? 0.4 : 0.2;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      }

      step = (step + 1) % 16;
      this.timer = window.setTimeout(playStep, intervalMs);
    };

    playStep();
  }

  public stopBgm() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public playSoundEffect(type: 'whoosh' | 'chime' | 'click' | 'success') {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (type === 'chime' || type === 'success') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.2, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.38);
      });
    } else if (type === 'whoosh') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }
}

export const webAudioDirector = new WebAudioDirector();
