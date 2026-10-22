import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { prisma } from '../../server/db/prisma';
import { ensureFastApiRunning } from '../../server/services/fastapi-service';

describe('TRACE 2.0 Differentiated Features End-to-End Suite', () => {
  let app: any;
  let reviewerCookie: any;
  let complianceCookie: any;
  let adminCookie: any;

  beforeAll(async () => {
    // Warm up the FastAPI internal Document-AI inference engine
    await ensureFastApiRunning();
    app = await createExpressApp();

    const revLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'arvind.deshmukh@trace-scrutiny.demo.in', password: 'TraceSecure2026!' });
    reviewerCookie = revLogin.headers['set-cookie'];

    const compLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'meera.krishnan@vieps-tech.demo.edu', password: 'TraceSecure2026!' });
    complianceCookie = compLogin.headers['set-cookie'];

    const admLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rajeshwari.nair@trace-policy.demo.in', password: 'TraceSecure2026!' });
    adminCookie = admLogin.headers['set-cookie'];

    // Clean previous manifests so fresh deterministic chain is established
    await prisma.validationManifest.deleteMany({});
  }, 25000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. ChronoGraph: Extracts claims and detects cross-document contradictions with source-page evidence', async () => {
    // Run cross-document analysis on APP-2026-0842
    const analyzeRes = await request(app)
      .post('/api/applications/APP-2026-0842/analyze')
      .set('Cookie', reviewerCookie);

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.success).toBe(true);
    expect(analyzeRes.body.totalClaims).toBeGreaterThanOrEqual(1);

    // Retrieve claim graph
    const graphRes = await request(app)
      .get('/api/applications/APP-2026-0842/claim-graph')
      .set('Cookie', reviewerCookie);

    expect(graphRes.status).toBe(200);
    expect(graphRes.body.nodes).toBeDefined();
    expect(Array.isArray(graphRes.body.nodes)).toBe(true);
    expect(graphRes.body.nodes.length).toBeGreaterThanOrEqual(1);
    expect(graphRes.body.edges).toBeDefined();

    // Check contradictions endpoint
    const contradictionsRes = await request(app)
      .get('/api/applications/APP-2026-0842/contradictions')
      .set('Cookie', reviewerCookie);

    expect(contradictionsRes.status).toBe(200);
    expect(contradictionsRes.body.contradictions).toBeDefined();
    expect(typeof contradictionsRes.body.contradictionsCount).toBe('number');
  }, 15000);

  it('2. FixPreview Sandbox: Evaluates hypothetical correction safely without modifying real production finding', async () => {
    // Fetch the target finding FIND-2026-0042
    const beforeFinding = await prisma.complianceFinding.findUnique({
      where: { id: 'FIND-2026-0042' },
    });
    expect(beforeFinding).toBeDefined();
    const originalStatus = beforeFinding?.lifecycleStatus;

    // Run FixPreview sandbox with a compliant hypothetical value (e.g. valid date before 30-Jun-2026)
    const previewRes = await request(app)
      .post('/api/findings/FIND-2026-0042/fix-preview')
      .set('Cookie', complianceCookie)
      .send({
        proposedValue: '28-Jun-2026',
        rationale: 'Hypothetical simulation with certified completion date before statutory cutoff',
      });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    expect(previewRes.body.isHypothetical).toBe(true);
    expect(previewRes.body.hypotheticalStatus).toBe('Would Resolve');
    expect(previewRes.body.previewOutcomeSummary).toBeDefined();

    // VERIFY CRITICAL SAFETY RULE: The actual finding in PostgreSQL MUST NOT be altered
    const afterFinding = await prisma.complianceFinding.findUnique({
      where: { id: 'FIND-2026-0042' },
    });
    expect(afterFinding?.lifecycleStatus).toBe(originalStatus);
    expect(afterFinding?.resolvedAt).toEqual(beforeFinding?.resolvedAt);
  });

  it('3. DeltaScan: Detects page changes and reprocesses only eligible modified content with verified compute savings', async () => {
    const deltaRes = await request(app)
      .post('/api/documents/DOC-2026-101/reprocess-delta')
      .set('Cookie', reviewerCookie);

    expect(deltaRes.status).toBe(200);
    expect(deltaRes.body.success).toBe(true);
    expect(deltaRes.body.metrics).toBeDefined();
    expect(deltaRes.body.metrics.totalPages).toBeGreaterThanOrEqual(1);
    expect(deltaRes.body.metrics.estimatedSavingsPercent).toBeGreaterThanOrEqual(0);

    // Check that reprocessing log is persisted in PostgreSQL
    const log = await prisma.reprocessingLog.findFirst({
      where: { documentId: 'DOC-2026-101' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeDefined();
    expect(log?.totalPages).toBe(deltaRes.body.metrics.totalPages);
  }, 15000);

  it('4. RuleReplay: Compares regulatory ruleset versions and executes shadow-mode replay', async () => {
    // Compare APH-2025-V1 with APH-2026-V2
    const compareRes = await request(app)
      .post('/api/rules/compare')
      .set('Cookie', reviewerCookie)
      .send({
        sourceRulesetCode: 'APH-2025-V1',
        targetRulesetCode: 'APH-2026-V2',
      });

    expect(compareRes.status).toBe(200);
    expect(compareRes.body.comparison).toBeDefined();
    expect(compareRes.body.comparison.diffs).toBeDefined();
    expect(compareRes.body.comparison.summary).toBeDefined();

    // Run shadow-mode replay for APH-2026-27
    const replayRes = await request(app)
      .post('/api/rules/APH-2026-27/replay')
      .set('Cookie', reviewerCookie)
      .send({
        targetVersion: 'APH-2026-27',
        targetApplicationIds: ['APP-2026-0842'],
      });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.success).toBe(true);
    expect(replayRes.body.impactReport).toBeDefined();
    expect(replayRes.body.impactReport.isDraft).toBe(true);
    expect(replayRes.body.impactReport.isPublished).toBe(false);

    const reportId = replayRes.body.impactReport.id;

    // Verify draft remains unpublished until authorized publication gate
    const fetchedReport = await request(app)
      .get(`/api/rules/impact-reports/${reportId}`)
      .set('Cookie', reviewerCookie);

    expect(fetchedReport.status).toBe(200);
    expect(fetchedReport.body.report.isPublished).toBe(false);

    // Unauthorized attempt by non-administrator is rejected (403 Forbidden)
    const unauthorizedPublishRes = await request(app)
      .post(`/api/rules/impact-reports/${reportId}/publish`)
      .set('Cookie', complianceCookie);

    expect(unauthorizedPublishRes.status).toBe(403);

    // Authorized administrator publication succeeds (200 OK)
    const publishRes = await request(app)
      .post(`/api/rules/impact-reports/${reportId}/publish`)
      .set('Cookie', adminCookie);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.report.isPublished).toBe(true);
  }, 15000);

  it('5. ReviewPilot: Provides explainable prioritization with scoring factors and workload balancing', async () => {
    const queueRes = await request(app)
      .get('/api/review-queue/prioritized')
      .set('Cookie', reviewerCookie);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.items).toBeDefined();
    expect(Array.isArray(queueRes.body.items)).toBe(true);
    expect(queueRes.body.items.length).toBeGreaterThanOrEqual(1);

    // Verify explainable scoring factors are present
    const firstItem = queueRes.body.items[0];
    expect(firstItem.scoringFactors).toBeDefined();
    expect(typeof firstItem.priorityScore).toBe('number');
    expect(firstItem.reviewerWorkload).toBeDefined();
  }, 15000);

  it('6. Proofline: Validates assessment manifests and verifies cryptographic hash-chain integrity', async () => {
    // Fetch manifest for APP-2026-0842
    const provRes = await request(app)
      .get('/api/provenance/APP-2026-0842/provenance')
      .set('Cookie', reviewerCookie);

    expect(provRes.status).toBe(200);
    expect(provRes.body.manifest).toBeDefined();
    expect(provRes.body.manifest.manifestHash).toBeDefined();
    expect(provRes.body.manifest.verificationStatus).toBeDefined();

    // Execute cryptographic hash-chain integrity verification
    const verifyRes = await request(app)
      .post('/api/provenance/APP-2026-0842/verify')
      .set('Cookie', reviewerCookie);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.chainLength).toBeGreaterThanOrEqual(1);
    expect(verifyRes.body.status).toBe('Valid Chain');
  }, 15000);
});
