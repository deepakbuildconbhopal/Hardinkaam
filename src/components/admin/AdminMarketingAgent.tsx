import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Sparkles,
  Phone,
  MessageSquare,
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  UserCheck,
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Share2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Play,
  Pause,
  Square,
  Globe,
  Award,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckSquare,
  Square as SquareIcon,
  Video,
  Film,
  Radio,
  FileText,
  FileSpreadsheet,
  Smartphone,
  Layers,
  Sparkle,
  Sliders,
  RotateCcw,
  Image as ImageIcon,
  Palette,
  Eye,
  Camera,
  Target as TargetIcon,
} from 'lucide-react';
import { AdCreativeStudio } from './AdCreativeStudio';
import { AdminMarketingLeadsManager } from './AdminMarketingLeadsManager';
import { ALL_INDIA_LOCATIONS, StateData } from '../../data/indiaLocations';
import {
  DiscoveredLead,
  SearchLeadsResponse,
  MarketingCampaignCopy,
  VideoScene,
  VideoAdData,
  ImagePromptItem,
  TargetDemographics,
  MarketingTaskRecord,
  searchServicemenLeads,
  transcribeMicrophoneAudio,
  generateMarketingCampaign,
  allocateMarketingTask,
  fetchMarketingTasks,
  updateLeadStatus,
  generateAIImage,
  playVoiceSpeech,
  stopVoiceSpeech,
  buildWhatsAppUrl,
  buildSmsUrl,
  shareToSocialPlatform,
  downloadMediaFile,
  downloadTextAsFile,
  SocialPlatform,
} from '../../services/marketingAgentClientService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Props {
  onSelectTab?: (tab: string) => void;
  initialView?: 'search' | 'campaign' | 'allocation' | 'tasks';
}

const COMMON_TRADES = [
  { id: 'Electrician', label: 'इलेक्ट्रीशियन (Electrician)', icon: '⚡' },
  { id: 'Plumber', label: 'प्लंबर (Plumber)', icon: '🔧' },
  { id: 'AC Repair & Technician', label: 'एसी रिपेयर (AC Technician)', icon: '❄️' },
  { id: 'Carpenter', label: 'कारपेंटर / बढ़ई (Carpenter)', icon: '🪚' },
  { id: 'Painter', label: 'पेंटर / रंगाई (Painter)', icon: '🎨' },
  { id: 'Appliance Repair', label: 'उपकरण मरम्मत (Appliance Repair)', icon: '🔌' },
  { id: 'Home Cleaning', label: 'होम क्लीनिंग (Deep Cleaning)', icon: '🧹' },
  { id: 'Mason & Civil Work', label: 'राजमिस्त्री / सिविल वर्क (Mason)', icon: '🧱' },
  { id: 'All Services', label: 'सभी सर्विसमैन (All Trades)', icon: '🛠️' },
];

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const AdminMarketingAgent: React.FC<Props> = ({ onSelectTab, initialView }) => {
  const { user, userProfile } = useAuth();
  const { addToast } = useToast();

  // Active View Tab inside Marketing Agent
  const [activeView, setActiveView] = useState<'search' | 'leads_manager' | 'campaign' | 'allocation' | 'tasks'>(
    (initialView as any) || 'leads_manager'
  );

  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  // Location & Search States
  const [selectedState, setSelectedState] = useState<string>('Madhya Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Bhopal');
  const [selectedPlace, setSelectedPlace] = useState<string>('MP Nagar & New Bhopal');
  const [customLocationKeyword, setCustomLocationKeyword] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('Electrician');
  const [gpsCoords, setGpsCoords] = useState<{ lat?: number; lng?: number }>({});
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);

  // Search Results States
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchLeadsResponse | null>(null);
  const [leadsList, setLeadsList] = useState<DiscoveredLead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Creative Studio Sub-Tab inside Campaign view: 'all' | 'images' | 'video' | 'audio' | 'social'
  const [campaignSubView, setCampaignSubView] = useState<'all' | 'images' | 'video' | 'audio' | 'social'>('all');

  // Target Demographics States
  const [targetAudience, setTargetAudience] = useState<'servicemen' | 'customers' | 'franchise_partners'>('servicemen');
  const [ageDemographic, setAgeDemographic] = useState<string>('20-45 वर्ष (युवा व पेशेवर)');
  const [campaignObjective, setCampaignObjective] = useState<string>('₹121 रजिस्ट्रेशन व 100% सीधी कमाई');
  const [toneAndLanguage, setToneAndLanguage] = useState<string>('कड़क व आकर्षक हिंदी (Energetic Hindi)');

  // Image Generation Prompts & Poster Studio States
  const [selectedImagePrompt, setSelectedImagePrompt] = useState<ImagePromptItem | null>(null);
  const [generatedAiImages, setGeneratedAiImages] = useState<Record<string, string>>({});
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState<boolean>(false);
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video Ad Player States
  const [videoAspectRatio, setVideoAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [lastGeneratedVideoBlob, setLastGeneratedVideoBlob] = useState<Blob | null>(null);
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Campaign & Ad Maker States
  const [customAdPrompt, setCustomAdPrompt] = useState<string>(
    'Offer ₹121 nominal lifetime registration, 100% daily earnings, direct local customer bookings, zero agency commission, and 24x7 support.'
  );
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState<boolean>(false);
  const [campaignCopy, setCampaignCopy] = useState<MarketingCampaignCopy | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Voice & Audio Messaging States
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Task Allocation States
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeePhone, setEmployeePhone] = useState<string>('');
  const [employeeRole, setEmployeeRole] = useState<string>('Brand Promoter / Telecaller');
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  const [existingTasks, setExistingTasks] = useState<MarketingTaskRecord[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<MarketingTaskRecord | null>(null);

  // Derive districts and places from selected state
  const currentStateData = ALL_INDIA_LOCATIONS.find((s) => s.state === selectedState);
  const currentDistrictData = currentStateData?.districts.find((d) => d.district === selectedDistrict);

  // Set default district when state changes
  useEffect(() => {
    if (currentStateData && currentStateData.districts.length > 0) {
      const firstDistrict = currentStateData.districts[0];
      setSelectedDistrict(firstDistrict.district);
      if (firstDistrict.places.length > 0) {
        setSelectedPlace(firstDistrict.places[0].name);
      } else {
        setSelectedPlace('');
      }
    }
  }, [selectedState]);

  // Set default place when district changes
  useEffect(() => {
    if (currentDistrictData && currentDistrictData.places.length > 0) {
      setSelectedPlace(currentDistrictData.places[0].name);
    } else {
      setSelectedPlace('');
    }
  }, [selectedDistrict]);

  // Load existing tasks on mount or tab change
  useEffect(() => {
    if (activeView === 'tasks') {
      loadTasks();
    }
  }, [activeView]);

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const tasks = await fetchMarketingTasks();
      setExistingTasks(tasks);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // 1-Click GPS Fetch
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      addToast('आपके ब्राउज़र में GPS लोकेशन समर्थित नहीं है।', 'error');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsGettingGps(false);
        addToast(`GPS लोकेशन प्राप्त: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
      },
      (err) => {
        setIsGettingGps(false);
        addToast(`लोकेशन एरर: ${err.message}`, 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Execute Google Maps Grounding Search
  const handleSearchGoogleMapsLeads = async () => {
    setIsSearching(true);
    try {
      const result = await searchServicemenLeads({
        trade: selectedTrade,
        state: selectedState,
        district: selectedDistrict,
        tehsilOrVillage: customLocationKeyword ? `${selectedPlace}, ${customLocationKeyword}` : selectedPlace,
        customKeyword: customLocationKeyword,
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
      });

      setSearchResult(result);
      setLeadsList(result.leads || []);
      // Select all by default
      const allIds = new Set(result.leads.map((l) => l.id));
      setSelectedLeadIds(allIds);

      addToast(`सफलतापूर्वक ${result.leads.length} सर्विसमैन लीड्स खोजी गईं!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Google Maps खोज में त्रुटि हुई।', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle selection of lead
  const toggleLeadSelection = (id: string) => {
    const updated = new Set(selectedLeadIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedLeadIds(updated);
  };

  const selectAllLeads = () => {
    if (selectedLeadIds.size === leadsList.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leadsList.map((l) => l.id)));
    }
  };

  // Generate AI Marketing Ad Copy & Creative Studio Package
  const handleGenerateCampaign = async () => {
    setIsGeneratingCampaign(true);
    try {
      const locationStr = [customLocationKeyword, selectedPlace, selectedDistrict, selectedState].filter(Boolean).join(', ');
      const copy = await generateMarketingCampaign({
        trade: selectedTrade,
        location: locationStr,
        customInstruction: customAdPrompt,
        leadCount: selectedLeadIds.size || leadsList.length,
        promoterOrEmployeeName: employeeName || userProfile?.name || 'HARDINKAAM टीम',
        targetAudience,
        state: selectedState,
        districtOrCity: selectedDistrict,
        localityOrVillage: selectedPlace || customLocationKeyword,
        ageGroup: ageDemographic,
        campaignObjective,
        toneAndLanguage,
      });

      setCampaignCopy(copy);
      if (copy.imagePrompts && copy.imagePrompts.length > 0) {
        setSelectedImagePrompt(copy.imagePrompts[0]);
      }
      setActiveView('campaign');
      addToast('AI Ad Creative Studio (इमेज, वीडियो, ऑडियो व टेक्स्ट) तैयार हो गया!', 'success');
    } catch (err: any) {
      addToast(err.message || 'कैंपेन जनरेशन में त्रुटि हुई।', 'error');
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  // Generate real AI Marketing Image via Imagen / Gemini
  const handleGenerateAIImage = async (promptItem: ImagePromptItem) => {
    setIsGeneratingAiImage(true);
    try {
      addToast('Gemini / Imagen से AI इमेज तैयार हो रही है...', 'info');
      const res = await generateAIImage({
        prompt: promptItem.prompt,
        aspectRatio: promptItem.aspectRatio,
      });
      setGeneratedAiImages((prev) => ({
        ...prev,
        [promptItem.id]: res.imageUrl,
      }));
      addToast('AI इमेज सफलतापूर्वक तैयार हो गई!', 'success');
    } catch (err: any) {
      addToast(err.message || 'AI इमेज जनरेशन में त्रुटि हुई।', 'error');
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Render Graphic Poster from Image Prompt to HTML5 Canvas
  const renderPosterToCanvas = useCallback(
    (promptItem: ImagePromptItem) => {
      const canvas = posterCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isSquare = promptItem.aspectRatio === '1:1';
      const isVertical = promptItem.aspectRatio === '9:16';

      canvas.width = isSquare ? 1080 : isVertical ? 720 : 1280;
      canvas.height = isSquare ? 1080 : isVertical ? 1280 : 720;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.4, '#1E293B');
      grad.addColorStop(1, '#0B0F19');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 2. Geometric Accents
      ctx.save();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.beginPath();
      ctx.arc(w * 0.85, h * 0.2, w * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.beginPath();
      ctx.arc(w * 0.15, h * 0.85, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Top Branding Header
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('⚡ HARDINKAAM.online', 32, 60);

      ctx.fillStyle = '#FDE047';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`📍 ${selectedDistrict}, ${selectedState}`, w - 32, 60);
      ctx.restore();

      // 4. Center Visual Graphic & Service Icon
      const tradeEmoji =
        selectedTrade.includes('Electric') ? '⚡' :
        selectedTrade.includes('Plumb') ? '🔧' :
        selectedTrade.includes('AC') ? '❄️' :
        selectedTrade.includes('Carp') ? '🪚' :
        selectedTrade.includes('Paint') ? '🎨' : '🛠️';

      ctx.save();
      ctx.font = '80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tradeEmoji, w / 2, h * 0.30);
      ctx.restore();

      // 5. Category Pill
      ctx.save();
      ctx.fillStyle = '#F59E0B';
      const catText = `✨ ${selectedTrade.toUpperCase()} ऑनबोर्डिंग`;
      ctx.font = 'bold 18px sans-serif';
      const catMetrics = ctx.measureText(catText);
      ctx.beginPath();
      ctx.roundRect((w - catMetrics.width - 40) / 2, h * 0.36, catMetrics.width + 40, 40, 20);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(catText, w / 2, h * 0.36 + 20);
      ctx.restore();

      // 6. Main Overlay Headline
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 16;
      ctx.font = `900 ${Math.min(w * 0.05, 36)}px sans-serif`;
      const titleLines = wrapCanvasText(ctx, promptItem.suggestedOverlayText || campaignCopy?.headline || '100% सीधी कमाई', w - 80);
      titleLines.forEach((l, idx) => {
        ctx.fillText(l, w / 2, h * 0.48 + idx * 46);
      });
      ctx.restore();

      // 7. Value Bullets
      ctx.save();
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✅ सीधे आपके इलाके से जेन्युइन ग्राहक बुकिंग्स', w / 2, h * 0.64);
      ctx.fillText('✅ मात्र ₹121 से लाइफटाइम सदस्यता | 0% कमीशन', w / 2, h * 0.69);
      ctx.fillText('✅ 24x7 प्राथमिकता सपोर्ट व गारंटीड पेमेंट', w / 2, h * 0.74);
      ctx.restore();

      // 8. Call to Action Button
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect((w - 420) / 2, h * 0.81, 420, 56, 16);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📲 विजिट करें: www.hardinkaam.online', w / 2, h * 0.81 + 28);
      ctx.restore();

      // 9. Footer
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h - 80, w, 80);

      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏛️ दीपक बिल्डकॉन भोपाल द्वारा संचालित | हेल्पलाइन: +91 62675 46945', w / 2, h - 45);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('HardinKaam Service Network • अखिल भारतीय सर्विसमैन नेटवर्क', w / 2, h - 22);
      ctx.restore();
    },
    [campaignCopy, selectedDistrict, selectedState, selectedTrade]
  );

  // Automatically render poster when prompt selection changes
  useEffect(() => {
    if (selectedImagePrompt) {
      renderPosterToCanvas(selectedImagePrompt);
    }
  }, [selectedImagePrompt, renderPosterToCanvas]);

  // Audio Microphone Voice Recording & Transcription
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Transcribe using gemini-3.8-flash
        setIsTranscribing(true);
        try {
          const text = await transcribeMicrophoneAudio(audioBlob);
          if (text) {
            setCustomAdPrompt((prev) => `${prev} ${text}`.trim());
            addToast(`वॉइस ट्रांसक्रिप्शन: "${text}"`, 'success');
          }
        } catch (tErr: any) {
          addToast('ऑडियो ट्रांसक्रिप्शन नहीं हो सका।', 'warning');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingMic(true);
      addToast('माइक रिकॉर्डिंग शुरू हो गई है... बोलिए।', 'info');
    } catch (err: any) {
      addToast(`माइक्रोफ़ोन एक्सेस एरर: ${err.message}`, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecordingMic(false);
    }
  };

  // Speech Synthesis: Listen to spoken audio pitch
  const handlePlayAudioPitch = () => {
    if (!campaignCopy?.audioVoiceScript) return;

    if (isPlayingAudio) {
      stopVoiceSpeech();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      playVoiceSpeech(campaignCopy.audioVoiceScript, {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }
  };

  // Canvas Scene Renderer
  const renderVideoFrameToCanvas = useCallback(
    (sceneIndex: number, animPhase: number = 0) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scenes = campaignCopy?.videoAd?.scenes || [
        {
          sceneNumber: 1,
          title: 'काम की तलाश में भटकना बंद!',
          subtitle: `क्या आप ${selectedDistrict || 'अपने शहर'} में ${selectedTrade} का काम करते हैं?`,
          visualDescription: 'Service Pro',
          badge: '🚨 बड़ा मौका',
          voiceover: `क्या आप ${selectedDistrict || 'अपने शहर'} में ${selectedTrade} का काम करते हैं?`,
          highlightColor: '#F59E0B',
          bgTheme: 'gradient_gold' as const,
          cta: 'आगे देखें ⏩',
        },
      ];

      const scene = scenes[Math.min(sceneIndex, scenes.length - 1)] || scenes[0];
      const width = canvas.width;
      const height = canvas.height;

      // 1. Background Gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (scene.bgTheme === 'gradient_gold') {
        grad.addColorStop(0, '#451A03');
        grad.addColorStop(0.5, '#78350F');
        grad.addColorStop(1, '#1E1B4B');
      } else if (scene.bgTheme === 'gradient_emerald') {
        grad.addColorStop(0, '#064E3B');
        grad.addColorStop(0.5, '#065F46');
        grad.addColorStop(1, '#0F172A');
      } else if (scene.bgTheme === 'gradient_cyber') {
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.5, '#1E3A8A');
        grad.addColorStop(1, '#0284C7');
      } else if (scene.bgTheme === 'gradient_ruby') {
        grad.addColorStop(0, '#4C0519');
        grad.addColorStop(0.5, '#881337');
        grad.addColorStop(1, '#18181B');
      } else {
        grad.addColorStop(0, '#09090B');
        grad.addColorStop(0.5, '#1C1917');
        grad.addColorStop(1, '#292524');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render Active Generated AI Image if available on video canvas
      const activeAiImgUrl = selectedImagePrompt?.id ? generatedAiImages[selectedImagePrompt.id] : Object.values(generatedAiImages)[0];
      if (activeAiImgUrl) {
        let img = (renderVideoFrameToCanvas as any)._cachedImg;
        if (!img || img.src !== activeAiImgUrl) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = activeAiImgUrl;
          img.onload = () => {
            renderVideoFrameToCanvas(sceneIndex, animPhase);
          };
          (renderVideoFrameToCanvas as any)._cachedImg = img;
        }

        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const canvasRatio = width / height;
          let dw = width, dh = height, dx = 0, dy = 0;
          if (imgRatio > canvasRatio) {
            dh = height;
            dw = height * imgRatio;
            dx = (width - dw) / 2;
          } else {
            dw = width;
            dh = width / imgRatio;
            dy = (height - dh) / 2;
          }
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        }
      }

      // 2. Animated Particle Sparks
      ctx.save();
      for (let i = 0; i < 20; i++) {
        const px = ((i * 137.5 + animPhase * 20) % width);
        const py = ((i * 89.3 + Math.sin(animPhase + i) * 25 + (i % 5) * 120) % height);
        const radius = (i % 3) + 1.5;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (i % 4) * 0.1})`;
        ctx.fill();
      }
      ctx.restore();

      // 3. Top Multi-Segment Progress Bar
      const totalScenes = scenes.length;
      const barPadding = 24;
      const barHeight = 6;
      const barGap = 8;
      const totalGap = (totalScenes - 1) * barGap;
      const singleBarWidth = (width - barPadding * 2 - totalGap) / totalScenes;

      for (let i = 0; i < totalScenes; i++) {
        const bx = barPadding + i * (singleBarWidth + barGap);
        const by = 24;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(bx, by, singleBarWidth, barHeight, 3);
        ctx.fill();

        if (i < sceneIndex) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(bx, by, singleBarWidth, barHeight, 3);
          ctx.fill();
        } else if (i === sceneIndex) {
          ctx.fillStyle = scene.highlightColor || '#F59E0B';
          const fillWidth = singleBarWidth * Math.min(1, Math.max(0.2, (animPhase % 100) / 100));
          ctx.beginPath();
          ctx.roundRect(bx, by, fillWidth, barHeight, 3);
          ctx.fill();
        }
      }

      // 4. Top Brand Header
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ HARDINKAAM.online', 28, 62);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'right';
      ctx.fillText(`Scene ${sceneIndex + 1}/${totalScenes}`, width - 28, 62);
      ctx.restore();

      // 5. Center Badge with Glow
      const badgeY = height * 0.20;
      const badgeText = scene.badge || '✨ विशेष ऑफर';
      ctx.save();
      ctx.font = 'bold 22px sans-serif';
      const badgeMetrics = ctx.measureText(badgeText);
      const badgeWidth = badgeMetrics.width + 40;
      const badgeHeight = 44;
      const badgeX = (width - badgeWidth) / 2;

      ctx.shadowColor = scene.highlightColor || '#F59E0B';
      ctx.shadowBlur = 15;
      ctx.fillStyle = scene.highlightColor || '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - 30, badgeWidth, badgeHeight, 22);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, width / 2, badgeY - 8);
      ctx.restore();

      // 6. Service Trade Icon
      const iconY = height * 0.35;
      const tradeEmoji =
        selectedTrade.includes('Electric') ? '⚡' :
        selectedTrade.includes('Plumb') ? '🔧' :
        selectedTrade.includes('AC') ? '❄️' :
        selectedTrade.includes('Carp') ? '🪚' :
        selectedTrade.includes('Paint') ? '🎨' : '🛠️';

      ctx.save();
      ctx.font = `${Math.min(width * 0.16, 80)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tradeEmoji, width / 2, iconY);
      ctx.restore();

      // 7. Main Animated Headline
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      const titleFontSize = Math.min(width * 0.055, 34);
      ctx.font = `900 ${titleFontSize}px sans-serif`;
      const titleLines = wrapCanvasText(ctx, scene.title, width - 80);
      const titleStartY = height * 0.50;
      titleLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, titleStartY + idx * (titleFontSize * 1.3));
      });
      ctx.restore();

      // 8. Subtitle / Explanation
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F1F5F9';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;

      const subFontSize = Math.min(width * 0.038, 20);
      ctx.font = `600 ${subFontSize}px sans-serif`;
      const subLines = wrapCanvasText(ctx, scene.subtitle, width - 90);
      const subStartY = height * 0.65;
      subLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, subStartY + idx * (subFontSize * 1.35));
      });
      ctx.restore();

      // 9. Call to Action Banner
      const ctaY = height * 0.80;
      const ctaText = scene.cta || '📲 www.hardinkaam.online | मात्र ₹121';
      ctx.save();
      ctx.font = 'bold 20px sans-serif';
      const ctaMetrics = ctx.measureText(ctaText);
      const ctaW = Math.min(width - 60, ctaMetrics.width + 48);
      const ctaH = 50;
      const ctaX = (width - ctaW) / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(ctaX, ctaY - 25, ctaW, ctaH, 16);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctaText, width / 2, ctaY);
      ctx.restore();

      // 10. Bottom Footer & Verification
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, height - 76, width, 76);

      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏛️ दीपक बिल्डकॉन भोपाल द्वारा संचालित | 100% वेरिफाइड', width / 2, height - 46);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '12px sans-serif';
      ctx.fillText('हेल्पलाइन: +91 62675 46945 | www.hardinkaam.online', width / 2, height - 22);
      ctx.restore();
    },
    [campaignCopy, selectedDistrict, selectedTrade]
  );

  // Resize canvas when aspect ratio changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (videoAspectRatio === '9:16') {
      canvas.width = 720;
      canvas.height = 1280;
    } else if (videoAspectRatio === '1:1') {
      canvas.width = 1080;
      canvas.height = 1080;
    } else {
      canvas.width = 1280;
      canvas.height = 720;
    }
    renderVideoFrameToCanvas(currentSceneIdx, 0);
  }, [videoAspectRatio, currentSceneIdx, renderVideoFrameToCanvas]);

  // Video playback loop
  const playVideoAd = () => {
    const scenes = campaignCopy?.videoAd?.scenes || [];
    if (scenes.length === 0) return;

    setIsPlayingVideo(true);
    let sceneIdx = 0;
    setCurrentSceneIdx(sceneIdx);

    const playScene = (idx: number) => {
      if (idx >= scenes.length) {
        setIsPlayingVideo(false);
        stopVoiceSpeech();
        return;
      }
      setCurrentSceneIdx(idx);
      const scene = scenes[idx];

      if (scene.voiceover) {
        playVoiceSpeech(scene.voiceover, {
          onEnd: () => {
            if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
            videoTimerRef.current = setTimeout(() => {
              playScene(idx + 1);
            }, 600);
          },
          onError: () => {
            if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
            videoTimerRef.current = setTimeout(() => {
              playScene(idx + 1);
            }, 4000);
          },
        });
      } else {
        videoTimerRef.current = setTimeout(() => {
          playScene(idx + 1);
        }, 4000);
      }
    };

    playScene(0);
  };

  const stopVideoAd = () => {
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    stopVoiceSpeech();
    setIsPlayingVideo(false);
  };

  // Export & Download Video Ad (.webm file)
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      addToast('कैनवास लोड नहीं हुआ।', 'error');
      return;
    }

    const scenes = campaignCopy?.videoAd?.scenes || [];
    if (scenes.length === 0) {
      addToast('कोई वीडियो दृश्य उपलब्ध नहीं है।', 'warning');
      return;
    }

    setIsExportingVideo(true);
    setExportProgress(10);
    addToast('वीडियो रेंडरिंग शुरू हो रही है...', 'info');

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      const videoChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunks.push(e.data);
      };

      const recordPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(videoChunks, { type: 'video/webm' });
          resolve(blob);
        };
      });

      mediaRecorder.start();

      for (let i = 0; i < scenes.length; i++) {
        setCurrentSceneIdx(i);
        setExportProgress(Math.round(((i + 1) / scenes.length) * 90));

        const startTime = Date.now();
        while (Date.now() - startTime < 3000) {
          const elapsed = (Date.now() - startTime) / 1000;
          renderVideoFrameToCanvas(i, elapsed * 30);
          await new Promise((r) => setTimeout(r, 33));
        }
      }

      mediaRecorder.stop();
      setExportProgress(95);

      const videoBlob = await recordPromise;
      setLastGeneratedVideoBlob(videoBlob);
      setExportProgress(100);

      const filename = `hardinkaam_${selectedTrade.replace(/\s+/g, '_')}_video_ad_${Date.now()}.webm`;
      downloadMediaFile(videoBlob, filename);
      addToast('वीडियो सफलतापूर्वक डाउनलोड हो गया!', 'success');
    } catch (err: any) {
      console.error('Video export error:', err);
      addToast(err.message || 'वीडियो निर्यात में त्रुटि हुई।', 'error');
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  // Multi-Social Sharing Handler
  const handleShareSocial = async (platform: SocialPlatform, customText?: string) => {
    const textToShare =
      customText ||
      (platform === 'whatsapp' ? campaignCopy?.whatsappAdText :
       platform === 'facebook' ? campaignCopy?.socialMedia?.facebookAdText :
       platform === 'instagram' ? campaignCopy?.socialMedia?.instagramCaption :
       platform === 'telegram' ? campaignCopy?.socialMedia?.telegramAdText :
       platform === 'twitter' ? campaignCopy?.socialMedia?.twitterAdText :
       platform === 'linkedin' ? campaignCopy?.socialMedia?.linkedInAdText :
       platform === 'sms' ? campaignCopy?.smsPitch : campaignCopy?.whatsappAdText) ||
      'HARDINKAAM - www.hardinkaam.online';

    const filesToShare: File[] = [];
    if (lastGeneratedVideoBlob && (platform === 'native' || platform === 'whatsapp')) {
      const file = new File([lastGeneratedVideoBlob], 'hardinkaam_ad.webm', { type: 'video/webm' });
      filesToShare.push(file);
    } else if (recordedAudioBlob && platform === 'native') {
      const file = new File([recordedAudioBlob], 'hardinkaam_audio.webm', { type: 'audio/webm' });
      filesToShare.push(file);
    }

    try {
      const res = await shareToSocialPlatform({
        platform,
        text: textToShare,
        url: 'https://www.hardinkaam.online',
        title: campaignCopy?.headline || 'HARDINKAAM Service Network',
        files: filesToShare.length > 0 ? filesToShare : undefined,
      });

      if (res.message) {
        addToast(res.message, 'success');
      }
    } catch (err: any) {
      addToast(`शेयरिंग में त्रुटि: ${err.message}`, 'error');
    }
  };

  // Copy text to clipboard helper
  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    addToast('क्लिपबोर्ड पर कॉपी किया गया!', 'success');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Allocate Task to Employee / Staff
  const handleAllocateTask = async () => {
    if (!employeeName.trim()) {
      addToast('कृपया कर्मचारी / प्रमोटर का नाम दर्ज करें।', 'error');
      return;
    }

    const leadsToAssign = leadsList.filter((l) => selectedLeadIds.has(l.id));
    if (leadsToAssign.length === 0) {
      addToast('कम से कम 1 सर्विसमैन लीड का चयन करें।', 'warning');
      return;
    }

    setIsAllocating(true);
    try {
      const locationStr = [selectedPlace, selectedDistrict, selectedState].filter(Boolean).join(', ');
      const title = `${selectedTrade} ऑनबोर्डिंग व प्रचार - ${locationStr}`;

      await allocateMarketingTask({
        title,
        trade: selectedTrade,
        state: selectedState,
        district: selectedDistrict,
        tehsilOrVillage: selectedPlace,
        assignedToEmployeeId: `emp_${Date.now()}`,
        assignedToEmployeeName: `${employeeName} ${employeePhone ? `(${employeePhone})` : ''}`.trim(),
        assignedToEmployeeRole: employeeRole,
        assignedByAdminEmail: user?.email || 'admin@hardinkaam.online',
        leads: leadsToAssign,
        campaignCopy,
        notes: allocationNotes,
      });

      addToast(`सफलतापूर्वक कार्य "${employeeName}" को आवंटित कर दिया गया!`, 'success');
      setActiveView('tasks');
      loadTasks();
    } catch (err: any) {
      addToast(err.message || 'कार्य आवंटन में विफलता।', 'error');
    } finally {
      setIsAllocating(false);
    }
  };

  // Export Leads to CSV / Excel
  const handleExportLeadsCsv = () => {
    if (leadsList.length === 0) {
      addToast('एक्सपोर्ट करने के लिए कोई लीड्स नहीं हैं।', 'warning');
      return;
    }

    const headers = ['ID', 'Name', 'BusinessName', 'Trade', 'Phone', 'Address', 'District', 'State', 'Status', 'MapsUri'];
    const rows = leadsList.map((l) => [
      `"${l.id}"`,
      `"${l.name || ''}"`,
      `"${l.businessName || ''}"`,
      `"${l.trade || ''}"`,
      `"${l.phone || ''}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${l.cityOrDistrict || ''}"`,
      `"${l.state || ''}"`,
      `"${l.verificationStatus || 'unverified'}"`,
      `"${l.mapsUri || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HARDINKAAM_Servicemen_Leads_${selectedDistrict}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV फ़ाइल सफलतापूर्वक डाउनलोड हो गई!', 'success');
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 backdrop-blur-xs text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Deepak Buildcon Bhopal • Official
                </span>
                <span className="bg-emerald-500/80 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Globe className="w-3 h-3" /> www.hardinkaam.online
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
                <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
                <span>KaamDost AI मार्केटिंग एजेंट व Google Maps लीड्स</span>
              </h1>
              <p className="text-orange-100 text-sm mt-1 max-w-2xl">
                भारत के किसी भी राज्य, ज़िले, तहसील या गाँव से Google Maps के ज़रिए सर्विसमैन व कॉन्ट्रैक्टर्स खोजें,
                AI से 1-क्लिक विज्ञापन (WhatsApp, SMS, ऑडियो संदेश) बनवाएं और कर्मचारियों को मार्केटिंग कार्य सौंपें।
              </p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setActiveView('leads_manager')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'leads_manager'
                    ? 'bg-white text-orange-900 shadow-md'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>मार्केटिंग लीड्स व एक्सेल डाटाबेस</span>
              </button>

              <button
                onClick={() => setActiveView('search')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'search'
                    ? 'bg-white text-orange-900 shadow-md'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span>Google Maps खोज ({leadsList.length})</span>
              </button>

              <button
                onClick={() => setActiveView('campaign')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'campaign'
                    ? 'bg-white text-orange-900 shadow-md'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>AI विज्ञापन स्टूडियो</span>
              </button>

              <button
                onClick={() => setActiveView('allocation')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'allocation'
                    ? 'bg-white text-orange-900 shadow-md'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>कर्मचारी को कार्य सौंपें</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('tasks');
                  loadTasks();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'tasks'
                    ? 'bg-white text-orange-900 shadow-md'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>आवंटित कार्य ({existingTasks.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* =========================================================================
            SECTION 0: MARKETING LEADS MANAGER & EXCEL HUB
        ========================================================================= */}
        {activeView === 'leads_manager' && (
          <AdminMarketingLeadsManager onNavigateToPros={() => onSelectTab && onSelectTab('admin_service_men')} />
        )}

        {/* =========================================================================
            SECTION 1: GOOGLE MAPS LEADS SEARCH & DISCOVERY ENGINE
        ========================================================================= */}
        {activeView === 'search' && (
          <div className="space-y-6">
            {/* Quick Jump Banner to Ad Creative & Video Studio */}
            <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 p-0.5 rounded-3xl shadow-md">
              <div className="bg-stone-950 rounded-[22px] p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0">
                    <Video className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-amber-300">
                        🎬 AI विज्ञापन व 5-सीन रील्स वीडियो स्टूडियो (Ad & Video Studio)
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white">
                        100% रेडी
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-0.5">
                      {selectedDistrict} में {selectedTrade} के लिए तुरंत आकर्षक पोस्टर, WhatsApp/SMS कॉपी और इंस्टाग्राम रील्स वीडियो बनाएं व डाउनलोड करें।
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('campaign')}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>🚀 विज्ञापन व वीडियो स्टूडियो खोलें</span>
                </button>
              </div>
            </div>

            {/* Search Configuration Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-600" />
                    <span>अखिल भारतीय सर्विसमैन डेटा खोज (Google Maps Grounding)</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    भारत के किसी भी राज्य, ज़िले या गाँव में काम कर रहे वास्तविक सर्विसमैन व दुकानों का डेटा Google Maps से लाइव निकालें
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingGps}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isGettingGps ? 'GPS प्राप्त हो रहा है...' : 'मेरा वर्तमान GPS स्थान उपयोग करें'}</span>
                </button>
              </div>

              {/* Form Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                {/* State Select */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    राज्य (State) *
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    {ALL_INDIA_LOCATIONS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.hindiState} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Select */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ज़िला (District) *
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    {currentStateData?.districts.map((d) => (
                      <option key={d.district} value={d.district}>
                        {d.hindiDistrict} ({d.district})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tehsil / Village / Locality Select */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    तहसील / गाँव / इलाका (Tehsil/Village)
                  </label>
                  <select
                    value={selectedPlace}
                    onChange={(e) => setSelectedPlace(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    <option value="">-- पूरा ज़िला (All District) --</option>
                    {currentDistrictData?.places.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.hindiName} ({p.type === 'village' ? 'गाँव' : p.type === 'town' ? 'कस्बा' : 'शहर'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trade Select */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    काम का प्रकार (Trade / Service) *
                  </label>
                  <select
                    value={selectedTrade}
                    onChange={(e) => setSelectedTrade(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-bold text-orange-950 rounded-xl border border-orange-200 bg-orange-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    {COMMON_TRADES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Keyword or Village Name */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={customLocationKeyword}
                    onChange={(e) => setCustomLocationKeyword(e.target.value)}
                    placeholder="विशिष्ट गाँव, चौराहा, वार्ड या कीवर्ड (उदा: नज़ीराबाद गाँव, सीहोर नाका, कोलार, बैरसिया रोड)..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSearchGoogleMapsLeads}
                    disabled={isSearching}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Google Maps से डेटा खोजा जा रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-white" />
                        <span>Google Maps से सर्विसमैन खोजें</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('campaign')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span>🎬 सीधा AI विज्ञापन व वीडियो बनाएं</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Discovered Leads Result View */}
            {searchResult && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-5">
                {/* Search Meta & Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                        {leadsList.length} सर्विसमैन लीड्स प्राप्त
                      </span>
                      <span className="text-xs text-stone-500">स्थान: {searchResult.location}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 italic">
                      &quot;{searchResult.query}&quot;
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllLeads}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      {selectedLeadIds.size === leadsList.length ? (
                        <>
                          <SquareIcon className="w-3.5 h-3.5" />
                          <span>अन-सेलेक्ट करें</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                          <span>सभी चुनें ({leadsList.length})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportLeadsCsv}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center gap-1.5 cursor-pointer border border-stone-200"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-600" />
                      <span>CSV / Excel डाउनलोड</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateCampaign}
                      disabled={isGeneratingCampaign || leadsList.length === 0}
                      className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>{isGeneratingCampaign ? 'AI ऐड तैयार हो रहा है...' : 'चयनित के लिए AI ऐड बनाएं'}</span>
                    </button>
                  </div>
                </div>

                {/* Grounding Sources Notice */}
                {searchResult.groundingSources && searchResult.groundingSources.length > 0 && (
                  <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                      <Globe className="w-3.5 h-3.5 text-amber-700" />
                      <span>Google Maps Grounding स्रोत स्थान ({searchResult.groundingSources.length}):</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.groundingSources.slice(0, 6).map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 hover:border-amber-400 flex items-center gap-1"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leads Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leadsList.map((lead) => {
                    const isSelected = selectedLeadIds.has(lead.id);
                    const whatsappMsg = `नमस्ते जी, मैं HARDINKAAM (www.hardinkaam.online) दीपक बिल्डकॉन भोपाल से बोल रहा हूँ। क्या आप ${lead.cityOrDistrict} में ${lead.trade} का काम करते हैं? हमारे पास आपके इलाके से सीधी ग्राहक बुकिंग्स हैं। तुरंत जुड़ने हेतु संपर्क करें: +91 62675 46945`;

                    return (
                      <div
                        key={lead.id}
                        className={`rounded-2xl p-4 border transition-all relative ${
                          isSelected
                            ? 'bg-orange-50/40 border-orange-300 ring-2 ring-orange-200'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* Checkbox & Header */}
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleLeadSelection(lead.id)}
                            className="mt-0.5 text-stone-400 hover:text-orange-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-orange-600" />
                            ) : (
                              <SquareIcon className="w-5 h-5" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-stone-900 truncate">
                              {lead.name}
                            </h3>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700">
                              {lead.trade}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Maps Verified
                          </span>
                        </div>

                        {/* Details */}
                        <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{lead.address}</span>
                          </div>

                          {lead.phone ? (
                            <div className="flex items-center gap-1.5 font-mono font-bold text-stone-900">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-400 italic">
                              फ़ोन: सीधे Google Maps प्रोफाइल से उपलब्ध
                            </div>
                          )}

                          {lead.reviewSnippet && (
                            <p className="text-[11px] text-stone-500 italic bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                              &quot;{lead.reviewSnippet}&quot;
                            </p>
                          )}
                        </div>

                        {/* 1-Click Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                          <a
                            href={buildWhatsAppUrl(lead.phone, whatsappMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-colors"
                            title="1-क्लिक व्हाट्सएप संदेश भेजें"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={buildSmsUrl(lead.phone, `HARDINKAAM par ${lead.trade} ke liye rozana bookings paayein! Helpline: 6267546945 https://www.hardinkaam.online`)}
                            className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center gap-1"
                            title="1-क्लिक SMS भेजें"
                          >
                            <Send className="w-3 h-3 text-stone-600" />
                            <span>SMS</span>
                          </a>

                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center gap-1"
                              title="सीधे फ़ोन कॉल करें"
                            >
                              <Phone className="w-3 h-3 text-amber-700" />
                              <span>कॉल</span>
                            </a>
                          )}

                          {lead.mapsUri && (
                            <a
                              href={lead.mapsUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                              title="Google Maps पर देखें"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SECTION 2: AI AD CREATIVE STUDIO & CAMPAIGN GALLERY
        ========================================================================= */}
        {activeView === 'campaign' && (
          <AdCreativeStudio
            initialState={selectedState}
            initialDistrict={selectedDistrict}
            initialTrade={selectedTrade}
            onSelectTab={onSelectTab}
          />
        )}











        {/* =========================================================================
            SECTION 3: EMPLOYEE TASK ALLOCATION CONSOLE
        ========================================================================= */}
        {activeView === 'allocation' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                <span className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <UserPlus className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    कर्मचारी / प्रमोटर को मार्केटिंग कार्य सौंपें (Allocate Campaign)
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Google Maps से प्राप्त सर्विसमैन लीड्स और AI विज्ञापन सामग्री को किसी भी कर्मचारी, टेलीकॉलर या ब्रांड प्रमोटर को आउटरीच के लिए सौंपें
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      कर्मचारी / प्रमोटर का नाम (Staff Name) *
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="उदा: राहुल वर्मा, अंकित सिंह..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      कर्मचारी का मोबाइल नंबर (Staff Phone)
                    </label>
                    <input
                      type="tel"
                      value={employeePhone}
                      onChange={(e) => setEmployeePhone(e.target.value)}
                      placeholder="+91 98XXXXXXXX"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      पद / भूमिका (Staff Role)
                    </label>
                    <select
                      value={employeeRole}
                      onChange={(e) => setEmployeeRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    >
                      <option value="Telecaller & Outreach Executive">टेलीकॉलर (Telecaller &amp; Outreach)</option>
                      <option value="Brand Promoter / Marketing Staff">ब्रांड प्रमोटर (Brand Promoter)</option>
                      <option value="Field Verification Officer">फ़ील्ड वेरिफिकेशन अफ़सर (Field Officer)</option>
                      <option value="Franchise District Executive">फ्रेंचाइज़ी ज़िला कार्यकारी (Franchise Staff)</option>
                      <option value="Business Partner Executive">बिज़नेस पार्टनर टीम (Business Partner)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      सौंपी जा रही सर्विसमैन लीड्स की संख्या:
                    </label>
                    <div className="px-3.5 py-2.5 text-xs font-black text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span>चयनित लीड्स: {selectedLeadIds.size || leadsList.length}</span>
                      <span className="text-[11px] font-normal text-emerald-700">
                        {selectedTrade} • {selectedDistrict}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    कर्मचारी के लिए विशेष निर्देश व लक्ष्य (Target &amp; Notes):
                  </label>
                  <textarea
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    rows={3}
                    placeholder="उदा: आज शाम तक सभी 25 इलेक्ट्रीशियन को WhatsApp भेजें और कम से कम 5 को ₹121 में ऐप पर रजिस्टर करवाएं..."
                    className="w-full p-3.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                {/* Campaign Attached Summary */}
                {campaignCopy && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      संलग्न AI विज्ञापन सामग्री (Attached Copy):
                    </span>
                    <p className="text-xs text-stone-600 font-mono line-clamp-2">
                      {campaignCopy.whatsappAdText}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveView('search')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    रद्द करें
                  </button>

                  <button
                    type="button"
                    onClick={handleAllocateTask}
                    disabled={isAllocating}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAllocating ? 'कार्य सौंपा जा रहा है...' : 'कार्य आवंटित करें'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: ALLOCATED MARKETING CAMPAIGNS & TRACKER
        ========================================================================= */}
        {activeView === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    <span>आवंटित मार्केटिंग कार्य व कर्मचारी प्रगति (Campaign Tasks Tracker)</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    कर्मचारियों को सौंपे गए सभी अभियानों की लाइव स्थिति, संपर्क प्रगति और सर्विसमैन ऑनबोर्डिंग की निगरानी करें
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadTasks}
                  disabled={isLoadingTasks}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                  <span>रिफ्रेश करें</span>
                </button>
              </div>

              {isLoadingTasks ? (
                <div className="py-16 text-center text-stone-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">टास्क लोड हो रहे हैं...</p>
                </div>
              ) : existingTasks.length === 0 ? (
                <div className="py-16 text-center text-stone-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  <p className="text-sm font-bold text-stone-600">कोई आवंटित मार्केटिंग टास्क नहीं मिला।</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Google Maps से सर्विसमैन खोजें और &quot;कर्मचारी को कार्य सौंपें&quot; बटन से असाइन करें।
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {existingTasks.map((task) => {
                    const totalLeads = task.leads?.length || 0;
                    const contacted = task.leads?.filter((l) => l.verificationStatus !== 'unverified').length || 0;
                    const percent = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl border border-stone-200 p-5 hover:border-indigo-300 transition-all bg-stone-50/50"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                                {task.trade}
                              </span>
                              <span className="text-xs text-stone-500">
                                {task.district}, {task.state}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  task.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {task.status === 'COMPLETED' ? 'पूर्ण' : 'प्रगति पर'}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-stone-900 mt-1">
                              {task.title}
                            </h3>

                            <div className="flex items-center gap-3 text-xs text-stone-600 mt-1.5">
                              <span className="flex items-center gap-1 font-semibold text-stone-800">
                                <Users className="w-3.5 h-3.5 text-stone-500" />
                                {task.assignedToEmployeeName} ({task.assignedToEmployeeRole})
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(task.createdAt).toLocaleDateString('hi-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-black text-stone-900">
                              {contacted} / {totalLeads} संपर्कित ({percent}%)
                            </div>
                            <div className="w-36 h-2 rounded-full bg-stone-200 mt-1.5 overflow-hidden ml-auto">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {task.notes && (
                          <p className="mt-3 text-xs text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                            <strong>निर्देश:</strong> {task.notes}
                          </p>
                        )}

                        {/* Leads Action Row */}
                        <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-stone-500">
                            लीड्स: {totalLeads} सर्विसमैन जुड़े हैं
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedTaskForDetail(task)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <span>लीड्स देखें व आउटरीच शुरू करें</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Task Detail Modal */}
            {selectedTaskForDetail && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">
                        {selectedTaskForDetail.title}
                      </h3>
                      <p className="text-xs text-stone-500">
                        आवंटित कर्मचारी: {selectedTaskForDetail.assignedToEmployeeName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTaskForDetail(null)}
                      className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Task Leads List */}
                  <div className="mt-4 overflow-y-auto flex-1 space-y-3 pr-1">
                    {selectedTaskForDetail.leads?.map((lead) => {
                      const msg = selectedTaskForDetail.campaignCopy?.whatsappAdText || 'नमस्ते, HARDINKAAM www.hardinkaam.online से जुड़ें और 100% सीधी कमाई पाएं!';

                      return (
                        <div
                          key={lead.id}
                          className="rounded-2xl p-3.5 border border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-stone-900">{lead.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                                {lead.trade}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{lead.address}</p>
                            {lead.phone && (
                              <p className="text-xs font-mono font-bold text-stone-800 mt-0.5">
                                📞 {lead.phone}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Update Status Dropdown */}
                            <select
                              value={lead.verificationStatus || 'unverified'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await updateLeadStatus({
                                    taskId: selectedTaskForDetail.id,
                                    leadId: lead.id,
                                    newStatus,
                                  });
                                  lead.verificationStatus = newStatus as any;
                                  addToast('स्टेटस अपडेट हो गया!', 'success');
                                  loadTasks();
                                } catch (err: any) {
                                  addToast('अपडेट विफल', 'error');
                                }
                              }}
                              className="text-xs font-bold rounded-xl border border-stone-300 bg-white px-2.5 py-1.5"
                            >
                              <option value="unverified">लंबित (Pending)</option>
                              <option value="contacted">संपर्क किया (Contacted)</option>
                              <option value="interested">इच्छुक (Interested)</option>
                              <option value="registered">रजिस्टर्ड (Registered)</option>
                              <option value="rejected">इच्छुक नहीं (Not Interested)</option>
                            </select>

                            <a
                              href={buildWhatsAppUrl(lead.phone, msg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1"
                              title="WhatsApp पर भेजें"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>

                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                className="p-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold flex items-center gap-1"
                                title="कॉल करें"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
