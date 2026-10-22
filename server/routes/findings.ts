import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';

export const findingsRouter = Router();

findingsRouter.get('/', async (req, res) => {
  try {
    const { applicationId, institutionId, severity, status } = req.query;
    const where: any = {};
    if (applicationId) where.applicationId = String(applicationId);
    if (institutionId) where.institutionId = String(institutionId);
    if (severity && severity !== 'ALL') where.severity = String(severity);
    if (status && status !== 'ALL') where.lifecycleStatus = String(status);

    const findings = await prisma.complianceFinding.findMany({
      where,
      include: {
        application: true,
        institution: true,
        assignedTask: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = findings.map((f) => ({
      id: f.id,
      title: f.title,
      applicationId: f.applicationId,
      applicationCode: f.application.code,
      institutionId: f.institutionId,
      institutionName: f.institution.name,
      requirementId: f.requirementId,
      requirementTitle: f.requirementTitle,
      ruleSetId: f.ruleSetId,
      ruleVersion: f.ruleVersion,
      academicYear: f.academicYear,
      clauseId: f.clauseId,
      clauseNumber: f.clauseNumber,
      clauseExcerpt: f.clauseExcerpt,
      sourceDocumentTitle: f.sourceDocumentTitle,
      sourcePageRef: f.sourcePageRef,
      documentId: f.documentId,
      documentTitle: f.documentTitle,
      pageNumber: f.pageNumber,
      boundingBoxId: f.boundingBoxId,
      fieldId: f.fieldId,
      fieldKey: f.fieldKey,
      fieldLabel: f.fieldLabel,
      extractedValue: f.extractedValue,
      expectedValue: f.expectedValue,
      discrepancyNote: f.discrepancyNote,
      severity: f.severity,
      status: f.lifecycleStatus,
      assignedTaskId: f.assignedTaskId,
      dueDate: f.assignedTask?.dueDate?.toISOString().split('T')[0] || '2026-10-25',
      resolvedAt: f.resolvedAt?.toISOString(),
      resolvedBy: f.resolvedBy,
      resolutionNote: f.resolutionNote,
    }));

    res.json({ findings: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch findings', detail: error?.message });
  }
});

findingsRouter.post('/:id/resolve', async (req, res) => {
  try {
    const { decisionNote } = req.body;
    if (!decisionNote) {
      res.status(400).json({ error: 'decisionNote is required' });
      return;
    }

    if (req.user?.role === 'auditor') {
      res.status(403).json({ error: 'Auditors are strictly read-only.' });
      return;
    }

    const finding = await prisma.complianceFinding.findUnique({
      where: { id: req.params.id },
      include: { application: true },
    });

    if (!finding) {
      res.status(404).json({ error: 'Finding not found' });
      return;
    }

    const resolverName = req.user?.name || 'Dr. Arvind Deshmukh';

    const updated = await prisma.complianceFinding.update({
      where: { id: req.params.id },
      data: {
        lifecycleStatus: 'Resolved',
        resolvedAt: new Date(),
        resolvedBy: resolverName,
        resolutionNote: decisionNote,
      },
    });

    // If associated task exists, complete it
    if (finding.assignedTaskId) {
      await prisma.correctiveTask.update({
        where: { id: finding.assignedTaskId },
        data: {
          status: 'Completed',
          completedAt: new Date(),
          responseComment: `Finding resolved: ${decisionNote}`,
        },
      });
    }

    // Check if application has remaining unresolved critical findings
    const remainingCritical = await prisma.complianceFinding.count({
      where: {
        applicationId: finding.applicationId,
        severity: 'Critical',
        lifecycleStatus: { not: 'Resolved' },
      },
    });

    if (remainingCritical === 0) {
      await prisma.application.update({
        where: { id: finding.applicationId },
        data: {
          currentStage: 'Ready for authorized review',
          lastEvaluatedAt: new Date(),
        },
      });
    }

    await logAuditEvent({
      actorId: req.user?.id || 'USR-REV-01',
      actorName: resolverName,
      actorRole: req.user?.role || 'authorized_reviewer',
      action: 'FINDING_RESOLVED',
      entityType: 'ComplianceFinding',
      entityId: finding.id,
      applicationId: finding.applicationId,
      institutionId: finding.institutionId,
      previousState: finding.lifecycleStatus,
      newState: 'Resolved',
      evidenceReference: decisionNote,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.json({ success: true, finding: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resolve finding', detail: error?.message });
  }
});

// ==========================================
// FEATURE 4: FixPreview — Counterfactual Correction Sandbox
// ==========================================

// POST /api/findings/:id/fix-preview
findingsRouter.post('/:id/fix-preview', async (req, res) => {
  try {
    const findingId = req.params.id;
    const { proposedFieldKey, proposedValue } = req.body;

    if (!proposedValue) {
      res.status(400).json({ error: 'proposedValue is required for FixPreview sandbox simulation.' });
      return;
    }

    const finding = await prisma.complianceFinding.findUnique({
      where: { id: findingId },
      include: { application: true },
    });

    if (!finding) {
      res.status(404).json({ error: 'Finding not found' });
      return;
    }

    // Deterministic Counterfactual Evaluation
    let hypotheticalStatus = 'Would Resolve';
    let remainingConflicts: string[] = [];
    let requiredEvidenceGuidance = '';
    let previewOutcomeSummary = '';

    const clauseId = finding.clauseId;
    const normProposed = proposedValue.trim().toLowerCase();

    // Case 1a: Facility Completion / Handover Date (Statutory deadline: on or before 30-Jun-2026)
    if (
      finding.title.toLowerCase().includes('completion') ||
      finding.title.toLowerCase().includes('handover') ||
      finding.fieldKey === 'handover_completion_date'
    ) {
      const parsedProposed = new Date(proposedValue);
      const cutoffDate = new Date('2026-06-30');

      if (!isNaN(parsedProposed.getTime()) && parsedProposed <= cutoffDate) {
        hypotheticalStatus = 'Would Resolve';
        previewOutcomeSummary = `Hypothetically valid: Proposed handover/completion date ${proposedValue} is certified on or prior to the mandatory statutory readiness cutoff (30-Jun-2026). Mandatory deficiency would be lifted upon official document verification.`;
        requiredEvidenceGuidance = 'Submit certified Architect completion certificate and structural stability endorsement confirming completion on or prior to 30-Jun-2026.';
      } else {
        hypotheticalStatus = 'Conflict Remains';
        remainingConflicts.push(`Proposed completion date ${proposedValue} remains after the mandatory statutory readiness cutoff (30-Jun-2026).`);
        previewOutcomeSummary = `Hypothetical rejection: The proposed date ${proposedValue} does not satisfy APH 2026-27 norms requiring facility readiness prior to academic commencement.`;
        requiredEvidenceGuidance = 'Obtain expedited civil engineering completion certificate confirming readiness on or before 30-Jun-2026.';
      }
    }
    // Case 1b: Fire Safety NOC Expiry / Validity Date (Must remain valid on or after 30-Jun-2026)
    else if (clauseId.includes('4.2') || finding.title.toLowerCase().includes('fire') || finding.fieldKey === 'validity_expiry_date') {
      const parsedProposed = new Date(proposedValue);
      const cutoffDate = new Date('2026-06-30');

      if (!isNaN(parsedProposed.getTime()) && parsedProposed >= cutoffDate) {
        hypotheticalStatus = 'Would Resolve';
        previewOutcomeSummary = `Hypothetically valid: Proposed expiry date ${proposedValue} extends past the academic commencement cutoff (30-Jun-2026). Mandatory deficiency would be lifted upon official document verification.`;
        requiredEvidenceGuidance = 'Official Fire Safety NOC renewal certificate from the State Fire & Emergency Services Authority bearing competent digital signature and seal.';
      } else {
        hypotheticalStatus = 'Conflict Remains';
        remainingConflicts.push(`Proposed date ${proposedValue} remains before the mandatory statutory cutoff (30-Jun-2026).`);
        previewOutcomeSummary = `Hypothetical rejection: The proposed date ${proposedValue} does not satisfy APH 2026-27 norms requiring continuous validity through the academic term.`;
        requiredEvidenceGuidance = 'Obtain an amended NOC or formal extension letter valid at least until 30-Jun-2026.';
      }
    }
    // Case 2: Land Area / Built-Up Area
    else if (clauseId.includes('4.1') || finding.title.toLowerCase().includes('land') || finding.title.toLowerCase().includes('area')) {
      const areaMatch = proposedValue.match(/([0-9]+(?:\.[0-9]+)?)/);
      const numericVal = areaMatch ? parseFloat(areaMatch[1]) : 0;
      const isAcre = proposedValue.toLowerCase().includes('acre');
      const isSqm = proposedValue.toLowerCase().includes('sq') || proposedValue.toLowerCase().includes('meter');

      const convertedSqm = isAcre ? numericVal * 4046.86 : numericVal;

      if (convertedSqm >= 6000) { // AICTE urban technical campus norm ~1.5 - 2.5 acres (6000+ sq.m)
        hypotheticalStatus = 'Would Resolve';
        previewOutcomeSummary = `Hypothetically satisfied: Proposed area ${proposedValue} (${convertedSqm.toFixed(1)} sq.m) meets the prescribed minimum statutory norm for Engineering & Technical campuses.`;
        requiredEvidenceGuidance = 'Registered land title deed, revenue demarcation certificate, and approved architect campus site layout drawing.';
      } else {
        hypotheticalStatus = 'Conflict Remains';
        remainingConflicts.push(`Proposed area ${convertedSqm.toFixed(1)} sq.m is below the statutory threshold of 6,000 sq.m.`);
        previewOutcomeSummary = `Hypothetical deficiency: Proposed area is insufficient under APH 2026-CL-4.1.a.`;
        requiredEvidenceGuidance = 'Submit contiguous land registration documents or regional urban relaxation certificate.';
      }
    }
    // Case 3: Intake Capacity
    else if (clauseId.includes('3.1') || finding.title.toLowerCase().includes('intake')) {
      const proposedIntakeNum = parseInt(proposedValue, 10);
      if (proposedIntakeNum <= 180 && proposedIntakeNum > 0) {
        hypotheticalStatus = 'Would Resolve';
        previewOutcomeSummary = `Hypothetically aligned: Proposed intake of ${proposedIntakeNum} is consistent with program tier ceiling.`;
        requiredEvidenceGuidance = 'University affiliation concurrence letter and Governing Body resolution authorizing intake capacity.';
      } else {
        hypotheticalStatus = 'Conflict Remains';
        remainingConflicts.push(`Intake of ${proposedIntakeNum} exceeds single-program approval cap without NBA accreditation.`);
        previewOutcomeSummary = `Hypothetical rejection: National Board of Accreditation (NBA) Tier-1 certificate required for intake > 180 seats.`;
        requiredEvidenceGuidance = 'Provide valid NBA accreditation certificate for the program.';
      }
    } else {
      hypotheticalStatus = 'Partially Resolved';
      previewOutcomeSummary = `Hypothetical test: Proposed correction acknowledges the deficiency; requires counterpart document verification.`;
      requiredEvidenceGuidance = 'Statutory supporting documentation endorsed by the Institution Head.';
    }

    // Persist FixPreview record marked strictly as hypothetical
    const previewRecord = await prisma.fixPreview.create({
      data: {
        findingId: finding.id,
        applicationId: finding.applicationId,
        proposedFieldKey: proposedFieldKey || finding.fieldKey || 'generic_correction',
        originalValue: finding.extractedValue || 'None',
        proposedValue,
        isHypothetical: true,
        hypotheticalFindingStatus: hypotheticalStatus,
        remainingConflictsJson: JSON.stringify(remainingConflicts),
        requiredEvidenceGuidance,
        previewOutcomeSummary,
        createdBy: req.user?.name || 'Institution Compliance Officer',
      },
    });

    await logAuditEvent({
      actorId: req.user?.id || 'USR-ICO-01',
      actorName: req.user?.name || 'Institution Compliance Officer',
      actorRole: req.user?.role || 'institution_compliance_officer',
      action: 'FIX_PREVIEW_SIMULATED',
      entityType: 'FixPreview',
      entityId: previewRecord.id,
      applicationId: finding.applicationId,
      institutionId: finding.institutionId,
      evidenceReference: `Hypothetical preview test on Finding '${finding.title}': Proposed '${proposedValue}' -> Status: '${hypotheticalStatus}'. Production records unchanged.`,
      outcome: 'Success',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      previewId: previewRecord.id,
      findingId: finding.id,
      originalValue: finding.extractedValue,
      proposedValue,
      isHypothetical: true,
      hypotheticalStatus,
      remainingConflicts,
      requiredEvidenceGuidance,
      previewOutcomeSummary,
      notice: 'HYPOTHETICAL SIMULATION ONLY. Production records, official findings, and legal validation states remain unchanged until official replacement documents are uploaded and verified.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'FixPreview simulation failed', detail: error?.message });
  }
});

