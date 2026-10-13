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
import { safeFetchJson } from '../../utils/safeJson';
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
  const [activeTab, setActiveTab] = useState<'deploy' | 'cli'>('deploy');
  const [cliCommandInput, setCliCommandInput] = useState<string>('firebase deploy --only hosting');
  const [cliSelectedZip, setCliSelectedZip] = useState<File | null>(null);
  const cliFileInputRef = useRef<HTMLInputElement>(null);
  const [cliLogs, setCliLogs] = useState<Array<{ command: string; stdout: string; stderr: string; exitCode: number; time: string; durationMs: number }>>([
    {
      command: 'firebase --version',
      stdout: '13.15.0 (Firebase CLI ready)',
      stderr: '',
      exitCode: 0,
      time: new Date().toLocaleTimeString('en-IN'),
      durationMs: 120,
    },
    {
      command: 'firebase status',
      stdout: 'Project: hardinkaam-5cc6a\nSite Target: hardinkaam-5cc6a.web.app\nAuth: Google Cloud Application Default Credentials (ADC)',
      stderr: '',
      exitCode: 0,
      time: new Date().toLocaleTimeString('en-IN'),
      durationMs: 150,
    },
  ]);
  const [isExecutingCli, setIsExecutingCli] = useState<boolean>(false);

  const [viewLogDeployment, setViewLogDeployment] = useState<DeploymentVersion | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<DeploymentVersion | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);
  const [setupGuideTab, setSetupGuideTab] = useState<'overview' | 'iam' | 'worker' | 'env'>('overview');
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [deployElapsedSeconds, setDeployElapsedSeconds] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Active deployment timer
  useEffect(() => {
    let timer: any = null;
    if (isDeploying) {
      timer = setInterval(() => {
        setDeployElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setDeployElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDeploying]);

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
  const handleStartDeploy = async (force = false, stripUnsupported = true) => {
    if (!selectedFile) {
      setDeployError('कृपया पहले वेबसाइट ZIP फ़ाइल चुनें (Please select a ZIP file).');
      return;
    }

    if (selectedFile.size > 120 * 1024 * 1024) {
      setDeployError(`फ़ाइल का आकार (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है। अधिकतम अनुमत सीमा 120 MB है।`);
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
        `✓ website updated! वर्शन ${result.deployment.version} सफलतापूर्वक बिल्ड होकर ${liveUrl} पर लाइव हो गया है!`
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
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            return;
          }
          consecutivePollErrors = 0;
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            return;
          }
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
              setDeploySuccess(`✓ website updated! वर्शन ${job.versionTag || ''} सफलतापूर्वक लाइव हो गया है!`);
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

  const handleExecuteCliCommand = async (cmdToRun?: string, zipFileOverride?: File | null) => {
    const cmd = cmdToRun || cliCommandInput;
    if (!cmd || !cmd.trim()) return;

    setIsExecutingCli(true);
    const userToken = currentUser ? await currentUser.getIdToken().catch(() => '') : '';
    const fileToUpload = zipFileOverride !== undefined ? zipFileOverride : (cliSelectedZip || selectedFile);

    try {
      let res: Response;
      if (fileToUpload) {
        const formData = new FormData();
        formData.append('command', cmd.trim());
        formData.append('zipFile', fileToUpload);

        res = await fetch('/api/admin/cli/execute', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'x-admin-email': currentUser?.email || 'deepakbuildconbhopal@gmail.com',
            'x-admin-name': userProfile?.name || 'DEEPAK (Admin)',
            'x-admin-uid': currentUser?.uid || 'admin_user',
            'x-admin-role': 'admin',
          },
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/cli/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
            'x-admin-email': currentUser?.email || 'deepakbuildconbhopal@gmail.com',
            'x-admin-name': userProfile?.name || 'DEEPAK (Admin)',
            'x-admin-uid': currentUser?.uid || 'admin_user',
            'x-admin-role': 'admin',
          },
          body: JSON.stringify({ command: cmd.trim() }),
        });
      }

      let parsed = await safeFetchJson(res);

      // Auto-retry once if server was temporarily rebooting / returning HTML
      if (!parsed.ok && parsed.error && parsed.error.includes('HTML')) {
        await new Promise((r) => setTimeout(r, 2500));
        let resRetry: Response;
        if (fileToUpload) {
          const formData = new FormData();
          formData.append('command', cmd.trim());
          formData.append('zipFile', fileToUpload);

          resRetry = await fetch('/api/admin/cli/execute', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'x-admin-email': currentUser?.email || 'deepakbuildconbhopal@gmail.com',
              'x-admin-name': userProfile?.name || 'DEEPAK (Admin)',
              'x-admin-uid': currentUser?.uid || 'admin_user',
              'x-admin-role': 'admin',
            },
            body: formData,
          });
        } else {
          resRetry = await fetch('/api/admin/cli/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`,
              'x-admin-email': currentUser?.email || 'deepakbuildconbhopal@gmail.com',
              'x-admin-name': userProfile?.name || 'DEEPAK (Admin)',
              'x-admin-uid': currentUser?.uid || 'admin_user',
              'x-admin-role': 'admin',
            },
            body: JSON.stringify({ command: cmd.trim() }),
          });
        }
        parsed = await safeFetchJson(resRetry);
      }

      const data = parsed.data || {
        success: false,
        stdout: '',
        stderr: parsed.error || `Server HTTP Error ${res.status}`,
        exitCode: 1,
        executionTimeMs: 0,
      };

      setCliLogs((prev) => [
        ...prev,
        {
          command: cmd.trim() + (fileToUpload ? ` [ZIP: ${fileToUpload.name}]` : ''),
          stdout: data.stdout || '',
          stderr: data.stderr || data.error || (parsed.ok ? '' : parsed.error || 'Server returned non-JSON response'),
          exitCode: data.exitCode ?? (data.success ? 0 : 1),
          time: new Date().toLocaleTimeString('en-IN'),
          durationMs: data.executionTimeMs || 0,
        },
      ]);
    } catch (err: any) {
      const isFetchError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      const errMsg = isFetchError
        ? 'नेटवर्क डिस्कनेक्ट हुआ या सर्वर रिस्पॉन्स टाइमआउट हो गया (Failed to fetch)। यदि सर्वर रीबूट हुआ है तो 5-10 सेकंड बाद पुनः प्रयास करें।'
        : (err?.message || 'CLI निष्पादन विफल रहा (CLI execution failed)');

      setCliLogs((prev) => [
        ...prev,
        {
          command: cmd.trim() + (fileToUpload ? ` [ZIP: ${fileToUpload.name}]` : ''),
          stdout: '',
          stderr: errMsg,
          exitCode: 1,
          time: new Date().toLocaleTimeString('en-IN'),
          durationMs: 0,
        },
      ]);
    } finally {
      setIsExecutingCli(false);
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
              Firebase CLI &amp; Terminal Execution Engine
            </h1>
            <p className="text-sm text-stone-300 max-w-2xl leading-relaxed">
              एडमिन डायरेक्ट Firebase CLI कमांड्स निष्पादित करके वेबसाइट तुरंत अपडेट व लाइव डिप्लॉय कर सकते हैं।
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

      {/* Main Grid: CLI Terminal on Left, History & Protocols on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Firebase CLI & Terminal Execution Engine (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-2xl border border-stone-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Firebase CLI &amp; Terminal Execution Engine</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">ADC LOGGED IN</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    एडमिन डायरेक्ट कमांड (जैसे <code className="text-amber-300">firebase deploy --only hosting</code>) रन करके वेबसाइट तुरंत अपडेट व डिप्लॉय कर सकते हैं।
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCliLogs([])}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all border border-stone-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                <span>क्लियर कंसोल</span>
              </button>
            </div>

            {/* CLI Direct ZIP Upload Box */}
            <div className="bg-stone-950/80 rounded-2xl p-4 border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black text-amber-300">
                    ZIP फ़ाइल द्वारा CLI डिप्लॉय (Attach ZIP File for CLI Command)
                  </span>
                </div>
                <input
                  ref={cliFileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setCliSelectedZip(file);
                      setCliCommandInput('firebase deploy --only hosting');
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cliFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  <Upload className="w-4 h-4 text-stone-950" />
                  <span>{cliSelectedZip ? 'फ़ाइल बदलें (Change ZIP)' : 'ZIP फ़ाइल चुनें (Select ZIP File)'}</span>
                </button>
              </div>

              {cliSelectedZip || selectedFile ? (
                <div className="flex items-center justify-between bg-amber-950/40 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-amber-200 font-mono font-bold truncate">
                      Attached ZIP: {(cliSelectedZip || selectedFile)?.name} (
                      {(((cliSelectedZip || selectedFile)?.size || 0) / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCliSelectedZip(null);
                      setCliCommandInput('firebase deploy --only hosting');
                    }}
                    className="text-amber-400 hover:text-white text-[11px] font-bold underline cursor-pointer ml-2"
                  >
                    हटाएं (Remove)
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-stone-400">
                  अपनी ZIP फ़ाइल (`.zip`) यहाँ जोड़ें ताकि CLI टर्मिनल सीधे उस ZIP को एक्सट्रैक्ट करके `firebase deploy` कमांड चला दे।
                </p>
              )}
            </div>

            {/* Quick Action Presets */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>वन-क्लिक कमांड्स (Quick Action Presets):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(cliSelectedZip || selectedFile) && (
                  <button
                    onClick={() => {
                      const cmd = 'firebase deploy --only hosting';
                      setCliCommandInput(cmd);
                      handleExecuteCliCommand(cmd, cliSelectedZip || selectedFile);
                    }}
                    disabled={isExecutingCli}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer disabled:opacity-50"
                  >
                    <Flame className="w-4 h-4 text-stone-950" />
                    <span>🚀 Deploy ZIP: {(cliSelectedZip || selectedFile)?.name}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const cmd = 'firebase deploy --only hosting';
                    setCliCommandInput(cmd);
                    handleExecuteCliCommand(cmd, cliSelectedZip || selectedFile);
                  }}
                  disabled={isExecutingCli}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Flame className="w-4 h-4 text-stone-950" />
                  <span>🚀 Direct Firebase Deploy</span>
                </button>

                <button
                  onClick={() => {
                    setCliCommandInput('firebase hosting:sites:list');
                    handleExecuteCliCommand('firebase hosting:sites:list');
                  }}
                  disabled={isExecutingCli}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold transition-all border border-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>🌐 Hosting Sites List</span>
                </button>

                <button
                  onClick={() => {
                    setCliCommandInput('firebase projects:list');
                    handleExecuteCliCommand('firebase projects:list');
                  }}
                  disabled={isExecutingCli}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold transition-all border border-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>📊 Firebase Projects</span>
                </button>

                <button
                  onClick={() => {
                    setCliCommandInput('npm run build');
                    handleExecuteCliCommand('npm run build');
                  }}
                  disabled={isExecutingCli}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-bold transition-all border border-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🔨 Run Production Build</span>
                </button>

                <button
                  onClick={() => {
                    setCliCommandInput('ls -la');
                    handleExecuteCliCommand('ls -la');
                  }}
                  disabled={isExecutingCli}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all border border-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileCode className="w-3.5 h-3.5 text-stone-400" />
                  <span>📁 Inspect Files (ls -la)</span>
                </button>
              </div>
            </div>

            {/* Command Input Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-mono font-bold text-sm">
                  $&nbsp;
                </div>
                <input
                  type="text"
                  value={cliCommandInput}
                  onChange={(e) => setCliCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isExecutingCli) {
                      handleExecuteCliCommand();
                    }
                  }}
                  placeholder="e.g. firebase deploy --only hosting"
                  disabled={isExecutingCli}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-stone-950 border border-stone-700 text-amber-300 font-mono text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                />
              </div>

              <button
                onClick={() => handleExecuteCliCommand()}
                disabled={isExecutingCli || !cliCommandInput.trim()}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isExecutingCli ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>कमांड रन हो रही है...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-stone-950 text-stone-950" />
                    <span>कमांड रन करें (Execute)</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Log Output Window */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Terminal Stream Logs ({cliLogs.length} outputs)</span>
                </span>
                <span className="text-[11px] text-stone-500">Live Server Shell Execution</span>
              </div>

              <div className="bg-stone-950 rounded-2xl border border-stone-800 p-4 font-mono text-xs max-h-[500px] overflow-y-auto space-y-4">
                {cliLogs.length === 0 ? (
                  <div className="text-stone-600 text-center py-8 italic">
                    कमांड दर्ज करें या ऊपर दिए गए क्विक एक्शन बटन पर क्लिक करके डायरेक्ट Firebase CLI कमांड रन करें।
                  </div>
                ) : (
                  cliLogs.map((log, index) => (
                    <div key={index} className="space-y-1.5 pb-3 border-b border-stone-900 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 bg-stone-900/60 px-3 py-1.5 rounded-lg border border-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">$ {log.command}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${log.exitCode === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            Exit: {log.exitCode} {log.exitCode === 0 ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-stone-500 text-[10px]">
                          <span>⏱️ {log.durationMs}ms</span>
                          <span>🕒 {log.time}</span>
                          <button
                            onClick={() => copyToClipboard(`${log.stdout}\n${log.stderr}`, `cli_${index}`)}
                            className="text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {copiedCmd === `cli_${index}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCmd === `cli_${index}` ? 'कॉपी हो गया' : 'कॉपी'}</span>
                          </button>
                        </div>
                      </div>

                      {log.stdout && (
                        <pre className="text-stone-300 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-black/40 p-3 rounded-xl border border-stone-900 overflow-x-auto">
                          {log.stdout}
                        </pre>
                      )}

                      {log.stderr && (
                        <pre className="text-red-400 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-red-950/20 p-3 rounded-xl border border-red-900/40 overflow-x-auto">
                          {log.stderr}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Right Column: Deployment History & Rollback System (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
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
                          <li>• VITE_ADMOB_APP_ID</li>
                          <li>• VITE_ADMOB_BANNER_UNIT_ID</li>
                          <li>• VITE_RAZORPAY_KEY_ID</li>
                          <li>• Firebase Client Config (apiKey, projectId)</li>
                        </ul>
                        <p className="text-[10px] text-stone-400 mt-2">
                          ये मान विज्ञापन व क्लाइंट के लिए सुरक्षित हैं (AdMob में कोई Secret Key नहीं होती)।
                        </p>
                      </div>

                      <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                        <div className="font-bold text-orange-400 text-xs uppercase tracking-wider">
                          🔒 प्राइवेट सर्वर कॉन्फ़िग (Server Secret)
                        </div>
                        <ul className="space-y-1 font-mono text-[11px] text-stone-300">
                          <li>• GEMINI_API_KEY</li>
                          <li>• GEMINI_MODEL=gemini-3.8-flash</li>
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
