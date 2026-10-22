import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const FASTAPI_PORT = Number(process.env.FASTAPI_PORT || 8000);
const FASTAPI_URL = process.env.FASTAPI_URL || `http://127.0.0.1:${FASTAPI_PORT}`;

let fastApiProcess: ChildProcess | null = null;
let isStarting = false;

export async function isFastApiHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${FASTAPI_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureFastApiRunning(): Promise<boolean> {
  if (await isFastApiHealthy()) {
    return true;
  }

  if (isStarting) {
    // Wait up to 5 seconds
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isFastApiHealthy()) return true;
    }
    return false;
  }

  isStarting = true;
  const pythonExecutable =
    process.env.MINICONDA_PYTHON || 'C:\\Users\\elang\\miniconda3\\envs\\dgpu-core\\python.exe';
  const mainScript = path.resolve(process.cwd(), 'fastapi_engine', 'main.py');

  if (!fs.existsSync(pythonExecutable) || !fs.existsSync(mainScript)) {
    console.warn('[FastAPI Service] Python or main.py not found at paths:', { pythonExecutable, mainScript });
    isStarting = false;
    return false;
  }

  console.log(`[FastAPI Service] Spawning internal Document-AI FastAPI service on ${FASTAPI_URL}...`);
  try {
    fastApiProcess = spawn(
      pythonExecutable,
      ['-m', 'uvicorn', 'fastapi_engine.main:app', '--host', '127.0.0.1', '--port', String(FASTAPI_PORT)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          PYTHONPATH: process.cwd(),
        },
        stdio: 'inherit',
      }
    );

    fastApiProcess.on('exit', (code, signal) => {
      console.warn(`[FastAPI Service] Internal process exited with code ${code}, signal ${signal}`);
      fastApiProcess = null;
    });

    // Wait for health check to pass
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isFastApiHealthy()) {
        console.log('[FastAPI Service] Internal Document-AI service is READY and healthy.');
        isStarting = false;
        return true;
      }
    }
  } catch (err) {
    console.error('[FastAPI Service] Failed to start FastAPI process:', err);
  }

  isStarting = false;
  return false;
}

export function stopFastApiProcess() {
  if (fastApiProcess) {
    try {
      fastApiProcess.kill();
    } catch {}
    fastApiProcess = null;
  }
}

// Typed caller
async function callFastApi<T>(endpoint: string, method: string = 'POST', body?: any): Promise<T> {
  const healthy = await ensureFastApiRunning();
  if (!healthy) {
    throw new Error('Internal FastAPI Document-AI engine is unavailable.');
  }

  const res = await fetch(`${FASTAPI_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FastAPI request to ${endpoint} failed (${res.status}): ${errorText}`);
  }

  return (await res.json()) as T;
}

export const fastApiClient = {
  processDocument: (filePath: string) =>
    callFastApi<any>('/document/process', 'POST', { filePath }),

  extractClaims: (data: { applicationId: string; institutionId: string; documents: any[] }) =>
    callFastApi<any>('/chronograph/extract-claims', 'POST', data),

  detectContradictions: (data: { applicationId: string; academicYear?: string; claims: any[] }) =>
    callFastApi<any>('/chronograph/detect-contradictions', 'POST', data),

  analyzeDeltaPlan: (data: {
    documentId: string;
    newFilePath: string;
    oldFilePath?: string;
    oldVersion?: string;
    newVersion?: string;
    existingCachedPages?: any[];
  }) => callFastApi<any>('/deltascan/analyze-plan', 'POST', data),

  compareRulesets: (data: {
    sourceRulesetCode: string;
    targetRulesetCode: string;
    sourceClauses: any[];
    targetClauses: any[];
  }) => callFastApi<any>('/rulereplay/compare', 'POST', data),

  executeShadowReplay: (data: {
    rulesetVersion: string;
    targetRulesetCode: string;
    applications: any[];
    newRulesetClauses: any[];
  }) => callFastApi<any>('/rulereplay/shadow-replay', 'POST', data),

  prioritizeReviewQueue: (data: { applications: any[]; availableReviewers?: any[] }) =>
    callFastApi<any>('/reviewpilot/prioritize', 'POST', data),

  generateManifest: (data: {
    applicationId: string;
    assessmentId: string;
    documentHashes: any[];
    claimReferences: any[];
    ruleVersionUsed: string;
    pipelineVersions: any;
    normalizedInputs: any;
    ruleEvaluations: any[];
    previousManifestHash?: string;
    signedBy?: string;
    timestamp?: string;
  }) => callFastApi<any>('/proofline/generate-manifest', 'POST', data),

  verifyManifestChain: (data: { manifestChain: any[] }) =>
    callFastApi<any>('/proofline/verify-chain', 'POST', data),

  // Feature 7: System ML & Control Center
  getModels: () => callFastApi<any>('/system_ml/models', 'GET'),

  reloadModel: (modelId: string, version?: string) =>
    callFastApi<any>(`/system_ml/models/${modelId}/reload`, 'POST', { version: version || 'v2.1' }),

  evaluateModel: (modelId: string) =>
    callFastApi<any>(`/system_ml/models/${modelId}/evaluate`, 'POST'),

  startTraining: (data: {
    jobId: string;
    modelId: string;
    datasetName: string;
    datasetVersion: string;
    epochs?: number;
    learningRate?: number;
    batchSize?: number;
  }) => callFastApi<any>('/system_ml/training/start', 'POST', data),

  getTrainingStatus: (jobId: string) =>
    callFastApi<any>(`/system_ml/training/${jobId}/status`, 'GET'),

  cancelTraining: (jobId: string) =>
    callFastApi<any>(`/system_ml/training/${jobId}/cancel`, 'POST'),

  getSystemMlHealth: () =>
    callFastApi<any>('/system_ml/system/health', 'GET'),
};
