import { prisma } from '../db/prisma';

export interface AuditParams {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  applicationId?: string;
  institutionId?: string;
  previousState?: string;
  newState?: string;
  ruleVersion?: string;
  evidenceReference?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome?: string;
}

export async function logAuditEvent(params: AuditParams) {
  try {
    const auditRecord = await prisma.auditEvent.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        applicationId: params.applicationId,
        institutionId: params.institutionId,
        previousState: params.previousState,
        newState: params.newState,
        ruleVersion: params.ruleVersion || 'APH 2026-27 v2.0',
        evidenceReference: params.evidenceReference,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        outcome: params.outcome || 'Success',
      },
    });
    return auditRecord;
  } catch (error) {
    console.error('[AuditService] Failed to persist audit event:', error);
    return null;
  }
}
