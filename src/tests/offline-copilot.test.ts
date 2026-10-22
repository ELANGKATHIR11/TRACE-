import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { prisma } from '../../server/db/prisma';

describe('100% Offline Regulatory Engine & Copilot Verification', () => {
  let app: any;

  beforeAll(async () => {
    app = await createExpressApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reports 100% offline status and dgpu-core hardware acceleration on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.offlineMode).toBe(true);
    expect(res.body.database.provider).toBe('PostgreSQL');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.hardwareAcceleration.pythonEnv).toContain('dgpu-core');
    expect(res.body.aiEngine.offline).toBe(true);
  });

  it('rejects copilot query without question with 400', async () => {
    const res = await request(app).post('/api/copilot/query').send({});
    expect(res.status).toBe(400);
  });

  it('serves 100% offline source-grounded regulatory queries with 4-tier epistemic output', async () => {
    const res = await request(app).post('/api/copilot/query').send({
      question: 'What is the statutory cutoff date for building completion under APH 2026-27 Clause 4.2.b?',
      applicationId: 'APP-2026-0842',
    });

    expect(res.status).toBe(200);
    expect(res.body.offline).toBe(true);
    expect(['local_offline_llm', 'local_statutory_retrieval']).toContain(res.body.mode);

    const data = res.body.data;
    expect(typeof data.summaryAnswer).toBe('string');
    expect(Array.isArray(data.directlySupportedStatements)).toBe(true);
    expect(data.directlySupportedStatements.length).toBeGreaterThan(0);
    expect(data.directlySupportedStatements[0]).toHaveProperty('clauseId');
    expect(data.directlySupportedStatements[0]).toHaveProperty('statement');

    expect(Array.isArray(data.systemComputedFindings)).toBe(true);
    expect(Array.isArray(data.explanatorySuggestions)).toBe(true);
    expect(Array.isArray(data.uncertaintyWarnings)).toBe(true);
    expect(Array.isArray(data.recommendedNextActions)).toBe(true);
  }, 20000);
});
