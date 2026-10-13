import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Share2,
  Mic,
  Square,
  Upload,
  Globe,
  Sliders,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Music,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Headphones,
  Wand2,
  ShieldCheck,
  Phone,
  Film,
  Tv,
  Smartphone,
  Radio,
  RefreshCw,
  UserCheck,
  UserPlus,
  Smile,
  Eye,
  Camera,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import {
  AdStudioProject,
  AdStudioScene,
  AdLanguage,
  AdVoiceOption,
  AdFormat,
  AdDuration,
  AIAvatarProfile,
  AvatarUsageMode,
  AvatarPlacement,
  LANGUAGE_LABELS,
  requestGenerateAdStudioProject,
  requestTranslateAdVersion,
  requestFetchAIAvatars,
  requestCreateAIAvatar,
  webAudioDirector,
} from '../../services/aiAdStudioClientService';

const SAMPLE_TEMPLATES = [
  {
    title: 'AC Repair Bhopal - 30s Quick Ad',
    prompt: 'AC repair ka Bhopal ke liye 30 second ka professional Hindi ad banao jisme 30 minute arrival aur 100% warranty ho',
    language: 'hi' as AdLanguage,
    duration: 30 as AdDuration,
    voiceOption: 'ai_female' as AdVoiceOption,
    style: 'professional',
    format: '9:16' as AdFormat,
  },
  {
    title: 'Emergency Electrician - 15s Reel',
    prompt: 'Emergency electrician service in Indore, short circuit repair, fast arrival in 20 minutes',
    language: 'hinglish' as AdLanguage,
    duration: 15 as AdDuration,
    voiceOption: 'ai_male' as AdVoiceOption,
    style: 'energetic',
    format: '9:16' as AdFormat,
  },
  {
    title: 'Musical Jingle & Song - 30s',
    prompt: 'HARDINKAAM ke liye ek pyara gana aur jingle banao, ghar ke sabhi kaamo ka ek hi hal',
    language: 'hi' as AdLanguage,
    duration: 30 as AdDuration,
    voiceOption: 'singing' as AdVoiceOption,
    style: 'promotional',
    format: '9:16' as AdFormat,
  },
  {
    title: 'Full Brand Story - 2 Min (120s)',
    prompt: 'HARDINKAAM Bhopal & Indore ka 2 minute ka complete brand advertisement jisme sabhi services aur verified technicians ka bharosa ho',
    language: 'hi' as AdLanguage,
    duration: 120 as AdDuration,
    voiceOption: 'ai_female' as AdVoiceOption,
    style: 'cinematic',
    format: '16:9' as AdFormat,
  },
];

const CURATED_MEDIA_GALLERY = [
  { name: 'AC Repair Expert', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&auto=format&fit=crop&q=80' },
  { name: 'AC Maintenance Tools', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Electrician Wiring Panel', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Plumber Pipe Leakage', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Satisfied Customer Family', url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Technician on Two-Wheeler', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Deep Home Cleaning', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80' },
  { name: 'App Booking on Mobile', url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80' },
];

export const AdminAIAdStudio: React.FC = () => {
  // Navigation Tabs
  type StudioTab = 'preview' | 'script' | 'scenes' | 'audio' | 'media' | 'edit' | 'publish';
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');

  // Creation State
  const [prompt, setPrompt] = useState<string>('AC repair ka Bhopal ke liye 30 second ka professional Hindi ad banao jisme 30 minute arrival aur 100% warranty ho');
  const [selectedLanguage, setSelectedLanguage] = useState<AdLanguage>('hi');
  const [selectedDuration, setSelectedDuration] = useState<AdDuration>(30);
  const [selectedVoice, setSelectedVoice] = useState<AdVoiceOption>('ai_female');
  const [selectedStyle, setSelectedStyle] = useState<string>('professional');
  const [selectedFormat, setSelectedFormat] = useState<AdFormat>('auto');
  const [selectedBgmStyle, setSelectedBgmStyle] = useState<string>('corporate');

  // AI Avatar Optional System State
  const [includeAvatar, setIncludeAvatar] = useState<boolean>(false);
  const [avatarLibrary, setAvatarLibrary] = useState<AIAvatarProfile[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('avatar_ananya_01');
  const [avatarUsageMode, setAvatarUsageMode] = useState<AvatarUsageMode>('auto');
  const [avatarPlacement, setAvatarPlacement] = useState<AvatarPlacement>('pip_bottom_right');
  const [showCreateAvatarModal, setShowCreateAvatarModal] = useState<boolean>(false);
  const [newAvatarName, setNewAvatarName] = useState<string>('');
  const [newAvatarRole, setNewAvatarRole] = useState<string>('Senior Service Host');
  const [newAvatarGender, setNewAvatarGender] = useState<'female' | 'male' | 'neutral'>('female');
  const [newAvatarConsent, setNewAvatarConsent] = useState<boolean>(false);
  const [isCreatingAvatar, setIsCreatingAvatar] = useState<boolean>(false);

  // Generation Engine State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [project, setProject] = useState<AdStudioProject | null>(null);
  const [activeLanguageVersion, setActiveLanguageVersion] = useState<string>('master');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Player / Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // Audio Mixer State
  const [voiceVolume, setVoiceVolume] = useState<number>(100);
  const [bgmVolume, setBgmVolume] = useState<number>(35);
  const [sfxVolume, setSfxVolume] = useState<number>(60);
  const [songVolume, setSongVolume] = useState<number>(85);
  const [autoDuckingEnabled, setAutoDuckingEnabled] = useState<boolean>(true);
  const [duckSpeechLevel, setDuckSpeechLevel] = useState<number>(15);
  const [duckSilenceLevel, setDuckSilenceLevel] = useState<number>(45);
  const [reverbEffectEnabled, setReverbEffectEnabled] = useState<boolean>(false);

  // Recording & Media State
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [activeAudioSource, setActiveAudioSource] = useState<'tts' | 'recorded' | 'uploaded'>('tts');

  // Browser Speech Synthesis voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);

  // Animation / Render timer
  const animFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const speechSynthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recordedAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  // Export / Recording canvas video
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [copiedCaptionType, setCopiedCaptionType] = useState<string | null>(null);

  // Load browser speech voices
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const v = window.speechSynthesis.getVoices();
        setAvailableVoices(v);
        const hindiOrIndianVoice = v.find((voice) =>
          voice.lang.includes('hi') || voice.lang.includes('IN') || voice.name.toLowerCase().includes('india')
        );
        if (hindiOrIndianVoice) {
          setSelectedVoiceURI(hindiOrIndianVoice.voiceURI);
        } else if (v.length > 0) {
          setSelectedVoiceURI(v[0].voiceURI);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize with initial project if empty
  useEffect(() => {
    handleGenerateAd(true);
  }, []);

  // Update canvas aspect ratio when project changes
  useEffect(() => {
    if (project) {
      setAspectRatio(project.aspectRatio);
    }
  }, [project]);

  // Load AI Avatar Library on mount
  useEffect(() => {
    requestFetchAIAvatars()
      .then((avatars) => {
        setAvatarLibrary(avatars);
        if (avatars.length > 0) setSelectedAvatarId(avatars[0].id);
      })
      .catch((err) => console.warn('Failed to load AI Avatar library:', err));
  }, []);

  // Handle ad generation
  const handleGenerateAd = async (isInitial = false) => {
    setIsGenerating(true);
    setGenerationStep('1/5 Researching Bhopal & Indore market data...');
    try {
      setTimeout(() => setGenerationStep('2/5 Crafting high-converting hook & commercial strategy...'), 600);
      setTimeout(() => setGenerationStep('3/5 Directing scenes & attaching Indian home service visuals...'), 1200);
      setTimeout(() => setGenerationStep('4/5 Synthesizing voiceover narration & musical arrangement...'), 1800);
      setTimeout(() => setGenerationStep('5/5 Mastering audio ducking & finalizing project...'), 2400);

      const proj = await requestGenerateAdStudioProject({
        prompt,
        language: selectedLanguage,
        duration: selectedDuration,
        voiceOption: selectedVoice,
        voiceStyle: selectedStyle,
        format: selectedFormat,
        bgmStyle: selectedBgmStyle,
        location: 'Bhopal & Indore, MP',
        includeAvatar,
        avatarId: selectedAvatarId,
        avatarUsageMode,
        avatarPlacement,
      });

      setProject(proj);
      setActiveLanguageVersion('master');
      setCurrentTime(0);
      setActiveSceneIndex(0);
      setIsPlaying(false);
      webAudioDirector.stopBgm();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (!isInitial) {
        webAudioDirector.playSoundEffect('success');
      }
    } catch (err: any) {
      console.error('Failed to generate ad:', err);
      alert(`Generation notice: ${err.message || 'Continuing with fallback package'}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Translate to a new language version
  const handleTranslateToVersion = async (targetLang: AdLanguage) => {
    if (!project) return;
    setIsTranslating(true);
    try {
      const translated = await requestTranslateAdVersion(project, targetLang);
      const updatedProject: AdStudioProject = {
        ...project,
        languageVersions: {
          ...(project.languageVersions || {}),
          [targetLang]: translated,
        },
      };
      setProject(updatedProject);
      setActiveLanguageVersion(targetLang);
      webAudioDirector.playSoundEffect('success');
    } catch (err: any) {
      alert(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Current Active Script & Scenes (considering active language version)
  const currentAdTitle =
    activeLanguageVersion !== 'master' && project?.languageVersions?.[activeLanguageVersion]
      ? project.languageVersions[activeLanguageVersion].adTitle
      : project?.adTitle || 'HARDINKAAM AI Ad Studio';

  const currentHookLine =
    activeLanguageVersion !== 'master' && project?.languageVersions?.[activeLanguageVersion]
      ? project.languageVersions[activeLanguageVersion].hookLine
      : project?.hookLine || '';

  const currentScenes: AdStudioScene[] =
    project?.scenes.map((sc, idx) => {
      if (activeLanguageVersion !== 'master' && project.languageVersions?.[activeLanguageVersion]?.scenes?.[idx]) {
        const transScene = project.languageVersions[activeLanguageVersion].scenes[idx];
        return {
          ...sc,
          title: transScene.title || sc.title,
          subtitle: transScene.subtitle || sc.subtitle,
          voiceoverText: transScene.voiceoverText || sc.voiceoverText,
          captionText: transScene.captionText || sc.captionText,
          ctaText: transScene.ctaText || sc.ctaText,
        };
      }
      return sc;
    }) || [];

  // Canvas Video Player Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project || currentScenes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on aspect ratio
    const width = aspectRatio === '9:16' ? 720 : aspectRatio === '16:9' ? 1280 : 1080;
    const height = aspectRatio === '9:16' ? 1280 : aspectRatio === '16:9' ? 720 : 1080;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Determine current scene based on currentTime
    let accumulatedTime = 0;
    let currIdx = 0;
    for (let i = 0; i < currentScenes.length; i++) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + currentScenes[i].durationSeconds) {
        currIdx = i;
        break;
      }
      accumulatedTime += currentScenes[i].durationSeconds;
    }
    if (currIdx !== activeSceneIndex) {
      setActiveSceneIndex(currIdx);
    }

    const currentScene = currentScenes[currIdx] || currentScenes[0];
    const sceneStartTime = currentScenes.slice(0, currIdx).reduce((acc, s) => acc + s.durationSeconds, 0);
    const sceneElapsed = currentTime - sceneStartTime;
    const sceneProgress = Math.min(1, Math.max(0, sceneElapsed / (currentScene.durationSeconds || 1)));

    // Render Background / Image
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Render Scene visual
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentScene.mediaUrl;

    const drawSceneContent = () => {
      // Dynamic camera movement zoom factor
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;

      if (currentScene.cameraMovement === 'slow_zoom_in') {
        scale = 1.0 + sceneProgress * 0.12;
      } else if (currentScene.cameraMovement === 'cinematic_push') {
        scale = 1.05 + sceneProgress * 0.15;
      } else if (currentScene.cameraMovement === 'pan_right') {
        offsetX = sceneProgress * 40;
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2 + offsetX, -height / 2 + offsetY);

      if (img.complete && img.naturalWidth > 0) {
        // Draw image cover
        const hRatio = width / img.width;
        const vRatio = height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (width - img.width * ratio) / 2;
        const centerShiftY = (height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      } else {
        // Vibrant animated gradient fallback
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#312e81');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      // Cinematic Vignette & Dark Overlay for readable text
      const darkGrad = ctx.createLinearGradient(0, 0, 0, height);
      darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      darkGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.2)');
      darkGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.35)');
      darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, width, height);

      // Top Branding Bar
      if (project.branding.showWatermark) {
        ctx.save();
        // Brand Badge Pill
        const pillW = 280;
        const pillH = 46;
        const pillX = 36;
        const pillY = 36;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 23);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
        ctx.fillText('⚡ HARDINKAAM', pillX + 18, pillY + 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('BHOPAL & INDORE', pillX + 165, pillY + 28);
        ctx.restore();

        // Top Right Helpline
        ctx.save();
        const phoneW = 230;
        const phoneH = 44;
        const phoneX = width - phoneW - 36;
        const phoneY = 36;

        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.beginPath();
        ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 22);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(`📞 0755-HARDIN`, phoneX + 18, phoneY + 28);
        ctx.restore();
      }

      // Scene Badge Top Center
      if (currentScene.badge) {
        ctx.save();
        ctx.font = 'bold 16px system-ui, sans-serif';
        const badgeText = currentScene.badge.toUpperCase();
        const badgeWidth = ctx.measureText(badgeText).width + 36;
        const badgeX = (width - badgeWidth) / 2;
        const badgeY = 110;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, 34, 17);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, badgeX + 18, badgeY + 23);
        ctx.restore();
      }

      // Middle / Main Scene Headline (Animated slide/fade)
      ctx.save();
      const titleY = height * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = aspectRatio === '9:16' ? 'bold 40px system-ui, sans-serif' : 'bold 48px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12;

      // Wrap headline text
      const maxTextWidth = width * 0.85;
      const words = currentScene.title.split(' ');
      let line = '';
      let lineY = titleY;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && n > 0) {
          ctx.fillText(line, width / 2, lineY);
          line = words[n] + ' ';
          lineY += 52;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, lineY);

      // Subtitle
      if (currentScene.subtitle) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillText(currentScene.subtitle, width / 2, lineY + 44);
      }
      ctx.restore();

      // Lower Section: Dynamic Subtitles / Spoken Captions with Highlight
      ctx.save();
      const captionBoxY = height - (aspectRatio === '9:16' ? 240 : 180);
      const captionBoxH = 100;
      const captionBoxW = width * 0.92;
      const captionBoxX = (width - captionBoxW) / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(captionBoxX, captionBoxY, captionBoxW, captionBoxH, 18);
      ctx.fill();
      ctx.stroke();

      // Audio waveform / Speaker indicator
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('🎙️ HARDINKAAM AI VOICE:', captionBoxX + 22, captionBoxY + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      const capText = currentScene.captionText || currentScene.voiceoverText;
      const truncatedCap = capText.length > 75 ? capText.slice(0, 72) + '...' : capText;
      ctx.fillText(`"${truncatedCap}"`, captionBoxX + 22, captionBoxY + 68);
      ctx.restore();

      // Bottom CTA Banner
      ctx.save();
      const ctaY = height - (aspectRatio === '9:16' ? 110 : 70);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(30, ctaY, width - 60, 56, 28);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const cta = currentScene.ctaText || 'हार्डिनकाम ऐप डाउनलोड करें | www.hardinkaam.online';
      ctx.fillText(`👉 ${cta} 👈`, width / 2, ctaY + 36);
      ctx.restore();
    };

    if (img.complete) {
      drawSceneContent();
    } else {
      img.onload = drawSceneContent;
      drawSceneContent();
    }
  }, [currentTime, project, aspectRatio, currentScenes, activeSceneIndex]);

  // Handle Play / Pause logic
  const handleTogglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handlePlay = () => {
    if (!project) return;
    setIsPlaying(true);
    playbackStartTimeRef.current = performance.now() - currentTime * 1000;

    // Start background music with Web Audio Director
    webAudioDirector.init();
    webAudioDirector.setMusicVolume(isMuted ? 0 : (bgmVolume / 100) * masterVolume);
    webAudioDirector.startBgm(project.audioDirector?.musicMood || selectedBgmStyle);

    // Play Voiceover
    if (activeAudioSource === 'recorded' && recordedAudioUrl && recordedAudioElemRef.current) {
      recordedAudioElemRef.current.currentTime = currentTime;
      recordedAudioElemRef.current.volume = isMuted ? 0 : (voiceVolume / 100) * masterVolume;
      recordedAudioElemRef.current.play().catch(() => {});
      if (autoDuckingEnabled) webAudioDirector.duckMusic(true, duckSpeechLevel / 100, duckSilenceLevel / 100);
    } else if ('speechSynthesis' in window) {
      playTtsSceneVoiceover(activeSceneIndex);
    }

    // Canvas animation loop
    const totalDuration = project.totalDurationSeconds || 30;
    const tick = (now: number) => {
      const elapsed = (now - playbackStartTimeRef.current) / 1000;
      if (elapsed >= totalDuration) {
        handlePause();
        setCurrentTime(0);
        return;
      }
      setCurrentTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    webAudioDirector.stopBgm();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recordedAudioElemRef.current) {
      recordedAudioElemRef.current.pause();
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    playbackStartTimeRef.current = performance.now() - newTime * 1000;
    if (recordedAudioElemRef.current) {
      recordedAudioElemRef.current.currentTime = newTime;
    }
    if (isPlaying) {
      // Re-trigger voiceover at new scene
      let acc = 0;
      let targetIdx = 0;
      for (let i = 0; i < currentScenes.length; i++) {
        if (newTime >= acc && newTime < acc + currentScenes[i].durationSeconds) {
          targetIdx = i;
          break;
        }
        acc += currentScenes[i].durationSeconds;
      }
      setActiveSceneIndex(targetIdx);
      if (activeAudioSource === 'tts' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        playTtsSceneVoiceover(targetIdx);
      }
    }
  };

  // Play TTS voice for specific scene with speech synthesis & auto-ducking
  const playTtsSceneVoiceover = (sceneIdx: number) => {
    if (!('speechSynthesis' in window) || currentScenes.length === 0) return;
    window.speechSynthesis.cancel();

    const scene = currentScenes[sceneIdx];
    if (!scene || !scene.voiceoverText) return;

    const utterance = new SpeechSynthesisUtterance(scene.voiceoverText);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = isMuted ? 0 : (voiceVolume / 100) * masterVolume;

    if (selectedVoiceURI) {
      const v = availableVoices.find((vo) => vo.voiceURI === selectedVoiceURI);
      if (v) utterance.voice = v;
    }

    utterance.onstart = () => {
      if (autoDuckingEnabled) {
        webAudioDirector.duckMusic(true, duckSpeechLevel / 100, duckSilenceLevel / 100);
      }
    };

    utterance.onend = () => {
      if (autoDuckingEnabled) {
        webAudioDirector.duckMusic(false, duckSpeechLevel / 100, duckSilenceLevel / 100);
      }
    };

    speechSynthUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Switch scene voice when time advances
  useEffect(() => {
    if (isPlaying && activeAudioSource === 'tts') {
      let acc = 0;
      let targetIdx = 0;
      for (let i = 0; i < currentScenes.length; i++) {
        if (currentTime >= acc && currentTime < acc + currentScenes[i].durationSeconds) {
          targetIdx = i;
          break;
        }
        acc += currentScenes[i].durationSeconds;
      }
      if (targetIdx !== activeSceneIndex) {
        setActiveSceneIndex(targetIdx);
        playTtsSceneVoiceover(targetIdx);
      }
    }
  }, [currentTime, isPlaying, activeAudioSource, currentScenes]);

  // Audio volume changes sync
  useEffect(() => {
    if (isPlaying) {
      webAudioDirector.setMusicVolume(isMuted ? 0 : (bgmVolume / 100) * masterVolume);
      if (recordedAudioElemRef.current) {
        recordedAudioElemRef.current.volume = isMuted ? 0 : (voiceVolume / 100) * masterVolume;
      }
    }
  }, [isMuted, bgmVolume, voiceVolume, masterVolume, isPlaying]);

  // Microphone Recording Handler
  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      micAudioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) micAudioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(micAudioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setActiveAudioSource('recorded');
        webAudioDirector.playSoundEffect('chime');
      };

      recorder.start();
      micMediaRecorderRef.current = recorder;
      setIsRecordingMic(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Microphone permission denied or not available: ${err.message}`);
    }
  };

  const stopMicRecording = () => {
    if (micMediaRecorderRef.current && isRecordingMic) {
      micMediaRecorderRef.current.stop();
      setIsRecordingMic(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Upload Voice File Handler
  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedAudioUrl(url);
      setActiveAudioSource('uploaded');
      webAudioDirector.playSoundEffect('chime');
    }
  };

  // Record Canvas Video to WebM / MP4 file
  const handleExportCanvasVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    setIsExportingVideo(true);
    handlePause();
    setCurrentTime(0);

    try {
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.adTitle.replace(/\s+/g, '_')}_hardinkaam_ad.webm`;
        a.click();
        setIsExportingVideo(false);
        webAudioDirector.playSoundEffect('success');
      };

      rec.start();
      mediaRecorderRef.current = rec;

      // Play video programmatically to record
      handlePlay();

      setTimeout(() => {
        if (rec.state === 'recording') {
          rec.stop();
          handlePause();
        }
      }, (project.totalDurationSeconds || 30) * 1000 + 500);
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExportingVideo(false);
      alert(`Canvas recording failed: ${err.message}`);
    }
  };

  // Copy social caption
  const handleCopyCaption = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionType(type);
    webAudioDirector.playSoundEffect('click');
    setTimeout(() => setCopiedCaptionType(null), 2000);
  };

  // Scene editing helpers
  const handleUpdateScene = (sceneId: string, updates: Partial<AdStudioScene>) => {
    if (!project) return;
    const updatedScenes = project.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s));
    setProject({ ...project, scenes: updatedScenes });
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    if (!project) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= project.scenes.length) return;
    const newScenes = [...project.scenes];
    const temp = newScenes[index];
    newScenes[index] = newScenes[targetIdx];
    newScenes[targetIdx] = temp;
    setProject({ ...project, scenes: newScenes });
  };

  const handleDeleteScene = (sceneId: string) => {
    if (!project || project.scenes.length <= 2) {
      alert('An ad must contain at least 2 scenes.');
      return;
    }
    const newScenes = project.scenes.filter((s) => s.id !== sceneId);
    setProject({ ...project, scenes: newScenes });
  };

  const handleAddScene = () => {
    if (!project) return;
    const newSceneNumber = project.scenes.length + 1;
    const sampleMedia = CURATED_MEDIA_GALLERY[(newSceneNumber - 1) % CURATED_MEDIA_GALLERY.length];
    const newScene: AdStudioScene = {
      id: `scene_${Date.now()}`,
      sceneNumber: newSceneNumber,
      durationSeconds: 6,
      title: 'नई सर्विस विशेषता',
      subtitle: 'हार्डिनकाम का पक्का भरोसा',
      badge: '✓ नई सुविधा',
      visualPrompt: 'Technician explaining service with smile',
      cameraMovement: 'slow_zoom_in',
      voiceoverText: 'हार्डिनकाम के साथ आपकी हर समस्या का समाधान तुरंत और पक्का होता है।',
      captionText: 'तुरंत और पक्का समाधान!',
      ctaText: 'कॉल करें 0755-HARDIN',
      highlightColor: '#F59E0B',
      mediaUrl: sampleMedia.url,
      mediaType: 'image',
      transition: 'fade',
    };
    setProject({ ...project, scenes: [...project.scenes, newScene] });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-20 font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-950/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  HARDINKAAM <span className="text-amber-400">AI AD STUDIO</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                  AI COMMERCIAL ENGINE
                </span>
              </div>
              <p className="text-xs text-stone-400">
                1-Prompt Auto Production: Strategy • Script • Scenes • Multilingual Voice • Dynamic Audio Mixing • Social Export
              </p>
            </div>
          </div>

          {/* Quick Stats & Master Language Version */}
          {project && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-xs">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300">Version:</span>
                <select
                  aria-label="Ad Language Version"
                  value={activeLanguageVersion}
                  onChange={(e) => setActiveLanguageVersion(e.target.value)}
                  className="bg-transparent text-amber-400 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="master" className="bg-stone-900 text-stone-200">
                    Master ({LANGUAGE_LABELS[project.language] || project.language})
                  </option>
                  {project.languageVersions &&
                    Object.keys(project.languageVersions).map((langKey) => (
                      <option key={langKey} value={langKey} className="bg-stone-900 text-stone-200">
                        {LANGUAGE_LABELS[langKey as AdLanguage] || langKey} Version
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={() => {
                  const targetLang = prompt('Translate to language code (e.g. en, mr, gu, pa, bn, ta, te):');
                  if (targetLang && LANGUAGE_LABELS[targetLang as AdLanguage]) {
                    handleTranslateToVersion(targetLang as AdLanguage);
                  }
                }}
                disabled={isTranslating}
                className="px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                {isTranslating ? 'Translating...' : '+ Translate Version'}
              </button>

              <button
                onClick={() => handleExportCanvasVideo()}
                disabled={isExportingVideo}
                className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-stone-950 rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                {isExportingVideo ? 'Rendering Video...' : 'Export Video'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ============================================================== */}
        {/* SECTION 1: ONE-SIMPLE-IDEA CREATOR BAR                         */}
        {/* ============================================================== */}
        <section className="bg-gradient-to-b from-stone-900 to-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                What do you want to advertise? <span className="text-xs text-stone-400 font-normal">(Admin enters one simple idea)</span>
              </label>

              {/* Sample idea chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-stone-500 font-medium">Quick Ideas:</span>
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(tmpl.prompt);
                      setSelectedLanguage(tmpl.language);
                      setSelectedDuration(tmpl.duration);
                      setSelectedVoice(tmpl.voiceOption);
                      setSelectedStyle(tmpl.style);
                      setSelectedFormat(tmpl.format);
                    }}
                    className="px-2 py-0.5 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 rounded-lg border border-stone-700/60 transition"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Prompt Input Box */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='E.g. "AC repair ka Bhopal ke liye 2 minute ka professional Hindi ad banao jisme 30 minute arrival, verified technicians aur 100% warranty ho"'
                rows={2}
                className="w-full bg-stone-950/80 border border-stone-700/80 focus:border-amber-500 rounded-2xl px-4 py-3 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition shadow-inner"
              />
            </div>

            {/* Parameters Controls Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Language */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-amber-400" /> Language:
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as AdLanguage)}
                  className="w-full bg-stone-800/90 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                  <option value="hinglish">Hinglish</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="or">Odia (ଓଡ଼ିଆ)</option>
                  <option value="ur">Urdu (اردو)</option>
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Duration:
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value) as AdDuration)}
                  className="w-full bg-stone-800/90 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value={15}>15 sec (Reel / Story)</option>
                  <option value={30}>30 sec (Standard Commercial)</option>
                  <option value={60}>60 sec (Comprehensive Ad)</option>
                  <option value={90}>90 sec (Detailed Explainer)</option>
                  <option value={120}>2 min / 120s (Brand Film)</option>
                </select>
              </div>

              {/* Voice Option */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" /> Voice:
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as AdVoiceOption)}
                  className="w-full bg-stone-800/90 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ai_female">AI Female (Priya / Rhea)</option>
                  <option value="ai_male">AI Male (Aarav / Kabir)</option>
                  <option value="singing">Singing / Jingle Vocal</option>
                  <option value="recorded">Record My Voice (Mic)</option>
                  <option value="uploaded">Uploaded Voice File</option>
                </select>
              </div>

              {/* Style */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-400" /> Style:
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly & Warm</option>
                  <option value="energetic">Energetic & Upbeat</option>
                  <option value="emotional">Emotional & Caring</option>
                  <option value="corporate">Corporate Brand</option>
                  <option value="local_business">Local Bhopal/Indore</option>
                  <option value="cinematic">Cinematic Story</option>
                  <option value="promotional">Festive / Promotional</option>
                </select>
              </div>

              {/* Format */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Film className="w-3 h-3 text-amber-400" /> Format:
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    const f = e.target.value as AdFormat;
                    setSelectedFormat(f);
                    if (f !== 'auto') setAspectRatio(f);
                  }}
                  className="w-full bg-stone-800/90 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto (Smart Match)</option>
                  <option value="9:16">9:16 (Reels/Shorts)</option>
                  <option value="16:9">16:9 (YouTube/Landscape)</option>
                  <option value="1:1">1:1 (Square Feed)</option>
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleGenerateAd(false)}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full h-[38px] bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-red-700 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition active:scale-[0.98]"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'GENERATING...' : '✨ GENERATE COMPLETE AD'}
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* OPTIONAL AI AVATAR CONFIGURATION PANEL                         */}
            {/* ============================================================== */}
            <div className="pt-4 mt-4 border-t border-stone-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeAvatar}
                    onChange={(e) => setIncludeAvatar(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    🤖 Include AI Avatar <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-normal">Optional</span>
                  </span>
                </label>

                {includeAvatar && (
                  <button
                    type="button"
                    onClick={() => setShowCreateAvatarModal(true)}
                    className="text-xs px-3 py-1 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl border border-stone-700 font-medium flex items-center gap-1 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Create New Avatar
                  </button>
                )}
              </div>

              {includeAvatar && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 animate-fadeIn">
                  {/* Select Avatar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-stone-400 block">Select Avatar:</label>
                    <select
                      value={selectedAvatarId}
                      onChange={(e) => setSelectedAvatarId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                    >
                      {avatarLibrary.map((av) => (
                        <option key={av.id} value={av.id}>
                          {av.name} ({av.roleTitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Avatar Usage Mode */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-stone-400 block">Avatar Usage Mode:</label>
                    <select
                      value={avatarUsageMode}
                      onChange={(e) => setAvatarUsageMode(e.target.value as AvatarUsageMode)}
                      className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                    >
                      <option value="auto">Auto (Smart Placement)</option>
                      <option value="presenter">Presenter (Intro & Outro)</option>
                      <option value="intro">Intro Scene Only</option>
                      <option value="outro">Outro CTA Scene Only</option>
                      <option value="full">Full Advertisement (Every Scene)</option>
                    </select>
                  </div>

                  {/* Avatar Placement Style */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-stone-400 block">Screen Placement:</label>
                    <select
                      value={avatarPlacement}
                      onChange={(e) => setAvatarPlacement(e.target.value as AvatarPlacement)}
                      className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500"
                    >
                      <option value="pip_bottom_right">Picture-in-Picture (Bottom Right)</option>
                      <option value="pip_bottom_left">Picture-in-Picture (Bottom Left)</option>
                      <option value="center_speaker">Full / Center Speaker</option>
                      <option value="split_side">Split Screen Side</option>
                      <option value="lower_third_host">Lower-Third Host Card</option>
                    </select>
                  </div>

                  {/* Avatar Voice Tone */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <div className="flex items-center gap-2 p-2 bg-stone-900 rounded-xl border border-stone-800 text-xs text-stone-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Likeness & Voice rights verified & secured.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Animated generation progress bar */}
            {isGenerating && (
              <div className="bg-stone-950/90 border border-amber-500/30 rounded-2xl p-4 mt-3 animate-pulse space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    {generationStep || 'Directing AI Commercial Production...'}
                  </span>
                  <span>HARDINKAAM Intelligence Engine</span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full w-3/4 rounded-full animate-indeterminate" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 2: WORKSPACE TABS                                      */}
        {/* ============================================================== */}
        <div className="flex items-center gap-1 border-b border-stone-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'preview', label: 'VIDEO PREVIEW', icon: Tv },
            { id: 'script', label: 'AI SCRIPT', icon: FileText },
            { id: 'scenes', label: `SCENES (${currentScenes.length})`, icon: Layers },
            { id: 'audio', label: 'AUDIO & MIXING', icon: Headphones },
            { id: 'media', label: 'MEDIA & VOICE', icon: Mic },
            { id: 'edit', label: 'EDIT & BRANDING', icon: Sliders },
            { id: 'publish', label: 'PUBLISH & SOCIAL', icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB CONTENT: 1. VIDEO PREVIEW                                  */}
        {/* ============================================================== */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Real Canvas Player */}
            <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-2 border-b border-stone-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-stone-200 uppercase tracking-wide">
                    Live HTML5 Canvas Player
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Scene {activeSceneIndex + 1}/{currentScenes.length}
                  </span>
                </div>

                {/* Aspect ratio switcher */}
                <div className="flex items-center bg-stone-950 p-0.5 rounded-xl border border-stone-800 text-[11px]">
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                      aspectRatio === '9:16' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> 9:16
                  </button>
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                      aspectRatio === '16:9' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    <Tv className="w-3 h-3" /> 16:9
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                      aspectRatio === '1:1' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    Square 1:1
                  </button>
                </div>
              </div>

              {/* The Video Display Frame */}
              <div
                className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center transition-all ${
                  aspectRatio === '9:16'
                    ? 'w-[320px] sm:w-[360px] h-[568px] sm:h-[640px]'
                    : aspectRatio === '16:9'
                    ? 'w-full max-w-[580px] h-[326px]'
                    : 'w-[360px] h-[360px]'
                }`}
              >
                <canvas ref={canvasRef} className="w-full h-full object-contain" />

                {/* Overlay play button when paused */}
                {!isPlaying && (
                  <button
                    onClick={handlePlay}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-2xl hover:scale-105 transition"
                  >
                    <Play className="w-8 h-8 ml-1 fill-stone-950" />
                  </button>
                )}

                {/* Auto-ducking indicator badge */}
                {isPlaying && autoDuckingEnabled && (
                  <div className="absolute top-16 left-3 px-2 py-0.5 rounded-full bg-stone-900/80 border border-cyan-500/40 text-[10px] text-cyan-400 flex items-center gap-1 backdrop-blur pointer-events-none">
                    <Sliders className="w-3 h-3 text-cyan-400 animate-pulse" />
                    Auto-Ducking Active
                  </div>
                )}
              </div>

              {/* Scrubber Timeline & Controls */}
              <div className="w-full space-y-3 pt-2">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="relative w-full bg-stone-800 h-2 rounded-full cursor-pointer overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (currentTime / (project?.totalDurationSeconds || 30)) * 100
                        )}%`,
                      }}
                    />
                    <input
                      type="range"
                      aria-label="Video scrubber timeline"
                      min={0}
                      max={project?.totalDurationSeconds || 30}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                    <span>
                      {Math.floor(currentTime / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {Math.floor(currentTime % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                    <span>
                      {Math.floor((project?.totalDurationSeconds || 30) / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {Math.floor((project?.totalDurationSeconds || 30) % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Main Player Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-stone-950" /> : <Play className="w-4 h-4 fill-stone-950" />}
                      {isPlaying ? 'PAUSE' : 'PLAY AD'}
                    </button>

                    <button
                      onClick={() => handleSeek(0)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                      title="Restart from beginning"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCanvasVideo()}
                      disabled={isExportingVideo}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      {isExportingVideo ? 'Exporting...' : 'Save .webm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Strategic Ad Overview & Live Scene Details */}
            <div className="lg:col-span-5 space-y-4">
              {/* Ad Strategy Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> AI Commercial Strategy
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    High Conversion
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-white leading-snug">{currentAdTitle}</h2>
                  <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800 text-xs text-amber-300/90 italic">
                    &ldquo;{currentHookLine}&rdquo;
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {project?.advertisingStrategy || 'Direct Problem-Agitation-Solution model targeting local residents.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                    <span className="text-stone-500 block">Target Audience:</span>
                    <span className="text-stone-200 font-medium">{project?.targetAudience || 'Bhopal & Indore'}</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                    <span className="text-stone-500 block">Audio Director:</span>
                    <span className="text-stone-200 font-medium">
                      {project?.audioDirector.musicMood || selectedBgmStyle} ({project?.audioDirector.musicTempoBpm || 115} BPM)
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Scene Card */}
              {currentScenes[activeSceneIndex] && (
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Current Scene #{activeSceneIndex + 1}
                    </h3>
                    <span className="text-xs font-mono text-amber-400">
                      {currentScenes[activeSceneIndex].durationSeconds} seconds
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <img
                      src={currentScenes[activeSceneIndex].mediaUrl}
                      alt="Scene preview"
                      className="w-24 h-24 object-cover rounded-xl border border-stone-700/80 shadow-md"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-white">{currentScenes[activeSceneIndex].title}</div>
                      <div className="text-stone-400 text-[11px] line-clamp-2">
                        {currentScenes[activeSceneIndex].subtitle}
                      </div>
                      <div className="text-[11px] text-amber-400 font-medium pt-1">
                        Motion: {currentScenes[activeSceneIndex].cameraMovement.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">VOICEOVER LINE:</span>
                    <p className="text-stone-200">{currentScenes[activeSceneIndex].voiceoverText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 2. AI SCRIPT                                      */}
        {/* ============================================================== */}
        {activeTab === 'script' && (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" /> Complete Voiceover Script Editor
                </h2>
                <p className="text-xs text-stone-400">
                  Edit narration text, choose AI Voice actor, adjust speed, pitch and preview voice immediately.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => playTtsSceneVoiceover(0)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 flex items-center gap-1.5 transition"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" /> Preview AI Voice
                </button>
              </div>
            </div>

            {/* Script Text Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-300">
                Master Spoken Script (Automatically synchronized across timeline):
              </label>
              <textarea
                rows={6}
                value={project?.fullVoiceoverScript || ''}
                onChange={(e) => {
                  if (project) {
                    setProject({ ...project, fullVoiceoverScript: e.target.value });
                  }
                }}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-2xl p-4 text-sm text-stone-100 focus:outline-none transition leading-relaxed font-sans"
              />
            </div>

            {/* Voice Actor Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-800">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-400">Speech Actor (Browser Synth):</label>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Speed / Pace:</span>
                  <span className="font-mono text-amber-400">{speechRate}x</span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Voice Pitch:</span>
                  <span className="font-mono text-amber-400">{speechPitch}</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 3. SCENES                                         */}
        {/* ============================================================== */}
        {activeTab === 'scenes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" /> Storyboard Scenes ({currentScenes.length})
                </h2>
                <p className="text-xs text-stone-400">
                  Reorder, adjust durations, swap visuals, or refine on-screen captions for every scene.
                </p>
              </div>

              <button
                onClick={handleAddScene}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" /> Add Scene
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentScenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-lg hover:border-stone-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-stone-200">{scene.badge || `Scene ${idx + 1}`}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveScene(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded-lg text-stone-300"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveScene(idx, 'down')}
                        disabled={idx === currentScenes.length - 1}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded-lg text-stone-300"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteScene(scene.id)}
                        className="p-1.5 bg-stone-800 hover:bg-red-900/50 rounded-lg text-stone-400 hover:text-red-400"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scene Visual & Media Switcher */}
                  <div className="flex gap-4">
                    <div className="relative group w-32 h-24 rounded-2xl overflow-hidden border border-stone-700 shrink-0">
                      <img src={scene.mediaUrl} alt={scene.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <select
                          aria-label="Swap Scene Image"
                          onChange={(e) => handleUpdateScene(scene.id, { mediaUrl: e.target.value })}
                          className="bg-stone-900 text-[10px] text-white p-1 rounded border border-stone-600 max-w-[110px]"
                        >
                          <option value="">Swap Photo</option>
                          {CURATED_MEDIA_GALLERY.map((g, gi) => (
                            <option key={gi} value={g.url}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div>
                        <label className="text-[10px] text-stone-500 uppercase font-semibold block">Scene Title:</label>
                        <input
                          type="text"
                          value={scene.title}
                          onChange={(e) => handleUpdateScene(scene.id, { title: e.target.value })}
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <div className="w-1/2">
                          <label className="text-[10px] text-stone-500 uppercase font-semibold block">Duration:</label>
                          <select
                            value={scene.durationSeconds}
                            onChange={(e) => handleUpdateScene(scene.id, { durationSeconds: Number(e.target.value) })}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-1 text-xs text-stone-200"
                          >
                            <option value={3}>3 sec</option>
                            <option value={5}>5 sec</option>
                            <option value={7}>7 sec</option>
                            <option value={10}>10 sec</option>
                            <option value={15}>15 sec</option>
                          </select>
                        </div>
                        <div className="w-1/2">
                          <label className="text-[10px] text-stone-500 uppercase font-semibold block">Camera:</label>
                          <select
                            value={scene.cameraMovement}
                            onChange={(e) => handleUpdateScene(scene.id, { cameraMovement: e.target.value as any })}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-1 text-xs text-stone-200"
                          >
                            <option value="slow_zoom_in">Slow Zoom In</option>
                            <option value="cinematic_push">Cinematic Push</option>
                            <option value="pan_right">Pan Right</option>
                            <option value="fade_reveal">Fade Reveal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scene voiceover line */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 uppercase font-semibold block">Voiceover Narration:</label>
                    <textarea
                      rows={2}
                      value={scene.voiceoverText}
                      onChange={(e) => handleUpdateScene(scene.id, { voiceoverText: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 4. AUDIO & PROFESSIONAL MIXER                     */}
        {/* ============================================================== */}
        {activeTab === 'audio' && (
          <div className="space-y-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-amber-400" /> Multi-Track Audio Mixer
                  </h2>
                  <p className="text-xs text-stone-400">
                    Independent volume controls, auto-ducking during speech, and Web Audio API synthesis.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">Master Level:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="accent-amber-500 w-24 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-amber-400">{Math.round(masterVolume * 100)}%</span>
                </div>
              </div>

              {/* Mixing Tracks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Track 1: Voiceover */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Mic className="w-4 h-4" /> VOICEOVER
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 uppercase">
                      {activeAudioSource}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Volume:</span>
                      <span className="font-mono">{voiceVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Primary vocal narration. Automatically prioritizes speech clarity.
                  </p>
                </div>

                {/* Track 2: Music / BGM */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Music className="w-4 h-4" /> MUSIC / BGM
                    </span>
                    <select
                      value={selectedBgmStyle}
                      onChange={(e) => {
                        setSelectedBgmStyle(e.target.value);
                        if (isPlaying) webAudioDirector.startBgm(e.target.value);
                      }}
                      className="bg-stone-800 text-[10px] text-stone-200 rounded p-1 border border-stone-700"
                    >
                      <option value="corporate">Corporate</option>
                      <option value="indian_folk">Indian Folk</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="energetic">Energetic</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Volume:</span>
                      <span className="font-mono">{bgmVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Background backing track. Automatically ducks when speech is active.
                  </p>
                </div>

                {/* Track 3: Song / Jingle Vocal */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Radio className="w-4 h-4" /> SONG / JINGLE
                    </span>
                    <button
                      onClick={() => setReverbEffectEnabled(!reverbEffectEnabled)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                        reverbEffectEnabled
                          ? 'bg-purple-900/40 text-purple-300 border-purple-500/50'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {reverbEffectEnabled ? 'Reverb ON' : 'Dry'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Volume:</span>
                      <span className="font-mono">{songVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={songVolume}
                      onChange={(e) => setSongVolume(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Specialized vocal track for singing and brand jingles.
                  </p>
                </div>

                {/* Track 4: SFX / Brand Audio */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" /> SFX / CHIMES
                    </span>
                    <button
                      onClick={() => webAudioDirector.playSoundEffect('chime')}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700"
                    >
                      Test Chime
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Volume:</span>
                      <span className="font-mono">{sfxVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sfxVolume}
                      onChange={(e) => setSfxVolume(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Impact whooshes, brand signatures, and satisfaction bell chimes.
                  </p>
                </div>
              </div>

              {/* AI Auto-Ducking Intelligence Panel */}
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">AI Automatic Audio Ducking</span>
                  </div>
                  <button
                    onClick={() => setAutoDuckingEnabled(!autoDuckingEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      autoDuckingEnabled
                        ? 'bg-cyan-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {autoDuckingEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-300 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Music During Speech:</span>
                      <span className="font-mono text-cyan-400">{duckSpeechLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      value={duckSpeechLevel}
                      onChange={(e) => setDuckSpeechLevel(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Music During Pauses / Silence:</span>
                      <span className="font-mono text-cyan-400">{duckSilenceLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={70}
                      value={duckSilenceLevel}
                      onChange={(e) => setDuckSilenceLevel(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 5. MEDIA & VOICE RECORDING                        */}
        {/* ============================================================== */}
        {activeTab === 'media' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Microphone Recording Studio */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-red-500" /> Direct Voice Recording
                </h3>
                <p className="text-xs text-stone-400">
                  Record custom Hindi/English voiceover narration or sing a commercial jingle.
                </p>
              </div>

              {/* Record Action Box */}
              <div className="p-6 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col items-center justify-center space-y-4">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecordingMic
                      ? 'bg-red-500/20 text-red-400 border-2 border-red-500 animate-pulse'
                      : 'bg-stone-800 text-stone-300 hover:scale-105'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>

                <div className="text-center">
                  <div className="text-xl font-mono font-bold text-white">
                    {Math.floor(recordingSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {Math.floor(recordingSeconds % 60)
                      .toString()
                      .padStart(2, '0')}
                  </div>
                  <span className="text-xs text-stone-400">
                    {isRecordingMic ? 'Recording in progress...' : 'Ready to record microphone'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {!isRecordingMic ? (
                    <button
                      onClick={startMicRecording}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition"
                    >
                      <Mic className="w-4 h-4" /> START RECORDING
                    </button>
                  ) : (
                    <button
                      onClick={stopMicRecording}
                      className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-2 border border-red-500/50 transition"
                    >
                      <Square className="w-4 h-4 text-red-400 fill-red-400" /> STOP & SAVE
                    </button>
                  )}
                </div>
              </div>

              {/* Recorded Audio Preview & Track Assignment */}
              {recordedAudioUrl && (
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Microphone Recording Captured
                  </span>
                  <audio
                    ref={recordedAudioElemRef}
                    src={recordedAudioUrl}
                    controls
                    className="w-full h-8 accent-amber-500"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setActiveAudioSource('recorded');
                        webAudioDirector.playSoundEffect('success');
                      }}
                      className="flex-1 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition"
                    >
                      ✓ Use as Main Voiceover
                    </button>
                    <button
                      onClick={() => setRecordedAudioUrl(null)}
                      className="p-1.5 text-stone-400 hover:text-red-400 bg-stone-800 rounded-xl"
                      title="Discard"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Audio File Uploader */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-400" /> Upload Voice / Narration File
                </h3>
                <p className="text-xs text-stone-400">
                  Upload MP3, WAV, or M4A audio files produced in an external studio.
                </p>
              </div>

              <div className="p-8 bg-stone-950 rounded-2xl border-2 border-dashed border-stone-800 hover:border-cyan-500/60 transition flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-900/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label className="cursor-pointer text-xs font-semibold text-cyan-400 hover:underline">
                    Click to select audio file
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/m4a,audio/*"
                      onChange={handleUploadAudioFile}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-stone-500 mt-1">Supports MP3, WAV, M4A up to 25MB</p>
                </div>
              </div>

              {uploadedAudioUrl && (
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                  <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Uploaded Audio File Loaded
                  </span>
                  <audio src={uploadedAudioUrl} controls className="w-full h-8 accent-cyan-500" />
                  <button
                    onClick={() => {
                      setActiveAudioSource('uploaded');
                      webAudioDirector.playSoundEffect('success');
                    }}
                    className="w-full py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-stone-950 rounded-xl transition"
                  >
                    ✓ Apply to Ad Audio Track
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 6. EDIT & BRANDING                                */}
        {/* ============================================================== */}
        {activeTab === 'edit' && project && (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" /> HARDINKAAM Branding & Watermark Settings
              </h2>
              <p className="text-xs text-stone-400">
                Ensure brand consistency across all ads produced for Bhopal & Indore.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-400">Brand Helpline Phone:</label>
                <input
                  type="text"
                  value={project.branding.helpline}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      branding: { ...project.branding, helpline: e.target.value },
                    })
                  }
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl p-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-400">Website URL:</label>
                <input
                  type="text"
                  value={project.branding.websiteUrl}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      branding: { ...project.branding, websiteUrl: e.target.value },
                    })
                  }
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl p-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-400">Target Region / City:</label>
                <input
                  type="text"
                  value={project.branding.cityTarget}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      branding: { ...project.branding, cityTarget: e.target.value },
                    })
                  }
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-950 rounded-2xl border border-stone-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Show HARDINKAAM Watermark Badge</span>
                <p className="text-[11px] text-stone-500">Overlays official verification seals and hotline badge in the video.</p>
              </div>
              <input
                type="checkbox"
                checked={project.branding.showWatermark}
                onChange={(e) =>
                  setProject({
                    ...project,
                    branding: { ...project.branding, showWatermark: e.target.checked },
                  })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB CONTENT: 7. PUBLISH & SOCIAL                               */}
        {/* ============================================================== */}
        {activeTab === 'publish' && project && (
          <div className="space-y-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-400" /> One-Click Social Copies & Publish Center
                </h2>
                <p className="text-xs text-stone-400">
                  Ready-to-use captions, hashtags, and formats tailored for Instagram Reels, YouTube Shorts, and WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Reel */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                      📸 Instagram Reel (9:16)
                    </span>
                    <p className="text-xs text-stone-300 whitespace-pre-line leading-relaxed">
                      {project.socialPublish.instagramReelCaption}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCaption(project.socialPublish.instagramReelCaption, 'instagram')}
                    className="w-full py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedCaptionType === 'instagram' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCaptionType === 'instagram' ? 'Copied!' : 'Copy Caption'}
                  </button>
                </div>

                {/* YouTube Shorts */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      ▶️ YouTube Shorts Title & Desc
                    </span>
                    <div className="text-xs font-semibold text-white">
                      {project.socialPublish.youtubeShortsTitle}
                    </div>
                    <p className="text-[11px] text-stone-400 whitespace-pre-line line-clamp-4">
                      {project.socialPublish.youtubeDescription}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyCaption(
                        `${project.socialPublish.youtubeShortsTitle}\n\n${project.socialPublish.youtubeDescription}`,
                        'youtube'
                      )
                    }
                    className="w-full py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedCaptionType === 'youtube' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCaptionType === 'youtube' ? 'Copied!' : 'Copy YouTube Info'}
                  </button>
                </div>

                {/* WhatsApp Broadcast */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      💬 WhatsApp Broadcast Text
                    </span>
                    <p className="text-xs text-stone-300 whitespace-pre-line leading-relaxed">
                      {project.socialPublish.whatsAppBroadcastText}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCaption(project.socialPublish.whatsAppBroadcastText, 'whatsapp')}
                    className="w-full py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedCaptionType === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCaptionType === 'whatsapp' ? 'Copied!' : 'Copy WhatsApp Text'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ============================================================== */}
        {/* CREATE NEW AI AVATAR MODAL                                     */}
        {/* ============================================================== */}
        {showCreateAvatarModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-scaleUp">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" /> Create New AI Avatar
                </h3>
                <button
                  onClick={() => setShowCreateAvatarModal(false)}
                  className="p-1 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Avatar / Host Name:</label>
                  <input
                    type="text"
                    value={newAvatarName}
                    onChange={(e) => setNewAvatarName(e.target.value)}
                    placeholder="E.g. Priya Mishra"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Professional Role / Title:</label>
                  <input
                    type="text"
                    value={newAvatarRole}
                    onChange={(e) => setNewAvatarRole(e.target.value)}
                    placeholder="E.g. Senior Service Expert & Host"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Gender:</label>
                  <select
                    value={newAvatarGender}
                    onChange={(e) => setNewAvatarGender(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="female">Female Host</option>
                    <option value="male">Male Host</option>
                    <option value="neutral">Neutral / Professional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Reference Video / Footage URL (Optional):</label>
                  <input
                    type="text"
                    placeholder="https://... (mp4 reference footage)"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-stone-500">
                    Upload a clean reference video with stable lighting and clear face visibility.
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consentCheck"
                    checked={newAvatarConsent}
                    onChange={(e) => setNewAvatarConsent(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="consentCheck" className="text-xs text-amber-200 cursor-pointer select-none leading-relaxed">
                    I confirm that I have explicit authorization, consent, and rights to use this person's likeness and voice for commercial advertisements on HARDINKAAM.
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAvatarModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newAvatarName.trim() || !newAvatarConsent || isCreatingAvatar}
                  onClick={async () => {
                    setIsCreatingAvatar(true);
                    try {
                      const created = await requestCreateAIAvatar({
                        name: newAvatarName,
                        roleTitle: newAvatarRole,
                        gender: newAvatarGender,
                        consentVerified: newAvatarConsent,
                      });
                      setAvatarLibrary((prev) => [created, ...prev]);
                      setSelectedAvatarId(created.id);
                      setShowCreateAvatarModal(false);
                      setNewAvatarName('');
                      webAudioDirector.playSoundEffect('success');
                    } catch (err: any) {
                      alert(`Failed to create avatar: ${err.message}`);
                    } finally {
                      setIsCreatingAvatar(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 rounded-xl shadow-lg transition"
                >
                  {isCreatingAvatar ? 'Synthesizing Avatar...' : '✨ Create & Approve Avatar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Default export alias to maintain pristine backwards compatibility with all routes and tabs
export const AdminAIVideoStudio = AdminAIAdStudio;
export default AdminAIAdStudio;
