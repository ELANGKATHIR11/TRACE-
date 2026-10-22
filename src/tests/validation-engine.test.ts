import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseStrictDate, validateDocumentRecord } from '../../server/services/validation-engine';
import { prisma } from '../../server/db/prisma';

describe('Real Validation Engine & Chronological Date Analysis', () => {
  beforeAll(async () => {
    // Ensure DB is connected and reset DOC-2026-101 to v1.0
    await prisma.$queryRaw`SELECT 1`;
    await prisma.document.update({
      where: { id: 'DOC-2026-101' },
      data: {
        currentVersion: 'v1.0',
        validationState: 'Needs manual review',
      },
    });
    await prisma.extractedField.updateMany({
      where: { documentId: 'DOC-2026-101' },
      data: { extractedValue: '14-Aug-2026' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('correctly parses dates chronologically regardless of format', () => {
    const d1 = parseStrictDate('2026-06-30');
    const d2 = parseStrictDate('14-Aug-2026');
    const d3 = parseStrictDate('01-May-2026');

    expect(d1).not.toBeNull();
    expect(d2).not.toBeNull();
    expect(d3).not.toBeNull();

    // Verify true chronological comparison: 14-Aug-2026 > 30-Jun-2026
    expect(d2!.getTime()).toBeGreaterThan(d1!.getTime());
    // Verify 01-May-2026 < 30-Jun-2026
    expect(d3!.getTime()).toBeLessThan(d1!.getTime());
  });

  it('flags intentional date inconsistency on DOC-2026-101 and triggers deficiency', async () => {
    const outcome = await validateDocumentRecord('DOC-2026-101');

    expect(outcome.passed).toBe(false);
    expect(outcome.documentValidationState).toBe('Mismatch detected');
    expect(outcome.ruleEvaluationStatus).toBe('Deficiency triggered');
    expect(outcome.crossDocStatus).toBe('Potential inconsistency detected');
    expect(outcome.findingsTriggered.length).toBeGreaterThan(0);
    expect(outcome.summary).toContain('violates APH Clause 4.2.b cutoff of 30-Jun-2026');
  });

  it('validates a compliant document like DOC-2026-102', async () => {
    const outcome = await validateDocumentRecord('DOC-2026-102');

    expect(outcome.documentValidationState).toBe('Validated');
    expect(outcome.ruleEvaluationStatus).toBe('Criteria satisfied');
  });
});
