import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';

export const reviewQueueRouter = Router();

// GET /api/review-queue/prioritized
reviewQueueRouter.get('/prioritized', async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        institution: true,
        documents: true,
        findings: {
          where: { lifecycleStatus: { not: 'Resolved' } },
        },
        obligations: true,
        claimRelationships: {
          where: { status: 'Open' },
        },
      },
    });

    const { fastApiClient } = await import('../services/fastapi-service');
    const priorityResult = await fastApiClient.prioritizeReviewQueue({
      applications: applications.map((app) => ({
        id: app.id,
        code: app.code,
        programName: app.programName,
        currentStage: app.currentStage,
        submittedAt: app.submittedAt?.toISOString(),
        findings: app.findings.map((f) => ({
          id: f.id,
          severity: f.severity,
          lifecycleStatus: f.lifecycleStatus,
        })),
        contradictions: app.claimRelationships.map((cr) => ({
          id: cr.id,
          severity: cr.severity,
          status: cr.status,
        })),
        documents: app.documents.map((d) => ({
          id: d.id,
          ocrConfidenceAvg: d.ocrConfidenceAvg,
        })),
        obligations: app.obligations.map((o) => ({
          id: o.id,
          status: o.status,
          dueDate: o.dueDate.toISOString(),
        })),
      })),
    });

    // Persist priority records in DB
    if (priorityResult.items && Array.isArray(priorityResult.items)) {
      for (const item of priorityResult.items) {
        await prisma.reviewPriority.upsert({
          where: { applicationId: item.applicationId },
          update: {
            priorityScore: item.priorityScore,
            rank: item.rank,
            urgencyBand: item.urgencyBand,
            scoringFactorsJson: JSON.stringify(item.scoringFactors),
            explanationText: item.explanationText,
            assignedReviewerId: item.assignedReviewerId,
            assignedReviewerName: item.assignedReviewerName,
            reviewerWorkload: item.reviewerWorkload,
            calculatedAt: new Date(),
          },
          create: {
            applicationId: item.applicationId,
            priorityScore: item.priorityScore,
            rank: item.rank,
            urgencyBand: item.urgencyBand,
            scoringFactorsJson: JSON.stringify(item.scoringFactors),
            explanationText: item.explanationText,
            assignedReviewerId: item.assignedReviewerId,
            assignedReviewerName: item.assignedReviewerName,
            reviewerWorkload: item.reviewerWorkload,
          },
        });
      }
    }

    res.json(priorityResult);
  } catch (error: any) {
    res.status(500).json({ error: 'Review queue prioritization failed', detail: error?.message });
  }
});
