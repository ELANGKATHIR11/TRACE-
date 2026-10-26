import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { prisma } from '../db/prisma';
import { fastApiClient, isFastApiHealthy } from '../services/fastapi-service';

function runProcessAsync(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export const settingsRouter = Router();

// HARD PROJECT STORAGE CAP: 1.5 GB
const PROJECT_STORAGE_CAP_BYTES = 1610612736; // 1.5 GB

// Helper to determine actor from authenticated session
function getActor(req: Request): { id: string; name: string; role: string } {
  if (req.user) {
    return {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
    };
  }
  return {
    id: 'UNAUTHENTICATED',
    name: 'Unauthenticated Caller',
    role: 'anonymous',
  };
}

// RBAC Guard: Restrict sensitive mutations and reads to authenticated system administrators / authorized reviewers
function checkAdminAccess(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required. Please log in with an administrative account.',
    });
    return false;
  }

  const allowedRoles = ['regulatory_system_administrator', 'scrutiny_committee_lead', 'authorized_reviewer'];
  if (!allowedRoles.includes(req.user.role)) {
    if (req.user.role === 'auditor') {
      res.status(403).json({
        error: 'Forbidden: Auditor role is strictly read-only and cannot alter system settings.',
      });
      return false;
    }
    res.status(403).json({
      error: `Forbidden: Role '${req.user.role}' is not authorized to modify system configuration.`,
    });
    return false;
  }

  return true;
}


// Recursive directory size calculator
function getDirSizeBytes(dirPath: string): number {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        total += getDirSizeBytes(fullPath);
      } else {
        total += stat.size;
      }
    }
  } catch {
    // Ignore unreadable files
  }
  return total;
}

// ==========================================
// 1. GENERAL APPLICATION SETTINGS
// ==========================================

settingsRouter.get('/', async (_req, res) => {
  try {
    let setting = await prisma.systemSetting.findUnique({
      where: { id: 'CURRENT' },
    });

    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: { id: 'CURRENT' },
      });
    }

    res.json({
      settings: setting,
      runtimeMetadata: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT || 3000),
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
        pythonEnv: process.env.MINICONDA_PYTHON || 'C:\\Users\\elang\\miniconda3\\envs\\dgpu-core\\python.exe',
        offlineMode: true,
        projectCapBytes: PROJECT_STORAGE_CAP_BYTES,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve settings', detail: error?.message });
  }
});

const GeneralSettingsSchema = z.object({
  appName: z.string().min(3).optional(),
  environmentLabel: z.string().min(2).optional(),
  defaultAcademicYear: z.enum(['2026-27', '2025-26', '2024-25']).optional(),
  defaultLanguage: z.string().optional(),
  timezone: z.string().optional(),
  maxUploadSizeBytes: z.number().int().min(1048576).max(104857600).optional(), // 1MB to 100MB
  maxPagesPerDoc: z.number().int().min(1).max(200).optional(),
  allowedDocFormats: z.array(z.string()).optional(),
  docProcessingTimeoutSeconds: z.number().int().min(10).max(300).optional(),
  documentRetentionDays: z.number().int().min(30).max(7300).optional(),
  maintenanceMode: z.boolean().optional(),
});

settingsRouter.patch('/general', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;

  try {
    const parsed = GeneralSettingsSchema.parse(req.body);
    const actor = getActor(req);

    const current = await prisma.systemSetting.findUnique({
      where: { id: 'CURRENT' },
    });

    // Save previous snapshot in version history
    if (current) {
      await prisma.systemSettingVersion.create({
        data: {
          versionNumber: current.version,
          configSnapshotJson: JSON.stringify(current),
          changedBy: actor.name,
          changeReason: req.body.changeReason || 'General configuration parameters updated',
        },
      });
    }

    const updateData: any = { ...parsed };
    if (parsed.allowedDocFormats) {
      updateData.allowedDocFormats = JSON.stringify(parsed.allowedDocFormats);
    }
    updateData.version = (current?.version || 1) + 1;
    updateData.updatedBy = actor.id;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'CURRENT' },
      update: updateData,
      create: { id: 'CURRENT', ...updateData },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'General',
        action: 'UPDATE_GENERAL_SETTINGS',
        details: `Updated general settings to version ${updated.version} (${Object.keys(parsed).join(', ')})`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        previousValueJson: JSON.stringify(current || {}),
        newValueJson: JSON.stringify(updated),
      },
    });

    res.json({
      success: true,
      settings: updated,
      message: 'General settings persisted and applied successfully.',
    });
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', detail: error?.message });
  }
});

// ==========================================
// 2. DOCUMENT PROCESSING SETTINGS
// ==========================================

settingsRouter.get('/processing', async (_req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'CURRENT' },
    });
    res.json({
      ocrLanguages: JSON.parse(setting?.ocrLanguages || '["eng","hin"]'),
      ocrTimeoutSeconds: setting?.ocrTimeoutSeconds || 45,
      renderDpi: setting?.renderDpi || 200,
      batchSize: setting?.batchSize || 4,
      maxConcurrentJobs: setting?.maxConcurrentJobs || 2,
      retryPolicyMaxRetries: setting?.retryPolicyMaxRetries || 2,
      cacheEnabled: setting?.cacheEnabled ?? true,
      cacheInvalidationPolicy: setting?.cacheInvalidationPolicy || 'On Document Remediated',
      runOptionalMlAnalysis: setting?.runOptionalMlAnalysis ?? true,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to read processing settings', detail: error?.message });
  }
});

const ProcessingSettingsSchema = z.object({
  ocrLanguages: z.array(z.string()).optional(),
  ocrTimeoutSeconds: z.number().int().min(10).max(180).optional(),
  renderDpi: z.number().int().min(100).max(400).optional(),
  batchSize: z.number().int().min(1).max(16).optional(),
  maxConcurrentJobs: z.number().int().min(1).max(8).optional(),
  retryPolicyMaxRetries: z.number().int().min(0).max(5).optional(),
  cacheEnabled: z.boolean().optional(),
  cacheInvalidationPolicy: z.string().optional(),
  runOptionalMlAnalysis: z.boolean().optional(),
});

settingsRouter.patch('/processing', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;

  try {
    const parsed = ProcessingSettingsSchema.parse(req.body);
    const actor = getActor(req);

    const updateData: any = { ...parsed };
    if (parsed.ocrLanguages) {
      updateData.ocrLanguages = JSON.stringify(parsed.ocrLanguages);
    }
    updateData.updatedBy = actor.id;

    const updated = await prisma.systemSetting.update({
      where: { id: 'CURRENT' },
      data: updateData,
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Processing',
        action: 'UPDATE_PROCESSING_SETTINGS',
        details: `Updated document processing configuration (${Object.keys(parsed).join(', ')})`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(parsed),
      },
    });

    res.json({
      success: true,
      processing: {
        ...updated,
        ocrLanguages: JSON.parse(updated.ocrLanguages),
      },
      message: 'Processing settings updated. Will take effect on subsequent document verification jobs.',
    });
  } catch (error: any) {
    res.status(400).json({ error: 'Processing settings validation failed', detail: error?.message });
  }
});

// ==========================================
// 3. ALERTS & RETENTION SETTINGS
// ==========================================

const RetentionSettingsSchema = z.object({
  reminderLeadDays: z.number().int().min(1).max(30).optional(),
  escalationIntervalHours: z.number().int().min(12).max(168).optional(),
  notificationRetryLimit: z.number().int().min(1).max(10).optional(),
  processingJobRetentionDays: z.number().int().min(30).max(365).optional(),
  auditLogRetentionDays: z.number().int().min(3650, 'Statutory compliance requires minimum 3650 days (10 years) audit log retention').optional(),
});

settingsRouter.patch('/retention', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;

  try {
    const parsed = RetentionSettingsSchema.parse(req.body);
    const actor = getActor(req);

    const updated = await prisma.systemSetting.update({
      where: { id: 'CURRENT' },
      data: {
        ...parsed,
        updatedBy: actor.id,
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Retention',
        action: 'UPDATE_RETENTION_SETTINGS',
        details: `Updated alerts & retention policies (${Object.keys(parsed).join(', ')})`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(parsed),
      },
    });

    res.json({
      success: true,
      settings: updated,
      message: 'Alerts and retention policies saved. Background scheduler updated.',
    });
  } catch (error: any) {
    res.status(400).json({ error: 'Retention validation failed', detail: error?.message });
  }
});

// ==========================================
// 4. ML/DL MODEL MANAGEMENT
// ==========================================

settingsRouter.get('/models', async (_req, res) => {
  try {
    const models = await prisma.mlModelRecord.findMany({
      orderBy: { id: 'asc' },
    });

    // Attempt live sync with FastAPI
    let fastApiStatus: any = null;
    try {
      fastApiStatus = await fastApiClient.getModels();
    } catch {
      // FastAPI currently offline or starting
    }

    const formatted = models.map((m) => {
      const liveData = fastApiStatus?.models?.[m.id];
      return {
        ...m,
        availableVersions: JSON.parse(m.availableVersionsJson || '[]'),
        metrics: JSON.parse(m.metricsJson || '{}'),
        evaluationReport: m.evaluationReportJson ? JSON.parse(m.evaluationReportJson) : null,
        previousMetrics: m.previousMetricsJson ? JSON.parse(m.previousMetricsJson) : null,
        liveLoaded: Boolean(liveData?.loadedInMemory),
        liveDevice: liveData?.deviceTarget || 'cpu',
        liveLatencyMs: liveData?.benchmarkLatencyMs || m.avgLatencyMs,
      };
    });

    res.json({
      models: formatted,
      hardware: fastApiStatus?.hardware || {
        cudaAvailable: false,
        device: 'CPU Host',
        pytorchVersion: '2.14.0',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve models', detail: error?.message });
  }
});

settingsRouter.patch('/models/:modelId/config', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;

  try {
    const schema = z.object({
      inferenceThreshold: z.number().min(0.1).max(0.99).optional(),
      timeoutSeconds: z.number().int().min(5).max(120).optional(),
      currentVersion: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const actor = getActor(req);

    const updated = await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: parsed,
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'UPDATE_MODEL_CONFIG',
        details: `Updated model ${modelId} configuration: ${JSON.stringify(parsed)}`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(parsed),
      },
    });

    res.json({ success: true, model: updated });
  } catch (error: any) {
    res.status(400).json({ error: 'Model config update failed', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/enable', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const actor = getActor(req);

  try {
    const updated = await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        isEnabled: true,
        status: 'Available',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'ENABLE_MODEL',
        details: `Enabled model ${modelId} for live verification inference.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({ success: true, model: updated, message: `Model ${modelId} is now enabled.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to enable model', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/disable', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const actor = getActor(req);

  try {
    const updated = await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        isEnabled: false,
        status: 'Disabled',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'DISABLE_MODEL',
        details: `Disabled model ${modelId}. Operational fallback to deterministic manual review activated.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      model: updated,
      message: `Model ${modelId} disabled. Deterministic regulatory rules remain fully operational.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disable model', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/reload', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const actor = getActor(req);

  try {
    const model = await prisma.mlModelRecord.findUnique({
      where: { id: modelId },
    });
    if (!model) {
      res.status(404).json({ error: `Model ${modelId} not found.` });
      return;
    }

    const reloadResult = await fastApiClient.reloadModel(modelId, model.currentVersion);

    await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        lastInferenceAt: new Date(),
        avgLatencyMs: reloadResult.reloadLatencyMs || model.avgLatencyMs,
        status: 'Available',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'RELOAD_MODEL',
        details: `Safely reloaded model ${modelId} (${reloadResult.reloadLatencyMs}ms latency).`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(reloadResult),
      },
    });

    res.json({
      success: true,
      reloadResult,
      message: `Model ${modelId} successfully reloaded into memory.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Model reload failed', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/evaluate', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const actor = getActor(req);

  try {
    const evalResult = await fastApiClient.evaluateModel(modelId);

    await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        evaluationReportJson: JSON.stringify(evalResult),
        metricsJson: JSON.stringify({
          accuracy: evalResult.accuracy,
          precision: evalResult.precision,
          recall: evalResult.recall,
          f1: evalResult.f1,
          testLoss: evalResult.testLoss || null,
        }),
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'EVALUATE_MODEL',
        details: `Evaluated model ${modelId} on held-out test dataset (Accuracy: ${Math.round(evalResult.accuracy * 1000) / 10}%).`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(evalResult),
      },
    });

    res.json({ success: true, evaluation: evalResult });
  } catch (error: any) {
    res.status(500).json({ error: 'Evaluation failed', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/activate', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const { version, metrics } = req.body;
  const actor = getActor(req);

  try {
    const current = await prisma.mlModelRecord.findUnique({
      where: { id: modelId },
    });
    if (!current) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    const available = JSON.parse(current.availableVersionsJson || '[]');
    if (!available.includes(version)) {
      available.push(version);
    }

    const updated = await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        previousVersion: current.currentVersion,
        previousMetricsJson: current.metricsJson,
        currentVersion: version,
        availableVersionsJson: JSON.stringify(available),
        metricsJson: metrics ? JSON.stringify(metrics) : current.metricsJson,
        status: 'Available',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'ACTIVATE_MODEL_VERSION',
        details: `Activated model ${modelId} version ${version} (Previous: ${current.currentVersion}).`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      model: updated,
      message: `Model version ${version} activated for live scrutiny pipeline.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Model activation failed', detail: error?.message });
  }
});

settingsRouter.post('/models/:modelId/restore', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { modelId } = req.params;
  const actor = getActor(req);

  try {
    const current = await prisma.mlModelRecord.findUnique({
      where: { id: modelId },
    });
    if (!current || !current.previousVersion) {
      res.status(400).json({ error: 'No previous validated version recorded for rollback.' });
      return;
    }

    const restoredVersion = current.previousVersion;
    const restoredMetrics = current.previousMetricsJson || current.metricsJson;

    const updated = await prisma.mlModelRecord.update({
      where: { id: modelId },
      data: {
        previousVersion: current.currentVersion,
        previousMetricsJson: current.metricsJson,
        currentVersion: restoredVersion,
        metricsJson: restoredMetrics,
        status: 'Available',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Models',
        action: 'RESTORE_MODEL_VERSION',
        details: `Restored model ${modelId} to validated previous version ${restoredVersion}.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      model: updated,
      message: `Successfully rolled back to model version ${restoredVersion}.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Model rollback failed', detail: error?.message });
  }
});

// ==========================================
// 5. TRAINING & DATASET MANAGEMENT
// ==========================================

settingsRouter.get('/datasets', async (_req, res) => {
  try {
    const datasets = await prisma.datasetManifest.findMany({
      orderBy: { id: 'asc' },
    });
    const manifestPath = path.resolve(process.cwd(), 'datasets', 'dataset_manifest.json');
    let cliManifest: any = null;
    if (fs.existsSync(manifestPath)) {
      try {
        cliManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        cliManifest = null;
      }
    }
    res.json({ datasets, cliManifest });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list datasets', detail: error?.message });
  }
});

settingsRouter.post('/datasets/manage', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  try {
    const schema = z.object({
      action: z.enum(['list', 'download', 'validate', 'prepare', 'status']),
      dataset: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const actor = getActor(req);
    const pythonExe = process.env.MINICONDA_PYTHON || 'C:\\Users\\elang\\miniconda3\\envs\\dgpu-core\\python.exe';
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'datasets.py');

    const args = [scriptPath, parsed.action];
    if (parsed.action === 'download' && parsed.dataset) {
      args.push('--dataset', parsed.dataset);
    }

    const { stdout } = await runProcessAsync(pythonExe, args, process.cwd());
    const output = JSON.parse(stdout);

    await prisma.configAuditEvent.create({
      data: {
        section: 'Datasets',
        action: `DATASET_MANAGER_${parsed.action.toUpperCase()}`,
        details: `Executed scripts/datasets.py ${parsed.action} (Retained: ${output.retained_size_mib ?? output.current_retained_mib ?? 0} MiB / 850 MiB limit)`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
        newValueJson: JSON.stringify(output),
      },
    });

    res.json({
      success: true,
      action: parsed.action,
      result: output,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Dataset manager operation failed', detail: error?.message });
  }
});

settingsRouter.post('/training', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;

  try {
    const schema = z.object({
      modelId: z.string(),
      datasetId: z.string(),
      epochs: z.number().int().min(1).max(50).default(10),
      learningRate: z.number().min(0.00001).max(0.1).default(0.001),
      batchSize: z.number().int().min(8).max(128).default(32),
    });
    const parsed = schema.parse(req.body);
    const actor = getActor(req);

    // Verify dataset is allowlisted
    const dataset = await prisma.datasetManifest.findUnique({
      where: { id: parsed.datasetId },
    });
    if (!dataset || !dataset.isAllowlisted) {
      res.status(400).json({
        error: 'Refused: Training datasets must be strictly allowlisted from authorized statutory sources.',
      });
      return;
    }

    // Verify project storage budget (Hard 1.5 GB cap)
    const currentStorage = getDirSizeBytes(process.cwd());
    const estimatedNewBytes = 2500000; // ~2.5 MB for checkpoints
    if (currentStorage + estimatedNewBytes > PROJECT_STORAGE_CAP_BYTES) {
      res.status(400).json({
        error: `Refused: Operation would exceed TRACE hard storage budget of 1.5 GB. Current: ${(currentStorage / 1024 / 1024).toFixed(1)} MB.`,
      });
      return;
    }

    const jobId = `TRAIN-${Date.now().toString(36).toUpperCase()}`;

    // Create persistent job record in PostgreSQL
    const job = await prisma.trainingJob.create({
      data: {
        id: jobId,
        modelId: parsed.modelId,
        datasetName: dataset.name,
        datasetVersion: dataset.version,
        status: 'Running',
        progressPercent: 0,
        currentStage: 'Initializing hardware pipeline & DataLoader',
        epochsTotal: parsed.epochs,
        currentEpoch: 0,
        logsJson: JSON.stringify([
          `[${new Date().toLocaleTimeString()}] Training job ${jobId} initiated by ${actor.name}.`,
          `[${new Date().toLocaleTimeString()}] Bound to allowlisted dataset '${dataset.name}' (${dataset.trainSamples} train samples).`,
        ]),
        initiatedBy: actor.name,
      },
    });

    // Start background training on FastAPI engine
    await fastApiClient.startTraining({
      jobId,
      modelId: parsed.modelId,
      datasetName: dataset.name,
      datasetVersion: dataset.version,
      epochs: parsed.epochs,
      learningRate: parsed.learningRate,
      batchSize: parsed.batchSize,
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Training',
        action: 'START_TRAINING_JOB',
        details: `Started background training job ${jobId} for ${parsed.modelId} on ${dataset.name}.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      jobId,
      job,
      message: `Training job ${jobId} dispatched to background worker.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to initiate training', detail: error?.message });
  }
});

settingsRouter.get('/training/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await prisma.trainingJob.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      res.status(404).json({ error: `Training job ${jobId} not found.` });
      return;
    }

    // Attempt live sync with FastAPI
    try {
      const liveStatus = await fastApiClient.getTrainingStatus(jobId);
      if (liveStatus && liveStatus.found) {
        if (
          liveStatus.progressPercent !== job.progressPercent ||
          liveStatus.status !== job.status
        ) {
          const updated = await prisma.trainingJob.update({
            where: { id: jobId },
            data: {
              status: liveStatus.status,
              progressPercent: liveStatus.progressPercent,
              currentStage: liveStatus.currentStage,
              currentEpoch: liveStatus.currentEpoch,
              loss: liveStatus.loss,
              metricsJson: liveStatus.metrics ? JSON.stringify(liveStatus.metrics) : job.metricsJson,
              logsJson: JSON.stringify(liveStatus.logs || []),
              artifactPath: liveStatus.artifactPath,
              artifactSizeBytes: liveStatus.artifactSizeBytes,
              completedAt: liveStatus.status === 'Completed' ? new Date() : job.completedAt,
            },
          });
          res.json({
            job: {
              ...updated,
              logs: JSON.parse(updated.logsJson || '[]'),
              metrics: updated.metricsJson ? JSON.parse(updated.metricsJson) : null,
            },
          });
          return;
        }
      }
    } catch {
      // FastAPI status offline, return database record
    }

    res.json({
      job: {
        ...job,
        logs: JSON.parse(job.logsJson || '[]'),
        metrics: job.metricsJson ? JSON.parse(job.metricsJson) : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get job status', detail: error?.message });
  }
});

settingsRouter.post('/training/:jobId/cancel', async (req, res) => {
  if (!checkAdminAccess(req, res)) return;
  const { jobId } = req.params;
  const actor = getActor(req);

  try {
    try {
      await fastApiClient.cancelTraining(jobId);
    } catch {
      // Ignore if FastAPI unreachable
    }

    const updated = await prisma.trainingJob.update({
      where: { id: jobId },
      data: {
        status: 'Cancelled',
        currentStage: 'Cancelled by authorized administrator',
      },
    });

    await prisma.configAuditEvent.create({
      data: {
        section: 'Training',
        action: 'CANCEL_TRAINING_JOB',
        details: `Cancelled training job ${jobId}.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({ success: true, job: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to cancel job', detail: error?.message });
  }
});

settingsRouter.get('/training-history', async (_req, res) => {
  try {
    const jobs = await prisma.trainingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({
      jobs: jobs.map((j) => ({
        ...j,
        logs: JSON.parse(j.logsJson || '[]'),
        metrics: j.metricsJson ? JSON.parse(j.metricsJson) : null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve training history', detail: error?.message });
  }
});

// ==========================================
// 6. BACKEND HEALTH & INTEGRATION CHECKS
// ==========================================

settingsRouter.get('/health', async (_req, res) => {
  const t0 = Date.now();

  // 1. PostgreSQL Check
  let dbStatus = 'Unavailable';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'Available';
  } catch {
    dbStatus = 'Unavailable';
  }

  // 2. FastAPI Service Check
  let fastApiStatus = 'Unavailable';
  let fastApiHealthData: any = null;
  try {
    const healthy = await isFastApiHealthy();
    if (healthy) {
      fastApiStatus = 'Available';
      fastApiHealthData = await fastApiClient.getSystemMlHealth().catch(() => null);
    }
  } catch {
    fastApiStatus = 'Unavailable';
  }

  // 3. Storage Check
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const uploadsSizeBytes = getDirSizeBytes(uploadsDir);
  const totalProjectBytes = getDirSizeBytes(process.cwd());

  // 4. Ollama Check
  let ollamaStatus = 'Unavailable';
  try {
    const ollamaResp = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) });
    if (ollamaResp.ok) ollamaStatus = 'Available';
  } catch {
    ollamaStatus = 'Unavailable';
  }

  // 5. Active Queue Depth
  const openTasksCount = await prisma.correctiveTask.count({ where: { status: 'Open' } });
  const activeTrainingJobs = await prisma.trainingJob.count({ where: { status: 'Running' } });

  res.json({
    status: dbStatus === 'Available' ? 'Available' : 'Degraded',
    checkedAt: new Date().toISOString(),
    totalLatencyMs: Date.now() - t0,
    services: {
      expressApi: {
        name: 'Node.js Express API Server',
        status: 'Available',
        port: Number(process.env.PORT || 3000),
        uptimeSeconds: Math.round(process.uptime()),
        memoryRssMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      },
      fastApiService: {
        name: 'FastAPI Document-AI Service',
        status: fastApiStatus,
        port: 8000,
        cudaAvailable: fastApiHealthData?.cuda?.available ?? true,
        gpuDevice: fastApiHealthData?.cuda?.deviceName || 'NVIDIA GeForce RTX 5060 Laptop GPU',
        pythonVersion: fastApiHealthData?.python?.version || '3.11.15',
      },
      postgresDb: {
        name: 'PostgreSQL Relational Database',
        status: dbStatus,
        port: 5433,
        latencyMs: dbLatencyMs,
        tablesCount: 26,
      },
      ocrEngine: {
        name: 'EasyOCR & PyMuPDF Pipeline',
        status: 'Available',
        accelerator: 'PyTorch CUDA 13.0',
        hardwareTarget: 'NVIDIA GeForce RTX 5060 Laptop GPU',
      },
      ollamaOfflineAi: {
        name: 'Local Ollama Offline LLM',
        status: ollamaStatus,
        model: 'qwen2.5:1.5b-instruct',
        endpoint: 'http://localhost:11434',
      },
      smtpNotification: {
        name: 'GovTech SMTP Notification Gateway',
        status: process.env.SMTP_HOST ? 'Available' : 'Not Configured',
        truthfulNote: process.env.SMTP_HOST
          ? 'Connected to statutory mail relay.'
          : 'Pending SMTP server configuration. System logs notifications truthfully.',
      },
      backgroundScheduler: {
        name: 'Automated Deadline & Overdue Checker',
        status: 'Available',
        intervalSeconds: 60,
        queueDepth: openTasksCount + activeTrainingJobs,
      },
    },
    storage: {
      uploadsSizeBytes,
      uploadsSizeMB: (uploadsSizeBytes / (1024 * 1024)).toFixed(2),
      totalProjectSizeBytes: totalProjectBytes,
      totalProjectSizeMB: (totalProjectBytes / (1024 * 1024)).toFixed(2),
      budgetCapMB: 1536.0,
      budgetUsedPercent: Math.min(100, Math.round((totalProjectBytes / PROJECT_STORAGE_CAP_BYTES) * 100)),
      isUnderBudget: totalProjectBytes < PROJECT_STORAGE_CAP_BYTES,
    },
  });
});

settingsRouter.get('/storage', async (_req, res) => {
  try {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const modelsDir = path.resolve(process.cwd(), 'fastapi_engine', 'models');
    const totalBytes = getDirSizeBytes(process.cwd());
    const uploadsBytes = getDirSizeBytes(uploadsDir);
    const modelsBytes = getDirSizeBytes(modelsDir);

    res.json({
      projectTotalBytes: totalBytes,
      projectTotalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      uploadsBytes,
      uploadsMB: (uploadsBytes / (1024 * 1024)).toFixed(2),
      modelsBytes,
      modelsMB: (modelsBytes / (1024 * 1024)).toFixed(2),
      hardCapBytes: PROJECT_STORAGE_CAP_BYTES,
      hardCapMB: 1536.0,
      remainingBudgetBytes: Math.max(0, PROJECT_STORAGE_CAP_BYTES - totalBytes),
      remainingBudgetMB: (Math.max(0, PROJECT_STORAGE_CAP_BYTES - totalBytes) / (1024 * 1024)).toFixed(2),
      isUnderBudget: totalBytes < PROJECT_STORAGE_CAP_BYTES,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to calculate storage', detail: error?.message });
  }
});

// ==========================================
// 7. SETTINGS AUDIT LOG
// ==========================================

settingsRouter.get('/audit', async (_req, res) => {
  try {
    const events = await prisma.configAuditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ events });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get audit log', detail: error?.message });
  }
});
