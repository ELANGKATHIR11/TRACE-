import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';
import { assertTenantAccess } from '../middleware/auth';

export const applicationsRouter = Router();

applicationsRouter.get('/', async (req, res) => {
  try {
    const { academicYear, category, institutionId, stage } = req.query;

    const isInstUser =
      req.user &&
      ['institution_compliance_officer', 'institution_administrator'].includes(req.user.role) &&
      req.user.institutionId;

    if (
      isInstUser &&
      institutionId &&
      institutionId !== 'ALL' &&
      String(institutionId) !== req.user?.institutionId
    ) {
      res.status(403).json({
        error: `Tenant isolation violation: Cannot query applications for institution ${institutionId}.`,
      });
      return;
    }

    const whereClause: any = {};
    if (academicYear && academicYear !== 'ALL') whereClause.academicYear = String(academicYear);
    if (category && category !== 'ALL') whereClause.category = String(category);
    if (isInstUser) {
      whereClause.institutionId = req.user!.institutionId;
    } else if (institutionId && institutionId !== 'ALL') {
      whereClause.institutionId = String(institutionId);
    }
    if (stage && stage !== 'ALL') whereClause.currentStage = String(stage);

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        institution: true,
        documents: true,
        findings: {
          where: { lifecycleStatus: { not: 'Resolved' } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const enriched = applications.map((app) => {
      const mandatoryFindings = app.findings.filter((f) => f.severity === 'Critical');
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
        unresolvedFindingsCount: app.findings.length,
        mandatoryFindingsCount: mandatoryFindings.length,
        documentsCount: app.documents.length,
        validatedDocumentsCount: validatedDocs.length,
        requiredNextAction:
          app.findings.length > 0
            ? app.findings[0].discrepancyNote
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

    res.json({ applications: enriched });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch applications', detail: error?.message });
  }
});

applicationsRouter.get('/:id', async (req, res) => {
  try {
    const app = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        institution: true,
        documents: {
          include: {
            extractedFields: true,
            boundingBoxes: true,
            pages: true,
            versions: true,
          },
        },
        findings: true,
        tasks: true,
        obligations: true,
        auditEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (!assertTenantAccess(req, res, app.institutionId, 'application')) {
      return;
    }

    res.json({ application: app });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch application', detail: error?.message });
  }
});

applicationsRouter.post('/', async (req, res) => {
  try {
    const {
      institutionId,
      category,
      academicYear,
      programName,
      requestedIntake,
      currentIntake,
      ruleSetId,
      submitImmediately,
      uploadedFiles,
    } = req.body;

    if (!institutionId || !category || !programName) {
      res.status(400).json({ error: 'institutionId, category, and programName are required.' });
      return;
    }

    if (!assertTenantAccess(req, res, institutionId, 'institution application intake')) {
      return;
    }

    const appCount = await prisma.application.count();
    const newCode = `APP-2026-0${840 + appCount + 1}`;
    const initialStage = submitImmediately ? 'Validation in progress' : 'Draft';

    const newApp = await prisma.application.create({
      data: {
        id: newCode,
        code: newCode,
        institutionId,
        category,
        academicYear: academicYear || '2026-27',
        programName,
        requestedIntake: Number(requestedIntake || 60),
        currentIntake: Number(currentIntake || 0),
        ruleSetId: ruleSetId || 'RS-APH-2026-V2',
        currentStage: initialStage,
        officialOutcome: 'Not yet issued (Internal workflow active)',
        submittedAt: submitImmediately ? new Date() : null,
      },
    });

    if (Array.isArray(uploadedFiles)) {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const f = uploadedFiles[i];
        const docId = `DOC-2026-${Date.now().toString().slice(-4)}-${i + 1}`;
        await prisma.document.create({
          data: {
            id: docId,
            applicationId: newApp.id,
            institutionId,
            title: f.title || `Document ${i + 1}`,
            category: 'Infrastructure',
            fileType: 'PDF',
            fileName: f.fileName || `document_${i + 1}.pdf`,
            fileSize: f.fileSize || '1.8 MB',
            sha256: `sha256_${Date.now()}_${i}`,
            uploadedBy: req.user?.name || 'Institution Compliance Officer',
            requiredByClauseId: f.clauseId || 'APH-2026-CL-4.2.b',
            validationState: 'Needs manual review',
          },
        });
      }
    }

    await logAuditEvent({
      actorId: req.user?.id || 'USR-ICO-01',
      actorName: req.user?.name || 'Prof. Meera Krishnan',
      actorRole: req.user?.role || 'institution_compliance_officer',
      action: 'APPLICATION_CREATED',
      entityType: 'Application',
      entityId: newApp.id,
      applicationId: newApp.id,
      institutionId,
      newState: initialStage,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.status(201).json({ success: true, application: newApp, applicationId: newApp.id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create application', detail: error?.message });
  }
});

applicationsRouter.patch('/:id/stage', async (req, res) => {
  try {
    const { newStage, note } = req.body;
    if (!newStage) {
      res.status(400).json({ error: 'newStage is required' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { findings: { where: { lifecycleStatus: { not: 'Resolved' } } } },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (!assertTenantAccess(req, res, application.institutionId, 'application workflow stage')) {
      return;
    }

    // Role enforcement: Auditor cannot transition
    if (req.user?.role === 'auditor') {
      res.status(403).json({ error: 'Auditors are strictly read-only.' });
      return;
    }

    // Official approval / review completion requires authorized reviewer or sysadmin
    if (
      (newStage === 'Review completed' || newStage === 'Authorized outcome recorded') &&
      req.user &&
      !['authorized_reviewer', 'regulatory_system_administrator'].includes(req.user.role)
    ) {
      res.status(403).json({
        error: 'Only Authorized Reviewers or System Administrators can record formal outcome decisions.',
      });
      return;
    }

    // Check mandatory blocker
    const criticalFindings = application.findings.filter((f) => f.severity === 'Critical');
    if (criticalFindings.length > 0 && (newStage === 'Review completed' || newStage === 'Authorized outcome recorded')) {
      res.status(400).json({
        error: `Cannot complete review: ${criticalFindings.length} Critical finding(s) remain unresolved.`,
      });
      return;
    }

    let officialOutcome = application.officialOutcome;
    if (newStage === 'Review completed') {
      officialOutcome = 'EoA Recommended by Scrutiny Committee';
    } else if (newStage === 'Authorized outcome recorded') {
      officialOutcome = 'Official Approval Recorded';
    } else if (newStage === 'Corrections required') {
      officialOutcome = 'Deficiency Notice Issued';
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        currentStage: newStage,
        officialOutcome,
        lastEvaluatedAt: new Date(),
      },
    });

    await logAuditEvent({
      actorId: req.user?.id || 'USR-REV-01',
      actorName: req.user?.name || 'Dr. Arvind Deshmukh',
      actorRole: req.user?.role || 'authorized_reviewer',
      action: 'WORKFLOW_STAGE_TRANSITION',
      entityType: 'Application',
      entityId: application.id,
      applicationId: application.id,
      institutionId: application.institutionId,
      previousState: application.currentStage,
      newState: newStage,
      evidenceReference: note || 'Workflow progression recorded by reviewer',
      outcome: 'Success',
      ipAddress: req.ip,
    });

    res.json({ success: true, application: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to transition application stage', detail: error?.message });
  }
});

// ==========================================
// FEATURE 1: ChronoGraph — Claim & Contradiction Graph Endpoints
// ==========================================

// POST /api/applications/:id/analyze
applicationsRouter.post('/:id/analyze', async (req, res) => {
  try {
    const applicationId = req.params.id;
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        institution: true,
        documents: {
          include: {
            pages: true,
            extractedFields: true,
          },
        },
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (!assertTenantAccess(req, res, application.institutionId, 'application claim analysis')) {
      return;
    }

    // Prepare documents payload for FastAPI
    const docsPayload = application.documents.map((doc) => {
      return {
        id: doc.id,
        title: doc.title,
        version: doc.currentVersion,
        category: doc.category,
        pages: doc.pages.map((p) => ({
          pageNumber: p.pageNumber,
          bodyLines: (() => {
            try {
              return JSON.parse(p.bodyLines);
            } catch {
              return [p.bodyLines];
            }
          })(),
        })),
      };
    });

    // 1. Extract claims via FastAPI Document-AI engine
    const { fastApiClient } = await import('../services/fastapi-service');
    const claimResult = await fastApiClient.extractClaims({
      applicationId: application.id,
      institutionId: application.institutionId,
      documents: docsPayload,
    });

    // Persist claims to DB
    const savedClaims: any[] = [];
    if (claimResult.claims && Array.isArray(claimResult.claims)) {
      // Clear existing claims for clean re-analysis
      await prisma.claimRelationship.deleteMany({ where: { applicationId } });
      await prisma.claim.deleteMany({ where: { applicationId } });

      for (const c of claimResult.claims) {
        const saved = await prisma.claim.create({
          data: {
            applicationId: application.id,
            institutionId: application.institutionId,
            documentId: c.documentId,
            documentVersion: c.documentVersion || 'v1.0',
            claimType: c.claimType,
            claimKey: c.claimKey,
            rawValue: c.rawValue,
            normalizedValue: c.normalizedValue,
            pageNumber: c.pageNumber || 1,
            confidence: c.confidence || 0.95,
            relevantDate: c.relevantDate ? new Date(c.relevantDate) : null,
            ruleReferences: c.ruleReferences,
            reviewStatus: 'Unreviewed',
          },
        });
        savedClaims.push(saved);
      }
    }

    // 2. Detect Cross-Document Contradictions
    const contradictionResult = await fastApiClient.detectContradictions({
      applicationId: application.id,
      academicYear: application.academicYear,
      claims: savedClaims.map((sc) => ({
        id: sc.id,
        claimKey: sc.claimKey,
        claimType: sc.claimType,
        rawValue: sc.rawValue,
        normalizedValue: sc.normalizedValue,
        documentId: sc.documentId,
        documentTitle: application.documents.find((d) => d.id === sc.documentId)?.title || 'Document',
        pageNumber: sc.pageNumber,
      })),
    });

    // Persist contradiction relationships
    const savedContradictions: any[] = [];
    if (contradictionResult.contradictions && Array.isArray(contradictionResult.contradictions)) {
      for (const item of contradictionResult.contradictions) {
        const sourceClaim = savedClaims.find((sc) => sc.id === item.sourceClaim?.id) || savedClaims[0];
        const targetClaim = savedClaims.find((sc) => sc.id === item.targetClaim?.id) || savedClaims[savedClaims.length - 1] || sourceClaim;

        if (sourceClaim && targetClaim) {
          const rel = await prisma.claimRelationship.create({
            data: {
              applicationId: application.id,
              sourceClaimId: sourceClaim.id,
              targetClaimId: targetClaim.id,
              relationType: item.relationType,
              severity: item.severity || 'Moderate',
              explanation: item.explanation,
              sourceValueSummary: item.sourceValueSummary,
              targetValueSummary: item.targetValueSummary,
              status: 'Open',
              sourceEvidenceDocTitle: item.sourceEvidenceDocTitle,
              sourceEvidencePage: item.sourceEvidencePage,
              targetEvidenceDocTitle: item.targetEvidenceDocTitle,
              targetEvidencePage: item.targetEvidencePage,
            },
          });
          savedContradictions.push(rel);
        }
      }
    }

    await logAuditEvent({
      actorId: req.user?.id || 'USR-SYS-01',
      actorName: req.user?.name || 'Document-AI Engine',
      actorRole: req.user?.role || 'regulatory_system_administrator',
      action: 'CHRONOGRAPH_ANALYSIS_EXECUTED',
      entityType: 'Application',
      entityId: application.id,
      applicationId: application.id,
      institutionId: application.institutionId,
      evidenceReference: `Extracted ${savedClaims.length} claims; detected ${savedContradictions.length} contradictions.`,
      outcome: 'Success',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      applicationId: application.id,
      totalClaims: savedClaims.length,
      claims: savedClaims,
      totalContradictions: savedContradictions.length,
      contradictions: savedContradictions,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'ChronoGraph analysis failed', detail: error?.message });
  }
});

// GET /api/applications/:id/claim-graph
applicationsRouter.get('/:id/claim-graph', async (req, res) => {
  try {
    const applicationId = req.params.id;
    const [claims, relationships, app] = await Promise.all([
      prisma.claim.findMany({
        where: { applicationId },
        include: { document: true },
        orderBy: { pageNumber: 'asc' },
      }),
      prisma.claimRelationship.findMany({
        where: { applicationId },
        include: {
          sourceClaim: { include: { document: true } },
          targetClaim: { include: { document: true } },
        },
      }),
      prisma.application.findUnique({ where: { id: applicationId } }),
    ]);

    if (app && !assertTenantAccess(req, res, app.institutionId, 'application claim graph')) {
      return;
    }

    // Format nodes and edges
    const nodes = claims.map((c) => ({
      id: c.id,
      label: `${c.claimKey}: ${c.normalizedValue}`,
      claimType: c.claimType,
      claimKey: c.claimKey,
      rawValue: c.rawValue,
      normalizedValue: c.normalizedValue,
      documentId: c.documentId,
      documentTitle: c.document.title,
      pageNumber: c.pageNumber,
      confidence: c.confidence,
      reviewStatus: c.reviewStatus,
    }));

    const edges = relationships.map((r) => ({
      id: r.id,
      source: r.sourceClaimId,
      target: r.targetClaimId,
      relationType: r.relationType,
      severity: r.severity,
      explanation: r.explanation,
      status: r.status,
      sourceDocTitle: r.sourceEvidenceDocTitle || r.sourceClaim.document.title,
      sourcePage: r.sourceEvidencePage || r.sourceClaim.pageNumber,
      targetDocTitle: r.targetEvidenceDocTitle || r.targetClaim.document.title,
      targetPage: r.targetEvidencePage || r.targetClaim.pageNumber,
    }));

    res.json({
      success: true,
      applicationId,
      applicationCode: app?.code,
      nodes,
      edges,
      contradictionsCount: edges.filter((e) => ['VALUE_MISMATCH', 'TEMPORAL_CONTRADICTION', 'STALE_EXPIRED'].includes(e.relationType)).length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch claim graph', detail: error?.message });
  }
});

// GET /api/applications/:id/contradictions
applicationsRouter.get('/:id/contradictions', async (req, res) => {
  try {
    const applicationId = req.params.id;
    const appCheck = await prisma.application.findUnique({ where: { id: applicationId } });
    if (appCheck && !assertTenantAccess(req, res, appCheck.institutionId, 'application contradictions')) {
      return;
    }
    const contradictions = await prisma.claimRelationship.findMany({
      where: {
        applicationId,
        relationType: { in: ['VALUE_MISMATCH', 'TEMPORAL_CONTRADICTION', 'STALE_EXPIRED', 'SUPERSEDED'] },
      },
      include: {
        sourceClaim: { include: { document: true } },
        targetClaim: { include: { document: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      applicationId,
      contradictionsCount: contradictions.length,
      contradictions: contradictions.map((c) => ({
        id: c.id,
        relationType: c.relationType,
        severity: c.severity,
        explanation: c.explanation,
        status: c.status,
        source: {
          claimId: c.sourceClaimId,
          value: c.sourceValueSummary,
          documentTitle: c.sourceEvidenceDocTitle || c.sourceClaim.document.title,
          pageNumber: c.sourceEvidencePage || c.sourceClaim.pageNumber,
        },
        target: {
          claimId: c.targetClaimId,
          value: c.targetValueSummary,
          documentTitle: c.targetEvidenceDocTitle || c.targetClaim.document.title,
          pageNumber: c.targetEvidencePage || c.targetClaim.pageNumber,
        },
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch contradictions', detail: error?.message });
  }
});

// ==========================================
// FEATURE A: Full 11-Node Compliance Evidence Graph
// Application -> Document -> Document Version -> Extracted Field -> Institutional Record / Verification Attempt
// -> Regulation Clause -> Rule Version -> Validation Run -> Finding -> Corrective Task -> Reviewer Decision
// ==========================================
applicationsRouter.get('/:id/evidence-graph', async (req, res) => {
  try {
    const applicationId = req.params.id;
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        institution: true,
        documents: {
          include: {
            versions: true,
            extractedFields: true,
          },
        },
        findings: true,
        tasks: true,
        validationManifests: {
          orderBy: { signedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (!assertTenantAccess(req, res, app.institutionId, 'compliance evidence graph')) {
      return;
    }

    const ruleSet = await prisma.ruleSet.findUnique({ where: { id: app.ruleSetId } });
    const clauses = await prisma.regulatoryClause.findMany({ where: { ruleSetId: app.ruleSetId } });

    const nodes: Array<{
      id: string;
      entityType: string;
      label: string;
      metadata: Record<string, any>;
    }> = [];
    const edges: Array<{
      id: string;
      source: string;
      target: string;
      relationship: string;
    }> = [];

    // 1. Application Node
    const appNodeId = `APP:${app.id}`;
    nodes.push({
      id: appNodeId,
      entityType: 'Application',
      label: `${app.code} — ${app.programName}`,
      metadata: {
        applicationId: app.id,
        category: app.category,
        academicYear: app.academicYear,
        stage: app.currentStage,
      },
    });

    // 2. Institutional Record Node
    const instNodeId = `INST:${app.institution.id}`;
    nodes.push({
      id: instNodeId,
      entityType: 'InstitutionalRecord',
      label: `${app.institution.name} (${app.institution.code})`,
      metadata: {
        institutionId: app.institution.id,
        region: app.institution.region,
        accreditation: app.institution.accreditationStatus,
      },
    });
    edges.push({
      id: `EDGE:${instNodeId}->${appNodeId}`,
      source: instNodeId,
      target: appNodeId,
      relationship: 'SUBMITTED_APPLICATION',
    });

    // 3. Rule Version Node
    const ruleSetNodeId = `RULESET:${app.ruleSetId}`;
    nodes.push({
      id: ruleSetNodeId,
      entityType: 'RuleVersion',
      label: `${ruleSet?.code || app.ruleSetId} (${ruleSet?.version || 'v2.0'})`,
      metadata: {
        ruleSetId: app.ruleSetId,
        version: ruleSet?.version || 'v2.0',
        status: ruleSet?.status || 'Published',
      },
    });
    edges.push({
      id: `EDGE:${appNodeId}->${ruleSetNodeId}`,
      source: appNodeId,
      target: ruleSetNodeId,
      relationship: 'GOVERNED_BY_RULE_VERSION',
    });

    // 4. Validation Run Node
    const latestManifest = app.validationManifests[0];
    const valRunNodeId = `VRUN:${latestManifest?.assessmentId || `RUN-${app.code}`}`;
    nodes.push({
      id: valRunNodeId,
      entityType: 'ValidationRun',
      label: `Validation Run ${latestManifest?.assessmentId || `RUN-${app.code}`}`,
      metadata: {
        assessmentId: latestManifest?.assessmentId || `RUN-${app.code}`,
        manifestHash: latestManifest?.manifestHash || null,
        evaluatedAt: (app.lastEvaluatedAt || app.updatedAt).toISOString(),
      },
    });
    edges.push({
      id: `EDGE:${appNodeId}->${valRunNodeId}`,
      source: appNodeId,
      target: valRunNodeId,
      relationship: 'EVALUATED_IN_RUN',
    });

    // 5. Regulation Clause Nodes
    for (const c of clauses) {
      const clauseNodeId = `CLAUSE:${c.id}`;
      nodes.push({
        id: clauseNodeId,
        entityType: 'RegulationClause',
        label: `${c.clauseNumber}: ${c.title}`,
        metadata: {
          clauseId: c.id,
          clauseNumber: c.clauseNumber,
          category: c.category,
          pageReference: c.pageReference,
        },
      });
      edges.push({
        id: `EDGE:${ruleSetNodeId}->${clauseNodeId}`,
        source: ruleSetNodeId,
        target: clauseNodeId,
        relationship: 'CONTAINS_CLAUSE',
      });
    }

    // 6. Document, DocumentVersion, ExtractedField, VerificationAttempt Nodes
    for (const doc of app.documents) {
      const docNodeId = `DOC:${doc.id}`;
      nodes.push({
        id: docNodeId,
        entityType: 'Document',
        label: `${doc.title} (${doc.currentVersion})`,
        metadata: {
          documentId: doc.id,
          category: doc.category,
          validationState: doc.validationState,
          sha256: doc.sha256,
        },
      });
      edges.push({
        id: `EDGE:${appNodeId}->${docNodeId}`,
        source: appNodeId,
        target: docNodeId,
        relationship: 'INCLUDES_DOCUMENT',
      });

      const targetClauseNodeId = `CLAUSE:${doc.requiredByClauseId}`;
      edges.push({
        id: `EDGE:${docNodeId}->${targetClauseNodeId}`,
        source: docNodeId,
        target: targetClauseNodeId,
        relationship: 'EVIDENCE_FOR_CLAUSE',
      });

      // Verification Attempt Node
      const verifNodeId = `VERIF:${doc.id}`;
      nodes.push({
        id: verifNodeId,
        entityType: 'VerificationAttempt',
        label: `Issuer Check: ${doc.issuerVerification}`,
        metadata: {
          documentId: doc.id,
          issuerVerification: doc.issuerVerification,
          integrityScreening: doc.integrityScreening,
        },
      });
      edges.push({
        id: `EDGE:${docNodeId}->${verifNodeId}`,
        source: docNodeId,
        target: verifNodeId,
        relationship: 'VERIFIED_BY_ATTEMPT',
      });

      for (const ver of doc.versions) {
        const verNodeId = `DOCVER:${ver.id}`;
        nodes.push({
          id: verNodeId,
          entityType: 'DocumentVersion',
          label: `${doc.title} — ${ver.version}`,
          metadata: {
            version: ver.version,
            fileName: ver.fileName,
            sha256: ver.sha256,
            uploadedAt: ver.uploadedAt.toISOString(),
            changeNote: ver.changeNote,
          },
        });
        edges.push({
          id: `EDGE:${docNodeId}->${verNodeId}`,
          source: docNodeId,
          target: verNodeId,
          relationship: 'HAS_IMMUTABLE_VERSION',
        });
      }

      for (const field of doc.extractedFields) {
        const fieldNodeId = `FIELD:${field.id}`;
        nodes.push({
          id: fieldNodeId,
          entityType: 'ExtractedField',
          label: `${field.label}: ${field.extractedValue}`,
          metadata: {
            fieldId: field.id,
            key: field.key,
            extractedValue: field.extractedValue,
            expectedRuleValue: field.expectedRuleValue,
            ocrConfidence: field.ocrConfidence,
            pageNumber: field.pageNumber,
            boundingBoxId: field.boundingBoxId,
          },
        });
        edges.push({
          id: `EDGE:${docNodeId}->${fieldNodeId}`,
          source: docNodeId,
          target: fieldNodeId,
          relationship: 'EXTRACTED_FIELD',
        });
      }
    }

    // 7. Finding, CorrectiveTask, ReviewerDecision Nodes
    for (const f of app.findings) {
      const findingNodeId = `FINDING:${f.id}`;
      nodes.push({
        id: findingNodeId,
        entityType: 'Finding',
        label: `[${f.severity}] ${f.title}`,
        metadata: {
          findingId: f.id,
          severity: f.severity,
          clauseId: f.clauseId,
          clauseNumber: f.clauseNumber,
          extractedValue: f.extractedValue,
          expectedValue: f.expectedValue,
          lifecycleStatus: f.lifecycleStatus,
        },
      });
      edges.push({
        id: `EDGE:${valRunNodeId}->${findingNodeId}`,
        source: valRunNodeId,
        target: findingNodeId,
        relationship: 'PRODUCED_FINDING',
      });
      if (f.documentId) {
        edges.push({
          id: `EDGE:DOC:${f.documentId}->${findingNodeId}`,
          source: `DOC:${f.documentId}`,
          target: findingNodeId,
          relationship: 'TRIGGERED_FINDING',
        });
      }
      edges.push({
        id: `EDGE:${findingNodeId}->CLAUSE:${f.clauseId}`,
        source: findingNodeId,
        target: `CLAUSE:${f.clauseId}`,
        relationship: 'EVALUATED_AGAINST_CLAUSE',
      });

      // Reviewer Decision Node
      const decNodeId = `DECISION:${f.id}`;
      nodes.push({
        id: decNodeId,
        entityType: 'ReviewerDecision',
        label: f.resolvedBy ? `Resolved by ${f.resolvedBy}` : `Status: ${f.lifecycleStatus}`,
        metadata: {
          findingId: f.id,
          lifecycleStatus: f.lifecycleStatus,
          resolvedBy: f.resolvedBy,
          resolvedAt: f.resolvedAt?.toISOString() || null,
          resolutionNote: f.resolutionNote,
        },
      });
      edges.push({
        id: `EDGE:${findingNodeId}->${decNodeId}`,
        source: findingNodeId,
        target: decNodeId,
        relationship: 'HAS_REVIEWER_DECISION',
      });
    }

    for (const t of app.tasks) {
      const taskNodeId = `TASK:${t.id}`;
      nodes.push({
        id: taskNodeId,
        entityType: 'CorrectiveTask',
        label: `${t.taskCode}: ${t.title}`,
        metadata: {
          taskId: t.id,
          taskCode: t.taskCode,
          findingId: t.findingId,
          assigneeName: t.assigneeName,
          status: t.status,
          dueDate: t.dueDate.toISOString().split('T')[0],
        },
      });
      edges.push({
        id: `EDGE:FINDING:${t.findingId}->${taskNodeId}`,
        source: `FINDING:${t.findingId}`,
        target: taskNodeId,
        relationship: 'ASSIGNED_CORRECTIVE_TASK',
      });
    }

    res.json({
      success: true,
      applicationId: app.id,
      applicationCode: app.code,
      entityTypesPresent: Array.from(new Set(nodes.map((n) => n.entityType))),
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodes,
      edges,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to build compliance evidence graph', detail: error?.message });
  }
});

