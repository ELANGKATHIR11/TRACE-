import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { prisma } from '../../server/db/prisma';

import { ensureFastApiRunning } from '../../server/services/fastapi-service';

describe('Feature 7: Settings & System Control Center', () => {
  let app: any;
  let adminCookie: any;
  let institutionCookie: any;
  let auditorCookie: any;

  beforeAll(async () => {
    app = await createExpressApp();
    await ensureFastApiRunning();

    // 1. Login as Administrator (Rajeshwari Nair - USR-SYS-01)
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rajeshwari.nair@trace-policy.demo.in', password: 'TraceSecure2026!' });
    adminCookie = adminLogin.headers['set-cookie'];

    // 2. Login as Institution Compliance Officer (Prof. Meera Krishnan - USR-ICO-01)
    const icoLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'meera.krishnan@vieps-tech.demo.edu', password: 'TraceSecure2026!' });
    institutionCookie = icoLogin.headers['set-cookie'];

    // 3. Login as Auditor (Vikramaditya Sen - USR-AUD-01)
    const audLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'v.sen@audit-oversight.demo.in', password: 'TraceSecure2026!' });
    auditorCookie = audLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Settings loads actual backend configuration
  it('loads real persisted backend configuration from PostgreSQL', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('settings');
    expect(res.body.settings.id).toBe('CURRENT');
    expect(res.body.settings.defaultAcademicYear).toBe('2026-27');
    expect(res.body.settings.maxUploadSizeBytes).toBeGreaterThan(0);
    expect(res.body.runtimeMetadata.offlineMode).toBe(true);
    expect(res.body.runtimeMetadata.projectCapBytes).toBe(1610612736);
  });

  // Test 2: Authorized administrator can update a valid setting
  it('allows authorized administrator to update valid settings with version increment', async () => {
    const res = await request(app)
      .patch('/api/settings/general')
      .set('Cookie', adminCookie)
      .send({
        appName: 'TRACE — Regulatory Assurance Engine (GovTech AY 2026-27)',
        maxPagesPerDoc: 60,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.appName).toContain('GovTech AY 2026-27');
    expect(res.body.settings.maxPagesPerDoc).toBe(60);
    expect(res.body.settings.version).toBeGreaterThan(1);

    // Verify snapshot was created in SystemSettingVersion
    const versionSnap = await prisma.systemSettingVersion.findFirst({
      orderBy: { versionNumber: 'desc' },
    });
    expect(versionSnap).not.toBeNull();
  });

  // Test 3: Invalid values are rejected without corrupting configuration
  it('rejects invalid settings payloads with 400 and preserves existing configuration', async () => {
    const res = await request(app)
      .patch('/api/settings/general')
      .set('Cookie', adminCookie)
      .send({
        maxPagesPerDoc: -10, // Invalid: must be >= 1
        defaultAcademicYear: 'INVALID-YEAR', // Invalid: not in enum
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');

    // Verify DB still holds valid values
    const current = await prisma.systemSetting.findUnique({ where: { id: 'CURRENT' } });
    expect(current?.maxPagesPerDoc).toBe(60);
  });

  // Test 4: Unauthorized institution users are rejected with 403
  it('forbids institution compliance officers from modifying global configuration', async () => {
    const res = await request(app)
      .patch('/api/settings/general')
      .set('Cookie', institutionCookie)
      .send({
        appName: 'Hacked Title',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  // Test 5: Auditor is strictly read-only and cannot mutate settings
  it('forbids auditor role from mutating system settings', async () => {
    const res = await request(app)
      .patch('/api/settings/retention')
      .set('Cookie', auditorCookie)
      .send({
        reminderLeadDays: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('read-only');
  });

  // Test 6: Model enable and disable operations
  it('enables and disables ML models, updating status and generating audit events', async () => {
    // Disable doc-layout-cnn
    const disableRes = await request(app)
      .post('/api/ml/models/doc-layout-cnn/disable')
      .set('Cookie', adminCookie);

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.model.isEnabled).toBe(false);
    expect(disableRes.body.model.status).toBe('Disabled');

    // Re-enable doc-layout-cnn
    const enableRes = await request(app)
      .post('/api/ml/models/doc-layout-cnn/enable')
      .set('Cookie', adminCookie);

    expect(enableRes.status).toBe(200);
    expect(enableRes.body.model.isEnabled).toBe(true);
    expect(enableRes.body.model.status).toBe('Available');

    // Verify audit event was logged
    const audit = await prisma.configAuditEvent.findFirst({
      where: { action: 'ENABLE_MODEL' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.section).toBe('Models');
  });

  // Test 7: Model reload returns real execution status
  it('safely reloads model weights and returns measured latency', async () => {
    const res = await request(app)
      .post('/api/ml/models/doc-layout-cnn/reload')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reloadResult).toHaveProperty('reloadLatencyMs');
    expect(res.body.reloadResult.success).toBe(true);
  }, 15000);

  // Test 8: Training creates a persistent background job and reports progress
  it('creates persistent background training job with progress and logs', async () => {
    const trainRes = await request(app)
      .post('/api/ml/training')
      .set('Cookie', adminCookie)
      .send({
        modelId: 'doc-layout-cnn',
        datasetId: 'dataset-doclayout-v2',
        epochs: 5,
        learningRate: 0.001,
        batchSize: 32,
      });

    expect(trainRes.status).toBe(200);
    expect(trainRes.body.success).toBe(true);
    const jobId = trainRes.body.jobId;
    expect(jobId).toBeDefined();

    // Query job progress
    const jobRes = await request(app)
      .get(`/api/ml/training/${jobId}`)
      .set('Cookie', adminCookie);

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.job.id).toBe(jobId);
    expect(jobRes.body.job.modelId).toBe('doc-layout-cnn');
    expect(Array.isArray(jobRes.body.job.logs)).toBe(true);

    // Cancel job safely
    const cancelRes = await request(app)
      .post(`/api/ml/training/${jobId}/cancel`)
      .set('Cookie', adminCookie);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.job.status).toBe('Cancelled');
  }, 20000);

  // Test 9: Rejects non-allowlisted datasets
  it('refuses training requests on non-allowlisted datasets', async () => {
    const res = await request(app)
      .post('/api/ml/training')
      .set('Cookie', adminCookie)
      .send({
        modelId: 'doc-layout-cnn',
        datasetId: 'malicious-unverified-dataset',
        epochs: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('allowlisted');
  });

  // Test 10: Legal hold retention enforcement (minimum 3650 days)
  it('rejects retention policy reduction below statutory 10-year (3650 days) legal hold', async () => {
    const res = await request(app)
      .patch('/api/settings/retention')
      .set('Cookie', adminCookie)
      .send({
        auditLogRetentionDays: 365, // Illegal: below 3650 days
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Retention validation failed');
  });

  // Test 11: Real health checks return genuine statuses
  it('performs live health check across Express, FastAPI, PostgreSQL, EasyOCR, and Ollama', async () => {
    const res = await request(app)
      .get('/api/system/health')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('services');
    expect(res.body.services.expressApi.status).toBe('Available');
    expect(res.body.services.postgresDb.status).toBe('Available');
    expect(res.body.services.ocrEngine.accelerator).toContain('Ollama');
    expect(res.body.storage.isUnderBudget).toBe(true);
  });

  // Test 12: Real storage budget calculation against 1.5 GB cap
  it('calculates real filesystem storage metrics and verifies 1.5 GB budget', async () => {
    const res = await request(app)
      .get('/api/system/storage')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.hardCapMB).toBe(1536.0);
    expect(res.body.projectTotalBytes).toBeGreaterThan(0);
    expect(res.body.isUnderBudget).toBe(true);
    expect(res.body.remainingBudgetBytes).toBeGreaterThan(0);
  });
});
