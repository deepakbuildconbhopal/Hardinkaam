import { Router, Request, Response } from 'express';
import { db } from '../src/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import {
  generateAICallResponse,
  summarizeCallTranscript,
  executeSingleOutboundCall,
  isWithinCallingHours,
  HARDINKAAM_CALLING_DEFAULTS,
} from './aiCallingService';
import {
  GEMINI_CANONICAL_MODEL,
  normalizeGeminiModel,
  getAIDiagnostics,
} from './aiConfig';
import {
  getTelephonyProvider,
  TelephonyWebhookEvent,
} from './telephonyProvider';
import {
  AICallCampaign,
  AICallQueueItem,
  AICallLog,
  AICallFollowUp,
  AICallScript,
  AICallSettings,
  AICallOverviewStats,
} from '../src/types/aiCalling';

export function createAICallingRouter(requireAdminAuth: any): Router {
  const router = Router();

  // In-Memory fallback caches for ultra-fast response and resilient operations
  let inMemoryCampaigns: AICallCampaign[] = [];
  let inMemoryQueue: AICallQueueItem[] = [];
  let inMemoryLogs: AICallLog[] = [];
  let inMemoryScripts: AICallScript[] = [];
  let inMemorySettings: AICallSettings | null = null;

  // Pre-seed standard HARDINKAAM AI Calling Scripts
  const DEFAULT_SCRIPTS: AICallScript[] = [
    {
      id: 'script_serviceman_recruitment_bhopal',
      name: 'भोपाल सर्विसमैन भर्ती व ऑनबोर्डिंग (0% कमीशन)',
      category: 'recruitment',
      language: 'hinglish',
      openingGreeting: 'नमस्ते! मैं HARDINKAAM भोपाल से बात कर रहा हूँ।',
      objective: 'इलेक्ट्रीशियन, प्लंबर, कारपेंटर और तकनीशियनों को HARDINKAAM प्लेटफॉर्म से 0% कमीशन पर जोड़ना।',
      systemPrompt: 'आप HARDINKAAM के प्रोफेशनल कॉलर हैं। सर्विसमैन को बताएं कि HARDINKAAM से जुड़ने पर कोई बिचौलिया नहीं है, 100% पेमेंट सीधे उनके खाते में आती है और रोज़ नई बुकिंग्स मिलती हैं। बातचीत सम्मानजनक (आप/जी) और उत्साहवर्धक होनी चाहिए।',
      keyTalkingPoints: [
        '0% प्लेटफॉर्म कमीशन - पूरा पैसा आपका',
        'रोजाना नए ग्राहक और बुकिंग्स',
        'तुरंत ऑनलाइन रजिस्ट्रेशन और फ्री आईडी कार्ड',
        'कंपनी की तरफ से 24x7 सपोर्ट और सहायता',
      ],
      faqResponses: [
        { question: 'रजिस्ट्रेशन फीस कितनी है?', answer: 'HARDINKAAM पर रजिस्ट्रेशन पूर्णतः आसान और पारदर्शी है।' },
        { question: 'पेमेंट कब मिलता है?', answer: 'कस्टमर से काम पूरा होते ही पेमेंट सीधे आपके UPI या कैश में मिल जाता है।' },
      ],
      objectionHandling: [
        { objection: 'मेरे पास पहले से बहुत काम है', response: 'बहुत अच्छी बात है सर! HARDINKAAM से आप अपने खाली समय में अतिरिक्त कमाई कर सकते हैं और जब चाहें ऑनलाइन/ऑफलाइन हो सकते हैं।' },
        { objection: 'कंपनी फ्रॉड तो नहीं है?', response: 'HARDINKAAM मध्य प्रदेश की रजिस्टर्ड होम सर्विस कंपनी है, जिसका ऑफिस भोपाल में है और हजारों कारीगर जुड़े हुए हैं।' },
      ],
      closingRemark: 'धन्यवाद! मैं आपके व्हाट्सएप नंबर पर रजिस्ट्रेशन लिंक भेज रहा हूँ।',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'script_customer_festive_service',
      name: 'कस्टमर होम सर्विस डिस्काउंट & बुकिंग ऑफर',
      category: 'customer_engagement',
      language: 'hi',
      openingGreeting: 'नमस्ते! मैं HARDINKAAM होम सर्विसेज से बोल रहा हूँ।',
      objective: 'ग्राहकों को AC रिपेयर, डीप क्लीनिंग, प्लंबिंग और पेंटिंग पर विशेष डिस्काउंट की जानकारी देना।',
      systemPrompt: 'आप HARDINKAAM के कस्टमर रिलेशनशिप एग्जीक्यूटिव हैं। ग्राहक को बताएं कि उनके इलाके में वेरीफाइड प्रोफेशनल्स 30 मिनट में उपलब्ध हैं और आज बुकिंग पर 20% तक की छूट है।',
      keyTalkingPoints: [
        'वेरीफाइड और बैकग्राउंड चेक्ड प्रोफेशनल्स',
        '30 मिनट में सर्विसमैन आपके द्वार',
        '30 दिनों की सर्विस वारंटी',
      ],
      faqResponses: [
        { question: 'क्या सर्विसमैन प्रशिक्षित हैं?', answer: 'हाँ, हमारे सभी सर्विसमैन KYC वेरीफाइड और प्रशिक्षित हैं।' },
      ],
      objectionHandling: [
        { objection: 'मुझे अभी काम नहीं करवाना', response: 'जी कोई बात नहीं सर, जब भी आपको जरूरत हो आप HARDINKAAM ऐप या 6267546945 पर कॉल कर सकते हैं।' },
      ],
      closingRemark: 'HARDINKAAM चुनने के लिए धन्यवाद। आपका दिन शुभ हो!',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'script_inactive_pro_reengagement',
      name: 'निष्क्रिय सर्विसमैन री-एंगेजमेंट & जॉब्स अलर्ट',
      category: 'retention',
      language: 'hinglish',
      openingGreeting: 'नमस्ते! HARDINKAAM पार्टनर हेल्पडेस्क से कॉल है।',
      objective: 'जो सर्विसमैन कुछ दिनों से ऑफलाइन हैं उन्हें नए काम के ऑर्डर्स की जानकारी देकर एक्टिव करना।',
      systemPrompt: 'सर्विसमैन से पूछें कि क्या उन्हें ऐप इस्तेमाल करने में कोई परेशानी आ रही है। उन्हें बताएं कि उनके इलाके में कई पेंडिंग कस्टमर रिक्वेस्ट्स हैं।',
      keyTalkingPoints: [
        'आपके इलाके में नए काम उपलब्ध हैं',
        'ऐप पर ऑनलाइन आएं और बुकिंग स्वीकार करें',
        'किसी भी समस्या के लिए हेल्पडेस्क तुरंत मदद करेगा',
      ],
      faqResponses: [],
      objectionHandling: [],
      closingRemark: 'हम आपके साथ हैं, ऐप खोलें और आज ही नए ऑर्डर्स पाएं। धन्यवाद!',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  inMemoryScripts = [...DEFAULT_SCRIPTS];

  const DEFAULT_SETTINGS: AICallSettings = {
    id: 'global_ai_call_settings',
    telephonyProvider: 'mock',
    jioCxConfig: {
      accountId: process.env.JIOCX_ACCOUNT_ID || '',
      apiKey: process.env.JIOCX_API_KEY || '',
      apiSecret: process.env.JIOCX_API_SECRET || '',
      businessNumber: process.env.JIOCX_NUMBER || '+916267546945',
      webhookSecret: process.env.JIOCX_WEBHOOK_SECRET || 'hardinkaam_jio_webhook_key_2026',
      baseUrl: 'https://api.jiocx.com/v1',
    },
    geminiVoiceConfig: {
      model: GEMINI_CANONICAL_MODEL,
      voiceName: 'Puck',
      temperature: 0.7,
      speechRate: 1.0,
    },
    globalCallingHours: {
      start: '10:00',
      end: '18:00',
      timezone: 'Asia/Kolkata',
      allowedDays: [1, 2, 3, 4, 5, 6],
    },
    safetyLimits: {
      maxDailyCalls: 500,
      maxConcurrentCalls: 5,
      minDelayBetweenCallsSeconds: 15,
      maxAttemptsPerLead: 3,
      cooldownPeriodDays: 7,
      autoDoNotCallOnDisinterestCount: 2,
    },
    humanHandoff: {
      enabled: true,
      forwardingNumber: '+916267546945',
    },
    testModeActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin_root',
  };

  inMemorySettings = { ...DEFAULT_SETTINGS };

  // =========================================================================
  // 1. CALLING OVERVIEW & ANALYTICS (Admin Only)
  // =========================================================================
  router.get('/overview', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Pull latest logs
      let logs = inMemoryLogs;
      try {
        const snap = await getDocs(collection(db, 'ai_call_logs'));
        if (!snap.empty) {
          logs = snap.docs.map((d) => d.data() as AICallLog);
          inMemoryLogs = logs;
        }
      } catch (_) {}

      // Pull latest queue
      let queue = inMemoryQueue;
      try {
        const qSnap = await getDocs(collection(db, 'ai_call_queue'));
        if (!qSnap.empty) {
          queue = qSnap.docs.map((d) => d.data() as AICallQueueItem);
          inMemoryQueue = queue;
        }
      } catch (_) {}

      // Pull campaigns
      let campaigns = inMemoryCampaigns;
      try {
        const cSnap = await getDocs(collection(db, 'ai_call_campaigns'));
        if (!cSnap.empty) {
          campaigns = cSnap.docs.map((d) => d.data() as AICallCampaign);
          inMemoryCampaigns = campaigns;
        }
      } catch (_) {}

      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter((l) => (l.startedAt || '').startsWith(todayStr));

      const totalCallsToday = todayLogs.length || logs.length;
      const connectedCalls = logs.filter((l) => ['CONNECTED', 'COMPLETED', 'FOLLOW_UP', 'HUMAN_TRANSFER'].includes(l.status)).length;
      const noAnswerCalls = logs.filter((l) => l.status === 'NO_ANSWER' || l.outcome === 'NO_ANSWER').length;
      const busyCalls = logs.filter((l) => l.status === 'BUSY' || l.outcome === 'BUSY').length;
      const interestedCount = logs.filter((l) => l.outcome === 'INTERESTED' || l.outcome === 'REGISTRATION_REQUEST' || l.outcome === 'BOOKING_REQUEST').length;
      const notInterestedCount = logs.filter((l) => l.outcome === 'NOT_INTERESTED' || l.outcome === 'DO_NOT_CALL').length;
      const followUpsScheduled = logs.filter((l) => l.outcome === 'CALL_LATER' || l.status === 'FOLLOW_UP').length;
      const humanTransferRequests = logs.filter((l) => l.humanTransferRequested || l.status === 'HUMAN_TRANSFER').length;
      const convertedLeads = logs.filter((l) => l.outcome === 'REGISTRATION_REQUEST' || l.outcome === 'BOOKING_REQUEST').length;
      const totalCallSeconds = logs.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
      const totalCallMinutes = Math.round(totalCallSeconds / 60);

      const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
      const pendingQueueCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'QUEUED').length;

      const connectionRatePercent = logs.length > 0 ? Math.round((connectedCalls / logs.length) * 100) : 0;
      const conversionRatePercent = connectedCalls > 0 ? Math.round((interestedCount / connectedCalls) * 100) : 0;

      const stats: AICallOverviewStats = {
        totalCallsToday,
        connectedCalls,
        noAnswerCalls,
        busyCalls,
        interestedCount,
        notInterestedCount,
        followUpsScheduled,
        humanTransferRequests,
        convertedLeads,
        totalCallMinutes,
        activeCampaignsCount,
        pendingQueueCount,
        connectionRatePercent,
        conversionRatePercent,
      };

      return res.status(200).json({
        success: true,
        stats,
        settings: inMemorySettings,
      });
    } catch (err: any) {
      console.error('[AICallingRouter] Overview error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 2. CAMPAIGN MANAGEMENT (Admin Only)
  // =========================================================================
  router.get('/campaigns', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      try {
        const snap = await getDocs(collection(db, 'ai_call_campaigns'));
        if (!snap.empty) {
          inMemoryCampaigns = snap.docs.map((d) => d.data() as AICallCampaign);
        }
      } catch (_) {}

      return res.status(200).json({
        success: true,
        campaigns: inMemoryCampaigns,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/campaigns', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const campaignId = body.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const campaign: AICallCampaign = {
        id: campaignId,
        name: body.name || 'नई AI कॉलिंग मुहीम',
        description: body.description || '',
        scriptId: body.scriptId || 'script_serviceman_recruitment_bhopal',
        scriptName: body.scriptName || 'भोपाल सर्विसमैन भर्ती व ऑनबोर्डिंग',
        targetAudience: body.targetAudience || 'marketing_leads',
        tradeFilter: body.tradeFilter || '',
        cityFilter: body.cityFilter || 'Bhopal',
        statusFilter: body.statusFilter || '',
        language: body.language || 'hinglish',
        status: body.status || 'draft',
        callingHoursStart: body.callingHoursStart || '10:00',
        callingHoursEnd: body.callingHoursEnd || '18:00',
        maxAttempts: Number(body.maxAttempts) || 3,
        delayBetweenCallsSeconds: Number(body.delayBetweenCallsSeconds) || 15,
        maxConcurrentCalls: Number(body.maxConcurrentCalls) || 2,
        recordingEnabled: body.recordingEnabled ?? true,
        transcriptionEnabled: body.transcriptionEnabled ?? true,
        humanHandoffNumber: body.humanHandoffNumber || '+916267546945',
        allowBargeIn: body.allowBargeIn ?? true,
        totalLeads: Number(body.totalLeads) || 0,
        completedLeads: Number(body.completedLeads) || 0,
        successfulLeads: Number(body.successfulLeads) || 0,
        failedLeads: Number(body.failedLeads) || 0,
        createdAt: body.createdAt || nowIso,
        updatedAt: nowIso,
        createdBy: (req as any).user?.email || 'admin',
      };

      const existingIdx = inMemoryCampaigns.findIndex((c) => c.id === campaignId);
      if (existingIdx !== -1) {
        inMemoryCampaigns[existingIdx] = campaign;
      } else {
        inMemoryCampaigns.unshift(campaign);
      }

      try {
        await setDoc(doc(db, 'ai_call_campaigns', campaignId), campaign);
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: 'Campaign saved successfully!',
        campaign,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/campaigns/:id/start', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      // Verify calling hours
      const withinHours = isWithinCallingHours(campaign.callingHoursStart, campaign.callingHoursEnd);
      if (!withinHours) {
        return res.status(400).json({
          success: false,
          error: `कॉलिंग समय (${campaign.callingHoursStart} - ${campaign.callingHoursEnd} IST) से बाहर है। कानूनी सुरक्षा हेतु कॉल केवल तय समय में ही की जा सकती है।`,
        });
      }

      campaign.status = 'active';
      campaign.startedAt = new Date().toISOString();
      campaign.updatedAt = new Date().toISOString();

      try {
        await updateDoc(doc(db, 'ai_call_campaigns', id), {
          status: 'active',
          startedAt: campaign.startedAt,
          updatedAt: campaign.updatedAt,
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: `Campaign "${campaign.name}" is now ACTIVE!`,
        campaign,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/campaigns/:id/pause', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (campaign) {
        campaign.status = 'paused';
        campaign.updatedAt = new Date().toISOString();
        try {
          await updateDoc(doc(db, 'ai_call_campaigns', id), { status: 'paused', updatedAt: campaign.updatedAt });
        } catch (_) {}
      }
      return res.status(200).json({ success: true, message: 'Campaign paused' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/campaigns/:id/stop', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (campaign) {
        campaign.status = 'stopped';
        campaign.endedAt = new Date().toISOString();
        campaign.updatedAt = new Date().toISOString();
        try {
          await updateDoc(doc(db, 'ai_call_campaigns', id), {
            status: 'stopped',
            endedAt: campaign.endedAt,
            updatedAt: campaign.updatedAt,
          });
        } catch (_) {}
      }
      return res.status(200).json({ success: true, message: 'Campaign stopped' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/campaigns/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      inMemoryCampaigns = inMemoryCampaigns.filter((c) => c.id !== id);
      try {
        await deleteDoc(doc(db, 'ai_call_campaigns', id));
      } catch (_) {}
      return res.status(200).json({ success: true, message: 'Campaign deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 3. QUEUE MANAGEMENT & REUSING MARKETING LEADS (Admin Only)
  // =========================================================================
  router.get('/queue', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { campaignId, status } = req.query;
      let items = inMemoryQueue;
      try {
        const snap = await getDocs(collection(db, 'ai_call_queue'));
        if (!snap.empty) {
          items = snap.docs.map((d) => d.data() as AICallQueueItem);
          inMemoryQueue = items;
        }
      } catch (_) {}

      if (campaignId) {
        items = items.filter((i) => i.campaignId === campaignId);
      }
      if (status) {
        items = items.filter((i) => i.status === status);
      }

      return res.status(200).json({
        success: true,
        queue: items,
        total: items.length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Imports eligible contacts from existing marketing_leads collection into ai_call_queue
   */
  router.post('/queue/populate', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { campaignId, cityFilter, tradeFilter, limitCount = 50 } = req.body;
      if (!campaignId) {
        return res.status(400).json({ success: false, error: 'Campaign ID is required.' });
      }

      const campaign = inMemoryCampaigns.find((c) => c.id === campaignId);
      const campName = campaign?.name || 'AI Campaign';

      // Pull existing marketing_leads
      let availableLeads: any[] = [];
      try {
        const leadsSnap = await getDocs(collection(db, 'marketing_leads'));
        if (!leadsSnap.empty) {
          availableLeads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      } catch (_) {}

      if (availableLeads.length === 0) {
        availableLeads = [
          { id: 'lead_bhopal_1', name: 'राजेश वर्मा (इलेक्ट्रीशियन)', phone: '+919826012345', city: 'Bhopal', trade: 'इलेक्ट्रीशियन' },
          { id: 'lead_bhopal_2', name: 'अमित पटेल (प्लंबर)', phone: '+919826023456', city: 'Bhopal', trade: 'प्लंबर' },
          { id: 'lead_bhopal_3', name: 'सुरेश विश्वकर्मा (कारपेंटर)', phone: '+919826034567', city: 'Bhopal', trade: 'कारपेंटर' },
          { id: 'lead_bhopal_4', name: 'मनोज साहू (AC रिपेयर)', phone: '+919826045678', city: 'Bhopal', trade: 'AC रिपेयर' },
          { id: 'lead_bhopal_5', name: 'दीपक मालवीय (पेंटर)', phone: '+919826056789', city: 'Bhopal', trade: 'पेंटर' },
          { id: 'lead_bhopal_6', name: 'संजय जैन (सिविल ठेकेदार)', phone: '+919826067890', city: 'Bhopal', trade: 'सिविल वर्क्स' },
        ];
      }

      // Filter leads by city/trade and valid phone
      let filtered = availableLeads.filter((lead) => {
        const phone = (lead.phone || lead.mobile || lead.contactPhone || '').trim();
        if (!phone || phone.length < 8) return false;
        if (cityFilter && !(lead.city || lead.cityOrDistrict || '').toLowerCase().includes(cityFilter.toLowerCase())) {
          return false;
        }
        if (tradeFilter && !(lead.trade || lead.category || '').toLowerCase().includes(tradeFilter.toLowerCase())) {
          return false;
        }
        return true;
      });

      // Avoid duplicates already in queue for this campaign
      const existingPhones = new Set(inMemoryQueue.map((q) => q.phone));
      const newlyAdded: AICallQueueItem[] = [];

      for (const lead of filtered.slice(0, Number(limitCount))) {
        const phone = (lead.phone || lead.mobile || lead.contactPhone || '').trim();
        if (existingPhones.has(phone)) continue;

        const queueItem: AICallQueueItem = {
          id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          campaignId,
          campaignName: campName,
          leadId: lead.id,
          contactName: lead.name || lead.businessName || 'सर्विस प्रोवाइडर',
          phone,
          city: lead.city || lead.cityOrDistrict || 'Bhopal',
          trade: lead.trade || lead.category || 'सर्विसमैन',
          status: 'PENDING',
          attemptCount: 0,
          maxAttempts: campaign?.maxAttempts || 3,
          priority: 1,
          doNotCall: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newlyAdded.push(queueItem);
        inMemoryQueue.push(queueItem);

        try {
          await setDoc(doc(db, 'ai_call_queue', queueItem.id), queueItem);
        } catch (_) {}
      }

      // Update campaign total leads
      if (campaign) {
        campaign.totalLeads = (campaign.totalLeads || 0) + newlyAdded.length;
        try {
          await updateDoc(doc(db, 'ai_call_campaigns', campaignId), { totalLeads: campaign.totalLeads });
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        message: `Successfully imported ${newlyAdded.length} eligible leads into calling queue!`,
        addedCount: newlyAdded.length,
        items: newlyAdded,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Triggers calling the next batch of pending items in the queue
   */
  router.post('/queue/trigger-next', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { campaignId, count = 1 } = req.body;
      const pendingItems = inMemoryQueue.filter(
        (q) => (q.status === 'PENDING' || q.status === 'QUEUED') && (!campaignId || q.campaignId === campaignId)
      );

      if (pendingItems.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No pending calls in queue.',
          processedCount: 0,
        });
      }

      const toProcess = pendingItems.slice(0, Number(count));
      const results: any[] = [];

      for (const item of toProcess) {
        item.status = 'CALLING';
        item.attemptCount = (item.attemptCount || 0) + 1;
        item.lastAttemptAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();

        const log = await executeSingleOutboundCall({
          leadId: item.leadId,
          campaignId: item.campaignId,
          contactName: item.contactName,
          phone: item.phone,
          city: item.city,
          trade: item.trade,
          adminUid: (req as any).user?.uid || 'admin_root',
        });

        item.lastCallId = log.id;
        item.status = log.status;
        item.lastOutcome = log.outcome;

        inMemoryLogs.unshift(log);
        results.push({ queueId: item.id, callId: log.id, status: log.status });

        try {
          await setDoc(doc(db, 'ai_call_queue', item.id), item);
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        message: `Processed ${toProcess.length} call(s) from queue.`,
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 4. CALL LOGS & TRANSCRIPT SUMMARIZATION (Admin Only)
  // =========================================================================
  router.get('/logs', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      try {
        const snap = await getDocs(collection(db, 'ai_call_logs'));
        if (!snap.empty) {
          inMemoryLogs = snap.docs.map((d) => d.data() as AICallLog);
        }
      } catch (_) {}

      return res.status(200).json({
        success: true,
        logs: inMemoryLogs,
        total: inMemoryLogs.length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/logs/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let log = inMemoryLogs.find((l) => l.id === id);
      if (!log) {
        try {
          const snap = await getDoc(doc(db, 'ai_call_logs', id));
          if (snap.exists()) log = snap.data() as AICallLog;
        } catch (_) {}
      }

      if (!log) {
        return res.status(404).json({ success: false, error: 'Call log not found' });
      }

      return res.status(200).json({ success: true, log });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/logs/:id/summarize', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const log = inMemoryLogs.find((l) => l.id === id);
      if (!log) {
        return res.status(404).json({ success: false, error: 'Call log not found' });
      }

      const summaryResult = await summarizeCallTranscript(log.transcript || [], log.contactName);
      log.summary = summaryResult.summary;
      log.sentiment = summaryResult.sentiment;
      log.outcome = summaryResult.outcome;
      log.nextAction = summaryResult.nextAction;
      log.updatedAt = new Date().toISOString();

      try {
        await updateDoc(doc(db, 'ai_call_logs', id), {
          summary: log.summary,
          sentiment: log.sentiment,
          outcome: log.outcome,
          nextAction: log.nextAction,
          updatedAt: log.updatedAt,
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        summary: summaryResult,
        log,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 5. SCRIPT BUILDER & TEMPLATES (Admin Only)
  // =========================================================================
  router.get('/scripts', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      try {
        const snap = await getDocs(collection(db, 'ai_call_scripts'));
        if (!snap.empty) {
          inMemoryScripts = snap.docs.map((d) => d.data() as AICallScript);
        }
      } catch (_) {}

      return res.status(200).json({
        success: true,
        scripts: inMemoryScripts,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/scripts', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const scriptId = body.id || `script_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const script: AICallScript = {
        id: scriptId,
        name: body.name || 'नया AI कॉलिंग स्क्रिप्ट',
        category: body.category || 'general',
        language: body.language || 'hinglish',
        openingGreeting: body.openingGreeting || 'नमस्ते!',
        objective: body.objective || '',
        systemPrompt: body.systemPrompt || '',
        keyTalkingPoints: Array.isArray(body.keyTalkingPoints) ? body.keyTalkingPoints : [],
        faqResponses: Array.isArray(body.faqResponses) ? body.faqResponses : [],
        objectionHandling: Array.isArray(body.objectionHandling) ? body.objectionHandling : [],
        closingRemark: body.closingRemark || 'धन्यवाद!',
        isDefault: Boolean(body.isDefault),
        createdAt: body.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const existingIdx = inMemoryScripts.findIndex((s) => s.id === scriptId);
      if (existingIdx !== -1) {
        inMemoryScripts[existingIdx] = script;
      } else {
        inMemoryScripts.push(script);
      }

      try {
        await setDoc(doc(db, 'ai_call_scripts', scriptId), script);
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: 'Script saved successfully!',
        script,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/scripts/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      inMemoryScripts = inMemoryScripts.filter((s) => s.id !== id);
      try {
        await deleteDoc(doc(db, 'ai_call_scripts', id));
      } catch (_) {}
      return res.status(200).json({ success: true, message: 'Script deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 6. TELEPHONY & VOICE SETTINGS (Admin Only - No secrets leaked)
  // =========================================================================
  router.get('/settings', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      try {
        const snap = await getDoc(doc(db, 'ai_call_settings', 'global_ai_call_settings'));
        if (snap.exists()) {
          inMemorySettings = snap.data() as AICallSettings;
        }
      } catch (_) {}

      // Normalize model to gemini-3.8-flash
      if (inMemorySettings?.geminiVoiceConfig) {
        inMemorySettings.geminiVoiceConfig.model = normalizeGeminiModel(inMemorySettings.geminiVoiceConfig.model);
      }

      // Mask sensitive API secrets before sending to Admin UI
      const safeSettings = inMemorySettings ? {
        ...inMemorySettings,
        geminiVoiceConfig: {
          ...inMemorySettings.geminiVoiceConfig,
          model: normalizeGeminiModel(inMemorySettings.geminiVoiceConfig?.model),
        },
        jioCxConfig: {
          ...inMemorySettings.jioCxConfig,
          apiKey: inMemorySettings.jioCxConfig.apiKey ? '••••••••' + inMemorySettings.jioCxConfig.apiKey.slice(-4) : '',
          apiSecret: inMemorySettings.jioCxConfig.apiSecret ? '••••••••' : '',
        }
      } : DEFAULT_SETTINGS;

      return res.status(200).json({
        success: true,
        settings: safeSettings,
        diagnostics: getAIDiagnostics(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/settings', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const current = inMemorySettings || DEFAULT_SETTINGS;

      const updated: AICallSettings = {
        ...current,
        telephonyProvider: body.telephonyProvider || current.telephonyProvider,
        jioCxConfig: {
          ...current.jioCxConfig,
          ...body.jioCxConfig,
          apiKey: body.jioCxConfig?.apiKey?.includes('••••') ? current.jioCxConfig.apiKey : (body.jioCxConfig?.apiKey || current.jioCxConfig.apiKey),
          apiSecret: body.jioCxConfig?.apiSecret?.includes('••••') ? current.jioCxConfig.apiSecret : (body.jioCxConfig?.apiSecret || current.jioCxConfig.apiSecret),
        },
        geminiVoiceConfig: {
          ...current.geminiVoiceConfig,
          ...body.geminiVoiceConfig,
          model: normalizeGeminiModel(body.geminiVoiceConfig?.model || current.geminiVoiceConfig.model),
        },
        globalCallingHours: {
          ...current.globalCallingHours,
          ...body.globalCallingHours,
        },
        safetyLimits: {
          ...current.safetyLimits,
          ...body.safetyLimits,
        },
        humanHandoff: {
          ...current.humanHandoff,
          ...body.humanHandoff,
        },
        testModeActive: body.testModeActive ?? current.testModeActive,
        updatedAt: new Date().toISOString(),
        updatedBy: (req as any).user?.email || 'admin',
      };

      inMemorySettings = updated;

      try {
        await setDoc(doc(db, 'ai_call_settings', 'global_ai_call_settings'), updated);
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: 'Calling settings saved successfully!',
        settings: {
          ...updated,
          jioCxConfig: {
            ...updated.jioCxConfig,
            apiKey: updated.jioCxConfig.apiKey ? '••••••••' + updated.jioCxConfig.apiKey.slice(-4) : '',
            apiSecret: updated.jioCxConfig.apiSecret ? '••••••••' : '',
          }
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 7. INTERACTIVE VOICE CALL SIMULATOR (Admin Only)
  // =========================================================================
  router.post('/simulator/turn', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const {
        scriptPrompt,
        leadName,
        trade,
        city,
        conversationHistory = [],
        customerInputText,
        language = 'hinglish',
        isFirstTurn = false,
      } = req.body;

      const aiTurn = await generateAICallResponse({
        scriptPrompt: scriptPrompt || DEFAULT_SCRIPTS[0].systemPrompt,
        leadName: leadName || 'दीपक',
        trade: trade || 'इलेक्ट्रीशियन',
        city: city || 'भोपाल',
        conversationHistory,
        customerInputText,
        language,
        isFirstTurn,
      });

      return res.status(200).json({
        success: true,
        ...aiTurn,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/simulator/finish', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { transcript = [], leadName, phone, trade, city, campaignId } = req.body;
      const summaryResult = await summarizeCallTranscript(transcript, leadName);

      const nowIso = new Date().toISOString();
      const callId = `sim_call_${Date.now()}`;

      const logRecord: AICallLog = {
        id: callId,
        callId,
        contactName: leadName || 'Test Lead',
        phone: phone || '+919826000000',
        direction: 'outbound',
        campaignId: campaignId || 'simulated_test',
        campaignName: 'Interactive Browser Simulator',
        provider: 'mock',
        status: 'COMPLETED',
        startedAt: nowIso,
        durationSeconds: Math.max(15, transcript.length * 12),
        language: 'hinglish',
        outcome: summaryResult.outcome,
        summary: summaryResult.summary,
        transcript,
        sentiment: summaryResult.sentiment,
        nextAction: summaryResult.nextAction,
        humanTransferRequested: summaryResult.outcome === 'HUMAN_AGENT_REQUEST',
        recordingEnabled: false,
        transcriptionEnabled: true,
        attemptNumber: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      inMemoryLogs.unshift(logRecord);

      try {
        await setDoc(doc(db, 'ai_call_logs', callId), logRecord);
      } catch (_) {}

      return res.status(200).json({
        success: true,
        log: logRecord,
        summary: summaryResult,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 8. DIRECT CALL NOW TRIGGER (Admin Only)
  // =========================================================================
  router.post('/call-now', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { phone, contactName, trade, city, campaignId, scriptId, providerOverride } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required.' });
      }

      const log = await executeSingleOutboundCall({
        leadId: req.body.leadId,
        campaignId: campaignId || 'direct_admin_call',
        contactName: contactName || 'कस्टमर / सर्विसमैन',
        phone,
        city: city || 'Bhopal',
        trade: trade || 'सर्विस प्रोवाइडर',
        scriptId,
        providerOverride,
        adminUid: (req as any).user?.uid || 'admin_root',
      });

      inMemoryLogs.unshift(log);

      return res.status(200).json({
        success: true,
        message: `Call initiated to ${phone} via ${log.provider.toUpperCase()}`,
        log,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 9. PUBLIC WEBHOOK RECEIVERS (For JioCX / Telephony Gateway Callbacks)
  // =========================================================================
  const handleTelephonyWebhook = async (req: Request, res: Response) => {
    try {
      const provider = getTelephonyProvider('jiocx');
      const event: TelephonyWebhookEvent = await provider.handleWebhook(req.body, req.headers);

      console.log(`[AICallingWebhook] Event ${event.eventType} for call ${event.callId} (${event.providerCallId})`);

      // Update call log if exists
      const log = inMemoryLogs.find((l) => l.id === event.callId || l.providerCallId === event.providerCallId);
      if (log) {
        log.status = event.status as any;
        if (event.durationSeconds) log.durationSeconds = event.durationSeconds;
        if (event.recordingUrl) log.recordingUrl = event.recordingUrl;
        log.updatedAt = new Date().toISOString();

        try {
          await updateDoc(doc(db, 'ai_call_logs', log.id), {
            status: log.status,
            durationSeconds: log.durationSeconds,
            recordingUrl: log.recordingUrl || null,
            updatedAt: log.updatedAt,
          });
        } catch (_) {}
      }

      return res.status(200).json({ success: true, received: true });
    } catch (err: any) {
      console.error('[AICallingWebhook] Webhook handling error:', err);
      return res.status(200).json({ success: false, error: err.message });
    }
  };

  router.post('/webhook/jiocx', handleTelephonyWebhook);
  router.post('/webhook/telephony', handleTelephonyWebhook);

  return router;
}
