import { Router } from 'express';
import { prisma } from '../db/prisma';

export const obligationsRouter = Router();

obligationsRouter.get('/', async (req, res) => {
  try {
    const { institutionId, applicationId, status } = req.query;
    const where: any = {};
    if (institutionId) where.institutionId = String(institutionId);
    if (applicationId) where.applicationId = String(applicationId);
    if (status && status !== 'ALL') where.status = String(status);

    const obligations = await prisma.complianceObligation.findMany({
      where,
      include: { institution: true, application: true },
      orderBy: { dueDate: 'asc' },
    });

    const formatted = obligations.map((o) => ({
      id: o.id,
      title: o.title,
      institutionId: o.institutionId,
      institutionName: o.institution.name,
      applicationId: o.applicationId,
      applicationCode: o.application.code,
      clauseId: o.clauseId,
      clauseNumber: o.clauseNumber,
      regulationRef: o.regulationRef,
      academicYear: o.academicYear,
      category: o.category,
      dueDate: o.dueDate.toISOString().split('T')[0],
      frequency: o.frequency,
      status: o.status,
      evidenceRequired: o.evidenceRequired,
      evidenceSubmitted: o.evidenceSubmitted,
      penaltyRisk: o.penaltyRisk,
      lastAssessedAt: o.lastAssessedAt.toISOString(),
    }));

    res.json({ obligations: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch obligations', detail: error?.message });
  }
});
