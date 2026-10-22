import { Router } from 'express';
import { prisma } from '../db/prisma';

export const auditRouter = Router();

auditRouter.get('/', async (req, res) => {
  try {
    const { action, actorRole, applicationId, institutionId, limit = '100' } = req.query;
    const where: any = {};
    if (action && action !== 'ALL') where.action = String(action);
    if (actorRole && actorRole !== 'ALL') where.actorRole = String(actorRole);
    if (applicationId) where.applicationId = String(applicationId);
    if (institutionId) where.institutionId = String(institutionId);

    const auditEvents = await prisma.auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(Number(limit), 200),
    });

    const formatted = auditEvents.map((a) => ({
      id: a.id,
      timestamp: a.timestamp.toISOString(),
      actorName: a.actorName,
      actorRole: a.actorRole,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      applicationId: a.applicationId,
      institutionId: a.institutionId,
      previousState: a.previousState,
      newState: a.newState,
      ruleVersion: a.ruleVersion,
      evidenceReference: a.evidenceReference,
      outcome: a.outcome,
      ipAddress: a.ipAddress,
    }));

    res.json({ auditEvents: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit events', detail: error?.message });
  }
});
