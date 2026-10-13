// Voice Service: Speech-to-Text (STT) & Text-to-Speech (TTS) Engine for KaamDost AI

export type VoiceStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'error' | 'unsupported';
export type VoicePlaybackState = 'idle' | 'playing' | 'paused';
export type SpeechSpeed = 0.75 | 1.0 | 1.25 | 1.5;

export interface VoiceServiceOptions {
  language: 'hi-IN' | 'en-IN' | 'en-US';
  speed?: SpeechSpeed;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (errorType: string, errorMsg: string) => void;
  onStatusChange?: (status: VoiceStatus) => void;
}

// Check speech recognition capability
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
};

// Check speech synthesis capability
export const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
};

class VoiceEngine {
  private recognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private status: VoiceStatus = 'idle';
  private playbackState: VoicePlaybackState = 'idle';
  private currentSpeakingMessageId: string | null = null;
  private speed: SpeechSpeed = 1.0;
  private targetVoiceLang: string = 'hi-IN';

  // Listeners
  private onPlaybackStateChangeSubscribers: Array<(state: VoicePlaybackState, messageId: string | null) => void> = [];
  private onStatusChangeSubscribers: Array<(status: VoiceStatus, errorMsg?: string) => void> = [];

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.status = 'unsupported';
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    } catch (e) {
      console.warn('SpeechRecognition init notice:', e);
      this.status = 'unsupported';
    }
  }

  public subscribePlayback(cb: (state: VoicePlaybackState, messageId: string | null) => void) {
    this.onPlaybackStateChangeSubscribers.push(cb);
    return () => {
      this.onPlaybackStateChangeSubscribers = this.onPlaybackStateChangeSubscribers.filter((s) => s !== cb);
    };
  }

  public subscribeStatus(cb: (status: VoiceStatus, errorMsg?: string) => void) {
    this.onStatusChangeSubscribers.push(cb);
    return () => {
      this.onStatusChangeSubscribers = this.onStatusChangeSubscribers.filter((s) => s !== cb);
    };
  }

  private notifyPlayback(state: VoicePlaybackState, messageId: string | null) {
    this.playbackState = state;
    this.currentSpeakingMessageId = messageId;
    this.onPlaybackStateChangeSubscribers.forEach((cb) => cb(state, messageId));
  }

  private notifyStatus(status: VoiceStatus, errorMsg?: string) {
    this.status = status;
    this.onStatusChangeSubscribers.forEach((cb) => cb(status, errorMsg));
  }

  /* -------------------------------------------------------------
   * 1. SPEECH-TO-TEXT (STT) RECORDING
   * ----------------------------------------------------------- */
  public async startListening(
    langCode: 'hi-IN' | 'en-IN' | 'en-US' = 'hi-IN',
    callbacks: {
      onInterim?: (text: string) => void;
      onFinal?: (text: string) => void;
      onError?: (errCode: string, msg: string) => void;
    }
  ): Promise<boolean> {
    if (!isSpeechRecognitionSupported()) {
      this.notifyStatus('unsupported', 'इस ब्राउज़र में वॉयस रिकॉग्निशन सपोर्ट नहीं है।');
      callbacks.onError?.('unsupported', 'ब्राउज़र में वॉयस सपोर्ट उपलब्ध नहीं है।');
      return false;
    }

    // Explicitly check / prompt for audio permission via getUserMedia
    this.notifyStatus('requesting');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the raw audio tracks once permission is granted
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      const errName = err?.name || '';
      let userFriendlyMsg = 'माइक्रोफ़ोन अनुमति अस्वीकृत (Permission Denied). कृपया ब्राउज़र में माइक की अनुमति दें।';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        userFriendlyMsg = 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र सेटिंग्स में जाकर माइक की अनुमति दें।';
      }
      this.notifyStatus('error', userFriendlyMsg);
      callbacks.onError?.('permission_denied', userFriendlyMsg);
      return false;
    }

    try {
      // Re-instantiate if needed
      if (!this.recognition) {
        this.initRecognition();
      }

      this.recognition.lang = langCode;
      let finalTranscript = '';

      this.recognition.onstart = () => {
        this.notifyStatus('recording');
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (interim && callbacks.onInterim) {
          callbacks.onInterim(interim);
        }

        if (finalTranscript && callbacks.onFinal) {
          callbacks.onFinal(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        const errorKey = event.error || 'unknown';
        let msg = 'ध्वनि पहचानने में समस्या हुई। कृपया पुनः प्रयास करें।';

        if (errorKey === 'not-allowed' || errorKey === 'service-not-allowed') {
          msg = 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया अनुमति दें या टेक्स्ट लिखकर भेजें।';
        } else if (errorKey === 'no-speech') {
          msg = 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक के पास आकर बोलें।';
        } else if (errorKey === 'network') {
          msg = 'इंटरनेट नेटवर्क त्रुटि हुई।';
        }

        this.notifyStatus('error', msg);
        callbacks.onError?.(errorKey, msg);
      };

      this.recognition.onend = () => {
        if (this.status === 'recording') {
          this.notifyStatus('idle');
        }
      };

      this.recognition.start();
      return true;
    } catch (e: any) {
      console.warn('SpeechRecognition start error:', e);
      this.notifyStatus('error', 'माइक शुरू करने में समस्या हुई।');
      callbacks.onError?.('start_error', 'माइक शुरू नहीं हो सका।');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && (this.status === 'recording' || this.status === 'requesting')) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.notifyStatus('idle');
  }

  /* -------------------------------------------------------------
   * 2. TEXT-TO-SPEECH (TTS) PLAYBACK
   * ----------------------------------------------------------- */
  public speakText(
    messageId: string,
    rawText: string,
    langCode: 'hi-IN' | 'en-IN' | 'en-US' = 'hi-IN',
    speed: SpeechSpeed = 1.0
  ) {
    if (!isSpeechSynthesisSupported()) {
      return false;
    }

    // If currently speaking this exact message, toggle pause/resume
    if (this.currentSpeakingMessageId === messageId && this.playbackState === 'playing') {
      this.pauseSpeech();
      return true;
    }

    if (this.currentSpeakingMessageId === messageId && this.playbackState === 'paused') {
      this.resumeSpeech();
      return true;
    }

    // Stop any existing speech
    this.stopSpeech();

    // Clean text: strip emojis, action buttons, URLs, and markdown hashes/asterisks
    const cleanedText = rawText
      .replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*#_~`\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) return false;

    this.speed = speed;
    this.targetVoiceLang = langCode;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = langCode;
      utterance.rate = speed;
      utterance.pitch = 1.0;

      // Prefer Indian voices if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        let bestVoice = voices.find(
          (v) => v.lang === langCode || (langCode.startsWith('hi') && v.lang.startsWith('hi'))
        );
        if (!bestVoice && langCode.startsWith('hi')) {
          bestVoice = voices.find((v) => v.name.toLowerCase().includes('hindi') || v.lang.includes('IN'));
        }
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      utterance.onstart = () => {
        this.notifyPlayback('playing', messageId);
      };

      utterance.onpause = () => {
        this.notifyPlayback('paused', messageId);
      };

      utterance.onresume = () => {
        this.notifyPlayback('playing', messageId);
      };

      utterance.onend = () => {
        this.notifyPlayback('idle', null);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error notice:', e);
        this.notifyPlayback('idle', null);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      console.warn('Failed to speak text:', e);
      this.notifyPlayback('idle', null);
      return false;
    }
  }

  public pauseSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.playbackState === 'playing') {
      try {
        window.speechSynthesis.pause();
        this.notifyPlayback('paused', this.currentSpeakingMessageId);
      } catch (e) {
        // ignore
      }
    }
  }

  public resumeSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.playbackState === 'paused') {
      try {
        window.speechSynthesis.resume();
        this.notifyPlayback('playing', this.currentSpeakingMessageId);
      } catch (e) {
        // ignore
      }
    }
  }

  public stopSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.currentUtterance = null;
    this.notifyPlayback('idle', null);
  }

  public setSpeed(speed: SpeechSpeed) {
    this.speed = speed;
    if (this.currentUtterance && this.playbackState === 'playing') {
      // Re-trigger with updated speed
      const msgId = this.currentSpeakingMessageId;
      const text = this.currentUtterance.text;
      const lang = this.targetVoiceLang as any;
      if (msgId && text) {
        this.speakText(msgId, text, lang, speed);
      }
    }
  }

  public getSpeed(): SpeechSpeed {
    return this.speed;
  }

  public getStatus(): VoiceStatus {
    return this.status;
  }

  public getPlaybackState(): VoicePlaybackState {
    return this.playbackState;
  }

  public getCurrentSpeakingMessageId(): string | null {
    return this.currentSpeakingMessageId;
  }
}

export const voiceService = new VoiceEngine();
