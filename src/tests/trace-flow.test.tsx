import { describe, it, expect, beforeEach } from 'vitest';
import { INITIAL_TRACE_STORE } from './fixtures/demo-data';
import { getPermissions, canRoleTransitionToStage } from '../lib/permissions';

describe('TRACE Domain Store & 13-Step SIH Demonstration Flow Invariants', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds all 5 distinct RBAC roles with accurate permission boundaries', () => {
    expect(INITIAL_TRACE_STORE.users).toHaveLength(5);

    const reviewerPerms = getPermissions('authorized_reviewer');
    expect(reviewerPerms.canAssignCorrectiveTask).toBe(true);
    expect(reviewerPerms.canResolveFinding).toBe(true);
    expect(reviewerPerms.canUploadRemediationDocument).toBe(false);

    const complianceOfficerPerms = getPermissions('institution_compliance_officer');
    expect(complianceOfficerPerms.canUploadRemediationDocument).toBe(true);
    expect(complianceOfficerPerms.canResolveFinding).toBe(false);

    const sysAdminPerms = getPermissions('regulatory_system_administrator');
    expect(sysAdminPerms.canPublishRuleSet).toBe(true);

    const auditorPerms = getPermissions('auditor');
    expect(auditorPerms.isReadOnlyAuditor).toBe(true);
    expect(auditorPerms.canResolveFinding).toBe(false);
    expect(canRoleTransitionToStage('auditor', 'Review completed')).toBe(false);
  });

  it('maintains coherent relational references across applications, documents, findings, and rules', () => {
    const targetApp = INITIAL_TRACE_STORE.applications.find((a: any) => a.id === 'APP-2026-0842');
    expect(targetApp).toBeDefined();
    expect(targetApp?.workflowStage).toBe('Corrections required');

    const mismatchDoc = INITIAL_TRACE_STORE.documents.find((d: any) => d.id === 'DOC-2026-101');
    expect(mismatchDoc).toBeDefined();
    expect(mismatchDoc?.validationState).toBe('Mismatch detected');
    expect(mismatchDoc?.ocrConfidenceAvg).toBeGreaterThan(95);
    // Epistemic separation check: high OCR confidence does NOT mean validated or issuer-confirmed
    expect(mismatchDoc?.issuerVerification).toBe(
      'Registry reference format matched (Not issuer-authenticated)'
    );

    const primaryFinding = INITIAL_TRACE_STORE.findings.find((f: any) => f.id === 'FND-2026-001');
    expect(primaryFinding).toBeDefined();
    expect(primaryFinding?.documentId).toBe('DOC-2026-101');
    expect(primaryFinding?.clauseId).toBe('APH-2026-CL-4.2.b');
    expect(primaryFinding?.extractedValue).toBe('14-Aug-2026');
  });

  it('includes both a published rule-set (v2.0) and a draft rule-set (v2.1-Draft)', () => {
    const published = INITIAL_TRACE_STORE.ruleSets.find((r: any) => r.status === 'published');
    const draft = INITIAL_TRACE_STORE.ruleSets.find((r: any) => r.status === 'draft');
    expect(published).toBeDefined();
    expect(draft).toBeDefined();
    expect(published?.version).toBe('v2.0');
    expect(draft?.version).toBe('v2.1-Draft');
  });
});
