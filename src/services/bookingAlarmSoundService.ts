/**
 * HARDINKAAM SERVICE PROFESSIONAL APP
 * Professional Web Audio Booking Alarm & Vibration Service
 * 
 * Features:
 * - 100% synthesized Web Audio API (zero external network dependency, zero copyright issues, instant playback)
 * - Distinctive, crystal-clear 2-burst harmonic bell chime for on-demand home service dispatch
 * - Smooth exponential gain envelopes (non-fatiguing, pleasant, yet highly attention-grabbing)
 * - Repeating / looping pattern while booking is pending response
 * - Safe AudioContext resume on user gesture / interaction
 * - Hardware vibration support via navigator.vibrate
 * - Instant stop / cleanup on accept, reject, cancel, or expiry
 */

export type AlarmToneType =
  | 'harmonic_bells'
  | 'emergency_dispatch'
  | 'marimba_upbeat'
  | 'digital_pulsar'
  | 'temple_conch_bell';

export interface AlarmToneOption {
  id: AlarmToneType;
  nameHindi: string;
  nameEnglish: string;
  description: string;
  iconTag: string;
}

export const ALARM_TONE_OPTIONS: AlarmToneOption[] = [
  {
    id: 'harmonic_bells',
    nameHindi: 'हरमोनिक बेल्स (डिफ़ॉल्ट)',
    nameEnglish: 'Harmonic Chime',
    description: '4-नोट्स सुरम्य घंटी ध्वनि, साफ और सुनने में सुखद',
    iconTag: '🔔',
  },
  {
    id: 'emergency_dispatch',
    nameHindi: 'इमरजेंसी डिस्पैच सायरन',
    nameEnglish: 'Rapid Dispatch Siren',
    description: 'तेज़ व तत्काल ध्यान आकर्षित करने वाला डुअल-टोन सायरन',
    iconTag: '🚨',
  },
  {
    id: 'marimba_upbeat',
    nameHindi: 'अपबीट मैरिम्बा',
    nameEnglish: 'Rhythmic Marimba',
    description: 'वुडन बार तालबद्ध बीट, ऊर्जावान और स्पष्ट',
    iconTag: '🎵',
  },
  {
    id: 'digital_pulsar',
    nameHindi: 'हाई-टेक डिजिटल पल्स',
    nameEnglish: 'Digital Pulsar Beep',
    description: 'आधुनिक इलेक्ट्रॉनिक पल्स, व्यावसायिक डिस्पैच अलर्ट',
    iconTag: '⚡',
  },
  {
    id: 'temple_conch_bell',
    nameHindi: 'शुभ मंदिर घंटा व शंख',
    nameEnglish: 'Festive Temple Bell & Gong',
    description: 'गंभीर अनुनाद व भारतीय परंपरा की शुभ ध्वनि',
    iconTag: '🪔',
  },
];

class BookingAlarmSoundService {
  private audioCtx: AudioContext | null = null;
  private isLooping: boolean = false;
  private loopIntervalId: number | null = null;
  private currentVolume: number = 0.85;
  private currentTone: AlarmToneType = 'harmonic_bells';
  private vibrationEnabled: boolean = true;
  private vibrationIntervalId: number | null = null;

  constructor() {
    // Lazy AudioContext initialization to adhere to browser autoplay policies
  }

  /**
   * Get or initialize the AudioContext safely
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((err) => {
          console.warn('AudioContext resume note:', err);
        });
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }

  /**
   * Unlocks the AudioContext after a user gesture (e.g., button click, settings test)
   */
  public async unlockAudio(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  /**
   * Set active alarm tone
   */
  public setTone(tone: AlarmToneType): void {
    if (tone) {
      this.currentTone = tone;
    }
  }

  /**
   * Get active alarm tone
   */
  public getTone(): AlarmToneType {
    return this.currentTone;
  }

  /**
   * Tone Synthesizer 1: Harmonic Bells (Default)
   * Bright sine + overtone mixture ascending D5 -> F#5 -> A5 -> D6
   */
  private playHarmonicBells(ctx: AudioContext, now: number, vol: number): void {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, vol)), now);
    masterGain.connect(ctx.destination);

    const notes = [
      { freq: 587.33, delay: 0.0, dur: 0.28 },
      { freq: 739.99, delay: 0.12, dur: 0.28 },
      { freq: 880.0, delay: 0.24, dur: 0.35 },
      { freq: 1174.66, delay: 0.40, dur: 0.65 },
    ];

    notes.forEach((note) => {
      const startTime = now + note.delay;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + note.dur + 0.05);

      // Sub-harmonic warm overtone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(note.freq / 2, startTime);
      subGain.gain.setValueAtTime(0.001, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur * 0.8);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      subOsc.start(startTime);
      subOsc.stop(startTime + note.dur * 0.8 + 0.05);
    });
  }

  /**
   * Tone Synthesizer 2: Rapid Dispatch Siren (High Urgency)
   * Alternating 2-tone frequency sweep with punchy attack
   */
  private playEmergencyDispatch(ctx: AudioContext, now: number, vol: number): void {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, vol * 0.9)), now);
    masterGain.connect(ctx.destination);

    // Two rapid dispatch siren warbles
    [0.0, 0.35].forEach((offset) => {
      const startTime = now + offset;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sawtooth';
      // Lowpass filter to avoid harshness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);

      // Warble pitch from 740Hz to 1100Hz
      osc.frequency.setValueAtTime(740, startTime);
      osc.frequency.exponentialRampToValueAtTime(1100, startTime + 0.14);
      osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.28);

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.65, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });
  }

  /**
   * Tone Synthesizer 3: Rhythmic Wood Marimba
   * Pleasant percussive wooden tones with rapid attack: E5 -> G#5 -> B5 -> E6
   */
  private playMarimbaUpbeat(ctx: AudioContext, now: number, vol: number): void {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, vol)), now);
    masterGain.connect(ctx.destination);

    const marimbaNotes = [
      { freq: 659.25, delay: 0.0, dur: 0.18 }, // E5
      { freq: 830.61, delay: 0.1, dur: 0.18 }, // G#5
      { freq: 987.77, delay: 0.2, dur: 0.22 }, // B5
      { freq: 1318.51, delay: 0.32, dur: 0.45 }, // E6
    ];

    marimbaNotes.forEach((item) => {
      const startTime = now + item.delay;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.freq, startTime);

      // Rapid percussive envelope
      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.8, startTime + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + item.dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + item.dur + 0.02);
    });
  }

  /**
   * Tone Synthesizer 4: Digital Pulsar Beep
   * Futuristic dual electronic pulses with high-tech clarity
   */
  private playDigitalPulsar(ctx: AudioContext, now: number, vol: number): void {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, vol * 0.9)), now);
    masterGain.connect(ctx.destination);

    const pulses = [
      { freq1: 988, freq2: 1480, delay: 0.0, dur: 0.12 },
      { freq1: 1175, freq2: 1760, delay: 0.16, dur: 0.14 },
      { freq1: 1397, freq2: 2093, delay: 0.34, dur: 0.28 },
    ];

    pulses.forEach((p) => {
      const startTime = now + p.delay;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(p.freq1, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(p.freq2, startTime);

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + p.dur);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      noteGain.connect(masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + p.dur + 0.02);
      osc2.stop(startTime + p.dur + 0.02);
    });
  }

  /**
   * Tone Synthesizer 5: Festive Temple Bell & Gong (शुभ मंदिर घंटा)
   * Deep meditative brass resonance with shimmering upper harmonics and long decay
   */
  private playTempleConchBell(ctx: AudioContext, now: number, vol: number): void {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, vol * 0.95)), now);
    masterGain.connect(ctx.destination);

    // Fundamental + Rich metallic brass harmonics
    const harmonics = [
      { freq: 440.0, gain: 0.5, dur: 1.2 }, // A4
      { freq: 880.0, gain: 0.35, dur: 0.9 }, // A5
      { freq: 1320.0, gain: 0.2, dur: 0.6 }, // E6
      { freq: 1760.0, gain: 0.15, dur: 0.4 }, // A6
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(h.gain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + h.dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + h.dur + 0.05);
    });
  }

  /**
   * Plays a single sequence of the requested or current booking alarm tone.
   */
  public playChimeOnce(customVolume?: number, tone?: AlarmToneType): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = typeof customVolume === 'number' ? customVolume : this.currentVolume;
    if (vol <= 0) return;

    const activeTone = tone || this.currentTone;

    switch (activeTone) {
      case 'emergency_dispatch':
        this.playEmergencyDispatch(ctx, now, vol);
        break;
      case 'marimba_upbeat':
        this.playMarimbaUpbeat(ctx, now, vol);
        break;
      case 'digital_pulsar':
        this.playDigitalPulsar(ctx, now, vol);
        break;
      case 'temple_conch_bell':
        this.playTempleConchBell(ctx, now, vol);
        break;
      case 'harmonic_bells':
      default:
        this.playHarmonicBells(ctx, now, vol);
        break;
    }
  }

  /**
   * Starts looping the alarm sound and vibration until explicitly stopped.
   * Repeats every 2.4 seconds with a double-burst pattern.
   */
  public startLoop(volume?: number, enableVibration: boolean = true, tone?: AlarmToneType): void {
    if (this.isLooping) return;

    if (typeof volume === 'number') {
      this.currentVolume = volume;
    }
    if (tone) {
      this.currentTone = tone;
    }
    this.vibrationEnabled = enableVibration;
    this.isLooping = true;

    // Immediately play first chime burst
    this.playChimeOnce(this.currentVolume, this.currentTone);
    // Short echo burst at 0.55s
    setTimeout(() => {
      if (this.isLooping) {
        this.playChimeOnce(this.currentVolume * 0.85, this.currentTone);
      }
    }, 550);

    // Trigger initial vibration
    this.triggerVibration();

    // Set interval to repeat every 2400ms
    this.loopIntervalId = window.setInterval(() => {
      if (!this.isLooping) return;
      this.playChimeOnce(this.currentVolume, this.currentTone);
      setTimeout(() => {
        if (this.isLooping) {
          this.playChimeOnce(this.currentVolume * 0.85, this.currentTone);
        }
      }, 550);
      this.triggerVibration();
    }, 2400);
  }

  /**
   * Triggers mobile vibration pattern where supported:
   * 400ms on, 200ms off, 400ms on, 200ms off, 600ms on
   */
  private triggerVibration(): void {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 600]);
      } catch (err) {
        console.warn('Vibration API note:', err);
      }
    }
  }

  /**
   * Stops the looping alarm sound, clears timers, and halts vibration immediately.
   */
  public stopLoop(): void {
    this.isLooping = false;

    if (this.loopIntervalId !== null) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }

    if (this.vibrationIntervalId !== null) {
      clearInterval(this.vibrationIntervalId);
      this.vibrationIntervalId = null;
    }

    // Stop any ongoing vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  /**
   * Plays a 3-second test chime and vibration
   */
  public async playTestChime(volume?: number, enableVibration: boolean = true, tone?: AlarmToneType): Promise<void> {
    await this.unlockAudio();
    this.stopLoop();
    this.startLoop(volume, enableVibration, tone);
    setTimeout(() => {
      this.stopLoop();
    }, 2800);
  }

  /**
   * Preview a specific tone once (approx 1.5 seconds) for Admin or Serviceman selection
   */
  public async playTonePreview(tone: AlarmToneType, volume?: number): Promise<void> {
    await this.unlockAudio();
    this.playChimeOnce(typeof volume === 'number' ? volume : 0.85, tone);
  }

  /**
   * Update master volume level (0.0 to 1.0)
   */
  public setVolume(vol: number): void {
    this.currentVolume = Math.min(1.0, Math.max(0, vol));
  }

  /**
   * Update vibration preference
   */
  public setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
  }

  /**
   * Check if currently looping
   */
  public getIsLooping(): boolean {
    return this.isLooping;
  }
}

export const bookingAlarmSoundService = new BookingAlarmSoundService();
