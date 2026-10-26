import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { prisma } from './server/db/prisma';
import { authMiddleware } from './server/middleware/auth';

// Routers
import { authRouter } from './server/routes/auth';
import { usersRouter } from './server/routes/users';
import { institutionsRouter } from './server/routes/institutions';
import { applicationsRouter } from './server/routes/applications';
import { documentsRouter } from './server/routes/documents';
import { findingsRouter } from './server/routes/findings';
import { tasksRouter } from './server/routes/tasks';
import { rulesRouter } from './server/routes/rules';
import { obligationsRouter } from './server/routes/obligations';
import { alertsRouter } from './server/routes/alerts';
import { auditRouter } from './server/routes/audit';
import { analyticsRouter } from './server/routes/analytics';
import { copilotRouter } from './server/routes/copilot';
import { stateRouter } from './server/routes/state';
import { reviewQueueRouter } from './server/routes/review-queue';
import { provenanceRouter } from './server/routes/provenance';
import { settingsRouter } from './server/routes/settings';
import { reportsRouter } from './server/routes/reports';
import { logAuditEvent } from './server/services/audit-service';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.APP_URL,
].filter(Boolean) as string[];

export async function createExpressApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (such as mobile apps, curl, or supertest)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    }) as any
  );
  app.use(cookieParser() as any);
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Global authentication & session middleware
  app.use(authMiddleware);

  // Health and Readiness Endpoint
  app.get('/api/health', async (_req, res) => {
    let dbStatus = 'disconnected';
    let dbReady = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbReady = true;
    } catch {
      dbStatus = 'disconnected';
      dbReady = false;
    }

    const localAiConfig = {
      offline: true,
      provider: 'Local Ollama & Deterministic Statutory RAG',
      model: process.env.LOCAL_LLM_MODEL || 'qwen2.5:1.5b-instruct',
      ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    };

    const overallStatus = dbReady ? 'ok' : 'degraded';
    const statusCode = dbReady ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      service: 'TRACE — Regulatory Assurance & Compliance Engine',
      environment: process.env.NODE_ENV || 'development',
      offlineMode: true,
      database: {
        provider: 'PostgreSQL',
        status: dbStatus,
      },
      hardwareAcceleration: {
        pythonEnv: process.env.MINICONDA_PYTHON || 'C:\\Users\\elang\\miniconda3\\envs\\dgpu-core\\python.exe',
        gpuTarget: 'NVIDIA GeForce RTX 5060 Laptop GPU',
        frameworks: 'PyTorch CUDA 13.0 + EasyOCR + PyMuPDF',
      },
      aiEngine: localAiConfig,
      liveAiConfigured: true,
      timestamp: new Date().toISOString(),
    });
  });

  // OpenAPI Specification Endpoint
  app.get('/api/openapi.json', (_req, res) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'TRACE — Trustworthy Regulatory Assurance & Compliance Engine API',
        version: '2.0.0',
        description:
          'Authoritative REST API for Regulatory Assurance, Evidence Verification, Document Intelligence, and AI Guidance.',
      },
      paths: {
        '/api/auth/login': { post: { summary: 'User login with session cookie' } },
        '/api/auth/me': { get: { summary: 'Get current user profile' } },
        '/api/applications': {
          get: { summary: 'List regulatory applications' },
          post: { summary: 'Create new application intake' },
        },
        '/api/documents/upload': { post: { summary: 'Multipart upload with GPU OCR' } },
        '/api/documents/{id}/validate': { post: { summary: 'Execute deterministic rule evaluation' } },
        '/api/documents/{id}/remediate': { post: { summary: 'Upload corrected version v2.0' } },
        '/api/findings/{id}/resolve': { post: { summary: 'Resolve compliance finding' } },
        '/api/tasks': {
          get: { summary: 'List corrective tasks' },
          post: { summary: 'Assign corrective task' },
        },
        '/api/rules': { get: { summary: 'List regulatory rule sets and clauses' } },
        '/api/copilot/query': { post: { summary: 'Source-grounded Regulatory Copilot' } },
        '/api/analytics': { get: { summary: 'Database-backed compliance analytics' } },
        '/api/audit': { get: { summary: 'Immutable audit trail' } },
        '/api/reports/application/{id}': { get: { summary: 'Canonical application validation report' } },
        '/api/reports/application/{id}/json': { get: { summary: 'Downloadable JSON validation report' } },
        '/api/reports/application/{id}/pdf': { get: { summary: 'Downloadable PDF validation report' } },
        '/api/state': { get: { summary: 'Full unified state snapshot for client synchronization' } },
      },
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/institutions', institutionsRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/findings', findingsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/rules', rulesRouter);
  app.use('/api/regulations', rulesRouter);
  app.use('/api/obligations', obligationsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/copilot', copilotRouter);
  app.use('/api/state', stateRouter);
  app.use('/api/review-queue', reviewQueueRouter);
  app.use('/api/provenance', provenanceRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/ml', settingsRouter);
  app.use('/api/system', settingsRouter);
  app.use('/api/assessments', provenanceRouter);
  app.use('/api/reports', reportsRouter);

  return app;
}

// Background scheduler for overdue tasks & compliance deadlines
let isSchedulerRunning = false;
let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;

export function startBackgroundScheduler() {
  if (schedulerIntervalId) {
    return schedulerIntervalId;
  }
  const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds

  schedulerIntervalId = setInterval(async () => {
    if (isSchedulerRunning) return;
    isSchedulerRunning = true;
    try {
      const now = new Date();
      // Detect overdue tasks
      const overdueTasks = await prisma.correctiveTask.findMany({
        where: {
          status: 'Open',
          dueDate: { lt: now },
        },
      });

      if (overdueTasks.length > 0) {
        await prisma.correctiveTask.updateMany({
          where: {
            id: { in: overdueTasks.map((t) => t.id) },
          },
          data: {
            status: 'Overdue',
          },
        });

        for (const t of overdueTasks) {
          await logAuditEvent({
            actorId: 'SYSTEM-SCHEDULER',
            actorName: 'Automated Deadline Scheduler',
            actorRole: 'system_service',
            action: 'TASK_STATUS_OVERDUE',
            entityType: 'CorrectiveTask',
            entityId: t.id,
            applicationId: t.applicationId,
            institutionId: t.institutionId,
            previousState: 'Open',
            newState: 'Overdue',
            evidenceReference: `Overdue deadline: ${t.dueDate.toISOString()}`,
          });
        }
      }

      // Detect expired documents
      const expiredDocs = await prisma.document.findMany({
        where: {
          expiryDate: { lt: now },
          validationState: { not: 'Expired document' },
        },
      });

      if (expiredDocs.length > 0) {
        await prisma.document.updateMany({
          where: {
            id: { in: expiredDocs.map((d) => d.id) },
          },
          data: {
            validationState: 'Expired document',
          },
        });

        for (const d of expiredDocs) {
          await logAuditEvent({
            actorId: 'SYSTEM-SCHEDULER',
            actorName: 'Automated Deadline Scheduler',
            actorRole: 'system_service',
            action: 'DOCUMENT_STATUS_EXPIRED',
            entityType: 'Document',
            entityId: d.id,
            applicationId: d.applicationId,
            institutionId: d.institutionId,
            previousState: d.validationState,
            newState: 'Expired document',
            evidenceReference: `Document statutory expiry reached: ${d.expiryDate?.toISOString()}`,
          });
        }
      }
    } catch (schedErr) {
      console.warn('[Scheduler] Periodic compliance check error:', schedErr);
    } finally {
      isSchedulerRunning = false;
    }
  }, CHECK_INTERVAL_MS);

  return schedulerIntervalId;
}

export function stopBackgroundScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    isSchedulerRunning = false;
  }
}

export async function startServer() {
  const app = await createExpressApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TRACE Regulatory Engine Server listening on http://0.0.0.0:${PORT}`);
    console.log(`PostgreSQL Database: localhost:5433 (trace_db)`);
    console.log(`Miniconda GPU Python: ${process.env.MINICONDA_PYTHON || 'C:\\Users\\elang\\miniconda3\\envs\\dgpu-core\\python.exe'}`);
  });

  startBackgroundScheduler();

  const shutdown = async () => {
    stopBackgroundScheduler();
    server.close();
    await prisma.$disconnect();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('server.ts')) {
  startServer();
}
