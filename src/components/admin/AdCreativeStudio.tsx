import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  MapPin,
  MessageSquare,
  Copy,
  Check,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Image as ImageIcon,
  Video,
  Bookmark,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Send,
  ExternalLink,
  ChevronRight,
  Info,
  Sliders,
  FolderOpen,
  PlusCircle,
  Smartphone,
  Globe,
  Tag,
  Calendar,
  Grid,
  List,
  CheckCircle2,
} from 'lucide-react';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import {
  MarketingCampaignCopy,
  TargetDemographics,
  ImagePromptItem,
  VideoAdData,
  VideoScene,
  SavedAdSet,
  generateCampaignCopy,
  generateAIImage,
  fetchSavedAdSets,
  saveAdSet,
  deleteSavedAdSet,
  playVoiceSpeech,
  stopVoiceSpeech,
  buildWhatsAppUrl,
  shareToSocialPlatform,
  downloadMediaFile,
  downloadTextAsFile,
  createDefaultMarketingCampaignCopy,
} from '../../services/marketingAgentClientService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Props {
  initialState?: string;
  initialDistrict?: string;
  initialTrade?: string;
  onSelectTab?: (tab: string) => void;
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

export const AdCreativeStudio: React.FC<Props> = ({
  initialState = 'Madhya Pradesh',
  initialDistrict = 'Bhopal',
  initialTrade = 'Electrician',
  onSelectTab,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Studio Sub-Tabs: 'creator' | 'gallery'
  const [studioMode, setStudioMode] = useState<'creator' | 'gallery'>('creator');

  // Creative Content Focus: 'all' | 'copy' | 'images' | 'video' | 'audio'
  const [contentCategory, setContentCategory] = useState<'all' | 'copy' | 'images' | 'video' | 'audio'>('all');

  // Demographic & Targeting Inputs
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [localityOrVillage, setLocalityOrVillage] = useState<string>('MP Nagar & City Center');
  const [targetAudience, setTargetAudience] = useState<'servicemen' | 'customers' | 'franchise_partners'>('servicemen');
  const [selectedTrade, setSelectedTrade] = useState<string>(initialTrade);
  const [ageGroup, setAgeGroup] = useState<string>('20-45 Yrs (युवा व अनुभवी कामगार)');
  const [campaignObjective, setCampaignObjective] = useState<string>('₹121 आजीवन रजिस्ट्रेशन व 100% दैनिक कमाई');
  const [toneAndLanguage, setToneAndLanguage] = useState<string>('दमदार व प्रेरक हिंदी (High Conversion)');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Generation & Output State (Initialized with instant active copy so ad and video are ready immediately)
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [campaignCopy, setCampaignCopy] = useState<MarketingCampaignCopy>(() =>
    createDefaultMarketingCampaignCopy({
      trade: initialTrade,
      districtOrCity: initialDistrict,
      state: initialState,
      location: `${initialDistrict}, ${initialState}`,
      targetAudience: 'servicemen',
    })
  );
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // AI Image Prompts & Poster Studio
  const [selectedImagePrompt, setSelectedImagePrompt] = useState<ImagePromptItem | null>(() => {
    const initial = createDefaultMarketingCampaignCopy({
      trade: initialTrade,
      districtOrCity: initialDistrict,
      state: initialState,
      location: `${initialDistrict}, ${initialState}`,
      targetAudience: 'servicemen',
    });
    return initial.imagePrompts?.[0] || null;
  });
  const [generatedAiImages, setGeneratedAiImages] = useState<Record<string, string>>({});
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState<boolean>(false);
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video Storyboard States
  const [videoAspectRatio, setVideoAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [activeVideoSceneIndex, setActiveVideoSceneIndex] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoPlaybackProgress, setVideoPlaybackProgress] = useState<number>(0);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoTimerRef = useRef<number | null>(null);

  // Audio Voiceover State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Gallery & Saved Ad Sets State
  const [savedAdSets, setSavedAdSets] = useState<SavedAdSet[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState<boolean>(false);
  const [gallerySearchTerm, setGallerySearchTerm] = useState<string>('');
  const [galleryFilterAudience, setGalleryFilterAudience] = useState<string>('all');
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAdSetForDetail, setSelectedAdSetForDetail] = useState<SavedAdSet | null>(null);
  const [activeAdSetId, setActiveAdSetId] = useState<string | null>(null);

  // Location helpers
  const currentStateData = ALL_INDIA_LOCATIONS.find((s) => s.state === selectedState);
  const currentDistrictData = currentStateData?.districts.find((d) => d.district === selectedDistrict);

  // Load saved ad sets on mount or mode change
  useEffect(() => {
    loadSavedSets();
  }, []);

  const loadSavedSets = async () => {
    try {
      setIsLoadingGallery(true);
      const sets = await fetchSavedAdSets();
      if (Array.isArray(sets)) {
        setSavedAdSets(sets);
      }
    } catch (err: any) {
      console.warn('Notice loading saved ad sets:', err?.message || err);
      try {
        const local = localStorage.getItem('hardinkaam_saved_ad_sets');
        if (local) {
          setSavedAdSets(JSON.parse(local));
        }
      } catch (_) {}
    } finally {
      setIsLoadingGallery(false);
    }
  };

  // Auto-fill district when state changes
  useEffect(() => {
    if (currentStateData && currentStateData.districts.length > 0) {
      if (!currentStateData.districts.some((d) => d.district === selectedDistrict)) {
        const firstDistrict = currentStateData.districts[0];
        setSelectedDistrict(firstDistrict.district);
        if (firstDistrict.places.length > 0) {
          setLocalityOrVillage(firstDistrict.places[0].name);
        }
      }
    }
  }, [selectedState]);

  // Handle Copy helper
  const handleCopyText = async (text: string, type: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedType(type);
      addToast('क्लिपबोर्ड पर कॉपी हो गया!', 'success');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      addToast('कॉपी करने में समस्या आई।', 'error');
    }
  };

  // Core Gemini API Content Generation
  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setGenerationStep('1/4 लक्षित जनसांख्यिकी (Demographics) का विश्लेषण...');

    try {
      const locationStr = [localityOrVillage, selectedDistrict, selectedState].filter(Boolean).join(', ');

      setTimeout(() => {
        setGenerationStep('2/4 Gemini AI से आकर्षक विज्ञापन प्रतिलिपि (Copywriting) तैयार हो रही है...');
      }, 700);

      setTimeout(() => {
        setGenerationStep('3/4 Imagen 3 के लिए फोटोरियलिस्टिक प्रॉम्ट्स और रील्स वीडियो स्टोरीबोर्ड...');
      }, 1500);

      const copy = await generateCampaignCopy({
        trade: selectedTrade,
        location: locationStr,
        customInstruction: customInstructions,
        targetAudience,
        state: selectedState,
        districtOrCity: selectedDistrict,
        localityOrVillage,
        ageGroup,
        campaignObjective,
        toneAndLanguage,
      });

      setCampaignCopy(copy);
      if (copy.imagePrompts && copy.imagePrompts.length > 0) {
        setSelectedImagePrompt(copy.imagePrompts[0]);
      }
      setActiveVideoSceneIndex(0);
      setActiveAdSetId(null);

      // Default Title
      const defaultTitle = `${selectedTrade} - ${selectedDistrict} (${targetAudience === 'servicemen' ? 'कारीगर भर्ती' : 'ग्राहक बुकिंग'})`;
      if (!campaignTitle) {
        setCampaignTitle(defaultTitle);
      }

      addToast('Gemini API से सम्पूर्ण विज्ञापन सेट सफलतापूर्वक तैयार हो गया!', 'success');
    } catch (err: any) {
      addToast(err.message || 'विज्ञापन तैयार करने में विफलता।', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Generate Imagen 3 Visual
  const handleGenerateAIImage = async (promptItem: ImagePromptItem) => {
    setIsGeneratingAiImage(true);
    try {
      addToast('Imagen 3 से AI इमेज तैयार हो रही है...', 'info');
      const res = await generateAIImage({
        prompt: promptItem.prompt,
        aspectRatio: promptItem.aspectRatio,
      });
      setGeneratedAiImages((prev) => ({
        ...prev,
        [promptItem.id]: res.imageUrl,
      }));
      addToast('AI विज्ञापन इमेज सफलतापूर्वक तैयार!', 'success');
    } catch (err: any) {
      addToast(err.message || 'AI इमेज जनरेशन में त्रुटि।', 'error');
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Save current Ad Set to Gallery & Firestore
  const handleSaveCurrentAdSet = async () => {
    if (!campaignCopy) {
      addToast('कृपया पहले विज्ञापन सामग्री (Content) जेनरेट करें।', 'warning');
      return;
    }

    const titleToSave = campaignTitle || `${selectedTrade} Ad Set - ${selectedDistrict} (${selectedState})`;
    try {
      const newSet = await saveAdSet({
        id: activeAdSetId || undefined,
        title: titleToSave,
        trade: selectedTrade,
        demographics: {
          targetAudience,
          state: selectedState,
          districtOrCity: selectedDistrict,
          localityOrVillage,
          ageGroup,
          campaignObjective,
          toneAndLanguage,
        },
        campaignCopy,
        generatedImages: generatedAiImages,
        tags: [selectedState, selectedDistrict, selectedTrade, targetAudience],
        notes: customInstructions,
      });

      setActiveAdSetId(newSet.id);
      addToast(`विज्ञापन सेट "${titleToSave}" गैलरी में सुरक्षित हो गया!`, 'success');
      loadSavedSets();
    } catch (err: any) {
      addToast(err.message || 'गैलरी में सुरक्षित करने में त्रुटि।', 'error');
    }
  };

  // Load a Saved Ad Set from Gallery into active Studio
  const handleLoadAdSetFromGallery = (adSet: SavedAdSet) => {
    setCampaignTitle(adSet.title);
    setSelectedState(adSet.demographics.state || 'Madhya Pradesh');
    setSelectedDistrict(adSet.demographics.districtOrCity || 'Bhopal');
    setLocalityOrVillage(adSet.demographics.localityOrVillage || '');
    setTargetAudience(adSet.demographics.targetAudience || 'servicemen');
    setSelectedTrade(adSet.trade || 'Electrician');
    setAgeGroup(adSet.demographics.ageGroup || '20-45 Yrs');
    setCampaignObjective(adSet.demographics.campaignObjective || '');
    setToneAndLanguage(adSet.demographics.toneAndLanguage || '');
    setCustomInstructions(adSet.notes || '');

    setCampaignCopy(adSet.campaignCopy);
    setGeneratedAiImages(adSet.generatedImages || {});
    if (adSet.campaignCopy?.imagePrompts && adSet.campaignCopy.imagePrompts.length > 0) {
      setSelectedImagePrompt(adSet.campaignCopy.imagePrompts[0]);
    }
    setActiveAdSetId(adSet.id);
    setStudioMode('creator');
    addToast(`"${adSet.title}" स्टूडियो में लोड हो गया!`, 'info');
  };

  // Delete an Ad Set
  const handleDeleteAdSet = async (id: string, title: string) => {
    if (!window.confirm(`क्या आप वाकई विज्ञापन सेट "${title}" को हटाना चाहते हैं?`)) {
      return;
    }
    try {
      await deleteSavedAdSet(id);
      setSavedAdSets((prev) => prev.filter((s) => s.id !== id));
      if (activeAdSetId === id) {
        setActiveAdSetId(null);
      }
      addToast('विज्ञापन सेट हटा दिया गया।', 'success');
    } catch (err: any) {
      addToast('हटाने में त्रुटि आई।', 'error');
    }
  };

  // Render Graphic Poster from Image Prompt to HTML5 Canvas
  const renderPosterToCanvas = useCallback(
    (promptItem: ImagePromptItem) => {
      const canvas = posterCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isStory = promptItem.aspectRatio === '9:16';
      const isBanner = promptItem.aspectRatio === '16:9';

      const width = isStory ? 1080 : isBanner ? 1920 : 1080;
      const height = isStory ? 1920 : isBanner ? 1080 : 1080;

      canvas.width = width;
      canvas.height = height;

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (promptItem.category === 'story_reel') {
        grad.addColorStop(0, '#1E1B4B');
        grad.addColorStop(0.4, '#431407');
        grad.addColorStop(1, '#0F172A');
      } else if (promptItem.category === 'banner_landscape') {
        grad.addColorStop(0, '#042F2E');
        grad.addColorStop(0.5, '#134E4A');
        grad.addColorStop(1, '#022C22');
      } else {
        grad.addColorStop(0, '#451A03');
        grad.addColorStop(0.5, '#78350F');
        grad.addColorStop(1, '#18181B');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Decorative Grid & Accents
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 2;
      const step = 80;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Top Brand Banner Header
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('⚡ HARDINKAAM • AI MARKETING STUDIO', 60, 90);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '24px sans-serif';
      ctx.fillText(`DEEPAK BUILDCON BHOPAL • ${selectedDistrict.toUpperCase()} REGION`, 60, 130);

      // Main Headline Box
      const headline = campaignCopy?.headline || `अब ${selectedDistrict} में पाएँ रोज़ काम और 100% कमाई`;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 56px sans-serif';
      const headlineLines = wrapCanvasText(ctx, headline, width - 140);
      let textY = isStory ? 340 : isBanner ? 260 : 280;
      headlineLines.forEach((line) => {
        ctx.fillText(line, 60, textY);
        textY += 68;
      });

      // Overlay text badge
      if (promptItem.suggestedOverlayText) {
        ctx.fillStyle = '#F97316';
        ctx.roundRect(60, textY + 20, width - 120, 130, 20);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px sans-serif';
        const overlayLines = wrapCanvasText(ctx, promptItem.suggestedOverlayText, width - 160);
        let overlayY = textY + 80;
        overlayLines.forEach((line) => {
          ctx.fillText(line, 90, overlayY);
          overlayY += 48;
        });
        textY += 180;
      }

      // Key Value Points
      textY += 40;
      const points = [
        '✔️ ₹121 लाइफटाइम रजिस्ट्रेशन ऑफर (Zero Hidden Fees)',
        '✔️ 100% डायरेक्ट पेमेंट ग्राहक से सीधा आपके हाथ में',
        '✔️ कोई बिचौलिया नहीं, ज़ीरो एजेंसी कमीशन',
        `✔️ ${selectedTrade} कारीगरों के लिए विशेष मौका`,
      ];

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '32px sans-serif';
      points.forEach((pt) => {
        ctx.fillText(pt, 70, textY);
        textY += 54;
      });

      // Bottom Call to Action Card
      const footerY = height - 180;
      ctx.fillStyle = '#0F172A';
      ctx.roundRect(50, footerY, width - 100, 130, 24);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('📲 आज ही वेबसाइट पर रजिस्टर करें: www.hardinkaam.online', 80, footerY + 55);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '26px sans-serif';
      ctx.fillText('📞 डायरेक्ट कॉल व WhatsApp सपोर्ट: +91 91317 48375', 80, footerY + 100);
    },
    [campaignCopy, selectedDistrict, selectedTrade]
  );

  // Render Poster Canvas when selection changes
  useEffect(() => {
    if (selectedImagePrompt && !generatedAiImages[selectedImagePrompt.id]) {
      renderPosterToCanvas(selectedImagePrompt);
    }
  }, [selectedImagePrompt, generatedAiImages, renderPosterToCanvas]);

  // Video Storyboard Canvas Renderer
  const renderVideoSceneToCanvas = useCallback(
    (sceneIndex: number, animPhase = 0) => {
      const canvas = videoCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const is9x16 = videoAspectRatio === '9:16';
      const is16x9 = videoAspectRatio === '16:9';

      canvas.width = is9x16 ? 720 : is16x9 ? 1280 : 720;
      canvas.height = is9x16 ? 1280 : is16x9 ? 720 : 720;

      const scenes: VideoScene[] = campaignCopy?.videoAd?.scenes || [
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

      // Background Gradient
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
      } else {
        grad.addColorStop(0, '#09090B');
        grad.addColorStop(0.5, '#1C1917');
        grad.addColorStop(1, '#292524');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Top Multi-Segment Progress Bar
      const totalScenes = scenes.length;
      const barPadding = 24;
      const barHeight = 6;
      const barGap = 8;
      const totalGap = (totalScenes - 1) * barGap;
      const singleBarWidth = (width - barPadding * 2 - totalGap) / totalScenes;

      for (let i = 0; i < totalScenes; i++) {
        const bx = barPadding + i * (singleBarWidth + barGap);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(bx, 24, singleBarWidth, barHeight, 3);
        ctx.fill();

        if (i < sceneIndex) {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.roundRect(bx, 24, singleBarWidth, barHeight, 3);
          ctx.fill();
        } else if (i === sceneIndex) {
          const filled = singleBarWidth * (videoPlaybackProgress / 100);
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.roundRect(bx, 24, filled, barHeight, 3);
          ctx.fill();
        }
      }

      // Top Brand Header
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('HARDINKAAM REELS AD STUDIO', 30, 68);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.fillText(`SCENE ${scene.sceneNumber} OF ${totalScenes}`, width - 160, 68);

      // Badge
      if (scene.badge) {
        ctx.fillStyle = scene.highlightColor || '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(30, 95, 220, 38, 10);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(scene.badge, 45, 120);
      }

      // Main Scene Headline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px sans-serif';
      const titleLines = wrapCanvasText(ctx, scene.title, width - 60);
      let curY = is9x16 ? 220 : 170;
      titleLines.forEach((line) => {
        ctx.fillText(line, 30, curY);
        curY += 52;
      });

      // Subtitle
      if (scene.subtitle) {
        ctx.fillStyle = '#FDE68A';
        ctx.font = 'bold 26px sans-serif';
        const subLines = wrapCanvasText(ctx, scene.subtitle, width - 60);
        curY += 15;
        subLines.forEach((line) => {
          ctx.fillText(line, 30, curY);
          curY += 36;
        });
      }

      // Spoken Voiceover box
      curY += 35;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      const vBoxHeight = is9x16 ? 260 : 180;
      ctx.beginPath();
      ctx.roundRect(25, curY, width - 50, vBoxHeight, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🎙️ हिंदी वॉइसओवर स्क्रिप्ट (Voiceover Script):', 40, curY + 35);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      const voLines = wrapCanvasText(ctx, `"${scene.voiceover}"`, width - 90);
      let voY = curY + 70;
      voLines.forEach((line) => {
        ctx.fillText(line, 40, voY);
        voY += 28;
      });

      // Bottom CTA Banner
      const ctaY = height - 120;
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.roundRect(25, ctaY, width - 50, 85, 16);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(scene.cta || 'अभी रजिस्टर करें: www.hardinkaam.online 🚀', 45, ctaY + 52);
    },
    [videoAspectRatio, campaignCopy, selectedDistrict, selectedTrade, videoPlaybackProgress]
  );

  // Trigger video scene rendering whenever active scene, aspect ratio, content category, or copy updates
  useEffect(() => {
    const timer = setTimeout(() => {
      renderVideoSceneToCanvas(activeVideoSceneIndex, videoPlaybackProgress);
    }, 40);
    return () => clearTimeout(timer);
  }, [activeVideoSceneIndex, videoAspectRatio, campaignCopy, contentCategory, renderVideoSceneToCanvas]);

  // Trigger poster rendering whenever prompt or category updates
  useEffect(() => {
    if (selectedImagePrompt) {
      const timer = setTimeout(() => {
        renderPosterToCanvas(selectedImagePrompt);
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [selectedImagePrompt, contentCategory, renderPosterToCanvas]);

  // Dedicated 1-Click Video Ad Generator
  const handleGenerateNewVideoOnly = () => {
    const freshScenes: VideoScene[] = [
      {
        sceneNumber: 1,
        title: `⚡ ${selectedDistrict} में ${selectedTrade} काम का बड़ा धमाका!`,
        subtitle: `रोज़ाना 5 से 10 नई ग्राहक कॉल्स व 100% पक्की बुकिंग्स`,
        visualDescription: `Skilled professional in ${selectedDistrict}`,
        badge: '🚨 स्पेशल अलर्ट',
        voiceover: `क्या आप ${selectedDistrict} में ${selectedTrade} का काम करते हैं? अब काम की तलाश में भटकना बिल्कुल बंद!`,
        highlightColor: '#F59E0B',
        bgTheme: 'gradient_gold',
        cta: 'आगे देखें ⏩',
      },
      {
        sceneNumber: 2,
        title: '0% कमीशन • मेहनत आपकी, कमाई आपकी!',
        subtitle: 'बिचौलियों और ठेकेदारों को कमीशन देना बंद करें',
        visualDescription: 'Direct earnings without middleman cuts',
        badge: '0% ब्रोकरेज',
        voiceover: 'HARDINKAAM पर कोई एजेंसी कमीशन नहीं कटता। पूरे पैसे सीधे आपके बैंक खाते में!',
        highlightColor: '#EF4444',
        bgTheme: 'gradient_ruby',
        cta: 'समाधान यहाँ है 💡',
      },
      {
        sceneNumber: 3,
        title: 'सीधे अपने इलाके से ग्राहक पाएं',
        subtitle: `${localityOrVillage || selectedDistrict} के हर मोहल्ले में भारी मांग`,
        visualDescription: 'Mobile booking alerts in nearby locality',
        badge: '100% डायरेक्ट',
        voiceover: `आपके घर के 5 से 10 किलोमीटर के दायरे से सीधे असली कस्टमर्स की बुकिंग्स पाएं।`,
        highlightColor: '#10B981',
        bgTheme: 'gradient_emerald',
        cta: 'मात्र ₹121 में शुरुआत 🎁',
      },
      {
        sceneNumber: 4,
        title: 'दीपक बिल्डकॉन भोपाल का आधिकारिक नेटवर्क',
        subtitle: 'डिजिटल आईडी कार्ड व 30 दिन की सर्विस गारंटी',
        visualDescription: 'Digital QR verified artisan card',
        badge: '100% वेरिफाइड',
        voiceover: 'दीपक बिल्डकॉन भोपाल द्वारा संचालित। डिजिटल पहचान पत्र और 24 घंटे हेल्पलाइन सहायता।',
        highlightColor: '#0284C7',
        bgTheme: 'gradient_cyber',
        cta: 'तुरंत रजिस्टर करें 🚀',
      },
      {
        sceneNumber: 5,
        title: 'आज ही रजिस्टर करें: www.hardinkaam.online',
        subtitle: 'हेल्पलाइन: +91 62675 46945 पर कॉल या व्हाट्सएप करें',
        visualDescription: 'Happy verified technician starting work',
        badge: 'सीमित सीटें',
        voiceover: 'मात्र ₹121 में आज ही रजिस्टर करें hardinkaam.online पर या कॉल करें 6267546945 पर। आपका अपना काम, आपकी तरक्की!',
        highlightColor: '#EA580C',
        bgTheme: 'gradient_gold',
        cta: '📲 www.hardinkaam.online',
      },
    ];

    setCampaignCopy((prev) => ({
      ...prev,
      videoAd: {
        title: `HARDINKAAM ${selectedTrade} Reels Ad - ${selectedDistrict}`,
        durationSeconds: 20,
        aspectRatios: ['9:16', '1:1', '16:9'],
        scenes: freshScenes,
      },
    }));

    setActiveVideoSceneIndex(0);
    setVideoPlaybackProgress(0);
    setContentCategory('video');
    addToast('🎬 नया 5-सीन AI वीडियो विज्ञापन सफलतापूर्वक जनरेट हो गया!', 'success');
  };

  // Instant 1-Click Demo Ad Generator
  const handleLoadInstantDemoCampaign = () => {
    const demo = createDefaultMarketingCampaignCopy({
      trade: selectedTrade,
      districtOrCity: selectedDistrict,
      state: selectedState,
      location: `${localityOrVillage || selectedDistrict}, ${selectedState}`,
      targetAudience,
      campaignObjective,
      toneAndLanguage,
    });
    setCampaignCopy(demo);
    if (demo.imagePrompts && demo.imagePrompts.length > 0) {
      setSelectedImagePrompt(demo.imagePrompts[0]);
    }
    setActiveVideoSceneIndex(0);
    setVideoPlaybackProgress(0);
    addToast('⚡ लाइव विज्ञापन व वीडियो तुरंत तैयार हो गया!', 'success');
  };

  // Download Current Video Scene as HD Poster PNG
  const handleDownloadCurrentScenePoster = () => {
    const canvas = videoCanvasRef.current;
    if (!canvas) {
      addToast('कैनवास लोड नहीं हुआ।', 'error');
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) {
        downloadMediaFile(blob, `hardinkaam_${selectedTrade}_scene_${activeVideoSceneIndex + 1}_hd.png`);
        addToast(`सीन ${activeVideoSceneIndex + 1} का HD पोस्टर सफलतापूर्वक डाउनलोड हो गया!`, 'success');
      }
    });
  };

  // Copy Complete Video Script
  const handleCopyVideoScript = () => {
    const scenes = campaignCopy?.videoAd?.scenes || [];
    if (scenes.length === 0) {
      addToast('कोई वीडियो स्क्रिप्ट उपलब्ध नहीं है।', 'warning');
      return;
    }
    const fullScript = `🎬 HARDINKAAM 5-SCENE VIDEO REELS SCRIPT (${selectedTrade} - ${selectedDistrict})\n\n` +
      scenes
        .map(
          (s) =>
            `[सीन ${s.sceneNumber}: ${s.title}]\n• उपशीर्षक: ${s.subtitle}\n• विजुअल विवरण: ${s.visualDescription}\n• 🎙️ वॉइसओवर: "${s.voiceover}"\n• 🏷️ कॉल टू एक्शन: ${s.cta || 'रजिस्टर करें'}`
        )
        .join('\n\n--------------------\n\n') +
      `\n\n🌐 वेबसाइट: www.hardinkaam.online | 📞 हेल्पलाइन: +91 62675 46945`;
    handleCopyText(fullScript, 'full_video_script');
  };

  // Video Ad Playback Loop
  const handleToggleVideoPlay = () => {
    if (isVideoPlaying) {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      setIsVideoPlaying(false);
      stopVoiceSpeech();
      return;
    }

    const scenes = campaignCopy?.videoAd?.scenes || [];
    if (scenes.length === 0) return;

    setIsVideoPlaying(true);
    let curScene = activeVideoSceneIndex;
    let progress = 0;

    // Speak initial voiceover
    if (scenes[curScene]?.voiceover) {
      playVoiceSpeech(scenes[curScene].voiceover);
    }

    videoTimerRef.current = window.setInterval(() => {
      progress += 4;
      setVideoPlaybackProgress(progress);
      renderVideoSceneToCanvas(curScene, progress);

      if (progress >= 100) {
        progress = 0;
        setVideoPlaybackProgress(0);
        curScene++;
        if (curScene >= scenes.length) {
          curScene = 0;
          setIsVideoPlaying(false);
          if (videoTimerRef.current) clearInterval(videoTimerRef.current);
          stopVoiceSpeech();
        } else {
          setActiveVideoSceneIndex(curScene);
          if (scenes[curScene]?.voiceover) {
            playVoiceSpeech(scenes[curScene].voiceover);
          }
        }
      }
    }, 120);
  };

  // Resilient Fail-proof Video Export to WebM / MP4 / Image Storyboard
  const handleExportVideo = async () => {
    const canvas = videoCanvasRef.current;
    if (!canvas) {
      addToast('कैनवास लोड नहीं हुआ। कृपया वीडियो टैब खोलें।', 'error');
      return;
    }

    setIsExportingVideo(true);
    addToast('🎬 वीडियो रेंडरिंग शुरू हो रही है...', 'info');

    try {
      const scenes = campaignCopy?.videoAd?.scenes || [];
      if (scenes.length === 0) {
        throw new Error('कोई वीडियो दृश्य उपलब्ध नहीं है।');
      }

      // Check supported MIME type dynamically
      const hasMediaRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window;
      const stream = canvas.captureStream ? canvas.captureStream(30) : null;

      let chosenMimeType = '';
      if (hasMediaRecorder && stream) {
        const candidates = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4;codecs=avc1',
          'video/mp4',
        ];
        for (const c of candidates) {
          if (MediaRecorder.isTypeSupported(c)) {
            chosenMimeType = c;
            break;
          }
        }
      }

      if (hasMediaRecorder && stream && chosenMimeType) {
        const recorder = new MediaRecorder(stream, { mimeType: chosenMimeType });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const recordingComplete = new Promise<Blob>((resolve, reject) => {
          recorder.onstop = () => {
            const completeBlob = new Blob(chunks, { type: chosenMimeType });
            resolve(completeBlob);
          };
          recorder.onerror = (e) => reject(e);
        });

        recorder.start(100);

        // Smoothly render all scenes for capture
        for (let s = 0; s < scenes.length; s++) {
          setActiveVideoSceneIndex(s);
          for (let p = 0; p <= 100; p += 12) {
            setVideoPlaybackProgress(p);
            renderVideoSceneToCanvas(s, p);
            await new Promise((r) => setTimeout(r, 50));
          }
        }

        recorder.stop();
        const finalBlob = await recordingComplete;

        if (finalBlob.size > 0) {
          const ext = chosenMimeType.includes('mp4') ? 'mp4' : 'webm';
          downloadMediaFile(finalBlob, `hardinkaam_${selectedTrade}_video_ad_${Date.now()}.${ext}`);
          setIsExportingVideo(false);
          addToast('🎬 वीडियो सफलतापूर्वक डाउनलोड हो गया!', 'success');
          return;
        }
      }

      // Universal Fallback if MediaRecorder unsupported or returns empty stream:
      // Download the active scene as high-definition 4K PNG poster
      canvas.toBlob((blob) => {
        if (blob) {
          downloadMediaFile(blob, `hardinkaam_${selectedTrade}_scene_${activeVideoSceneIndex + 1}.png`);
          addToast('वीडियो दृश्य (HD पोस्टर) सफलतापूर्वक डाउनलोड हो गया!', 'success');
        }
      });
    } catch (err: any) {
      console.warn('Video export notice, falling back to scene capture:', err);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadMediaFile(blob, `hardinkaam_${selectedTrade}_video_poster.png`);
          addToast('वीडियो दृश्य सुरक्षित रूप से डाउनलोड हो गया!', 'info');
        }
      });
    } finally {
      setIsExportingVideo(false);
    }
  };

  // Filtered Saved Sets for Gallery
  const filteredAdSets = savedAdSets.filter((s) => {
    const matchesSearch =
      !gallerySearchTerm ||
      s.title.toLowerCase().includes(gallerySearchTerm.toLowerCase()) ||
      s.trade.toLowerCase().includes(gallerySearchTerm.toLowerCase()) ||
      s.demographics.districtOrCity?.toLowerCase().includes(gallerySearchTerm.toLowerCase()) ||
      s.demographics.state?.toLowerCase().includes(gallerySearchTerm.toLowerCase());

    const matchesAudience =
      galleryFilterAudience === 'all' || s.demographics.targetAudience === galleryFilterAudience;

    return matchesSearch && matchesAudience;
  });

  return (
    <div className="space-y-6">
      {/* Studio Top Sub-Navigation Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Gemini 3.8 &amp; Imagen 3 Ad Studio
              </span>
              <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                Saved Ad Sets: {savedAdSets.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-orange-600" />
              <span>AI Ad Creative Studio (विज्ञापन क्रिएटिव स्टूडियो)</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              लक्षित जनसांख्यिकी (शहर, ज़िला, आयु, ट्रेड) इनपुट करें और 1-क्लिक में सम्पूर्ण विज्ञापन सेट (Ad Copy, AI पोस्टर, वीडियो रील्स व वॉइस) तैयार व प्रबंधित करें।
            </p>
          </div>

          {/* Mode Switcher: Creator vs Gallery */}
          <div className="flex items-center bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setStudioMode('creator')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                studioMode === 'creator'
                  ? 'bg-white text-orange-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-orange-600" />
              <span>नया विज्ञापन बनाएँ (Creator)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudioMode('gallery');
                loadSavedSets();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                studioMode === 'gallery'
                  ? 'bg-white text-orange-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-amber-600" />
              <span>सहेजे गए विज्ञापन गैलरी ({savedAdSets.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: AD CREATOR & GENERATOR ENGINE
      ========================================================================= */}
      {studioMode === 'creator' && (
        <div className="space-y-6">
          {/* Target Demographics Form Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <span>1. लक्षित जनसांख्यिकी व अभियान विवरण (Target Demographics)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  जिस शहर, ज़िले या गाँव के लिए विज्ञापन बनाना है, उसकी जनसांख्यिकी चुनें
                </p>
              </div>

              {activeAdSetId && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>गैलरी से लोड किया गया सेट (Editing Loaded Set)</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Campaign Title */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  अभियान का नाम (Campaign Title)
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder={`उदा. ${selectedTrade} Onboarding - ${selectedDistrict}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  लक्षित दर्शक (Target Audience)
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="servicemen">👷‍♂️ सर्विसमैन ऑनबोर्डिंग (Karigar)</option>
                  <option value="customers">🏠 ग्राहक बुकिंग (Home Owners)</option>
                  <option value="franchise_partners">🤝 फ्रैंचाइज़ी पार्टनर / प्रमोटर</option>
                </select>
              </div>

              {/* Target Trade / Service */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ट्रेड / सेवा (Service Trade)
                </label>
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {COMMON_TRADES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* State Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  राज्य (State)
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {ALL_INDIA_LOCATIONS.map((loc) => (
                    <option key={loc.state} value={loc.state}>
                      {loc.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* District / City Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ज़िला / शहर (District / City)
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-orange-950 focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {currentStateData?.districts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Locality / Tehsil / Area Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  तहसील / मोहल्ला / इलाका (Locality / Area)
                </label>
                <input
                  type="text"
                  value={localityOrVillage}
                  onChange={(e) => setLocalityOrVillage(e.target.value)}
                  placeholder="उदा. MP Nagar, New Market, Kolar..."
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Target Age Group */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  आयु वर्ग (Age Group)
                </label>
                <input
                  type="text"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  placeholder="उदा. 20-45 Yrs युवा कामगार"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Campaign Objective & Offer Hook */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  मुख्य ऑफर व हुक (Campaign Objective / Hook)
                </label>
                <input
                  type="text"
                  value={campaignObjective}
                  onChange={(e) => setCampaignObjective(e.target.value)}
                  placeholder="उदा. ₹121 आजीवन रजिस्ट्रेशन, 100% दैनिक कमाई, ज़ीरो ब्रोकरेज"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Tone & Language */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  भाषा व लहज़ा (Tone & Language)
                </label>
                <select
                  value={toneAndLanguage}
                  onChange={(e) => setToneAndLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="दमदार व प्रेरक हिंदी (High Conversion)">दमदार व प्रेरक हिंदी (High Conversion)</option>
                  <option value="युवा व ट्रेंडी हिंग्लिश (Youth Friendly Hinglish)">युवा व ट्रेंडी हिंग्लिश (Youth Friendly Hinglish)</option>
                  <option value="क्षेत्रीय व देहाती स्थानीय लहज़ा (Local Dialect)">क्षेत्रीय व देहाती स्थानीय लहज़ा (Local Dialect)</option>
                  <option value="फॉर्मल व प्रोफेशनल बिज़नेस (Formal Business)">फॉर्मल व प्रोफेशनल बिज़नेस (Formal Business)</option>
                </select>
              </div>

              {/* Custom Instructions */}
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  अतिरिक्त निर्देश / स्पेशल सेलिंग पॉइंट्स (Custom Instructions / USPs)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={2}
                  placeholder="उदा. भोपाल और आसपास के 50 किमी दायरे के इलेक्ट्रीशियन के लिए विशेष ऑफर, फ्री प्रोफाइल वेरिफिकेशन..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* "Generate Content" Action Bar with Gemini API & Direct Video Generator */}
            <div className="pt-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-t border-stone-100">
              <div className="text-xs text-stone-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                <span>Gemini 3.8 Flash द्वारा 100% प्रामाणिक Ad Copy, Imagen 3 विजुअल्स और 5-Scene Reels Storyboard तैयार किया जाता है</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadInstantDemoCampaign}
                  className="px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="बिना प्रतीक्षा किए तुरंत लाइव विज्ञापन डेमो लोड करें"
                >
                  <span>⚡ तुरंत लाइव डेमो</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateNewVideoOnly}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                  title="सीधे 5-सीन इंस्टाग्राम रील्स वीडियो विज्ञापन बनाएं"
                >
                  <Video className="w-4 h-4 text-white" />
                  <span>🎬 1-क्लिक वीडियो विज्ञापन बनाएं</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 hover:from-orange-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'animate-pulse text-amber-300'}`} />
                  <span>
                    {isGenerating
                      ? generationStep || 'Gemini API से सामग्री तैयार हो रही है...'
                      : '✨ संपूर्ण AI विज्ञापन बनाएं (Generate Full Ad)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Content Output Section */}
          {campaignCopy && (
            <div className="space-y-6">
              {/* Output Action Bar & Sub-Tabs */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Content Category Switcher */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setContentCategory('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      contentCategory === 'all'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    सभी क्रिएटिव (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentCategory('copy')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      contentCategory === 'copy'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ad Copy & Texts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentCategory('images')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      contentCategory === 'images'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>AI Posters & Imagen 3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentCategory('video')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      contentCategory === 'video'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video Reels Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentCategory('audio')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      contentCategory === 'audio'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio Script & Voice</span>
                  </button>
                </div>

                {/* Save to Gallery Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCurrentAdSet}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>गैलरी में सहेजें (Save Ad Set to Gallery)</span>
                  </button>
                </div>
              </div>

              {/* 1. AD COPY & MULTI-CHANNEL TEXTS */}
              {(contentCategory === 'all' || contentCategory === 'copy') && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-6">
                  <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        <span>Ad Copywriting & Social Channels (विज्ञापन प्रतिलिपि)</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        WhatsApp, SMS, Facebook, Instagram और Twitter के लिए हाई-कन्वर्जन विज्ञापन
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadTextAsFile(
                        `HARDINKAAM MARKETING CAMPAIGN\n${campaignTitle}\n\nHEADLINE:\n${campaignCopy.headline}\n\nWHATSAPP AD:\n${campaignCopy.whatsappAdText}\n\nSMS AD:\n${campaignCopy.smsPitch}\n\nINSTAGRAM:\n${campaignCopy.socialMedia?.instagramCaption || ''}`,
                        `hardinkaam_ad_copy_${selectedDistrict}.txt`
                      )}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-500" />
                      <span>टेक्स्ट डाउनलोड (.txt)</span>
                    </button>
                  </div>

                  {/* Headline Banner */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider block">
                        🎯 मुख्य हेडलाइन (Primary Headline)
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                        {campaignCopy.headline}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(campaignCopy.headline, 'headline')}
                      className="p-2 rounded-xl bg-white border border-orange-200 text-orange-800 hover:bg-orange-100 shadow-2xs cursor-pointer shrink-0"
                    >
                      {copiedType === 'headline' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* WhatsApp Blast Card */}
                    <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span>📱 WhatsApp ब्लास्ट विज्ञापन (Direct Outreach)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(campaignCopy.whatsappAdText, 'whatsapp')}
                            className="p-1.5 px-2 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>कॉपी</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => shareToSocialPlatform({ platform: 'whatsapp', text: campaignCopy.whatsappAdText })}
                            className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>भेजें</span>
                          </button>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs whitespace-pre-line text-stone-800 font-sans max-h-52 overflow-y-auto leading-relaxed">
                        {campaignCopy.whatsappAdText}
                      </div>
                    </div>

                    {/* SMS Pitch Card */}
                    <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <span>💬 160-अक्षर SMS पिच (SMS Ad Pitch)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(campaignCopy.smsPitch, 'sms')}
                            className="p-1.5 px-2 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedType === 'sms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>कॉपी</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => shareToSocialPlatform({ platform: 'sms', text: campaignCopy.smsPitch })}
                            className="p-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>SMS</span>
                          </button>
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs whitespace-pre-line text-stone-800 font-mono leading-relaxed min-h-[100px]">
                        {campaignCopy.smsPitch}
                      </div>
                    </div>

                    {/* Facebook & Instagram Feeds */}
                    {campaignCopy.socialMedia && (
                      <div className="lg:col-span-2 bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4">
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-lg inline-block">
                          🌐 सोशल मीडिया फीड्स व रील्स कैप्शन्स (Social Feeds & Viral Tags)
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                              <span>📸 Instagram Reels & Post Caption</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(campaignCopy.socialMedia?.instagramCaption || '', 'insta')}
                                className="text-orange-600 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                {copiedType === 'insta' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>कॉपी</span>
                              </button>
                            </div>
                            <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                              {campaignCopy.socialMedia.instagramCaption}
                            </p>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                              <span>👥 Facebook Campaign Feed Post</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(campaignCopy.socialMedia?.facebookAdText || '', 'fb')}
                                className="text-orange-600 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                {copiedType === 'fb' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>कॉपी</span>
                              </button>
                            </div>
                            <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                              {campaignCopy.socialMedia.facebookAdText}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. AI IMAGEN 3 POSTERS & VISUAL STUDIO */}
              {(contentCategory === 'all' || contentCategory === 'images') && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-6">
                  <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-amber-600" />
                        <span>AI Posters & Imagen 3 Visual Studio (ग्राफिक व पोस्टर स्टूडियो)</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Gemini जनरेटेड विस्तृत प्रॉम्ट्स, Imagen 3 असली इमेज जनरेशन व ब्रांडेड कैनवास पोस्टर्स
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Poster / AI Visual Preview Canvas */}
                    <div className="lg:col-span-5 flex flex-col items-center bg-stone-950 p-6 rounded-3xl shadow-lg border border-stone-800 space-y-4">
                      <div className="w-full flex items-center justify-between text-white pb-2 border-b border-stone-800">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                          <span>
                            {selectedImagePrompt && generatedAiImages[selectedImagePrompt.id]
                              ? '✨ AI Imagen 3 जनरेटेड इमेज'
                              : 'लाइव ब्रांडेड पोस्टर प्रिव्यू'}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          {selectedImagePrompt?.aspectRatio || '1:1'}
                        </span>
                      </div>

                      {/* Display Area */}
                      <div className="relative flex items-center justify-center w-full overflow-hidden rounded-2xl bg-black min-h-[260px]">
                        {selectedImagePrompt && generatedAiImages[selectedImagePrompt.id] ? (
                          <div className="relative group w-full flex items-center justify-center">
                            <img
                              src={generatedAiImages[selectedImagePrompt.id]}
                              alt={selectedImagePrompt.title}
                              className={`rounded-2xl shadow-2xl border border-stone-700 object-cover ${
                                selectedImagePrompt.aspectRatio === '9:16'
                                  ? 'w-full max-w-[280px] aspect-[9/16]'
                                  : selectedImagePrompt.aspectRatio === '16:9'
                                  ? 'w-full max-w-[420px] aspect-video'
                                  : 'w-full max-w-[320px] aspect-square'
                              }`}
                            />
                            <div className="absolute top-2 right-2 bg-black/70 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              AI Imagen 3 ✨
                            </div>
                          </div>
                        ) : (
                          <canvas
                            ref={posterCanvasRef}
                            className={`rounded-2xl shadow-2xl border border-stone-800 object-contain ${
                              selectedImagePrompt?.aspectRatio === '9:16'
                                ? 'w-full max-w-[280px] aspect-[9/16]'
                                : selectedImagePrompt?.aspectRatio === '16:9'
                                ? 'w-full max-w-[420px] aspect-video'
                                : 'w-full max-w-[320px] aspect-square'
                            }`}
                          />
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="w-full pt-2 border-t border-stone-800 space-y-2">
                        {selectedImagePrompt && (
                          <button
                            type="button"
                            onClick={() => handleGenerateAIImage(selectedImagePrompt)}
                            disabled={isGeneratingAiImage}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-4 h-4 ${isGeneratingAiImage ? 'animate-spin' : ''}`} />
                            <span>
                              {isGeneratingAiImage
                                ? 'Imagen 3 से इमेज तैयार हो रही है...'
                                : '🎨 AI से असली इमेज बनाएं (Generate with Imagen 3)'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedImagePrompt && generatedAiImages[selectedImagePrompt.id]) {
                              const link = document.createElement('a');
                              link.href = generatedAiImages[selectedImagePrompt.id];
                              link.download = `hardinkaam_ai_visual_${selectedTrade}_${Date.now()}.jpg`;
                              link.click();
                              addToast('AI विजुअल सफलतापूर्वक डाउनलोड हो गया!', 'success');
                              return;
                            }
                            const canvas = posterCanvasRef.current;
                            if (!canvas) return;
                            canvas.toBlob((blob) => {
                              if (blob) {
                                downloadMediaFile(blob, `hardinkaam_poster_${selectedTrade}.png`);
                                addToast('पोस्टर सफलतापूर्वक डाउनलोड हो गया!', 'success');
                              }
                            });
                          }}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-stone-800 hover:bg-stone-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>📥 इमेज / पोस्टर डाउनलोड करें (Download)</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Prompts Selection List */}
                    <div className="lg:col-span-7 space-y-4">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        📸 AI इमेज प्रॉम्ट्स चुनें व रेंडर करें (Image Prompts & Aspect Ratios)
                      </span>

                      <div className="space-y-3">
                        {campaignCopy.imagePrompts?.map((item) => {
                          const isSelected = selectedImagePrompt?.id === item.id;
                          const hasGenerated = !!generatedAiImages[item.id];

                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedImagePrompt(item)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                                  : 'bg-white border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-stone-900">{item.title}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                                      {item.aspectRatio} ({item.category.replace('_', ' ')})
                                    </span>
                                    {hasGenerated && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> AI इमेज तैयार
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-500 mt-0.5">{item.visualDescription}</p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateAIImage(item);
                                    }}
                                    disabled={isGeneratingAiImage}
                                    className="p-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-xs disabled:opacity-50"
                                  >
                                    <Sparkles className="w-3 h-3 text-white" />
                                    <span>AI इमेज</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyText(item.prompt, `prompt_${item.id}`);
                                    }}
                                    className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center gap-1 text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    {copiedType === `prompt_${item.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span>{copiedType === `prompt_${item.id}` ? 'कॉपी' : 'प्रॉम्ट कॉपी'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2.5 bg-stone-900 text-stone-200 p-2.5 rounded-xl font-mono text-[11px] leading-relaxed select-all">
                                {item.prompt}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. VIDEO REELS & SHORTS AD STUDIO */}
              {(contentCategory === 'all' || contentCategory === 'video') && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-6">
                  <div className="pb-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <Video className="w-5 h-5 text-rose-600" />
                        <span>AI Video Ad Studio (इंस्टाग्राम रील्स व यूट्यूब शॉर्ट्स स्टोरीबोर्ड)</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        5-सीन हाई-इम्पैक्ट विज्ञापन स्टोरीबोर्ड, लाइव प्लेयर और MP4/WebM एक्सपोर्टर
                      </p>
                    </div>

                    {/* Aspect Ratio Switcher & Direct Video Regenerator */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateNewVideoOnly}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                        title="ताज़ा 5-सीन AI रील्स वीडियो बनाएं"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                        <span>🎬 नया AI वीडियो विज्ञापन बनाएं</span>
                      </button>

                      <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                        {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setVideoAspectRatio(ratio)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              videoAspectRatio === ratio
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {ratio === '9:16' ? '📱 9:16 (Reels)' : ratio === '1:1' ? '⏹️ 1:1' : '📺 16:9'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Video Player Canvas */}
                    <div className="lg:col-span-5 flex flex-col items-center bg-stone-950 p-6 rounded-3xl shadow-xl border border-stone-800 space-y-4">
                      <div className="relative flex items-center justify-center w-full overflow-hidden rounded-2xl bg-black">
                        <canvas
                          ref={videoCanvasRef}
                          className={`rounded-2xl shadow-2xl border border-stone-800 object-contain ${
                            videoAspectRatio === '9:16'
                              ? 'w-full max-w-[280px] aspect-[9/16]'
                              : videoAspectRatio === '16:9'
                              ? 'w-full max-w-[420px] aspect-video'
                              : 'w-full max-w-[320px] aspect-square'
                          }`}
                        />
                      </div>

                      {/* Video Player Controls */}
                      <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
                        <button
                          type="button"
                          onClick={handleToggleVideoPlay}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                            isVideoPlaying
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{isVideoPlaying ? 'पॉज़ करें (Pause)' : 'लाइव वीडियो चलाएं (Play Ad)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveVideoSceneIndex(0);
                            setVideoPlaybackProgress(0);
                            renderVideoSceneToCanvas(0, 0);
                          }}
                          className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
                          title="शुरू से देखें"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="w-full space-y-2">
                        <button
                          type="button"
                          onClick={handleExportVideo}
                          disabled={isExportingVideo}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          <span>
                            {isExportingVideo ? 'वीडियो एक्सपोर्ट हो रहा है...' : '🎬 पूरा वीडियो डाउनलोड करें (.webm / .mp4)'}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadCurrentScenePoster}
                            className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="इस दृश्य को 4K PNG पोस्टर के रूप में डाउनलोड करें"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span>🖼️ सीन HD पोस्टर</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const scene = campaignCopy.videoAd?.scenes[activeVideoSceneIndex];
                              if (scene?.voiceover) {
                                playVoiceSpeech(scene.voiceover);
                                addToast('🔊 वॉइसओवर प्ले हो रहा है...', 'info');
                              }
                            }}
                            className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="इस दृश्य का हिंदी वॉइसओवर सुनें"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>🔊 आवाज़ सुनें</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyVideoScript}
                          className="w-full py-2 px-3 rounded-xl text-[11px] font-bold bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-stone-400" />
                          <span>📋 पूरी 5-सीन रील्स स्क्रिप्ट कॉपी करें</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Scene-by-Scene Storyboard */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🎬 5-Scene Storyboard (रील्स दृश्य)</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleGenerateNewVideoOnly}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
                          title="नए 5 सीन्स बनाएं"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>✨ नए सीन्स बनाएं</span>
                        </button>
                      </div>

                      {campaignCopy.videoAd?.scenes.map((scene, idx) => {
                        const isCurrentScene = activeVideoSceneIndex === idx;
                        return (
                          <div
                            key={scene.sceneNumber}
                            onClick={() => {
                              setActiveVideoSceneIndex(idx);
                              renderVideoSceneToCanvas(idx, 0);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                              isCurrentScene
                                ? 'bg-orange-50/80 border-orange-400 shadow-xs ring-1 ring-orange-300'
                                : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                              <div className="flex items-center gap-2">
                                <span className="bg-orange-600 text-white font-black text-xs px-2 py-0.5 rounded-md">
                                  Scene {scene.sceneNumber}
                                </span>
                                <span className="text-xs font-bold text-stone-900">{scene.title}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                {scene.badge || 'Promo'}
                              </span>
                            </div>

                            <p className="text-xs text-stone-700 font-medium mt-2">
                              {scene.subtitle}
                            </p>

                            <div className="mt-2 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl flex items-start gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                              <span className="italic flex-1">"{scene.voiceover}"</span>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playVoiceSpeech(scene.voiceover);
                                  addToast(`सीन ${scene.sceneNumber} का वॉइसओवर बज रहा है...`, 'info');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                              >
                                <Volume2 className="w-3 h-3 text-blue-600" />
                                <span>वॉइसओवर सुनें</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveVideoSceneIndex(idx);
                                  renderVideoSceneToCanvas(idx, 0);
                                  addToast(`सीन ${scene.sceneNumber} कैनवास पर सक्रिय हुआ`, 'info');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-orange-600" />
                                <span>कैनवास पर देखें</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. AUDIO VOICE AD SCRIPT */}
              {(contentCategory === 'all' || contentCategory === 'audio') && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-indigo-600" />
                        <span>AI Audio Announcement Script (ऑडियो संदेश व वॉइस स्क्रिप्ट)</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        लाउडस्पीकर प्रचार, ऑटो-अनाउंसमेंट या WhatsApp वॉइस नोट के लिए प्राकृतिक हिंदी स्क्रिप्ट
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlayingAudio) {
                            stopVoiceSpeech();
                            setIsPlayingAudio(false);
                          } else {
                            playVoiceSpeech(campaignCopy.audioVoiceScript);
                            setIsPlayingAudio(true);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          isPlayingAudio
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isPlayingAudio ? 'ऑडियो बंद करें' : '▶️ ऑडियो सुनें (Listen)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(campaignCopy.audioVoiceScript, 'audio_script')}
                        className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        {copiedType === 'audio_script' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>स्क्रिप्ट कॉपी</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-line">
                    {campaignCopy.audioVoiceScript}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: GALLERY OF SAVED AD CREATIVE SETS
      ========================================================================= */}
      {studioMode === 'gallery' && (
        <div className="space-y-6">
          {/* Gallery Filter & Search Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-amber-600" />
                  <span>सहेजे गए विज्ञापन सेट्स गैलरी (Saved Ad Sets Gallery)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  विभिन्न शहरों, राज्यों और ट्रेडों के लिए बनाए गए सभी विज्ञापन सेट्स को यहाँ खोजें, पुनः खोलें या डाउनलोड करें
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSavedSets}
                  className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="रिफ्रेश करें"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGallery ? 'animate-spin' : ''}`} />
                  <span>रिफ्रेश</span>
                </button>

                {/* Grid / List view toggle */}
                <div className="flex items-center bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGalleryViewMode('grid')}
                    className={`p-1.5 rounded-lg ${galleryViewMode === 'grid' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryViewMode('list')}
                    className={`p-1.5 rounded-lg ${galleryViewMode === 'list' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={gallerySearchTerm}
                  onChange={(e) => setGallerySearchTerm(e.target.value)}
                  placeholder="शीर्षक, शहर, ज़िला या ट्रेड से खोजें..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={galleryFilterAudience}
                  onChange={(e) => setGalleryFilterAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="all">सभी दर्शक (All Audiences)</option>
                  <option value="servicemen">सर्विसमैन (Karigar)</option>
                  <option value="customers">ग्राहक (Customers)</option>
                  <option value="franchise_partners">फ्रैंचाइज़ी (Franchise)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredAdSets.length === 0 && !isLoadingGallery && (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
                <Bookmark className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-stone-800">कोई सहेजा गया विज्ञापन सेट नहीं मिला</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  नया विज्ञापन बनाने के लिए "नया विज्ञापन बनाएँ" टैब पर जाएँ और जनरेट करने के बाद "गैलरी में सहेजें" पर क्लिक करें।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStudioMode('creator')}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>अभी नया विज्ञापन सेट बनाएं</span>
              </button>
            </div>
          )}

          {/* Gallery Items Grid View */}
          {galleryViewMode === 'grid' && filteredAdSets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAdSets.map((adSet) => {
                const dateStr = adSet.createdAt ? new Date(adSet.createdAt).toLocaleDateString('hi-IN') : 'हाल ही में';
                const hasImages = Object.keys(adSet.generatedImages || {}).length > 0;

                return (
                  <div
                    key={adSet.id}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-amber-700" />
                          <span>{adSet.trade}</span>
                        </span>
                        <span className="text-[10px] text-stone-400 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{dateStr}</span>
                        </span>
                      </div>

                      {/* Title & Demographics */}
                      <h4 className="text-sm font-black text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {adSet.title}
                      </h4>

                      <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="line-clamp-1">
                          {[adSet.demographics.districtOrCity, adSet.demographics.state].filter(Boolean).join(', ')}
                        </span>
                      </div>

                      {/* Headline Snippet */}
                      <div className="mt-3 bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs text-stone-700 line-clamp-2 italic">
                        "{adSet.campaignCopy?.headline || 'High conversion marketing campaign'}"
                      </div>

                      {/* Details tags */}
                      <div className="flex flex-wrap items-center gap-1 mt-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {adSet.demographics.targetAudience === 'servicemen'
                            ? '👷‍♂️ कारीगर'
                            : adSet.demographics.targetAudience === 'customers'
                            ? '🏠 ग्राहक'
                            : '🤝 पार्टनर'}
                        </span>
                        {hasImages && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            ✨ AI Imagen
                          </span>
                        )}
                        {adSet.campaignCopy?.videoAd && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                            🎬 {adSet.campaignCopy.videoAd.scenes.length} Scenes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadAdSetFromGallery(adSet)}
                        className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>स्टूडियो में खोलें</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(adSet.campaignCopy?.whatsappAdText || '', `set_${adSet.id}`)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="WhatsApp कॉपी करें"
                      >
                        {copiedType === `set_${adSet.id}` ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAdSet(adSet.id, adSet.title)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gallery Items List View */}
          {galleryViewMode === 'list' && filteredAdSets.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden divide-y divide-stone-100">
              {filteredAdSets.map((adSet) => {
                const dateStr = adSet.createdAt ? new Date(adSet.createdAt).toLocaleDateString('hi-IN') : 'हाल ही में';
                return (
                  <div
                    key={adSet.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-stone-900">{adSet.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          {adSet.trade}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-2">
                        <span>📍 {[adSet.demographics.districtOrCity, adSet.demographics.state].filter(Boolean).join(', ')}</span>
                        <span>•</span>
                        <span>📅 {dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadAdSetFromGallery(adSet)}
                        className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>खोलें</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(adSet.campaignCopy?.whatsappAdText || '', `set_list_${adSet.id}`)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="WhatsApp टेक्स्ट कॉपी"
                      >
                        {copiedType === `set_list_${adSet.id}` ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAdSet(adSet.id, adSet.title)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
