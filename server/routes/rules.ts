import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';

export const rulesRouter = Router();

rulesRouter.get('/', async (req, res) => {
  try {
    const { academicYear, status } = req.query;
    const where: any = {};
    if (academicYear && academicYear !== 'ALL') where.academicYear = String(academicYear);
    if (status && status !== 'ALL') where.status = String(status);

    const ruleSets = await prisma.ruleSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const clauses = await prisma.regulatoryClause.findMany({
      include: { source: true },
      orderBy: { clauseNumber: 'asc' },
    });

    const enrichedRuleSets = ruleSets.map((rs) => {
      const rsClauses = clauses.filter((c) => c.ruleSetId === rs.id);
      return {
        id: rs.id,
        title: rs.title,
        code: rs.code,
        edition: rs.edition,
        academicYear: rs.academicYear,
        version: rs.version,
        status: rs.status,
        description: rs.description,
        publishedAt: rs.publishedAt?.toISOString(),
        publishedBy: rs.publishedBy,
        publishedNote: rs.publishedNote,
        clausesCount: rsClauses.length,
        mandatoryClausesCount: rsClauses.filter((c) => c.isMandatory).length,
        clauses: rsClauses.map((c) => ({
          id: c.id,
          clauseNumber: c.clauseNumber,
          title: c.title,
          excerpt: c.excerpt,
          fullText: c.fullText,
          pageReference: c.pageReference,
          category: c.category,
          applicability: c.applicability,
          isMandatory: c.isMandatory,
          penaltyDescription: c.penaltyDescription,
          remediationGuidance: c.remediationGuidance,
          sourceDocumentTitle: c.source.title,
          sourceUrl: c.source.sourceUrl,
        })),
      };
    });

    res.json({ ruleSets: enrichedRuleSets, clauses });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch rules', detail: error?.message });
  }
});

rulesRouter.post('/:id/publish', async (req, res) => {
  try {
    const { approvalNote } = req.body;
    if (!approvalNote) {
      res.status(400).json({ error: 'approvalNote is required.' });
      return;
    }

    // Enforce authentication & role check: Only authenticated regulatory_system_administrator can publish
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required. Please log in as an authorized regulatory administrator.',
      });
      return;
    }

    if (req.user.role !== 'regulatory_system_administrator') {
      res.status(403).json({
        error: 'Only Regulatory System Administrators can publish approved rule sets.',
      });
      return;
    }

    const ruleSet = await prisma.ruleSet.findUnique({ where: { id: req.params.id } });
    if (!ruleSet) {
      res.status(404).json({ error: 'RuleSet not found' });
      return;
    }

    const publisher = req.user.name;

    const updated = await prisma.ruleSet.update({
      where: { id: req.params.id },
      data: {
        status: 'Published',
        publishedAt: new Date(),
        publishedBy: publisher,
        publishedNote: approvalNote,
      },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: publisher,
      actorRole: req.user.role,
      action: 'RULE_SET_PUBLISHED',
      entityType: 'RuleSet',
      entityId: ruleSet.id,
      previousState: ruleSet.status,
      newState: 'Published',
      evidenceReference: approvalNote,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.json({ success: true, ruleSet: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to publish rule set', detail: error?.message });
  }
});

// ==========================================
// FEATURE 2: RuleReplay — Regulatory Change Impact Simulator
// ==========================================

// POST /api/regulations/compare
rulesRouter.post('/compare', async (req, res) => {
  try {
    const { sourceRulesetCode = 'APH-2025-V1', targetRulesetCode = 'APH-2026-V2' } = req.body;

    const [sourceSet, targetSet] = await Promise.all([
      prisma.ruleSet.findFirst({ where: { code: sourceRulesetCode } }),
      prisma.ruleSet.findFirst({ where: { code: targetRulesetCode } }),
    ]);

    const [sourceClauses, targetClauses] = await Promise.all([
      sourceSet
        ? prisma.regulatoryClause.findMany({ where: { ruleSetId: sourceSet.id } })
        : prisma.regulatoryClause.findMany({ take: 3 }),
      targetSet
        ? prisma.regulatoryClause.findMany({ where: { ruleSetId: targetSet.id } })
        : prisma.regulatoryClause.findMany({ take: 5 }),
    ]);

    const { fastApiClient } = await import('../services/fastapi-service');
    const compareResult = await fastApiClient.compareRulesets({
      sourceRulesetCode,
      targetRulesetCode,
      sourceClauses: sourceClauses.map((c) => ({
        clauseNumber: c.clauseNumber,
        title: c.title,
        fullText: c.fullText,
        category: c.category,
      })),
      targetClauses: targetClauses.map((c) => ({
        clauseNumber: c.clauseNumber,
        title: c.title,
        fullText: c.fullText,
        category: c.category,
      })),
    });

    // Record comparison in DB
    const comparisonRecord = await prisma.rulesetComparison.create({
      data: {
        sourceRulesetId: sourceSet?.id || sourceRulesetCode,
        targetRulesetId: targetSet?.id || targetRulesetCode,
        comparisonSummary: compareResult.summary,
        changedClausesCount: compareResult.changedClausesCount,
        addedClausesCount: compareResult.addedClausesCount,
        removedClausesCount: compareResult.removedClausesCount,
        supersededClausesCount: compareResult.supersededClausesCount,
        clausesDiffJson: JSON.stringify(compareResult.diffs),
        performedBy: req.user?.name || 'Authorized Regulatory Administrator',
      },
    });

    res.json({
      success: true,
      comparisonId: comparisonRecord.id,
      comparison: compareResult,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Ruleset comparison failed', detail: error?.message });
  }
});

// POST /api/regulations/:version/replay
rulesRouter.post('/:version/replay', async (req, res) => {
  try {
    const rulesetVersion = req.params.version;
    const { targetRulesetCode = 'APH-2026-V2' } = req.body;

    const [applications, targetClauses] = await Promise.all([
      prisma.application.findMany({
        include: {
          documents: true,
          findings: true,
          institution: true,
        },
      }),
      prisma.regulatoryClause.findMany({
        take: 10,
      }),
    ]);

    const { fastApiClient } = await import('../services/fastapi-service');
    const replayResult = await fastApiClient.executeShadowReplay({
      rulesetVersion,
      targetRulesetCode,
      applications: applications.map((app) => ({
        id: app.id,
        code: app.code,
        programName: app.programName,
        currentStage: app.currentStage,
        officialOutcome: app.officialOutcome,
        requestedIntake: app.requestedIntake,
        findings: app.findings.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          discrepancyNote: f.discrepancyNote,
        })),
        documents: app.documents.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          currentVersion: d.currentVersion,
        })),
      })),
      newRulesetClauses: targetClauses.map((c) => ({
        clauseNumber: c.clauseNumber,
        title: c.title,
        fullText: c.fullText,
      })),
    });

    // Persist ImpactReport
    const impactReport = await prisma.impactReport.create({
      data: {
        title: replayResult.reportTitle,
        rulesetCode: targetRulesetCode,
        summary: replayResult.summary,
        totalApplicationsImpacted: replayResult.totalApplicationsImpacted,
        criticalFindingsDelta: replayResult.criticalFindingsDelta,
        majorFindingsDelta: replayResult.majorFindingsDelta,
        impactedApplicationIds: JSON.stringify(replayResult.impactedApplications.map((ia: any) => ia.applicationId)),
        remediationTasksJson: JSON.stringify(replayResult.remediationTasks),
        isPublished: false,
      },
    });

    // Save shadow evaluations for impacted applications
    for (const ia of replayResult.impactedApplications) {
      const app = applications.find((a) => a.id === ia.applicationId);
      if (app) {
        await prisma.shadowEvaluation.create({
          data: {
            rulesetVersion,
            targetApplicationId: app.id,
            institutionId: app.institutionId,
            oldOutcome: ia.currentOutcome,
            newOutcome: ia.shadowOutcome,
            diffReportJson: JSON.stringify(ia),
            affectedObligationsJson: JSON.stringify(ia.affectedClauseReferences || []),
            status: 'Shadow Complete',
            conductedBy: req.user?.name || 'Dr. Arvind Deshmukh',
          },
        });
      }
    }

    await logAuditEvent({
      actorId: req.user?.id || 'USR-SYS-01',
      actorName: req.user?.name || 'Regulatory Change Engine',
      actorRole: req.user?.role || 'regulatory_system_administrator',
      action: 'RULE_REPLAY_SHADOW_EVALUATED',
      entityType: 'RuleSet',
      entityId: targetRulesetCode,
      evidenceReference: `Shadow Replay evaluated ${replayResult.totalApplicationsTested} apps: ${replayResult.totalApplicationsImpacted} impacted. Draft kept unpublished pending authorized review.`,
      outcome: 'Success',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      reportId: impactReport.id,
      impactReport: {
        ...replayResult,
        id: impactReport.id,
        isDraft: !impactReport.isPublished,
        isPublished: impactReport.isPublished,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Rule replay simulation failed', detail: error?.message });
  }
});

// GET /api/regulations/impact-reports/:id
rulesRouter.get('/impact-reports/:id', async (req, res) => {
  try {
    const report = await prisma.impactReport.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      res.status(404).json({ error: 'Impact report not found' });
      return;
    }

    res.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        rulesetCode: report.rulesetCode,
        summary: report.summary,
        totalApplicationsImpacted: report.totalApplicationsImpacted,
        criticalFindingsDelta: report.criticalFindingsDelta,
        majorFindingsDelta: report.majorFindingsDelta,
        impactedApplicationIds: JSON.parse(report.impactedApplicationIds || '[]'),
        remediationTasks: JSON.parse(report.remediationTasksJson || '[]'),
        isDraft: !report.isPublished,
        isPublished: report.isPublished,
        publishedAt: report.publishedAt?.toISOString(),
        publishedBy: report.publishedBy,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch impact report', detail: error?.message });
  }
});

// POST /api/regulations/impact-reports/:id/publish
rulesRouter.post('/impact-reports/:id/publish', async (req, res) => {
  try {
    const { approvalNote } = req.body;
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required. Please log in as an authorized regulatory administrator.',
      });
      return;
    }

    const isAuthorized =
      req.user.role === 'regulatory_system_administrator' ||
      req.user.role === 'scrutiny_committee_lead' ||
      req.user.role === 'scrutiny_committee_member' ||
      req.user.role === 'system_admin';

    if (!isAuthorized) {
      res.status(403).json({ error: 'Only Authorized Regulatory Leads or Administrators can publish changes.' });
      return;
    }

    const report = await prisma.impactReport.findUnique({ where: { id: req.params.id } });
    if (!report) {
      res.status(404).json({ error: 'Impact report not found' });
      return;
    }

    const publisher = req.user.name;
    const updated = await prisma.impactReport.update({
      where: { id: req.params.id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: publisher,
      },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: publisher,
      actorRole: req.user.role,
      action: 'REGULATORY_CHANGE_PUBLISHED_FROM_REPLAY',
      entityType: 'ImpactReport',
      entityId: report.id,
      evidenceReference: approvalNote || 'Authorized sign-off and publication of shadow-evaluated regulatory change.',
      outcome: 'Success',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      report: {
        ...updated,
        isDraft: !updated.isPublished,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to publish impact report', detail: error?.message });
  }
});

