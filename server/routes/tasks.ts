import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';
import { createAndDispatchNotification } from '../services/notification-service';

export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  try {
    const { applicationId, institutionId, status } = req.query;
    const where: any = {};
    if (applicationId) where.applicationId = String(applicationId);
    if (institutionId) where.institutionId = String(institutionId);
    if (status && status !== 'ALL') where.status = String(status);

    const tasks = await prisma.correctiveTask.findMany({
      where,
      include: {
        application: true,
        institution: true,
        finding: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const formatted = tasks.map((t) => ({
      id: t.id,
      findingId: t.findingId,
      applicationId: t.applicationId,
      applicationCode: t.application.code,
      institutionId: t.institutionId,
      institutionName: t.institution.name,
      taskCode: t.taskCode,
      title: t.title,
      description: t.description,
      assigneeName: t.assigneeName,
      assigneeRole: t.assigneeRole,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate.toISOString().split('T')[0],
      requiredAction: t.requiredAction,
      responseComment: t.responseComment,
      completedAt: t.completedAt?.toISOString(),
      sourceClauseNumber: t.finding?.clauseNumber || 'Clause 4.2(b)',
      discrepancySummary: t.finding?.discrepancyNote || t.description,
    }));

    res.json({ tasks: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tasks', detail: error?.message });
  }
});

tasksRouter.post('/', async (req, res) => {
  try {
    const {
      findingId,
      applicationId,
      title,
      description,
      assigneeName,
      assigneeRole,
      priority,
      dueDate,
      requiredAction,
    } = req.body;

    if (!findingId || !applicationId || !title) {
      res.status(400).json({ error: 'findingId, applicationId, and title are required.' });
      return;
    }

    const finding = await prisma.complianceFinding.findUnique({
      where: { id: findingId },
      include: { application: true, institution: true },
    });

    if (!finding) {
      res.status(404).json({ error: 'Finding not found' });
      return;
    }

    const taskCount = await prisma.correctiveTask.count();
    const taskCode = `TSK-2026-0${840 + taskCount + 1}`;

    const existingTask = await prisma.correctiveTask.findFirst({
      where: { findingId },
    });

    let taskRecord: any;
    if (existingTask) {
      taskRecord = await prisma.correctiveTask.update({
        where: { id: existingTask.id },
        data: {
          title,
          description: description || `Corrective remediation for finding ${finding.title}`,
          assigneeName: assigneeName || 'Prof. Meera Krishnan',
          assigneeRole: assigneeRole || 'institution_compliance_officer',
          priority: priority || 'Urgent',
          status: 'Open',
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          requiredAction: requiredAction || 'Upload corrected evidence and run re-validation',
        },
      });
    } else {
      taskRecord = await prisma.correctiveTask.create({
        data: {
          id: taskCode,
          findingId,
          applicationId,
          institutionId: finding.institutionId,
          taskCode,
          title,
          description: description || `Corrective remediation for finding ${finding.title}`,
          assigneeName: assigneeName || 'Prof. Meera Krishnan',
          assigneeRole: assigneeRole || 'institution_compliance_officer',
          priority: priority || 'Urgent',
          status: 'Open',
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          requiredAction: requiredAction || 'Upload corrected evidence and run re-validation',
        },
      });
    }

    // Update finding to Task Assigned
    await prisma.complianceFinding.update({
      where: { id: findingId },
      data: {
        lifecycleStatus: 'Task Assigned',
        assignedTaskId: taskRecord.id,
      },
    });

    // Create notification alert
    await createAndDispatchNotification({
      applicationId,
      institutionId: finding.institutionId,
      code: `ALT-TASK-${taskRecord.taskCode}`,
      type: 'TASK_ASSIGNED',
      severity: priority === 'Urgent' ? 'Critical' : 'Major',
      title: `Corrective Task Assigned: ${taskRecord.title}`,
      message: `${taskRecord.requiredAction} (Due: ${dueDate || 'Within 5 days'}).`,
      sourceClauseId: finding.clauseId,
      targetRole: taskRecord.assigneeRole,
      recipientEmail: finding.institution.contactEmail,
    });

    await logAuditEvent({
      actorId: req.user?.id || 'USR-REV-01',
      actorName: req.user?.name || 'Dr. Arvind Deshmukh',
      actorRole: req.user?.role || 'authorized_reviewer',
      action: 'CORRECTIVE_TASK_CREATED',
      entityType: 'CorrectiveTask',
      entityId: taskRecord.id,
      applicationId,
      institutionId: finding.institutionId,
      newState: 'Open',
      evidenceReference: `Finding: ${finding.id}; Due: ${dueDate}`,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.status(201).json({ success: true, task: taskRecord, taskId: taskRecord.id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create task', detail: error?.message });
  }
});

tasksRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status, comment } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const task = await prisma.correctiveTask.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updated = await prisma.correctiveTask.update({
      where: { id: req.params.id },
      data: {
        status,
        responseComment: comment || task.responseComment,
        completedAt: status === 'Completed' ? new Date() : undefined,
      },
    });

    await logAuditEvent({
      actorId: req.user?.id || 'USR-ICO-01',
      actorName: req.user?.name || 'Prof. Meera Krishnan',
      actorRole: req.user?.role || 'institution_compliance_officer',
      action: 'TASK_STATUS_UPDATED',
      entityType: 'CorrectiveTask',
      entityId: task.id,
      applicationId: task.applicationId,
      institutionId: task.institutionId,
      previousState: task.status,
      newState: status,
      evidenceReference: comment,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.json({ success: true, task: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update task', detail: error?.message });
  }
});
