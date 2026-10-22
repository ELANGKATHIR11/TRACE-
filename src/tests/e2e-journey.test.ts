import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { prisma } from '../../server/db/prisma';

describe('Mandatory End-to-End Regulatory Journey', () => {
  let app: any;
  let reviewerCookie: any;
  let complianceCookie: any;

  beforeAll(async () => {
    app = await createExpressApp();

    const revLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'arvind.deshmukh@trace-scrutiny.demo.in', password: 'TraceSecure2026!' });
    reviewerCookie = revLogin.headers['set-cookie'];

    const compLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'meera.krishnan@vieps-tech.demo.edu', password: 'TraceSecure2026!' });
    complianceCookie = compLogin.headers['set-cookie'];

    // Reset initial application, document, and finding states for repeatable test execution
    await prisma.application.update({
      where: { id: 'APP-2026-0842' },
      data: { currentStage: 'Corrections required' },
    });
    await prisma.document.update({
      where: { id: 'DOC-2026-101' },
      data: {
        currentVersion: 'v1.0',
        validationState: 'Mismatch detected',
        crossDocConsistency: 'Potential inconsistency detected',
      },
    });
    await prisma.extractedField.updateMany({
      where: { documentId: 'DOC-2026-101' },
      data: { extractedValue: '14-Aug-2026' },
    });
    await prisma.complianceFinding.updateMany({
      where: { id: 'FIND-2026-0042' },
      data: {
        lifecycleStatus: 'Task Assigned',
        resolvedAt: null,
        resolvedBy: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('executes the complete 10-step Evidence-to-Action journey with real PostgreSQL persistence', async () => {
    // 1. Initial State Check: Application APP-2026-0842 is under "Corrections required"
    const appRes = await request(app).get('/api/applications/APP-2026-0842');
    expect(appRes.status).toBe(200);
    expect(appRes.body.application.currentStage).toBe('Corrections required');

    // 2. Validate Document DOC-2026-101 (Intentional discrepancy: 14-Aug-2026 vs 30-Jun-2026)
    const valRes = await request(app)
      .post('/api/documents/DOC-2026-101/validate')
      .set('Cookie', reviewerCookie);
    expect(valRes.status).toBe(200);
    expect(valRes.body.passed).toBe(false);
    expect(valRes.body.validationState).toBe('Mismatch detected');
    expect(valRes.body.crossDocStatus).toBe('Potential inconsistency detected');

    // 3. Verify that finding FIND-2026-0042 exists and is linked to the evidence
    const findingRes = await request(app).get('/api/findings?applicationId=APP-2026-0842');
    expect(findingRes.status).toBe(200);
    const targetFinding = findingRes.body.findings.find((f: any) => f.id === 'FIND-2026-0042');
    expect(targetFinding).toBeDefined();
    expect(targetFinding.clauseId).toBe('APH-2026-CL-4.2.b');
    expect(targetFinding.severity).toBe('Critical');

    // 4. Assign Corrective Task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', reviewerCookie)
      .send({
        findingId: 'FIND-2026-0042',
        applicationId: 'APP-2026-0842',
        title: 'Upload Corrected Structural Stability Certificate',
        description: 'Submit revised completion certificate with certified possession on or prior to 30-Jun-2026.',
        assigneeName: 'Prof. Meera Krishnan',
        assigneeRole: 'institution_compliance_officer',
        priority: 'Urgent',
        dueDate: '2026-10-25',
        requiredAction: 'Submit revised v2.0 document.',
      });
    expect(taskRes.status).toBe(201);
    expect(taskRes.body.success).toBe(true);

    // 5. Compliance Officer submits corrected document version v2.0
    const remRes = await request(app)
      .post('/api/documents/DOC-2026-101/remediate')
      .set('Cookie', complianceCookie)
      .send({
        fileName: 'VIEPS_BlockC_Structural_Completion_v2.pdf',
        fileSize: '2.5 MB',
        correctedDateValue: '28-Apr-2026',
        changeNote: 'Revised endorsement issued by Er. Kulkarni confirming physical lab readiness on 28-Apr-2026.',
      });
    expect(remRes.status).toBe(200);
    expect(remRes.body.success).toBe(true);
    expect(remRes.body.version).toBe('v2.0');

    // 6. Revalidate document: Date 28-Apr-2026 satisfies Clause 4.2.b cutoff (< 30-Jun-2026)
    const revalRes = await request(app)
      .post('/api/documents/DOC-2026-101/validate')
      .set('Cookie', reviewerCookie);
    expect(revalRes.status).toBe(200);
    expect(revalRes.body.passed).toBe(true);
    expect(revalRes.body.validationState).toBe('Validated');
    expect(revalRes.body.crossDocStatus).toBe('Consistent across records');

    // 7. Reviewer resolves the compliance finding
    const resolveRes = await request(app)
      .post('/api/findings/FIND-2026-0042/resolve')
      .set('Cookie', reviewerCookie)
      .send({
        decisionNote: 'Remediation verified: Version v2.0 confirms lab readiness as of 28-Apr-2026, satisfying Clause 4.2.b.',
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    // 8. Progress Application Stage to "Ready for authorized review"
    const stageRes = await request(app)
      .patch('/api/applications/APP-2026-0842/stage')
      .set('Cookie', reviewerCookie)
      .send({
        newStage: 'Ready for authorized review',
        note: 'All critical findings resolved. Ready for final committee evaluation.',
      });
    expect(stageRes.status).toBe(200);
    expect(stageRes.body.application.currentStage).toBe('Ready for authorized review');

    // 9. Verify Immutable Audit Trail in PostgreSQL
    const auditRes = await request(app).get('/api/audit?applicationId=APP-2026-0842');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.auditEvents.length).toBeGreaterThan(0);
    const actions = auditRes.body.auditEvents.map((a: any) => a.action);
    expect(actions).toContain('FINDING_RESOLVED');
    expect(actions).toContain('WORKFLOW_STAGE_TRANSITION');

    // 10. Verify Data Persistence: Query direct database state
    const persistedApp = await prisma.application.findUnique({
      where: { id: 'APP-2026-0842' },
    });
    expect(persistedApp?.currentStage).toBe('Ready for authorized review');

    const persistedDoc = await prisma.document.findUnique({
      where: { id: 'DOC-2026-101' },
    });
    expect(persistedDoc?.currentVersion).toBe('v2.0');
    expect(persistedDoc?.validationState).toBe('Validated');
  });
});
