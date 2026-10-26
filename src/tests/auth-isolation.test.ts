import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { prisma } from '../../server/db/prisma';

describe('Real Authentication, RBAC & Tenant Isolation', () => {
  let app: any;

  beforeAll(async () => {
    app = await createExpressApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('authenticates authorized reviewer with valid password and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'arvind.deshmukh@trace-scrutiny.demo.in', password: 'TraceSecure2026!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('authorized_reviewer');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('trace_session=');
  });

  it('rejects invalid password credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'arvind.deshmukh@trace-scrutiny.demo.in', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('rejects state mutation by an auditor role', async () => {
    // Switch or login as auditor
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'v.sen@audit-oversight.demo.in', password: 'TraceSecure2026!' });

    const cookie = loginRes.headers['set-cookie'];

    // Auditor attempts to transition an application
    const transitionRes = await request(app)
      .patch('/api/applications/APP-2026-0842/stage')
      .set('Cookie', cookie)
      .send({ newStage: 'Authorized outcome recorded', note: 'Unauthorized auditor attempt' });

    expect(transitionRes.status).toBe(403);
    expect(transitionRes.body.error).toContain('Auditor');
  });

  it('enforces that only regulatory_system_administrator can publish rule sets', async () => {
    // Compliance officer attempts to publish rule set
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'meera.krishnan@vieps-tech.demo.edu', password: 'TraceSecure2026!' });

    const cookie = loginRes.headers['set-cookie'];

    const publishRes = await request(app)
      .post('/api/rules/RS-APH-2026-V1/publish')
      .set('Cookie', cookie)
      .send({ approvalNote: 'Attempted publish by compliance officer' });

    expect(publishRes.status).toBe(403);
    expect(publishRes.body.error).toContain('Only Regulatory System Administrators');
  });

  it('rejects unauthenticated calls to /api/auth/me with HTTP 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Not authenticated');
  });

  it('rejects unauthenticated role switching attempts with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/auth/switch-role')
      .send({ userId: 'USR-SYS-01' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('rejects unauthenticated settings mutations with HTTP 401', async () => {
    const res = await request(app)
      .patch('/api/settings/general')
      .send({ appName: 'Unauthorized Name' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('rejects anonymous regulatory publication with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/rules/RS-APH-2026-V1/publish')
      .send({ approvalNote: 'Anonymous attempt' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('never exposes password hashes in user or authentication responses', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'arvind.deshmukh@trace-scrutiny.demo.in', password: 'TraceSecure2026!' });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain('$2a$');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });
});

