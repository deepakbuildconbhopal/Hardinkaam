import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Server,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  History,
  FileArchive,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  Copy,
  Check,
  X,
  Play,
  Cpu,
  Globe,
  HardDrive,
  FileCode,
  Flame,
  XCircle,
  MinusCircle,
  Trash2,
  HelpCircle,
  ShieldAlert,
  FileWarning,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DeploymentVersion,
  DeploymentStage,
  DeploymentProgressUpdate,
  DeploymentJobRecord,
  DeploymentErrorDetails,
  FlaggedExecutableFile,
  PreDeploymentAuditResult,
} from '../../types';
import {
  fetchDeploymentStatus,
  fetchDeploymentHistory,
  subscribeToDeployments,
  uploadAndDeployZip,
  rollbackToVersion,
  retryDeploymentJobApi,
  continueAuditDeploymentApi,
  preAuditZipFileApi,
} from '../../services/deploymentService';

export const AdminDeploymentManager: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  // Status & History State
  const [currentVersion, setCurrentVersion] = useState<string>('v1.0.3');
  const [nextSuggestedVersion, setNextSuggestedVersion] = useState<string>('v1.0.4');
  const [liveUrl, setLiveUrl] = useState<string>('https://hardinkaam-5cc6a.web.app');
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>('hardinkaam-5cc6a');
  const [deployments, setDeployments] = useState<DeploymentVersion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Upload & Pipeline State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customVersion, setCustomVersion] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<DeploymentStage>('IDLE');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [activeJobRecord, setActiveJobRecord] = useState<DeploymentJobRecord | null>(null);
  const [errorDetails, setErrorDetails] = useState<DeploymentErrorDetails | null>(null);
  const [duplicateZipInfo, setDuplicateZipInfo] = useState<{
    existingVersion: string;
    zipHash: string;
    message: string;
  } | null>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);

  // Pre-Deployment Auditing & Executable Exclusion State
  const [flaggedExecutables, setFlaggedExecutables] = useState<FlaggedExecutableFile[]>([]);
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([]);
  const [isAuditingFile, setIsAuditingFile] = useState<boolean>(false);
  const [preAuditResult, setPreAuditResult] = useState<PreDeploymentAuditResult | null>(null);
  const [isContinuingAudit, setIsContinuingAudit] = useState<boolean>(false);

  // Modals & Inspection
  const [viewLogDeployment, setViewLogDeployment] = useState<DeploymentVersion | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<DeploymentVersion | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);
  const [setupGuideTab, setSetupGuideTab] = useState<'overview' | 'iam' | 'worker' | 'env'>('overview');
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // Auto-scroll live log terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [liveLogs]);

  // Load initial status and subscribe to Firestore updates
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const status = await fetchDeploymentStatus();
      setCurrentVersion(status.currentVersion || 'v1.0.3');
      setNextSuggestedVersion(status.nextSuggestedVersion || 'v1.0.4');
      setLiveUrl(status.liveUrl || 'https://hardinkaam-5cc6a.web.app');
      setFirebaseProjectId(status.firebaseProjectId || 'hardinkaam-5cc6a');

      const history = await fetchDeploymentHistory();
      if (history.length > 0) {
        setDeployments(history);
      }
    } catch (e) {
      console.error('Error loading deployment info:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToDeployments((realtimeVersions) => {
      if (realtimeVersions && realtimeVersions.length > 0) {
        setDeployments(realtimeVersions);
        const live = realtimeVersions.find((d) => d.status === 'LIVE' || d.isActiveLive);
        if (live) {
          setCurrentVersion(live.version);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > 80 * 1024 * 1024) {
          setDeployError(`फ़ाइल का आकार (${(file.size / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है। अधिकतम अनुमत सीमा 80 MB है।`);
          return;
        }
        setSelectedFile(file);
        setDeployError(null);
      } else {
        setDeployError('कृपया केवल .zip फ़ाइल अपलोड करें (Please upload a valid .zip file only).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > 80 * 1024 * 1024) {
          setDeployError(`फ़ाइल का आकार (${(file.size / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है। अधिकतम अनुमत सीमा 80 MB है।`);
          return;
        }
        setSelectedFile(file);
        setDeployError(null);
      } else {
        setDeployError('कृपया केवल .zip फ़ाइल अपलोड करें (Please upload a valid .zip file only).');
      }
    }
  };

  // Start Deployment
  const handleStartDeploy = async (force = false, stripUnsupported = false) => {
    if (!selectedFile) {
      setDeployError('कृपया पहले वेबसाइट ZIP फ़ाइल चुनें (Please select a ZIP file).');
      return;
    }

    if (selectedFile.size > 80 * 1024 * 1024) {
      setDeployError(`फ़ाइल का आकार (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है। अधिकतम अनुमत सीमा 80 MB है।`);
      return;
    }

    setIsDeploying(true);
    setDeployError(null);
    setDeploySuccess(null);
    setErrorDetails(null);
    setDuplicateZipInfo(null);
    setCurrentStage('UPLOADING');
    setProgressPercent(2);
    setStatusMessage('ZIP अपलोड व सर्वर सत्यापन प्रारंभ किया जा रहा है...');
    setLiveLogs([
      `[${new Date().toLocaleTimeString('en-IN')}] Initializing deployment pipeline for ${selectedFile.name}...`,
      `[${new Date().toLocaleTimeString('en-IN')}] Admin: ${currentUser?.email || 'admin@hardinkaam.in'}`,
      `[${new Date().toLocaleTimeString('en-IN')}] Target Project: ${firebaseProjectId}`,
      `[${new Date().toLocaleTimeString('en-IN')}] Target Production Site: ${liveUrl}`,
      ...(force ? [`[${new Date().toLocaleTimeString('en-IN')}] Force mode active (bypassing duplicate hash check).`] : []),
      ...(stripUnsupported ? [`[${new Date().toLocaleTimeString('en-IN')}] Stripping unsupported non-web executables (.apk, .exe, etc.).`] : []),
    ]);

    const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
    const adminName = userProfile?.name || 'DEEPAK (Admin)';
    const adminUid = currentUser?.uid || 'admin_user';
    const versionTag = customVersion.trim() || nextSuggestedVersion;

    const result = await uploadAndDeployZip(
      selectedFile,
      {
        customVersion: versionTag,
        adminEmail,
        adminName,
        adminUid,
        force,
        stripUnsupportedFiles: stripUnsupported,
      },
      (update: DeploymentProgressUpdate) => {
        setCurrentStage(update.stage);
        setProgressPercent(update.progress);
        setStatusMessage(update.message);
        if (update.jobRecord) {
          setActiveJobRecord(update.jobRecord);
        }
        if (update.detectedExecutables && update.detectedExecutables.length > 0) {
          setFlaggedExecutables(update.detectedExecutables);
          setSelectedExclusions(update.detectedExecutables.map((f) => f.path));
          if (update.stage === 'AUDITING' || update.requiresAuditConfirmation) {
            setIsDeploying(false);
          }
        }
        if (update.logs && update.logs.length > 0) {
          setLiveLogs((prev) => Array.from(new Set([...prev, ...update.logs!])));
        }
        if (update.error && update.stage !== 'AUDITING') {
          setDeployError(update.error);
        }
        if (update.errorDetails) {
          setErrorDetails(update.errorDetails);
        }
      }
    );

    setIsDeploying(false);
    if (result.jobId) {
      setLastJobId(result.jobId);
    }

    if (result.isDuplicate) {
      setDuplicateZipInfo({
        existingVersion: result.existingVersion || 'v1.0.3',
        zipHash: result.zipHash || '',
        message: result.message,
      });
      return;
    }

    if (result.detectedExecutables && result.detectedExecutables.length > 0) {
      setFlaggedExecutables(result.detectedExecutables);
      setSelectedExclusions(result.detectedExecutables.map((f) => f.path));
    }

    if (result.errorDetails) {
      setErrorDetails(result.errorDetails);
    }

    if (result.success && result.deployment) {
      setDeploySuccess(
        `✓ वर्शन ${result.deployment.version} सफलतापूर्वक बिल्ड होकर ${liveUrl} पर लाइव हो गया है!`
      );
      setSelectedFile(null);
      setCustomVersion('');
      setErrorDetails(null);
      setDuplicateZipInfo(null);
      setFlaggedExecutables([]);
      setSelectedExclusions([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadData();
    } else if (flaggedExecutables.length === 0 && (!result.detectedExecutables || result.detectedExecutables.length === 0)) {
      setDeployError(
        result.message ||
          'डिप्लॉयमेंट में त्रुटि हुई। मौजूदा लाइव वेबसाइट पूरी तरह सुरक्षित व अपरिवर्तित है।'
      );
    }
  };

  // Generic polling for job execution until LIVE, ACTION_REQUIRED or FAILED
  const pollForJobStatus = (jobId: string, adminEmail: string) => {
    let consecutivePollErrors = 0;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/deploy/job/${jobId}`, {
          headers: {
            'x-admin-email': adminEmail,
            'x-admin-role': 'admin',
          },
        });
        if (res.ok) {
          consecutivePollErrors = 0;
          const data = await res.json();
          if (data && data.job) {
            const job = data.job;
            setCurrentStage(job.currentStage || job.stage);
            setProgressPercent(job.progress || 0);
            setStatusMessage(job.message || '');
            setActiveJobRecord(job);
            if (job.logs && job.logs.length > 0) setLiveLogs(job.logs);

            if (job.detectedExecutables && job.detectedExecutables.length > 0) {
              setFlaggedExecutables(job.detectedExecutables);
            }

            if (
              job.status === 'ACTION_REQUIRED' ||
              (job.detectedExecutables && job.detectedExecutables.length > 0 && job.requiresAuditConfirmation)
            ) {
              setIsDeploying(false);
              setIsContinuingAudit(false);
              if (job.detectedExecutables) {
                setSelectedExclusions((prev) =>
                  prev.length > 0 ? prev : job.detectedExecutables.map((f: FlaggedExecutableFile) => f.path)
                );
              }
              return;
            }

            if (job.status === 'SUCCESS' || job.currentStage === 'LIVE') {
              clearInterval(pollInterval);
              setIsDeploying(false);
              setIsContinuingAudit(false);
              setFlaggedExecutables([]);
              setSelectedExclusions([]);
              setDeploySuccess(`✓ वर्शन ${job.versionTag || ''} सफलतापूर्वक लाइव हो गया है!`);
              await loadData();
            } else if (job.status === 'FAILED' || job.status === 'FAILED_TIMEOUT') {
              clearInterval(pollInterval);
              setIsDeploying(false);
              setIsContinuingAudit(false);
              setDeployError(job.errorMessage || 'डिप्लॉयमेंट असफल रहा।');
              if (job.errorDetails) setErrorDetails(job.errorDetails);
            }
          }
        } else {
          consecutivePollErrors++;
          if (consecutivePollErrors > 20) {
            clearInterval(pollInterval);
            setIsDeploying(false);
            setIsContinuingAudit(false);
          }
        }
      } catch (e) {
        consecutivePollErrors++;
      }
    }, 1000);
    return pollInterval;
  };

  // Continue deployment after Pre-Deployment Audit flagged executables
  const handleContinueWithExclusions = async (excludePaths?: string[]) => {
    const targetJobId = lastJobId || activeJobRecord?.jobId;
    if (!targetJobId) {
      if (selectedFile) {
        await handleStartDeploy(true, true);
        return;
      }
      setDeployError('सक्रिय जॉब ID नहीं मिली। कृपया ZIP फ़ाइल दोबारा चुनें।');
      return;
    }

    const pathsToExclude = excludePaths || selectedExclusions;

    setIsContinuingAudit(true);
    setIsDeploying(true);
    setDeployError(null);
    setStatusMessage('स्टेजिंग डायरेक्टरी से अनुपयुक्त बाइनरी फ़ाइलें हटाई जा रही हैं एवं डिप्लॉय जारी है...');

    const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
    const adminName = userProfile?.name || 'DEEPAK (Admin)';
    const adminUid = currentUser?.uid || 'admin_user';

    setLiveLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN')}] [PRE-DEPLOY AUDIT ACTION] Preserving original uploaded ZIP archive (non-destructive).`,
      `[${new Date().toLocaleTimeString('en-IN')}] [STAGING PURGE] Removing ${pathsToExclude.length} selected executable file(s) from staging directory only...`,
      ...pathsToExclude.map((p) => `[EXCLUDE] - ${p}`),
    ]);

    try {
      const res = await continueAuditDeploymentApi(targetJobId, {
        adminEmail,
        adminName,
        adminUid,
        excludeFiles: pathsToExclude,
        excludeAllFlagged: true,
      });

      if (!res.success) {
        setIsContinuingAudit(false);
        setIsDeploying(false);
        setDeployError(res.message || 'Exclusion request failed.');
        return;
      }

      // Resume polling for job progression
      pollForJobStatus(targetJobId, adminEmail);
    } catch (err: any) {
      setIsContinuingAudit(false);
      setIsDeploying(false);
      setDeployError(err.message || 'Error continuing deployment after audit.');
    }
  };

  const handleCancelDeployment = () => {
    setFlaggedExecutables([]);
    setSelectedExclusions([]);
    setIsDeploying(false);
    setIsContinuingAudit(false);
    setCurrentStage('IDLE');
    setProgressPercent(0);
    setStatusMessage('डिप्लॉयमेंट रोक दिया गया। मौजूदा लाइव वर्शन सुरक्षित है।');
    setLiveLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString('en-IN')}] Deployment paused/cancelled by admin during Pre-Deployment Audit. Original ZIP and live website are untouched.`,
    ]);
  };

  const toggleExclusion = (filePath: string) => {
    setSelectedExclusions((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  const toggleSelectAllExclusions = () => {
    if (selectedExclusions.length === flaggedExecutables.length) {
      setSelectedExclusions([]);
    } else {
      setSelectedExclusions(flaggedExecutables.map((f) => f.path));
    }
  };

  // Pre-audit scan of file before deploying
  const handlePreAuditCheck = async () => {
    if (!selectedFile) return;
    setIsAuditingFile(true);
    setDeployError(null);
    setPreAuditResult(null);
    try {
      const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
      const adminName = userProfile?.name || 'DEEPAK (Admin)';
      const adminUid = currentUser?.uid || 'admin_user';

      const res = await preAuditZipFileApi(selectedFile, {
        adminEmail,
        adminName,
        adminUid,
      });

      if (res.success && res.audit) {
        setPreAuditResult(res.audit);
        const flagged = res.audit.executables || res.audit.flaggedFiles || [];
        if (flagged.length > 0) {
          setFlaggedExecutables(flagged);
          setSelectedExclusions(flagged.map((f) => f.path));
        } else {
          setFlaggedExecutables([]);
          setSelectedExclusions([]);
        }
      } else {
        setDeployError(res.error || 'Pre-deployment audit failed');
      }
    } catch (e: any) {
      setDeployError(e.message || 'Audit check failed');
    } finally {
      setIsAuditingFile(false);
    }
  };

  // Retry failed job
  const handleRetryDeploy = async (stripUnsupported = false) => {
    if (selectedFile) {
      await handleStartDeploy(true, stripUnsupported);
      return;
    }

    if (!lastJobId) {
      setDeployError('पुनः प्रयास करने के लिए कृपया ZIP फ़ाइल दोबारा चुनें।');
      return;
    }

    setIsDeploying(true);
    setDeployError(null);
    setErrorDetails(null);
    setStatusMessage('डिप्लॉयमेंट पाइपलाइन पुनः प्रारंभ की जा रही है...');

    const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
    const adminName = userProfile?.name || 'DEEPAK (Admin)';
    const adminUid = currentUser?.uid || 'admin_user';

    const retryRes = await retryDeploymentJobApi(lastJobId, {
      adminEmail,
      adminName,
      adminUid,
      stripUnsupportedFiles: stripUnsupported,
    });

    if (!retryRes.success) {
      setIsDeploying(false);
      setDeployError(retryRes.message || 'Retry request failed.');
      return;
    }

    // Resume polling
    pollForJobStatus(lastJobId, adminEmail);
  };

  // Execute Rollback
  const handleRollback = async (target: DeploymentVersion) => {
    setIsRollingBack(true);
    setDeployError(null);
    setDeploySuccess(null);

    const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
    const adminName = userProfile?.name || 'DEEPAK (Admin)';
    const adminUid = currentUser?.uid || 'admin_user';

    const res = await rollbackToVersion(target.id, {
      adminEmail,
      adminName,
      adminUid,
    });

    setIsRollingBack(false);
    setRollbackTarget(null);

    if (res.success) {
      setDeploySuccess(
        `✓ सफलतापूर्वक वर्शन ${target.version} पर रोलबैक कर दिया गया है। लाइव वेबसाइट पुनर्स्थापित हो गई है!`
      );
      await loadData();
    } else {
      setDeployError(res.message || 'रोलबैक असफल रहा।');
    }
  };

  const copyBuildLogsToClipboard = (logText: string) => {
    navigator.clipboard.writeText(logText);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  // Step stages definition for UI visualizer
  const pipelineSteps = [
    { key: 'UPLOADING', label: '1. ZIP Upload', desc: 'Secure multipart transfer' },
    { key: 'VALIDATING', label: '2. ZIP Validation', desc: 'Path traversal & format audit' },
    { key: 'EXTRACTING', label: '3. Safe Extraction', desc: 'Isolated sandbox unpacking' },
    { key: 'AUDITING', label: '4. Pre-Deploy Audit', desc: 'Executable binaries (.apk, .exe, .sh, .dll) inspection' },
    { key: 'INSTALLING', label: '5. Dependencies', desc: 'npm install --prefer-offline' },
    { key: 'BUILDING', label: '6. Production Build', desc: 'npm run build (React/Vite)' },
    { key: 'VERIFYING', label: '7. Artifact Audit', desc: 'dist/ & PWA validation' },
    { key: 'DEPLOYING', label: '8. Firebase Deploy', desc: 'Release to hardinkaam-5cc6a' },
    { key: 'LIVE', label: '9. Version LIVE', desc: 'Production site active' },
  ];

  const getStepIndex = (stage: DeploymentStage) => {
    switch (stage) {
      case 'UPLOADING':
        return 0;
      case 'VALIDATING':
        return 1;
      case 'EXTRACTING':
        return 2;
      case 'AUDITING':
        return 3;
      case 'INSTALLING':
        return 4;
      case 'BUILDING':
        return 5;
      case 'VERIFYING':
        return 6;
      case 'DEPLOYING':
        return 7;
      case 'LIVE':
        return 8;
      case 'FAILED':
        return -1;
      default:
        return -1;
    }
  };

  const activeStepIdx = getStepIndex(currentStage);

  return (
    <div id="admin-website-deployment-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-neutral-900 to-stone-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
              <Server className="w-3.5 h-3.5" />
              <span>HARDINKAAM Production Pipeline</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              One-Click Website Updates &amp; Deployment
            </h1>
            <p className="text-sm text-stone-300 max-w-2xl leading-relaxed">
              Google AI Studio से नई ZIP डाउनलोड कर यहाँ अपलोड करें। सिस्टम सुरक्षित रूप से एक्सट्रैक्ट,
              डिपेंडेंसी इंस्टॉल व प्रोडक्शन बिल्ड चलाकर स्वचालित रूप से Firebase Hosting पर लाइव करेगा।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSetupGuide(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold transition-all flex items-center gap-2 border border-orange-400/30"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>GCP ADC सेटअप गाइड (No Tokens)</span>
            </button>

            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश</span>
            </button>

            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>लाइव वेबसाइट खोलें</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">सक्रिय लाइव वर्शन (Live Version)</div>
            <div className="mt-1 text-xl font-black text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{currentVersion}</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Firebase Hosting पर लाइव</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">अगला वर्शन (Next Build Tag)</div>
            <div className="mt-1 text-xl font-black text-orange-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <span>{nextSuggestedVersion}</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">स्वचालित सीक्वेंशियल नंबरिंग</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Firebase प्रोजेक्ट (Target)</div>
            <div className="mt-1 text-sm font-black text-white truncate flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{firebaseProjectId}</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Web Hosting &amp; PWA Cache</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">सुरक्षा व फॉलबैक गार्ड</div>
            <div className="mt-1 text-sm font-black text-blue-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Atomic 100% Safe</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">त्रुटि पर लाइव वर्शन अपरिवर्तित रहेगा</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {deploySuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start justify-between gap-3 text-emerald-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">डिप्लॉयमेंट सफल (Deployment Successful)</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{deploySuccess}</p>
            </div>
          </div>
          <button
            onClick={() => setDeploySuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {deployError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">डिप्लॉयमेंट अलर्ट (Deployment Notice)</h4>
              <p className="text-xs text-red-800 mt-0.5">{deployError}</p>
              <p className="text-[11px] text-stone-600 mt-1">
                सुरक्षा नियम: वर्तमान लाइव वेबसाइट पर कोई प्रभाव नहीं पड़ा है। नीचे दिए गए बिल्ड लॉग की जाँच करें।
              </p>
            </div>
          </div>
          <button
            onClick={() => setDeployError(null)}
            className="text-red-700 hover:text-red-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Main Grid: ZIP Upload & Pipeline on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Live Pipeline (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">वेबसाइट ZIP अपलोड करें (Upload ZIP)</h3>
                  <p className="text-xs text-stone-500">Google AI Studio से डाउनलोड की गई ZIP फ़ाइल</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                Max 80 MB (.zip)
              </span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !isDeploying && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-stone-300 hover:border-orange-500 hover:bg-orange-50/20 bg-stone-50/50'
              } ${isDeploying ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                disabled={isDeploying}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-stone-900 text-sm">{selectedFile.name}</div>
                  <div className="text-xs text-stone-500 font-medium">
                    आकार: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • तैयार (Ready to deploy)
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFlaggedExecutables([]);
                        setSelectedExclusions([]);
                        setPreAuditResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-600 hover:underline font-bold"
                    >
                      फ़ाइल बदलें (Change File)
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreAuditCheck();
                      }}
                      disabled={isAuditingFile || isDeploying}
                      className="text-xs text-amber-800 hover:text-amber-950 font-bold inline-flex items-center gap-1.5 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-250 transition-colors"
                    >
                      {isAuditingFile ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                          <span>ऑडिट जांच जारी है...</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 text-amber-700" />
                          <span>सुरक्षा व बाइनरी ऑडिट जांचें (Scan Executables)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-stone-800 text-sm">
                    ZIP फ़ाइल यहाँ खींचें या ब्राउज़ करने के लिए क्लिक करें
                  </div>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Drag and drop your AI Studio ZIP export here or click to browse from your computer.
                  </p>
                </div>
              )}
            </div>

            {/* Version & Controls Form */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  वर्शन टैग (Version Tag)
                </label>
                <input
                  type="text"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  placeholder={nextSuggestedVersion}
                  disabled={isDeploying}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-orange-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleStartDeploy}
                  disabled={!selectedFile || isDeploying}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                    !selectedFile || isDeploying
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-700/20 hover:scale-[1.01]'
                  }`}
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>प्रक्रिया जारी है ({progressPercent}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>वेबसाइट बिल्ड व लाइव डिप्लॉय करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Deployment Step Progress Bar */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-stone-900">स्वचालित डिप्लॉयमेंट पाइपलाइन (Live Pipeline)</h3>
              </div>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  isDeploying
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : currentStage === 'LIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentStage === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {currentStage}
              </span>
            </div>

            {/* Progress Percentage Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-stone-600">
                <span>{statusMessage || 'सिस्टम तैयार है (System Ready)'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    currentStage === 'FAILED'
                      ? 'bg-red-500'
                      : currentStage === 'LIVE'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2">
              {pipelineSteps.map((step, idx) => {
                const stageRecord = activeJobRecord?.stages?.[step.key];
                const stageStatus =
                  stageRecord?.status ||
                  (currentStage === 'FAILED' && activeStepIdx === idx
                    ? 'FAILED'
                    : activeStepIdx > idx || currentStage === 'LIVE'
                    ? 'SUCCESS'
                    : activeStepIdx === idx && isDeploying
                    ? 'RUNNING'
                    : 'PENDING');

                const isCurrent = stageStatus === 'RUNNING';
                const isPassed = stageStatus === 'SUCCESS';
                const isFailed = stageStatus === 'FAILED';
                const isSkipped = stageStatus === 'SKIPPED';
                const isSelected = selectedStepKey === step.key;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setSelectedStepKey(isSelected ? null : step.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isFailed
                        ? 'border-red-400 bg-red-50/80 text-red-950 font-bold shadow-xs'
                        : isCurrent
                        ? 'border-orange-500 bg-orange-50/70 font-bold text-orange-950 shadow-xs ring-1 ring-orange-400'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950 font-medium hover:bg-emerald-50'
                        : isSkipped
                        ? 'border-stone-200 bg-stone-100/60 text-stone-500 line-through'
                        : 'border-stone-100 bg-stone-50/50 text-stone-400 hover:bg-stone-50'
                    } ${isSelected ? 'ring-2 ring-stone-900' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : isFailed ? (
                        <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-3.5 h-3.5 text-orange-600 animate-spin shrink-0" />
                      ) : isSkipped ? (
                        <MinusCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />
                      )}
                      <span className="truncate text-[11px]">{step.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Detail Drawer */}
            {selectedStepKey && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    {pipelineSteps.find((s) => s.key === selectedStepKey)?.label} विवरण
                  </span>
                  <button
                    onClick={() => setSelectedStepKey(null)}
                    className="text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-stone-600 text-[11px]">
                  {pipelineSteps.find((s) => s.key === selectedStepKey)?.desc}
                </p>
                {activeJobRecord?.stages?.[selectedStepKey] ? (
                  <div className="space-y-1 text-[11px] text-stone-700">
                    <div>
                      <span className="font-semibold">स्थिति:</span>{' '}
                      <span className="font-bold">{activeJobRecord.stages[selectedStepKey].status}</span>
                    </div>
                    {activeJobRecord.stages[selectedStepKey].message && (
                      <div>
                        <span className="font-semibold">विवरण:</span>{' '}
                        {activeJobRecord.stages[selectedStepKey].message}
                      </div>
                    )}
                    {activeJobRecord.stages[selectedStepKey].logs && (
                      <div className="bg-white p-2 rounded-lg border border-stone-200 font-mono text-[10px] max-h-24 overflow-y-auto">
                        {activeJobRecord.stages[selectedStepKey].logs.map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-stone-400 italic text-[11px]">
                    यह स्टेज अभी पाइपलाइन कतार में प्रतीक्षारत है...
                  </p>
                )}
              </div>
            )}

            {/* Pre-Deployment Auditing & Executable Exclusion Action Card */}
            {flaggedExecutables.length > 0 && (
              <div
                id="pre-deployment-audit-panel"
                className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-xs space-y-3.5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-amber-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldAlert className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="font-black text-amber-950 text-sm flex flex-wrap items-center gap-2">
                        <span>पूर्व-डिप्लॉयमेंट सुरक्षा ऑडिट: निष्पादन योग्य (Executable) फ़ाइलें पहचानी गईं</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] tracking-wide">
                          कार्रवाई आवश्यक (Action Required)
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-850 mt-0.5">
                        Pre-Deployment Inspection detected binary executables in extracted staging folder.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-bold border border-emerald-300 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>गैर-विनाशकारी (Non-Destructive) प्रक्रिया</span>
                  </div>
                </div>

                <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-250 text-amber-900 text-[11.5px] leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Firebase Hosting केवल स्थिर वेब एसेट्स (HTML, CSS, JS, Media) को अनुमति देता है:</span>
                  </div>
                  <p className="text-amber-850 pl-5">
                    अपलोड किए गए पैकेज में निष्पादन योग्य (.apk, .exe, .sh, .dll) फ़ाइलें पाई गई हैं। 
                    <strong> आपकी मूल अपलोड की गई ZIP फ़ाइल पूरी तरह सुरक्षित और अपरिवर्तित रहेगी।</strong> 
                    नीचे चुनी गई फ़ाइलों को केवल डिप्लॉयमेंट स्टेजिंग डायरेक्टरी से बाहर (exclude) रखकर वेबसाइट को सुरक्षित रूप से डिप्लॉय किया जाएगा।
                  </p>
                </div>

                {/* Selection Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAllExclusions}
                      className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 transition-colors shadow-2xs"
                    >
                      {selectedExclusions.length === flaggedExecutables.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                          <span>सभी अचयनित करें (Deselect All)</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-stone-400" />
                          <span>सभी चुनें ({flaggedExecutables.length} फ़ाइलें)</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] font-bold text-amber-800">
                      चयनित: {selectedExclusions.length} / {flaggedExecutables.length} फ़ाइलें स्टेजिंग से हटाई जाएंगी
                    </span>
                  </div>

                  <span className="text-[10px] text-stone-500 font-mono">
                    Filter: .apk, .exe, .sh, .dll, .bat, .bin
                  </span>
                </div>

                {/* Flagged Files Table */}
                <div className="bg-white rounded-xl border border-amber-250 overflow-hidden shadow-2xs">
                  <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
                    {flaggedExecutables.map((file) => {
                      const isSelected = selectedExclusions.includes(file.path);
                      const ext = (file.extension || file.ext || '').toLowerCase();
                      const badgeClass =
                        ext === '.apk'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : ext === '.exe'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : ext === '.sh' || ext === '.bash'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : ext === '.dll' || ext === '.so'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-stone-100 text-stone-800 border-stone-200';

                      return (
                        <div
                          key={file.path}
                          onClick={() => toggleExclusion(file.path)}
                          className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'bg-white hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExclusion(file.path)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 shrink-0"
                            />
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black border shrink-0 uppercase ${badgeClass}`}
                            >
                              {ext}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 text-xs truncate font-mono">
                                {file.fileName || file.name}
                              </div>
                              <div className="text-[10px] text-stone-500 truncate font-mono">
                                {file.path}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 text-right shrink-0">
                            <span className="text-[11px] font-bold text-stone-600 font-mono">
                              {file.sizeFormatted}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-stone-100 text-stone-600 border border-stone-200'
                              }`}
                            >
                              {isSelected ? 'Exclude' : 'Keep'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleContinueWithExclusions(selectedExclusions)}
                      disabled={selectedExclusions.length === 0 || isContinuingAudit || isDeploying}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
                        selectedExclusions.length === 0 || isContinuingAudit || isDeploying
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-700/20 hover:scale-[1.01]'
                      }`}
                    >
                      {isContinuingAudit ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>स्टेजिंग से फ़ाइलें हटाई जा रही हैं...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            चुनी गई फ़ाइलें ({selectedExclusions.length}) स्टेजिंग से हटाकर डिप्लॉय करें
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleContinueWithExclusions(flaggedExecutables.map((f) => f.path))}
                      disabled={isContinuingAudit || isDeploying}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>सभी फ्लैग्ड फ़ाइलें हटाएं व तुरंत डिप्लॉय करें</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelDeployment}
                    disabled={isContinuingAudit}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold text-xs transition-colors"
                  >
                    रद्द करें (Cancel)
                  </button>
                </div>
              </div>
            )}

            {/* Duplicate ZIP Warning Box */}
            {duplicateZipInfo && (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-3 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>पूर्व-अपलोड ZIP पहचानी गई (Duplicate ZIP Detected)</span>
                </div>
                <p className="text-amber-850 leading-relaxed text-xs">
                  {duplicateZipInfo.message ||
                    `यह exact ZIP फ़ाइल वर्शन ${duplicateZipInfo.existingVersion} के रूप में पहले से ही लाइव है।`}
                  <span className="block font-mono text-[11px] text-amber-700 mt-1">
                    SHA-256: {duplicateZipInfo.zipHash.substring(0, 24)}...
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => handleStartDeploy(true)}
                    disabled={isDeploying}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>फिर भी नया वर्शन डिप्लॉय करें (Deploy Again / Force)</span>
                  </button>
                  <button
                    onClick={() => setDuplicateZipInfo(null)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold text-xs transition-colors"
                  >
                    रद्द करें (Cancel)
                  </button>
                </div>
              </div>
            )}

            {/* Structured Failure Recovery Box */}
            {(deployError || errorDetails) && (
              <div className="p-4 rounded-2xl bg-red-50/90 border border-red-200 text-xs space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>पाइपलाइन त्रुटि एवं समाधान (Pipeline Error & Resolution)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-red-200/80 text-red-950 font-black text-[10px] uppercase">
                    {errorDetails?.stage || currentStage}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-red-950">
                    {errorDetails?.error || deployError}
                  </div>
                  {errorDetails?.file && (
                    <div className="text-[11px] font-mono bg-red-100/90 px-2.5 py-1 rounded-lg text-red-900">
                      संबंधित फ़ाइल: {errorDetails.file}
                    </div>
                  )}
                  {errorDetails?.reason && (
                    <div className="text-[11px] text-red-850">
                      <span className="font-bold">कारण: </span>
                      {errorDetails.reason}
                    </div>
                  )}
                  {errorDetails?.action && (
                    <div className="text-[11px] text-stone-700 bg-white/80 p-2.5 rounded-xl border border-red-100">
                      <span className="font-bold text-stone-900">सुझाया गया समाधान: </span>
                      {errorDetails.action}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(errorDetails?.file ||
                    (deployError &&
                      (deployError.includes('executable') ||
                        deployError.includes('.apk') ||
                        deployError.includes('.exe')))) && (
                    <button
                      onClick={() => handleRetryDeploy(true)}
                      disabled={isDeploying}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Unsupported फ़ाइल हटाकर डिप्लॉय करें (Remove &amp; Deploy)</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRetryDeploy(false)}
                    disabled={isDeploying}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                    <span>पुनः प्रयास करें (Retry Pipeline)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Terminal Log Stream */}
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                  <Terminal className="w-3.5 h-3.5 text-stone-500" />
                  <span>बिल्ड व कंसोल लॉग (Live Build Logs)</span>
                </div>
                {liveLogs.length > 0 && (
                  <button
                    onClick={() => copyBuildLogsToClipboard(liveLogs.join('\n'))}
                    className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-bold"
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLog ? 'कॉपी हो गया' : 'लॉग कॉपी करें'}</span>
                  </button>
                )}
              </div>

              <div
                ref={logTerminalRef}
                className="bg-stone-950 text-stone-200 font-mono text-[11px] p-3.5 rounded-2xl h-44 overflow-y-auto space-y-1 shadow-inner border border-stone-900"
              >
                {liveLogs.length === 0 ? (
                  <div className="text-stone-500 italic py-4 text-center">
                    डिप्लॉयमेंट प्रारंभ करने पर यहाँ लाइव बिल्ड लॉग दिखाई देंगे...
                  </div>
                ) : (
                  liveLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed whitespace-pre-wrap ${
                        log.includes('FAILED') || log.includes('ERROR') || log.includes('error')
                          ? 'text-red-400 font-bold'
                          : log.includes('✓') || log.includes('LIVE') || log.includes('success')
                          ? 'text-emerald-400 font-bold'
                          : 'text-stone-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Deployment History & Rollback System (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">डिप्लॉयमेंट इतिहास (Version History)</h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                कुल {deployments.length} वर्शन
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                <p className="text-xs">इतिहास लोड हो रहा है...</p>
              </div>
            ) : deployments.length === 0 ? (
              <div className="py-10 text-center text-stone-400 space-y-2 border-2 border-dashed border-stone-200 rounded-2xl">
                <FileArchive className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs font-medium">कोई पिछला डिप्लॉयमेंट रिकॉर्ड नहीं मिला।</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {deployments.map((dep) => {
                  const isLive = dep.status === 'LIVE' || dep.isActiveLive;
                  const isFailed = dep.status === 'FAILED' || dep.buildStatus === 'FAILED';
                  const isRolledBack = dep.status === 'ROLLED_BACK';

                  return (
                    <div
                      key={dep.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isLive
                          ? 'border-emerald-400 bg-emerald-50/30 shadow-xs'
                          : isFailed
                          ? 'border-red-200 bg-red-50/20'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-stone-900">
                              {dep.version}
                            </span>

                            {isLive && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>LIVE</span>
                              </span>
                            )}

                            {isFailed && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                FAILED
                              </span>
                            )}

                            {isRolledBack && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ROLLED BACK
                              </span>
                            )}

                            {!isLive && !isFailed && !isRolledBack && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                PREVIOUS
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-stone-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(dep.uploadedAt).toLocaleString('en-IN')}</span>
                          </div>

                          <div className="text-[11px] text-stone-600">
                            अपलोडकर्ता: <span className="font-medium text-stone-800">{dep.uploadedBy}</span>
                          </div>

                          {dep.errorMessage && (
                            <div className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded-lg mt-1">
                              {dep.errorMessage}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {dep.buildLog && (
                            <button
                              onClick={() => setViewLogDeployment(dep)}
                              className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <FileCode className="w-3 h-3" />
                              <span>लॉग देखें</span>
                            </button>
                          )}

                          {!isLive && dep.buildStatus === 'SUCCESS' && (
                            <button
                              onClick={() => setRollbackTarget(dep)}
                              disabled={isRollingBack}
                              className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>रोलबैक करें</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security & Deployment Architecture Information */}
          <div className="bg-stone-50 rounded-3xl border border-stone-200 p-5 text-xs text-stone-600 space-y-3">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>HARDINKAAM सुरक्षा व डिप्लॉयमेंट नियम (Safety Protocols)</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-stone-600 pl-1 leading-relaxed">
              <li>
                <strong className="text-stone-800">सर्वर-साइड प्रोसेसिंग:</strong> ZIP निष्कर्षण व कंपाइलेशन सुरक्षित रूप से Node.js बैकएंड पर होता है।
              </li>
              <li>
                <strong className="text-stone-800">ज़ीरो सीक्रेट लीक:</strong> कोई भी Firebase Admin credentials या secrets ब्राउज़र या ZIP में नहीं रखे जाते।
              </li>
              <li>
                <strong className="text-stone-800">सुरक्षित फॉलबैक (Atomic Rollback):</strong> बिल्ड या डिपेंडेंसी एरर आने पर लाइव वेबसाइट पर कोई प्रभाव नहीं पड़ता।
              </li>
              <li>
                <strong className="text-stone-800">PWA ऑटो-कैश अपडेट:</strong> डिप्लॉयमेंट के तुरंत बाद ग्राहकों व सर्विसमैन के ऐप पर नया वर्शन प्रॉम्प्ट उपलब्ध होगा।
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Build Log Modal */}
      <AnimatePresence>
        {viewLogDeployment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 text-stone-100 w-full max-w-3xl rounded-3xl p-6 shadow-2xl border border-stone-800 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-orange-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      बिल्ड व डिप्लॉयमेंट लॉग ({viewLogDeployment.version})
                    </h3>
                    <p className="text-xs text-stone-400">
                      अपलोड समय: {new Date(viewLogDeployment.uploadedAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewLogDeployment(null)}
                  className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-stone-950 rounded-2xl p-4 font-mono text-xs text-stone-300 overflow-y-auto flex-1 h-96 border border-stone-800 whitespace-pre-wrap leading-relaxed">
                {viewLogDeployment.buildLog || 'कोई लॉग रिकॉर्ड नहीं मिला।'}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                <button
                  onClick={() => copyBuildLogsToClipboard(viewLogDeployment.buildLog || '')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 flex items-center gap-2"
                >
                  {copiedLog ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLog ? 'लॉग कॉपी हो गया' : 'पूरा लॉग कॉपी करें'}</span>
                </button>
                <button
                  onClick={() => setViewLogDeployment(null)}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                >
                  बंद करें (Close)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rollback Confirmation Modal */}
      <AnimatePresence>
        {rollbackTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-stone-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-stone-900">
                  वर्शन {rollbackTarget.version} पर रोलबैक करें?
                </h3>
                <p className="text-xs text-stone-600">
                  यह क्रिया तुरंत उत्पादन वेबसाइट{' '}
                  <strong className="text-stone-900">{liveUrl}</strong> को वर्शन{' '}
                  <strong className="text-stone-900">{rollbackTarget.version}</strong> पर वापस ले जाएगी।
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>लक्ष्य वर्शन (Target):</span>
                  <span className="font-mono font-bold text-stone-900">{rollbackTarget.version}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>मूल डिप्लॉय समय:</span>
                  <span className="font-medium">{new Date(rollbackTarget.uploadedAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setRollbackTarget(null)}
                  disabled={isRollingBack}
                  className="py-2.5 px-4 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  रद्द करें (Cancel)
                </button>

                <button
                  onClick={() => handleRollback(rollbackTarget)}
                  disabled={isRollingBack}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isRollingBack ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>हाँ, रोलबैक करें</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Cloud ADC Architecture & Setup Guide Modal */}
      <AnimatePresence>
        {showSetupGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 text-stone-100 w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-800 space-y-6 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Google Cloud ADC Architecture &amp; One-Time Setup Guide</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        NO FIREBASE_TOKEN
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      सुरक्षित Google Cloud Application Default Credentials (ADC) व Workload Identity सेटअप निर्देश
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Guide Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
                {[
                  { id: 'overview', label: '1. आर्किटेक्चर (Overview)' },
                  { id: 'iam', label: '2. Service Account & IAM' },
                  { id: 'worker', label: '3. Cloud Run / Worker ADC' },
                  { id: 'env', label: '4. Public vs Private Config' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSetupGuideTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      setupGuideTab === tab.id
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Body */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs leading-relaxed text-stone-300">
                {setupGuideTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>सुरक्षा सिद्धांत: टोकन-मुक्त डिप्लॉयमेंट (Tokenless Deployment)</span>
                      </h4>
                      <p>
                        यह सिस्टम किसी भी <code>FIREBASE_TOKEN</code> या निजी की (private key) को ब्राउज़र,
                        लोकल स्टोरेज या डेटाबेस में स्टोर नहीं करता। इसके बजाय, यह Google Cloud की नेटिव पहचान प्रणाली
                        <strong> Application Default Credentials (ADC) / Workload Identity</strong> का उपयोग करता है।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 space-y-1">
                        <div className="font-bold text-emerald-400">✓ ब्राउज़र सुरक्षा (Zero Secret Exposure)</div>
                        <p className="text-[11px] text-stone-300">
                          एडमिन ब्राउज़र केवल ZIP अपलोड करता है और स्टेटस अपडेट प्राप्त करता है। ब्राउज़र को कभी भी डिप्लॉयमेंट क्रेडेंशियल्स प्राप्त नहीं होते।
                        </p>
                      </div>
                      <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 space-y-1">
                        <div className="font-bold text-blue-400">✓ ऑटोमैटिक सैंडबॉक्स आइसोलेशन</div>
                        <p className="text-[11px] text-stone-300">
                          अपलोड की गई ZIP को अस्थाई डायरेक्टरी में एक्सट्रैक्ट किया जाता है। पाथ ट्रैवर्सल (<code>../</code>) व निष्पादन योग्य फाइलों की तुरंत जांच होती है।
                        </p>
                      </div>
                      <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 space-y-1">
                        <div className="font-bold text-amber-400">✓ 100% सेफ ज़ीरो-डाउनटाइम फॉलबैक</div>
                        <p className="text-[11px] text-stone-300">
                          यदि <code>npm install</code> या <code>npm run build</code> में कोई त्रुटि आती है, तो प्रक्रिया वहीं रुक जाती है और वर्तमान लाइव वेबसाइट सुरक्षित रहती है।
                        </p>
                      </div>
                      <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 space-y-1">
                        <div className="font-bold text-purple-400">✓ PWA कम्पैटिबिलिटी व ऑटो-कैश</div>
                        <p className="text-[11px] text-stone-300">
                          सफल डिप्लॉयमेंट के पश्चात सर्विस वर्कर ऑटोमैटिकली नया वर्शन पहचानकर सभी उपयोगकर्ताओं को बिना डेटा मिटाए अपडेट कर देता है।
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {setupGuideTab === 'iam' && (
                  <div className="space-y-4">
                    <p>
                      अपने Google Cloud प्रोजेक्ट <code>hardinkaam-5cc6a</code> में न्यूनतम आवश्यक अनुमतियों वाला
                      Service Account बनाने के लिए नीचे दिए गए <code>gcloud</code> कमांड निष्पादित करें:
                    </p>

                    {/* Step 1 Code Block */}
                    <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-stone-400 font-mono text-[11px]">
                        <span># 1. सर्विस अकाउंट बनाएं (Create Service Account)</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `gcloud iam service-accounts create hardinkaam-deployer \\\n  --project=hardinkaam-5cc6a \\\n  --display-name="HARDINKAAM Deployment Worker"`,
                              'cmd1'
                            )
                          }
                          className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-sans"
                        >
                          {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCmd === 'cmd1' ? 'कॉपी हो गया' : 'कमांड कॉपी करें'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[11px] text-emerald-400 bg-black/40 p-3 rounded-xl overflow-x-auto">
{`gcloud iam service-accounts create hardinkaam-deployer \\
  --project=hardinkaam-5cc6a \\
  --display-name="HARDINKAAM Deployment Worker"`}
                      </pre>
                    </div>

                    {/* Step 2 Code Block */}
                    <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-stone-400 font-mono text-[11px]">
                        <span># 2. आवश्यक न्यूनतम IAM रोल्स असाइन करें (Assign Minimum IAM Roles)</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `# Firebase Hosting Admin Role\ngcloud projects add-iam-policy-binding hardinkaam-5cc6a \\\n  --member="serviceAccount:hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com" \\\n  --role="roles/firebasehosting.admin"\n\n# Service Usage Consumer Role\ngcloud projects add-iam-policy-binding hardinkaam-5cc6a \\\n  --member="serviceAccount:hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com" \\\n  --role="roles/serviceusage.serviceUsageConsumer"`,
                              'cmd2'
                            )
                          }
                          className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-sans"
                        >
                          {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCmd === 'cmd2' ? 'कॉपी हो गया' : 'कमांड कॉपी करें'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[11px] text-emerald-400 bg-black/40 p-3 rounded-xl overflow-x-auto">
{`# 1. Firebase Hosting Admin Role (डिप्लॉयमेंट अनुमति)
gcloud projects add-iam-policy-binding hardinkaam-5cc6a \\
  --member="serviceAccount:hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com" \\
  --role="roles/firebasehosting.admin"

# 2. Service Usage Consumer (API अनुमति)
gcloud projects add-iam-policy-binding hardinkaam-5cc6a \\
  --member="serviceAccount:hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com" \\
  --role="roles/serviceusage.serviceUsageConsumer"`}
                      </pre>
                    </div>
                  </div>
                )}

                {setupGuideTab === 'worker' && (
                  <div className="space-y-4">
                    <p>
                      जब आपका बैकएंड Cloud Run कंटेनर में चलता है, तो यह सर्विस अकाउंट पहचान (Service Identity) के माध्यम से बिना किसी टोकन के सीधे Firebase Hosting पर डिप्लॉय करता है:
                    </p>

                    <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-stone-400 font-mono text-[11px]">
                        <span># Cloud Run सर्विस को Service Account असाइन करें</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `gcloud run services update hardinkaam-backend \\\n  --project=hardinkaam-5cc6a \\\n  --region=asia-south1 \\\n  --service-account=hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com`,
                              'cmd3'
                            )
                          }
                          className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-sans"
                        >
                          {copiedCmd === 'cmd3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCmd === 'cmd3' ? 'कॉपी हो गया' : 'कमांड कॉपी करें'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[11px] text-emerald-400 bg-black/40 p-3 rounded-xl overflow-x-auto">
{`gcloud run services update hardinkaam-backend \\
  --project=hardinkaam-5cc6a \\
  --region=asia-south1 \\
  --service-account=hardinkaam-deployer@hardinkaam-5cc6a.iam.gserviceaccount.com`}
                      </pre>
                    </div>

                    <div className="bg-stone-800/50 p-4 rounded-2xl border border-stone-700/50 space-y-2">
                      <h4 className="font-bold text-white">कार्यप्रणाली (How it works):</h4>
                      <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px]">
                        <li>एडमिन ZIP अपलोड करता है → बैकएंड ZIP को सैंडबॉक्स में एक्सट्रैक्ट करता है।</li>
                        <li>बैकएंड <code>npm ci</code> / <code>npm install</code> तथा <code>npm run build</code> चलाता है।</li>
                        <li><code>dist/index.html</code> की अखंडता सत्यापित की जाती है।</li>
                        <li>
                          बैकएंड <code>npx firebase-tools deploy --only hosting --project hardinkaam-5cc6a --non-interactive</code> चलाता है। Cloud Run का ADC वातावरण स्वचालित रूप से पहचान प्रमाणित करता है।
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

                {setupGuideTab === 'env' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-sm">कॉन्फ़िगरेशन पृथक्करण (Config Separation):</h4>
                      <p className="text-stone-300">
                        सुरक्षा नियमों के अनुसार पब्लिक कॉन्फ़िग और प्राइवेट सर्वर कॉन्फ़िग को पूरी तरह अलग रखा गया है:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                        <div className="font-bold text-emerald-400 text-xs uppercase tracking-wider">
                          🌐 पब्लिक फ्रंटएंड कॉन्फ़िग (Vite Client)
                        </div>
                        <ul className="space-y-1 font-mono text-[11px] text-stone-300">
                          <li>• VITE_ADSENSE_CLIENT_ID</li>
                          <li>• VITE_RAZORPAY_KEY_ID</li>
                          <li>• Firebase Client Config (apiKey, projectId)</li>
                        </ul>
                        <p className="text-[10px] text-stone-400 mt-2">
                          ये मान ब्राउज़र में सुरक्षित रूप से प्रदर्शित होते हैं।
                        </p>
                      </div>

                      <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                        <div className="font-bold text-orange-400 text-xs uppercase tracking-wider">
                          🔒 प्राइवेट सर्वर कॉन्फ़िग (Server Secret)
                        </div>
                        <ul className="space-y-1 font-mono text-[11px] text-stone-300">
                          <li>• GEMINI_API_KEY</li>
                          <li>• RAZORPAY_KEY_SECRET</li>
                          <li>• MAX_DEPLOY_ZIP_SIZE_MB=80</li>
                          <li>• Google ADC / Service Identity</li>
                        </ul>
                        <p className="text-[10px] text-stone-400 mt-2">
                          ये मान कभी भी ब्राउज़र को नहीं भेजे जाते।
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                <div className="text-[11px] text-stone-400">
                  Target Project: <span className="font-bold text-white">hardinkaam-5cc6a</span> (Site: https://hardinkaam-5cc6a.web.app)
                </div>
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                >
                  समझ गया (Done)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
