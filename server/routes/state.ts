import { Router } from 'express';
import { prisma } from '../db/prisma';

export const stateRouter = Router();

stateRouter.get('/', async (req, res) => {
  try {
    const [
      users,
      institutions,
      applications,
      documents,
      findings,
      tasks,
      obligations,
      alerts,
      auditEvents,
      ruleSets,
      clauses,
      claims,
      claimRelationships,
      reviewPriorities,
      impactReports,
      validationManifests,
      reprocessingLogs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          roleLabel: true,
          title: true,
          organization: true,
          institutionId: true,
          email: true,
          badgeCode: true,
          permissionsDescription: true,
        },
      }),
      prisma.institution.findMany({
        include: {
          applications: true,
          findings: { where: { lifecycleStatus: { not: 'Resolved' } } },
          obligations: {
            where: {
              status: { in: ['Upcoming', 'Awaiting evidence', 'Under remediation', 'Overdue'] },
            },
          },
        },
      }),
      prisma.application.findMany({
        include: {
          institution: true,
          documents: true,
          findings: true,
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.document.findMany({
        include: {
          versions: true,
          pages: true,
          boundingBoxes: true,
          extractedFields: true,
          reviewerNotes: true,
        },
        orderBy: { uploadedAt: 'desc' },
      }),
      prisma.complianceFinding.findMany({
        include: { application: true, institution: true, assignedTask: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.correctiveTask.findMany({
        include: { application: true, institution: true, finding: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.complianceObligation.findMany({
        include: { institution: true, application: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.alert.findMany({
        include: { institution: true, application: true },
        orderBy: { triggeredAt: 'desc' },
      }),
      prisma.auditEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      prisma.ruleSet.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.regulatoryClause.findMany({
        include: { source: true },
        orderBy: { clauseNumber: 'asc' },
      }),
      prisma.claim.findMany({
        include: { document: true },
      }),
      prisma.claimRelationship.findMany({
        include: { sourceClaim: true, targetClaim: true },
      }),
      prisma.reviewPriority.findMany({
        orderBy: { priorityScore: 'desc' },
      }),
      prisma.impactReport.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.validationManifest.findMany({
        orderBy: { signedAt: 'desc' },
      }),
      prisma.reprocessingLog.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Current user resolution
    const currentUser =
      (req.user as any) ||
      users.find((u) => u.role === 'authorized_reviewer') ||
      users[0];

    // Format institutions
    const formattedInstitutions = institutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      permanentId: inst.code,
      type: inst.type,
      state: inst.region.split('(')[1]?.replace(')', '') || 'Maharashtra',
      city: inst.address.includes('Pune') ? 'Pune' : inst.address.includes('Mysuru') ? 'Mysuru' : 'Hyderabad',
      address: inst.address,
      establishedYear: inst.establishedYear,
      campusAreaAcres: 12.4,
      builtUpAreaSqm: 28450,
      applicableCategories: [
        'Extension of Approval (EoA)',
        'Increase in Intake',
        'New Technical Program',
      ],
      programs: [
        {
          id: 'PRG-01',
          name: 'B.Tech — Computer Science & Engineering (AI & Data Engineering)',
          level: 'UG (B.Tech / B.Pharm)',
          sanctionedIntake: 180,
          facultyCount: 14,
          accreditationStatus: inst.accreditationStatus,
        },
      ],
      complianceContacts: [
        {
          name: 'Prof. Meera Krishnan',
          designation: 'Dean of Regulatory Compliance',
          role: 'Primary Nodal Officer',
          email: inst.contactEmail,
          phone: inst.contactPhone,
        },
      ],
      openFindingsCount: inst.findings.length,
      upcomingObligationsCount: inst.obligations.length,
      checklistCompletionPct: inst.findings.length === 0 ? 100 : 82,
    }));

    // Format applications
    const formattedApplications = applications.map((app) => {
      const mandatoryFindings = app.findings.filter((f) => f.severity === 'Critical' && f.lifecycleStatus !== 'Resolved');
      const validatedDocs = app.documents.filter((d) => d.validationState === 'Validated');

      return {
        id: app.id,
        code: app.code,
        institutionId: app.institutionId,
        institutionName: app.institution.name,
        category: app.category,
        academicYear: app.academicYear,
        programName: app.programName,
        requestedIntake: app.requestedIntake,
        currentIntake: app.currentIntake,
        workflowStage: app.currentStage,
        officialOutcome: app.officialOutcome,
        submissionState:
          app.currentStage === 'Review completed' || app.currentStage === 'Authorized outcome recorded'
            ? 'Officially Recorded'
            : 'Under Active Verification',
        assignedReviewerName: 'Dr. Arvind Deshmukh',
        assignedReviewerId: 'USR-REV-01',
        priority: mandatoryFindings.length > 0 ? 'Critical' : 'Standard',
        submittedAt: app.submittedAt?.toISOString() || new Date().toISOString(),
        lastActivityAt: app.lastEvaluatedAt?.toISOString() || new Date().toISOString(),
        slaDueDate: '2026-10-26',
        ageingDays: Math.floor(
          (Date.now() - (app.submittedAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
        ),
        ruleSetId: app.ruleSetId,
        ruleVersion: 'APH 2026-27 v2.0 (Published)',
        unresolvedFindingsCount: app.findings.filter((f) => f.lifecycleStatus !== 'Resolved').length,
        mandatoryFindingsCount: mandatoryFindings.length,
        documentsCount: app.documents.length,
        validatedDocumentsCount: validatedDocs.length,
        requiredNextAction:
          mandatoryFindings.length > 0
            ? mandatoryFindings[0].discrepancyNote
            : 'All mandatory evidence checks and human review completed',
        versionHistory: [
          {
            version: 'v1.0',
            timestamp: app.submittedAt?.toISOString() || new Date().toISOString(),
            actor: 'Institution Nodal Officer',
            stage: app.currentStage,
            summary: `Application submitted for ${app.programName}.`,
          },
        ],
      };
    });

    // Format documents
    const formattedDocuments = documents.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      expiryDate: doc.expiryDate?.toISOString().split('T')[0],
      pages: doc.pages.map((p) => ({
        ...p,
        bodyLines: typeof p.bodyLines === 'string' ? JSON.parse(p.bodyLines) : p.bodyLines,
      })),
      versions: doc.versions.map((v) => ({
        ...v,
        uploadedAt: v.uploadedAt.toISOString(),
        sha256Preview: `${v.sha256.slice(0, 8)}...${v.sha256.slice(-8)}`,
      })),
      reviewerNotes: doc.reviewerNotes.map((n) => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
      })),
    }));

    // Format findings
    const formattedFindings = findings.map((f) => ({
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

    // Format tasks
    const formattedTasks = tasks.map((t) => ({
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

    // Format obligations
    const formattedObligations = obligations.map((o) => ({
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

    // Format alerts
    const formattedAlerts = alerts.map((a) => {
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

      // Map DB severity to frontend severity lowercase
      const sevLower = a.severity.toLowerCase();
      const severity = (sevLower === 'critical' ? 'critical' : sevLower === 'major' || sevLower === 'warning' ? 'warning' : 'info') as 'critical' | 'warning' | 'info';

      // Map eventType
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

    // Format audit events
    const formattedAudit = auditEvents.map((a) => {
      const actionType = a.action || 'APPLICATION_CREATED';
      const actionLabel = a.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
      const entityLabel = `${a.entityType} ${a.entityId}`;

      return {
        id: a.id,
        timestamp: a.timestamp.toISOString(),
        actorName: a.actorName,
        actorRole: a.actorRole,
        action: a.action,
        actionType,
        actionLabel,
        entityType: (a.entityType as any) || 'Application',
        entityId: a.entityId,
        entityLabel,
        applicationId: a.applicationId,
        institutionId: a.institutionId,
        previousState: a.previousState || undefined,
        newState: a.newState || undefined,
        ruleVersion: a.ruleVersion,
        evidenceReference: a.evidenceReference,
        evidenceOrRuleRef: a.evidenceReference || a.ruleVersion || undefined,
        outcome: a.outcome,
        ipAddress: a.ipAddress,
        correlationId: `CORR-${a.id}`,
        isDemoAction: true,
      };
    });

    // Format rule sets
    const formattedRuleSets = ruleSets.map((rs) => {
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

    res.json({
      engineMode: 'live_ai',
      currentUser,
      users,
      institutions: formattedInstitutions,
      applications: formattedApplications,
      documents: formattedDocuments,
      findings: formattedFindings,
      tasks: formattedTasks,
      requirements: formattedObligations,
      alerts: formattedAlerts,
      auditEvents: formattedAudit,
      ruleSets: formattedRuleSets,
      copilotHistory: [],
      claims,
      claimRelationships,
      reviewPriorities,
      impactReports,
      validationManifests,
      reprocessingLogs,
    });
  } catch (error: any) {
    console.error('[StateAPI] Failed to assemble state:', error);
    res.status(500).json({ error: 'Failed to assemble state from PostgreSQL', detail: error?.message });
  }
});
