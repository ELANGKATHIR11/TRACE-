import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sliders,
  Settings,
  Cpu,
  Brain,
  HardDrive,
  Activity,
  Shield,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  RotateCcw,
  Sparkles,
  Lock,
  Layers,
  FileText,
  AlertCircle,
  Database,
  Server,
  Terminal,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTraceStore } from '../../lib/store';
import { api } from '../../lib/api-client';

type SettingsTab =
  | 'general'
  | 'models'
  | 'training'
  | 'processing'
  | 'health'
  | 'retention'
  | 'security'
  | 'audit';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as SettingsTab) || 'general';

  const { state } = useTraceStore();
  const isInstitutionUser =
    state.currentUser.role === 'institution_compliance_officer' ||
    state.currentUser.role === 'institution_administrator';
  const isAuditor = state.currentUser.role === 'auditor';
  const isReadOnly = isInstitutionUser || isAuditor;

  // General Settings State
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalData, setGeneralData] = useState<any>({
    appName: 'TRACE — Regulatory Assurance & Compliance Engine',
    environmentLabel: 'Production GovTech (Statutory AY 2026-27)',
    defaultAcademicYear: '2026-27',
    defaultLanguage: 'en-IN',
    timezone: 'Asia/Kolkata',
    maxUploadSizeBytes: 26214400,
    maxPagesPerDoc: 50,
    allowedDocFormats: ['PDF', 'PNG', 'JPEG', 'TIFF'],
    docProcessingTimeoutSeconds: 60,
    documentRetentionDays: 1825,
    maintenanceMode: false,
  });

  // Processing Settings State
  const [processingLoading, setProcessingLoading] = useState(false);
  const [processingData, setProcessingData] = useState<any>({
    ocrLanguages: ['eng', 'hin'],
    ocrTimeoutSeconds: 45,
    renderDpi: 200,
    batchSize: 4,
    maxConcurrentJobs: 2,
    retryPolicyMaxRetries: 2,
    cacheEnabled: true,
    cacheInvalidationPolicy: 'On Document Remediated',
    runOptionalMlAnalysis: true,
  });

  // Retention Settings State
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionData, setRetentionData] = useState<any>({
    reminderLeadDays: 7,
    escalationIntervalHours: 48,
    notificationRetryLimit: 3,
    processingJobRetentionDays: 90,
    auditLogRetentionDays: 3650,
  });

  // Models State
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [selectedModelForEval, setSelectedModelForEval] = useState<any>(null);

  // Centralized Ollama Gateway & Qdrant VRAG/MRAG State
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [vragStatus, setVragStatus] = useState<any>(null);
  const [pullModelName, setPullModelName] = useState<string>('nomic-embed-text');
  const [pullLoading, setPullLoading] = useState<boolean>(false);
  const [reindexLoading, setReindexLoading] = useState<boolean>(false);

  // Training & Dataset State
  const [datasetsList, setDatasetsList] = useState<any[]>([]);
  const [cliManifest, setCliManifest] = useState<any>(null);
  const [datasetCmdLoading, setDatasetCmdLoading] = useState<string | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobData, setActiveJobData] = useState<any>(null);
  const [trainingConfig, setTrainingConfig] = useState({
    modelId: 'doc-layout-cnn',
    datasetId: 'dataset-doclayout-v2',
    epochs: 10,
    learningRate: 0.001,
    batchSize: 32,
  });

  // Health & Storage State
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);

  // Audit State
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Fetch initial general settings
  const loadGeneralSettings = useCallback(async () => {
    try {
      setGeneralLoading(true);
      const res = await api.getSettings();
      if (res.settings) {
        setGeneralData({
          ...res.settings,
          allowedDocFormats:
            typeof res.settings.allowedDocFormats === 'string'
              ? JSON.parse(res.settings.allowedDocFormats)
              : res.settings.allowedDocFormats || ['PDF', 'PNG', 'JPEG'],
        });
      }
    } catch (err: any) {
      toast.error(`Failed to load general settings: ${err.message}`);
    } finally {
      setGeneralLoading(false);
    }
  }, []);

  // Fetch processing settings
  const loadProcessingSettings = useCallback(async () => {
    try {
      setProcessingLoading(true);
      const res = await api.getProcessingSettings();
      if (res) {
        setProcessingData({
          ...res,
          ocrLanguages: Array.isArray(res.ocrLanguages)
            ? res.ocrLanguages
            : JSON.parse(res.ocrLanguages || '["eng","hin"]'),
        });
      }
    } catch (err: any) {
      toast.error(`Failed to load processing settings: ${err.message}`);
    } finally {
      setProcessingLoading(false);
    }
  }, []);

  // Fetch models
  const loadModels = useCallback(async () => {
    try {
      setModelsLoading(true);
      const [res, ollamaRes, vragRes] = await Promise.all([
        api.getMlModels(),
        api.getOllamaGatewayStatus(false).catch(() => null),
        api.getVragMragStatus().catch(() => null),
      ]);
      setModelsList(res.models || []);
      setHardwareInfo(res.hardware || null);
      if (ollamaRes) setOllamaStatus(ollamaRes);
      if (vragRes) setVragStatus(vragRes);
    } catch (err: any) {
      toast.error(`Failed to load ML models: ${err.message}`);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const handlePullOllamaModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !pullModelName.trim()) return;
    try {
      setPullLoading(true);
      toast.info(`User-initiated Ollama pull started for '${pullModelName}'...`);
      const res = await api.pullOllamaModel(pullModelName.trim());
      if (res.success) {
        toast.success(`Successfully pulled '${pullModelName}' into local Ollama.`);
        const updatedOllama = await api.getOllamaGatewayStatus(true);
        setOllamaStatus(updatedOllama);
      } else {
        toast.error(`Ollama pull failed: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Ollama pull failed: ${err.message}`);
    } finally {
      setPullLoading(false);
    }
  };

  const handleReindexQdrant = async () => {
    if (isReadOnly) return;
    try {
      setReindexLoading(true);
      toast.info('Re-indexing regulatory clauses, documents, and authorized records in Qdrant...');
      const res = await api.reindexVragMrag();
      if (res.status) setVragStatus(res.status);
      toast.success(
        `Indexed ${res.clausesIndexed} clauses, ${res.documentsIndexed} documents, and ${res.authorizedRecordsIndexed} institutional records.`
      );
    } catch (err: any) {
      toast.error(`Qdrant re-indexing failed: ${err.message}`);
    } finally {
      setReindexLoading(false);
    }
  };

  // Fetch training & datasets
  const loadTrainingData = useCallback(async () => {
    try {
      const [dsRes, histRes, storRes] = await Promise.all([
        api.getDatasets(),
        api.getTrainingHistory(),
        api.getSystemStorage(),
      ]);
      setDatasetsList(dsRes.datasets || []);
      setCliManifest(dsRes.cliManifest || null);
      setTrainingHistory(histRes.jobs || []);
      setStorageData(storRes);

      // Check for any currently running job in history
      const runningJob = histRes.jobs?.find((j: any) => j.status === 'Running' || j.status === 'Queued');
      if (runningJob && !activeJobId) {
        setActiveJobId(runningJob.id);
      }
    } catch (err: any) {
      console.warn('[Settings] Failed loading training data:', err);
    }
  }, [activeJobId]);

  // Fetch health
  const loadHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const [hRes, sRes] = await Promise.all([api.getSystemHealth(), api.getSystemStorage()]);
      setHealthData(hRes);
      setStorageData(sRes);
    } catch (err: any) {
      toast.error(`Health check failed: ${err.message}`);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch audit
  const loadAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await api.getSettingsAudit();
      setAuditEvents(res.events || []);
    } catch (err: any) {
      toast.error(`Failed to load settings audit: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Poll active training job if one is running
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await api.getTrainingJob(activeJobId);
        if (isMounted && res.job) {
          setActiveJobData(res.job);
          if (res.job.status === 'Completed' || res.job.status === 'Failed' || res.job.status === 'Cancelled') {
            loadTrainingData();
            loadModels();
          }
        }
      } catch (e) {
        console.warn('[Training Poll Error]', e);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId, loadTrainingData, loadModels]);

  useEffect(() => {
    if (currentTab === 'general') loadGeneralSettings();
    if (currentTab === 'models') loadModels();
    if (currentTab === 'training') loadTrainingData();
    if (currentTab === 'processing') loadProcessingSettings();
    if (currentTab === 'health') loadHealth();
    if (currentTab === 'retention') loadGeneralSettings();
    if (currentTab === 'audit') loadAudit();
  }, [
    currentTab,
    loadGeneralSettings,
    loadModels,
    loadTrainingData,
    loadProcessingSettings,
    loadHealth,
    loadAudit,
  ]);

  const handleTabChange = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  // Handlers for General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      setGeneralLoading(true);
      const res = await api.updateGeneralSettings(generalData);
      toast.success(res.message || 'General settings saved.');
      loadGeneralSettings();
    } catch (err: any) {
      toast.error(`Failed to update general settings: ${err.message}`);
    } finally {
      setGeneralLoading(false);
    }
  };

  // Handlers for Processing Settings
  const handleSaveProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      setProcessingLoading(true);
      const res = await api.updateProcessingSettings(processingData);
      toast.success(res.message || 'Processing settings updated.');
      loadProcessingSettings();
    } catch (err: any) {
      toast.error(`Failed to update processing settings: ${err.message}`);
    } finally {
      setProcessingLoading(false);
    }
  };

  // Handlers for Retention Settings
  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      setRetentionLoading(true);
      const res = await api.updateRetentionSettings(retentionData);
      toast.success(res.message || 'Retention policies saved.');
      loadGeneralSettings();
    } catch (err: any) {
      toast.error(`Failed to save retention settings: ${err.message}`);
    } finally {
      setRetentionLoading(false);
    }
  };

  // Handlers for Models
  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    if (isReadOnly) return;
    try {
      if (currentEnabled) {
        await api.disableModel(modelId);
        toast.warning(`Model ${modelId} disabled. Deterministic manual fallback activated.`);
      } else {
        await api.enableModel(modelId);
        toast.success(`Model ${modelId} enabled for live inference.`);
      }
      loadModels();
    } catch (err: any) {
      toast.error(`Failed to toggle model: ${err.message}`);
    }
  };

  const handleReloadModel = async (modelId: string) => {
    if (isReadOnly) return;
    try {
      toast.info(`Reloading model weights for ${modelId}...`);
      const res = await api.reloadModel(modelId);
      toast.success(res.message || `Model ${modelId} successfully reloaded into memory.`);
      loadModels();
    } catch (err: any) {
      toast.error(`Failed to reload model: ${err.message}`);
    }
  };

  const handleEvaluateModel = async (modelId: string) => {
    if (isReadOnly) return;
    try {
      toast.info(`Running test evaluation on held-out test split for ${modelId}...`);
      const res = await api.evaluateModel(modelId);
      setSelectedModelForEval(res.evaluation);
      toast.success(`Evaluation complete. Measured accuracy: ${(res.evaluation.accuracy * 100).toFixed(2)}%`);
      loadModels();
    } catch (err: any) {
      toast.error(`Model evaluation failed: ${err.message}`);
    }
  };

  const handleRestoreModel = async (modelId: string) => {
    if (isReadOnly) return;
    if (!window.confirm(`Are you sure you want to rollback ${modelId} to its previous validated version?`)) return;
    try {
      const res = await api.restoreModel(modelId);
      toast.success(res.message);
      loadModels();
    } catch (err: any) {
      toast.error(`Failed to rollback model: ${err.message}`);
    }
  };

  // Handlers for Training
  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const res = await api.startTraining(trainingConfig);
      toast.success(res.message || `Training job ${res.jobId} started.`);
      setActiveJobId(res.jobId);
      loadTrainingData();
    } catch (err: any) {
      toast.error(`Failed to start training: ${err.message}`);
    }
  };

  const handleCancelTraining = async (jobId: string) => {
    if (isReadOnly) return;
    try {
      await api.cancelTrainingJob(jobId);
      toast.info(`Training job ${jobId} cancellation requested.`);
      loadTrainingData();
    } catch (err: any) {
      toast.error(`Failed to cancel job: ${err.message}`);
    }
  };

  const handleActivateModelFromJob = async (modelId: string, version: string, metrics: any) => {
    if (isReadOnly) return;
    try {
      await api.activateModel(modelId, version, metrics);
      toast.success(`Model version ${version} is now LIVE for document verification.`);
      loadModels();
      handleTabChange('models');
    } catch (err: any) {
      toast.error(`Failed to activate model: ${err.message}`);
    }
  };

  const navTabs: { id: SettingsTab; label: string; icon: any; count?: number }[] = [
    { id: 'general', label: 'General Application', icon: Settings },
    { id: 'models', label: 'ML / DL Models', icon: Brain, count: modelsList.length },
    { id: 'training', label: 'Training & Datasets', icon: Cpu },
    { id: 'processing', label: 'Document Pipeline', icon: Layers },
    { id: 'health', label: 'Backend & Integrations', icon: Activity },
    { id: 'retention', label: 'Alerts & Retention', icon: Clock },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'audit', label: 'Configuration Audit', icon: History, count: auditEvents.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>SYSTEM CONTROL CENTER</span>
            <span>·</span>
            <span>REGULATORY ASSURANCE ARCHITECTURE</span>
            <span>·</span>
            <span className="font-mono text-[#0F766E]">AY 2026-27</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Settings & System Control Center
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Centralized management of application parameters, ML/DL model lifecycle, document processing limits, and hardware-accelerated health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isReadOnly ? (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              Restricted Access: Read-Only ({state.currentUser.roleLabel})
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Elevated Admin Privileges ({state.currentUser.roleLabel})
            </div>
          )}
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left-side Navigation Rail */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1">
            Control Domains
          </div>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#0F766E]'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Hardware Summary Widget */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#0F766E]" />
              Compute Target
            </div>
            <div className="text-[11px] font-mono text-slate-600 space-y-1">
              <div>GPU: RTX 5060 Laptop</div>
              <div>CUDA: 13.0 (PyTorch 2.14)</div>
              <div>Ollama: Qwen2.5 1.5B (Offline)</div>
              <div>PostgreSQL: Port 5433 (Native)</div>
            </div>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 min-w-0">
          {/* TAB 1: GENERAL APPLICATION SETTINGS */}
          {currentTab === 'general' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    General Application Settings
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Configure institutional display parameters, upload constraints, statutory academic year, and maintenance modes.
                  </p>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Application Display Name
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={generalData.appName}
                        onChange={(e) => setGeneralData({ ...generalData, appName: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Applies immediately across all browser sessions.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Environment Label
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={generalData.environmentLabel}
                        onChange={(e) => setGeneralData({ ...generalData, environmentLabel: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Displayed on top banner and official export reports.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Default Academic Year
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={generalData.defaultAcademicYear}
                        onChange={(e) => setGeneralData({ ...generalData, defaultAcademicYear: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      >
                        <option value="2026-27">AY 2026-27 (Current Cycle)</option>
                        <option value="2025-26">AY 2025-26</option>
                        <option value="2024-25">AY 2024-25</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Default Locale
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={generalData.defaultLanguage}
                        onChange={(e) => setGeneralData({ ...generalData, defaultLanguage: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      >
                        <option value="en-IN">English (India) — en-IN</option>
                        <option value="hi-IN">Hindi — hi-IN</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Timezone
                      </label>
                      <input
                        type="text"
                        disabled
                        value={generalData.timezone}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Max Upload Size (MB)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={Math.round(generalData.maxUploadSizeBytes / (1024 * 1024))}
                        onChange={(e) =>
                          setGeneralData({
                            ...generalData,
                            maxUploadSizeBytes: Math.max(1, parseInt(e.target.value) || 25) * 1024 * 1024,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Max Pages per Document
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={generalData.maxPagesPerDoc}
                        onChange={(e) =>
                          setGeneralData({ ...generalData, maxPagesPerDoc: parseInt(e.target.value) || 50 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Processing Timeout (Seconds)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={generalData.docProcessingTimeoutSeconds}
                        onChange={(e) =>
                          setGeneralData({
                            ...generalData,
                            docProcessingTimeoutSeconds: parseInt(e.target.value) || 60,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Maintenance Mode Toggle */}
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">Application Maintenance Mode</div>
                      <div className="text-[11px] text-slate-500">
                        When enabled, intake submission and document upload will be temporarily held. Scrutiny lead reviews remain accessible.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={generalData.maintenanceMode}
                      onChange={(e) => setGeneralData({ ...generalData, maintenanceMode: e.target.checked })}
                      className="h-4 w-4 accent-[#0F766E]"
                    />
                  </div>

                  {!isReadOnly && (
                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={generalLoading}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors disabled:opacity-50"
                      >
                        {generalLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Save General Configuration
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: ML/DL MODEL MANAGEMENT */}
          {currentTab === 'models' && (
            <div className="space-y-6">
              {/* Centralized Native Local Ollama Gateway & Capability Matrix */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                      <Sparkles className="h-4 w-4" />
                      <span>CENTRALIZED NATIVE OLLAMA GATEWAY (SIH 26261 OLLAMA-ONLY AI RUNTIME)</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Discovered Local Ollama Models, Capability Routing & User-Controlled Model Pull
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      All operational AI/ML/DL inference, scanned-page VLM OCR, document classification, and RAG synthesis execute strictly through local Ollama (`http://localhost:11434`). Never silently downloads models.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ollamaStatus?.online
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {ollamaStatus?.online
                      ? `Ollama Online (${ollamaStatus.installedModels?.length || 0} Models)`
                      : 'Ollama Unreachable'}
                  </span>
                </div>

                {/* Capability Status Banner (Text, Vision VLM, Dense Embeddings) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center justify-between">
                      <span>Structured Text & Reasoning</span>
                      <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                        ACTIVE
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-[#0F766E]">
                      {ollamaStatus?.assignedRouting?.text || 'qwen2.5:1.5b-instruct'}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Fast Fallback: {ollamaStatus?.assignedRouting?.fast_text || 'qwen2.5:0.5b-instruct'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center justify-between">
                      <span>Vision / Scanned-Page VLM (VRAG)</span>
                      <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                        {ollamaStatus?.capabilitiesAvailable?.vision ? 'ACTIVE' : 'MODEL_UNAVAILABLE'}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-[#0F766E]">
                      {ollamaStatus?.assignedRouting?.vision || 'riven/smolvlm:latest'}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {ollamaStatus?.visionStatus?.message || 'Used for scanned-page OCR & VRAG visual page descriptions.'}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border p-3.5 space-y-1 ${
                      ollamaStatus?.capabilitiesAvailable?.embedding
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-amber-200 bg-amber-50/60'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Semantic Vector Embeddings (MRAG)</span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                          ollamaStatus?.capabilitiesAvailable?.embedding
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {ollamaStatus?.capabilitiesAvailable?.embedding ? 'ACTIVE' : 'MODEL_UNAVAILABLE'}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] font-semibold text-amber-900">
                      {ollamaStatus?.assignedRouting?.embedding ||
                        ollamaStatus?.embeddingStatus?.blockerCode ||
                        'EMBEDDING_CAPABILITY_UNAVAILABLE'}
                    </div>
                    <p className="text-[11px] text-slate-700">
                      {ollamaStatus?.embeddingStatus?.message ||
                        'Hybrid lexical/clause/identifier retrieval in Qdrant remains active.'}
                    </p>
                  </div>
                </div>

                {/* Discovered Installed Ollama Models Table */}
                {ollamaStatus?.installedModels?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                          <th className="py-2 px-3">Installed Model Name</th>
                          <th className="py-2 px-3">Family / Params</th>
                          <th className="py-2 px-3">Quantization</th>
                          <th className="py-2 px-3">Size</th>
                          <th className="py-2 px-3">Discovered Capabilities</th>
                          <th className="py-2 px-3">Context Window</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {ollamaStatus.installedModels.map((om: any) => (
                          <tr key={om.name} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{om.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {om.family} · {om.parameterSize}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">{om.quantizationLevel}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{om.sizeFormatted}</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(om.capabilities || []).map((cap: string) => (
                                  <span
                                    key={cap}
                                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                      cap === 'vision'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-teal-50 text-[#0F766E]'
                                    }`}
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {om.contextLength?.toLocaleString()} tokens
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* User-Controlled Model Installation Option */}
                {!isReadOnly && (
                  <form
                    onSubmit={handlePullOllamaModel}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        User-Controlled Ollama Model Pull (Never Triggered Automatically)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Recommended command if dense embeddings are needed:{' '}
                        <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {ollamaStatus?.embeddingStatus?.userInstallCommand || 'ollama pull nomic-embed-text'}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={pullModelName}
                        onChange={(e) => setPullModelName(e.target.value)}
                        placeholder="e.g. nomic-embed-text"
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={pullLoading}
                        className="rounded bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d645d] disabled:opacity-50 whitespace-nowrap"
                      >
                        {pullLoading ? 'Pulling Model...' : 'User-Initiated Pull'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Local Persistent Qdrant VRAG & MRAG Collection Status */}
                {vragStatus && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Database className="h-4 w-4 text-[#0F766E]" />
                          <span>Local Persistent Qdrant Vector Store (VRAG + MRAG Collections)</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Storage Path: {vragStatus.storagePath} · VLM: {vragStatus.vragVisionModel || 'riven/smolvlm:latest'}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={handleReindexQdrant}
                          disabled={reindexLoading}
                          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${reindexLoading ? 'animate-spin' : ''}`} />
                          <span>Re-Index All 4 Qdrant Collections</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {Object.values(vragStatus.collections || {}).map((col: any) => (
                        <div
                          key={col.collectionName}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1"
                        >
                          <div className="font-mono text-[11px] font-bold text-[#0F766E]">
                            {col.collectionName}
                          </div>
                          <div className="text-base font-bold text-slate-900 font-mono">
                            {col.indexedRecordsCount} records
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {col.embeddingModel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      ML / DL Model Registry & Lifecycle
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Real trained PyTorch & scikit-learn models running natively on NVIDIA GeForce RTX 5060 Laptop GPU.
                    </p>
                  </div>
                  <button
                    onClick={loadModels}
                    disabled={modelsLoading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
                    Refresh Models
                  </button>
                </div>

                {/* Model Cards */}
                <div className="grid grid-cols-1 gap-5 pt-2">
                  {modelsList.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-5 space-y-4 transition-all ${
                        m.isEnabled
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                            <span className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-mono text-[#0F766E] font-semibold">
                              {m.modelType}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                m.isEnabled
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {m.isEnabled ? 'Active in Pipeline' : 'Disabled (Manual Fallback)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{m.purpose}</p>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleModel(m.id, m.isEnabled)}
                              className={`rounded px-3 py-1 text-xs font-medium border ${
                                m.isEnabled
                                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                              }`}
                            >
                              {m.isEnabled ? 'Disable Model' : 'Enable Model'}
                            </button>
                            <button
                              onClick={() => handleReloadModel(m.id)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              title="Safely reloads model weights into memory and tests forward pass"
                            >
                              <RotateCcw className="h-3 w-3 text-[#0F766E]" />
                              Reload
                            </button>
                            <button
                              onClick={() => handleEvaluateModel(m.id)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              title="Runs evaluation on held-out test split"
                            >
                              <Play className="h-3 w-3 text-[#0F766E]" />
                              Evaluate
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Model Metric Grids */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 rounded-md p-3 text-[11px] font-mono">
                        <div>
                          <div className="text-slate-400 text-[10px]">CURRENT VERSION</div>
                          <div className="font-bold text-slate-900">{m.currentVersion}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">ARTIFACT SIZE</div>
                          <div className="font-bold text-slate-900">
                            {(m.artifactSizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">ACCURACY / F1</div>
                          <div className="font-bold text-emerald-700">
                            {m.metrics?.accuracy ? `${(m.metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">BENCHMARK LATENCY</div>
                          <div className="font-bold text-slate-900">{m.liveLatencyMs} ms</div>
                        </div>
                      </div>

                      {/* Threshold Configuration & Version Selection */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-slate-500 mr-2">Inference Threshold:</span>
                            <span className="font-mono font-semibold text-slate-900">{m.inferenceThreshold}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 mr-2">Timeout:</span>
                            <span className="font-mono font-semibold text-slate-900">{m.timeoutSeconds}s</span>
                          </div>
                          <div>
                            <span className="text-slate-500 mr-2">Trained Dataset:</span>
                            <span className="font-mono font-medium text-slate-700">{m.datasetName} ({m.datasetVersion})</span>
                          </div>
                        </div>

                        {m.previousVersion && !isReadOnly && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              Previous Version: <strong className="font-mono">{m.previousVersion}</strong>
                            </span>
                            <button
                              onClick={() => handleRestoreModel(m.id)}
                              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Restore {m.previousVersion}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evaluation Modal / Drawer if result exists */}
                {selectedModelForEval && (
                  <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#0F766E] flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Live Evaluation Report: {selectedModelForEval.modelId} ({selectedModelForEval.version})
                      </div>
                      <button
                        onClick={() => setSelectedModelForEval(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                      <div>
                        Accuracy: <strong className="text-emerald-700">{(selectedModelForEval.accuracy * 100).toFixed(2)}%</strong>
                      </div>
                      <div>
                        Precision: <strong className="text-slate-900">{(selectedModelForEval.precision * 100).toFixed(2)}%</strong>
                      </div>
                      <div>
                        Recall: <strong className="text-slate-900">{(selectedModelForEval.recall * 100).toFixed(2)}%</strong>
                      </div>
                      <div>
                        F1-Score: <strong className="text-slate-900">{(selectedModelForEval.f1 * 100).toFixed(2)}%</strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Hardware Benchmark: {selectedModelForEval.evaluatedHardware} ({selectedModelForEval.evaluationLatencyMs}ms) · Samples: {selectedModelForEval.evaluatedSamples}
                    </div>
                    {Array.isArray(selectedModelForEval.confusionMatrix) && selectedModelForEval.confusionMatrix.length > 0 && (
                      <div className="pt-2 border-t border-teal-200">
                        <div className="font-semibold text-slate-800 mb-1 text-[11px]">
                          Measured Held-Out Confusion Matrix (Rows = Actual, Cols = Predicted):
                        </div>
                        <div className="overflow-x-auto">
                          <table className="border-collapse font-mono text-[10px] bg-white rounded border border-slate-200">
                            <tbody>
                              {selectedModelForEval.confusionMatrix.map((row: number[], rIdx: number) => (
                                <tr key={rIdx} className="border-b border-slate-100">
                                  <td className="px-2 py-1 font-semibold bg-slate-50 text-slate-700 border-r border-slate-200">
                                    {selectedModelForEval.classes?.[rIdx] || `Class ${rIdx}`}
                                  </td>
                                  {row.map((cell: number, cIdx: number) => (
                                    <td
                                      key={cIdx}
                                      className={`px-2.5 py-1 text-center ${
                                        rIdx === cIdx ? 'font-bold text-emerald-700 bg-emerald-50/60' : 'text-slate-500'
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRAINING & DATASET MANAGEMENT */}
          {currentTab === 'training' && (
            <div className="space-y-6">
              {/* Storage Budget Warning Card */}
              {storageData && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4 text-[#0F766E]" />
                      TRACE Storage Budget Enforcement (1.5 GB Hard Project Cap)
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      All models and datasets are constrained strictly under the 1.5 GB project cap.
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-slate-900">
                      {storageData.projectTotalMB} MB / {storageData.hardCapMB} MB
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      {storageData.remainingBudgetMB} MB remaining budget
                    </div>
                  </div>
                </div>
              )}

              {/* Active Training Job Monitor */}
              {activeJobData && activeJobData.status !== 'Completed' && (
                <div className="rounded-xl border border-teal-300 bg-teal-50/40 p-5 shadow-xs space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="rounded bg-teal-100 text-[#0F766E] px-2 py-0.5 font-mono text-[10px] font-bold">
                        ACTIVE JOB: {activeJobData.jobId}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        Training {activeJobData.modelId} on {activeJobData.datasetName}
                      </h3>
                      <div className="text-[11px] text-slate-600">{activeJobData.currentStage}</div>
                    </div>

                    {!isReadOnly && activeJobData.status === 'Running' && (
                      <button
                        onClick={() => handleCancelTraining(activeJobData.jobId)}
                        className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel Training
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Epoch {activeJobData.currentEpoch} / {activeJobData.epochsTotal}</span>
                      <span>{activeJobData.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F766E] transition-all duration-300"
                        style={{ width: `${activeJobData.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Log Terminal Window */}
                  <div className="rounded-md bg-slate-950 p-3 font-mono text-[10px] text-slate-200 max-h-40 overflow-y-auto space-y-0.5">
                    {activeJobData.logs?.map((l: string, idx: number) => (
                      <div key={idx} className="leading-tight">
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Launch Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 text-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Initiate Bounded Model Training
                  </h3>
                  <p className="text-slate-600 mt-0.5">
                    Dispatches background GPU training jobs on allowlisted datasets. Never runs synchronously inside Express request threads.
                  </p>
                </div>

                <form onSubmit={handleStartTraining} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select Model Target
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={trainingConfig.modelId}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, modelId: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      >
                        <option value="funsd-entity-mlp">FunsdEntityMLP (PyTorch, real FUNSD data, GPU)</option>
                        <option value="doc-layout-cnn">DocumentLayoutCNN (PyTorch CNN, synthetic data)</option>
                        <option value="compliance-risk-gbdt">ComplianceRiskGBDT (scikit-learn GBDT)</option>
                        <option value="doc-text-tfidf-logreg">DocTextTFIDFClassifier (TF-IDF + LogisticRegression)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select Allowlisted Dataset
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={trainingConfig.datasetId}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, datasetId: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      >
                        {datasetsList.map((ds) => (
                          <option key={ds.id} value={ds.id}>
                            {ds.name} ({ds.version}) — {ds.trainSamples} samples
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Epochs</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={trainingConfig.epochs}
                        onChange={(e) =>
                          setTrainingConfig({ ...trainingConfig, epochs: parseInt(e.target.value) || 10 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Learning Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={isReadOnly}
                        value={trainingConfig.learningRate}
                        onChange={(e) =>
                          setTrainingConfig({ ...trainingConfig, learningRate: parseFloat(e.target.value) || 0.001 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Batch Size</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={trainingConfig.batchSize}
                        onChange={(e) =>
                          setTrainingConfig({ ...trainingConfig, batchSize: parseInt(e.target.value) || 32 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Background Training Job
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Datasets Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Executable Dataset Manager & Allowlisted Manifests
                    </h3>
                    <p className="text-slate-600 mt-0.5">
                      Backed by <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">python scripts/datasets.py &#123;list,download,validate,prepare,status&#125;</code>. Enforces the 850 MiB working limit (900 MiB hard cap).
                    </p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(['download', 'validate', 'prepare', 'status'] as const).map((act) => (
                        <button
                          key={act}
                          disabled={Boolean(datasetCmdLoading)}
                          onClick={async () => {
                            try {
                              setDatasetCmdLoading(act);
                              toast.info(`Running scripts/datasets.py ${act}...`);
                              const res = await api.runDatasetManager(act);
                              toast.success(
                                `Dataset manager '${act}' completed (Retained: ${res.result?.retained_size_mib ?? 0} MiB / 850 MiB).`
                              );
                              loadTrainingData();
                            } catch (err: any) {
                              toast.error(`Dataset manager '${act}' failed: ${err.message}`);
                            } finally {
                              setDatasetCmdLoading(null);
                            }
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 capitalize"
                        >
                          {datasetCmdLoading === act ? `Running ${act}...` : `Run ${act}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {cliManifest && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[#0F766E]">
                        Benchmark & Corpus Discovery Audit (FUNSD, SROIE, CORD, TRACE-Synth)
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        Retained Dataset Footprint: {cliManifest.retained_size_mib} MiB / {cliManifest.working_limit_mib} MiB Working Cap ({cliManifest.hard_limit_mib} MiB Hard Cap)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.values(cliManifest.datasets || {}).map((d: any) => (
                        <div key={d.id} className="rounded border border-slate-200 bg-white p-2.5 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{d.name}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                d.status?.includes('DOWNLOADED') || d.status?.includes('PREPARED')
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {d.status}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[10px]">
                            License: {d.license} · Retained Size: <strong className="font-mono">{d.size_mib ?? 0} MiB</strong>
                            {d.is_synthetic ? ' · [SYNTHETIC LABELED]' : ' · [REAL PUBLIC BENCHMARK]'}
                          </div>
                          {d.reason && <div className="text-[10px] text-amber-800">{d.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                        <th className="py-2 px-3">Dataset Name</th>
                        <th className="py-2 px-3">Version</th>
                        <th className="py-2 px-3">License</th>
                        <th className="py-2 px-3">Samples</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {datasetsList.map((ds) => (
                        <tr key={ds.id}>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{ds.name}</td>
                          <td className="py-2.5 px-3 text-slate-700">{ds.version}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-sans">{ds.licenseStatus}</td>
                          <td className="py-2.5 px-3 text-slate-700">{ds.trainSamples} train / {ds.valSamples} val</td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                              Allowlisted & Verified
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENT PROCESSING SETTINGS */}
          {currentTab === 'processing' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Document Processing & OCR Pipeline
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Configure page rendering resolution, EasyOCR languages, batch sizes, retry bounds, and cache invalidation policies.
                  </p>
                </div>

                <form onSubmit={handleSaveProcessing} className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Page Rendering Resolution (DPI)
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={processingData.renderDpi}
                        onChange={(e) =>
                          setProcessingData({ ...processingData, renderDpi: parseInt(e.target.value) || 200 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      >
                        <option value={150}>150 DPI (Fast / Low Memory)</option>
                        <option value={200}>200 DPI (Balanced — Recommended)</option>
                        <option value={300}>300 DPI (High Precision OCR / High VRAM)</option>
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Used by PyMuPDF when generating bitmap rasters for EasyOCR.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        OCR Timeout (Seconds)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={processingData.ocrTimeoutSeconds}
                        onChange={(e) =>
                          setProcessingData({
                            ...processingData,
                            ocrTimeoutSeconds: parseInt(e.target.value) || 45,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Batch Size</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={processingData.batchSize}
                        onChange={(e) =>
                          setProcessingData({ ...processingData, batchSize: parseInt(e.target.value) || 4 })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Max Concurrent Jobs</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={processingData.maxConcurrentJobs}
                        onChange={(e) =>
                          setProcessingData({
                            ...processingData,
                            maxConcurrentJobs: parseInt(e.target.value) || 2,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Retry Limit</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={processingData.retryPolicyMaxRetries}
                        onChange={(e) =>
                          setProcessingData({
                            ...processingData,
                            retryPolicyMaxRetries: parseInt(e.target.value) || 2,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">Document Page Text & Layout Caching</div>
                        <div className="text-[11px] text-slate-500">
                          Reuses validated OCR results for unchanged pages during DeltaScan incremental revisions.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={processingData.cacheEnabled}
                        onChange={(e) =>
                          setProcessingData({ ...processingData, cacheEnabled: e.target.checked })
                        }
                        className="h-4 w-4 accent-[#0F766E]"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">Run Optional ML/DL Analysis</div>
                        <div className="text-[11px] text-slate-500">
                          Runs visual page layout classification and risk scoring when models are loaded.
                          <strong> Critical deterministic regulatory validation always remains operational.</strong>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={processingData.runOptionalMlAnalysis}
                        onChange={(e) =>
                          setProcessingData({ ...processingData, runOptionalMlAnalysis: e.target.checked })
                        }
                        className="h-4 w-4 accent-[#0F766E]"
                      />
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={processingLoading}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors disabled:opacity-50"
                      >
                        {processingLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Save Document Pipeline Settings
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: BACKEND & INTEGRATION HEALTH */}
          {currentTab === 'health' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Live Backend & Integration Health
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Real connectivity and hardware checks performed live across all sub-services.
                    </p>
                  </div>
                  <button
                    onClick={loadHealth}
                    disabled={healthLoading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d645d] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                    Run Health Checks
                  </button>
                </div>

                {healthData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {Object.entries(healthData.services || {}).map(([key, s]: [string, any]) => {
                      const isAvail = s.status === 'Available';
                      const isNotConfig = s.status === 'Not Configured';
                      return (
                        <div
                          key={key}
                          className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{s.name}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                isAvail
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isNotConfig
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>

                          <div className="font-mono text-[11px] text-slate-600 space-y-1">
                            {s.port && <div>Port: {s.port}</div>}
                            {s.uptimeSeconds && <div>Uptime: {s.uptimeSeconds}s (RSS: {s.memoryRssMB} MB)</div>}
                            {s.latencyMs !== undefined && <div>Ping Latency: {s.latencyMs} ms</div>}
                            {s.gpuDevice && <div>Device: {s.gpuDevice}</div>}
                            {s.model && <div>Model: {s.model}</div>}
                            {s.truthfulNote && <div className="text-slate-500 font-sans">{s.truthfulNote}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ALERTS & RETENTION SETTINGS */}
          {currentTab === 'retention' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Alerts, Escalations & Retention Policies
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Statutory notification rules, escalation lead times, and legally bound audit retention policies.
                  </p>
                </div>

                <form onSubmit={handleSaveRetention} className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Cutoff Reminder Lead (Days)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={retentionData.reminderLeadDays}
                        onChange={(e) =>
                          setRetentionData({
                            ...retentionData,
                            reminderLeadDays: parseInt(e.target.value) || 7,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Days before statutory cutoff (e.g. 30-Jun-2026) to issue automated alerts.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Escalation Interval (Hours)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={retentionData.escalationIntervalHours}
                        onChange={(e) =>
                          setRetentionData({
                            ...retentionData,
                            escalationIntervalHours: parseInt(e.target.value) || 48,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Interval before an unresolved corrective task escalates to lead reviewer.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Notification Retry Limit
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={retentionData.notificationRetryLimit}
                        onChange={(e) =>
                          setRetentionData({
                            ...retentionData,
                            notificationRetryLimit: parseInt(e.target.value) || 3,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Processing Job Retention (Days)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={retentionData.processingJobRetentionDays}
                        onChange={(e) =>
                          setRetentionData({
                            ...retentionData,
                            processingJobRetentionDays: parseInt(e.target.value) || 90,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-[#0F766E] focus:outline-hidden disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Audit Log Retention (Days — Minimum 10 Years Statutory Hold)
                      </label>
                      <input
                        type="number"
                        disabled
                        value={retentionData.auditLogRetentionDays}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Statutory legal hold requires minimum 3650 days (10 years). Premature deletion is locked.
                      </span>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={retentionLoading}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors disabled:opacity-50"
                      >
                        {retentionLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Save Alerts & Retention Policies
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY & ACCESS CONTROL */}
          {currentTab === 'security' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 text-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Role-Based Access Control (RBAC) Permissions Matrix
                  </h2>
                  <p className="text-slate-600 mt-0.5">
                    Separates global administrative configuration from institution persona privileges.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                        <th className="py-2.5 px-3">Role Persona</th>
                        <th className="py-2.5 px-3">View Settings</th>
                        <th className="py-2.5 px-3">Modify General Config</th>
                        <th className="py-2.5 px-3">Manage ML/DL Models</th>
                        <th className="py-2.5 px-3">Start Training</th>
                        <th className="py-2.5 px-3">Audit Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          Regulatory System Administrator
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          Authorized Reviewer / Verifier
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">Allowed</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          Auditor
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700">Read-Only</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-emerald-700">Read-Only</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          Institution Compliance Officer
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">Restricted</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          Institution Administrator
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">Restricted</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">Forbidden (403)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CONFIGURATION AUDIT TRAIL */}
          {currentTab === 'audit' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Configuration Change Audit Trail
                    </h2>
                    <p className="text-slate-600 mt-0.5">
                      Immutable record of all operational configuration updates, model activations, and training job events.
                    </p>
                  </div>
                  <button
                    onClick={loadAudit}
                    disabled={auditLoading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                    Refresh Audit Log
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">Domain</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Actor</th>
                        <th className="py-2 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {auditEvents.map((evt) => (
                        <tr key={evt.id}>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(evt.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                              {evt.section}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {evt.action}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-700">
                            {evt.actorName} ({evt.actorRole})
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 max-w-xs truncate">
                            {evt.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
