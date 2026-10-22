import { Router } from 'express';
import { prisma } from '../db/prisma';

export const alertsRouter = Router();

alertsRouter.get('/', async (req, res) => {
  try {
    const { institutionId, applicationId, acknowledged } = req.query;
    const where: any = {};
    if (institutionId) where.institutionId = String(institutionId);
    if (applicationId) where.applicationId = String(applicationId);
    if (acknowledged !== undefined && acknowledged !== 'ALL') {
      where.acknowledged = acknowledged === 'true';
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: { institution: true, application: true },
      orderBy: { triggeredAt: 'desc' },
    });

    const formatted = alerts.map((a) => ({
      id: a.id,
      applicationId: a.applicationId,
      applicationCode: a.application?.code || 'SYSTEM-WIDE',
      institutionId: a.institutionId,
      institutionName: a.institution.name,
      code: a.code,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      sourceClauseId: a.sourceClauseId,
      targetRole: a.targetRole,
      triggeredAt: a.triggeredAt.toISOString(),
      acknowledged: a.acknowledged,
      acknowledgedAt: a.acknowledgedAt?.toISOString(),
      acknowledgedBy: a.acknowledgedBy,
      channels: typeof a.channels === 'string' ? JSON.parse(a.channels) : a.channels,
    }));

    res.json({ alerts: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch alerts', detail: error?.message });
  }
});

alertsRouter.post('/:id/acknowledge', async (req, res) => {
  try {
    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?.name || 'Dr. Arvind Deshmukh',
      },
    });
    res.json({ success: true, alert: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to acknowledge alert', detail: error?.message });
  }
});

alertsRouter.post('/:id/retry', async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const channels = typeof alert.channels === 'string' ? JSON.parse(alert.channels) : alert.channels;
    const updatedChannels = channels.map((c: any) => {
      if (c.status === 'FAILED' || c.status === 'PENDING_CONFIG') {
        return {
          ...c,
          status: 'PENDING_CONFIG',
          timestamp: new Date().toISOString(),
          note: 'Retry scheduled — awaiting external SMTP delivery configuration.',
        };
      }
      return c;
    });

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { channels: JSON.stringify(updatedChannels) },
    });

    res.json({ success: true, alert: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retry delivery', detail: error?.message });
  }
});
