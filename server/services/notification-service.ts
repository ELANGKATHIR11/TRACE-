import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma';

export interface NotificationParams {
  applicationId?: string;
  institutionId: string;
  code: string;
  type: string;
  severity: 'Critical' | 'Major' | 'Moderate' | 'Observation';
  title: string;
  message: string;
  sourceClauseId: string;
  targetRole: string;
  recipientEmail?: string;
}

export async function createAndDispatchNotification(params: NotificationParams) {
  const channels: Array<{
    channel: string;
    status: 'DELIVERED' | 'PENDING_CONFIG' | 'FAILED';
    timestamp: string;
    note?: string;
  }> = [
    {
      channel: 'IN_APP',
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
    },
  ];

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass && params.recipientEmail) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@trace-regulatory.gov.in',
        to: params.recipientEmail,
        subject: `[TRACE Regulatory Alert] ${params.title}`,
        text: `${params.message}\n\nApplicable Clause: ${params.sourceClauseId}\nSeverity: ${params.severity}\nTRACE Automated Compliance Engine`,
      });

      channels.push({
        channel: 'EMAIL',
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        note: `Dispatched to ${params.recipientEmail}`,
      });
    } catch (err: any) {
      console.warn('[NotificationService] Email delivery failed:', err?.message);
      channels.push({
        channel: 'EMAIL',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        note: `SMTP delivery failed: ${err?.message || 'Connection error'}`,
      });
    }
  } else {
    // Truthful disclosure: no fabricated delivery
    channels.push({
      channel: 'EMAIL',
      status: 'PENDING_CONFIG',
      timestamp: new Date().toISOString(),
      note: 'SMTP credentials not configured in server environment (.env)',
    });
  }

  const alert = await prisma.alert.upsert({
    where: { code: params.code },
    update: {
      title: params.title,
      message: params.message,
      triggeredAt: new Date(),
      acknowledged: false,
      channels: JSON.stringify(channels),
    },
    create: {
      applicationId: params.applicationId,
      institutionId: params.institutionId,
      code: params.code,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      sourceClauseId: params.sourceClauseId,
      targetRole: params.targetRole,
      triggeredAt: new Date(),
      acknowledged: false,
      channels: JSON.stringify(channels),
    },
  });

  return alert;
}
