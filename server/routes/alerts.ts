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

    const formatted = alerts.map((a) => {
      let parsedChannels: any[] = [];
      try {
        if (typeof a.channels === 'string') {
          parsedChannels = JSON.parse(a.channels);
        } else if (Array.isArray(a.channels)) {
          parsedChannels = a.channels;
        }
      } catch {
        parsedChannels = [];
      }

      const deliveryChannels = (Array.isArray(parsedChannels) && parsedChannels.length > 0)
        ? parsedChannels.map((ch: any) => ({
            channel: ch.channel === 'IN_APP' ? 'In-App Console' : ch.channel === 'EMAIL' ? 'Institutional Email Relay (Simulated)' : (ch.channel || 'In-App Console'),
            status: ch.status === 'DELIVERED' ? 'Delivered' : ch.status === 'PENDING_CONFIG' ? 'Simulated Local Only' : (ch.status || 'Delivered'),
            recipient: ch.recipient || a.targetRole || 'Compliance Lead',
            lastAttemptAt: ch.timestamp || ch.lastAttemptAt || a.triggeredAt.toISOString(),
          }))
        : [
            {
              channel: 'In-App Console',
              status: 'Delivered',
              recipient: a.targetRole || 'Compliance Lead',
              lastAttemptAt: a.triggeredAt.toISOString(),
            },
          ];

      const sevLower = a.severity.toLowerCase();
      const severity = (sevLower === 'critical' ? 'critical' : sevLower === 'major' || sevLower === 'warning' ? 'warning' : 'info') as 'critical' | 'warning' | 'info';

      let eventType = 'Document Inconsistency';
      if (a.type === 'MISSING_EVIDENCE') eventType = 'Missing Mandatory Evidence';
      else if (a.type === 'OVERDUE_TASK') eventType = 'Overdue Task';
      else if (a.type === 'DISCREPANCY_FLAG') eventType = 'Document Inconsistency';
      else if (a.type) eventType = a.type;

      return {
        id: a.id,
        code: a.code,
        title: a.title,
        message: a.message,
        severity,
        eventType,
        createdAt: a.triggeredAt.toISOString(),
        dueDate: undefined,
        applicationId: a.applicationId,
        applicationCode: a.application?.code || 'SYSTEM-WIDE',
        institutionId: a.institutionId,
        institutionName: a.institution.name,
        sourceClauseId: a.sourceClauseId,
        targetRole: a.targetRole,
        assignedOwner: a.targetRole || 'Assigned Officer',
        recommendedAction: 'Inspect affected finding and verify compliance with regulatory clause ' + (a.sourceClauseId || ''),
        isRead: a.acknowledged,
        acknowledged: a.acknowledged,
        acknowledgedAt: a.acknowledgedAt?.toISOString(),
        acknowledgedBy: a.acknowledgedBy,
        escalationLevel: 'None' as const,
        channels: deliveryChannels,
        deliveryChannels,
      };
    });

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
