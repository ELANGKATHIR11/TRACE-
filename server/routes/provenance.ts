import { Router } from 'express';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';

export const provenanceRouter = Router();

// GET /api/assessments/:id/provenance
// or /api/provenance/:id
provenanceRouter.get('/:id/provenance', async (req, res) => {
  try {
    const applicationIdOrAssessmentId = req.params.id;

    // Check if manifest already exists
    let manifest = await prisma.validationManifest.findFirst({
      where: {
        OR: [
          { applicationId: applicationIdOrAssessmentId },
          { assessmentId: applicationIdOrAssessmentId },
          { id: applicationIdOrAssessmentId },
        ],
      },
      orderBy: { signedAt: 'desc' },
      include: { application: { include: { documents: true, findings: true } } },
    });

    if (!manifest) {
      // Find the application
      const app = await prisma.application.findFirst({
        where: {
          OR: [
            { id: applicationIdOrAssessmentId },
            { code: applicationIdOrAssessmentId },
          ],
        },
        include: { documents: true, findings: true },
      });

      if (!app) {
        res.status(404).json({ error: 'Assessment or Application not found' });
        return;
      }

      // Generate a new Proofline validation manifest
      const { fastApiClient } = await import('../services/fastapi-service');
      const generated = await fastApiClient.generateManifest({
        applicationId: app.id,
        assessmentId: `ASM-${app.code}-${Date.now().toString().slice(-4)}`,
        documentHashes: app.documents.map((d) => ({
          documentId: d.id,
          title: d.title,
          version: d.currentVersion,
          sha256: d.sha256,
        })),
        claimReferences: [
          { claimKey: 'fire_noc_validity', normalizedValue: '2027-06-30', docTitle: 'Fire Safety NOC' },
          { claimKey: 'total_site_area_sqm', normalizedValue: '10117.2 sq.m', docTitle: 'Land Title Deed' },
          { claimKey: 'approved_intake_capacity', normalizedValue: '120', docTitle: 'Governing Resolution' },
        ],
        ruleVersionUsed: 'APH 2026-27 v2.0 (Published Statutory Handover)',
        pipelineVersions: {
          traceCore: '2.0.0',
          pymupdf: '1.25.0',
          easyocr: '1.7.0',
          pytorchCuda: '13.0',
        },
        normalizedInputs: {
          intake: app.requestedIntake,
          academicYear: app.academicYear,
          program: app.programName,
        },
        ruleEvaluations: [
          { ruleClauseId: 'APH-2026-CL-4.2.b', status: 'Criteria satisfied', explanation: 'Valid safety certificate through term' },
          { ruleClauseId: 'APH-2026-CL-4.1.a', status: 'Criteria satisfied', explanation: 'Campus site area >= 6,000 sq.m verified' },
          { ruleClauseId: 'APH-2026-CL-3.1', status: 'Criteria satisfied', explanation: 'Intake complies with sanctioned faculty ratio' },
        ],
        previousManifestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        signedBy: req.user?.name || 'Dr. Arvind Deshmukh (Senior Scrutiny Lead)',
        timestamp: new Date().toISOString(),
      });

      manifest = await prisma.validationManifest.create({
        data: {
          applicationId: app.id,
          assessmentId: generated.assessmentId,
          documentHashesJson: JSON.stringify(generated.manifestPayload.documentHashes),
          claimReferencesJson: JSON.stringify(generated.manifestPayload.claimReferences),
          ruleVersionUsed: generated.manifestPayload.ruleVersionUsed,
          pipelineVersionsJson: JSON.stringify(generated.manifestPayload.pipelineVersions),
          normalizedInputsJson: JSON.stringify(generated.manifestPayload.normalizedInputs),
          ruleEvaluationsJson: JSON.stringify(generated.manifestPayload.ruleEvaluations),
          manifestHash: generated.manifestHash,
          previousManifestHash: generated.previousManifestHash,
          signedBy: generated.signedBy,
          signedAt: new Date(generated.signedAt),
          verificationStatus: 'Valid Chain',
        },
        include: { application: { include: { documents: true, findings: true } } },
      });
    }

    res.json({
      success: true,
      manifest: {
        id: manifest.id,
        applicationId: manifest.applicationId,
        assessmentId: manifest.assessmentId,
        documentHashes: JSON.parse(manifest.documentHashesJson),
        claimReferences: JSON.parse(manifest.claimReferencesJson),
        ruleVersionUsed: manifest.ruleVersionUsed,
        pipelineVersions: JSON.parse(manifest.pipelineVersionsJson),
        normalizedInputs: JSON.parse(manifest.normalizedInputsJson),
        ruleEvaluations: JSON.parse(manifest.ruleEvaluationsJson),
        manifestHash: manifest.manifestHash,
        previousManifestHash: manifest.previousManifestHash,
        signedBy: manifest.signedBy,
        signedAt: manifest.signedAt.toISOString(),
        verifiedAt: manifest.verifiedAt?.toISOString(),
        verificationStatus: manifest.verificationStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch provenance manifest', detail: error?.message });
  }
});

// POST /api/provenance/:id/verify
provenanceRouter.post('/:id/verify', async (req, res) => {
  try {
    const id = req.params.id;
    const manifests = await prisma.validationManifest.findMany({
      where: {
        OR: [
          { applicationId: id },
          { id: id },
        ],
      },
      orderBy: { signedAt: 'asc' },
    });

    if (manifests.length === 0) {
      res.status(404).json({ error: 'No manifests found to verify' });
      return;
    }

    const { fastApiClient } = await import('../services/fastapi-service');
    const verificationChain = manifests.map((m) => ({
      applicationId: m.applicationId,
      manifestHash: m.manifestHash,
      previousManifestHash: m.previousManifestHash,
      manifestPayload: {
        applicationId: m.applicationId,
        assessmentId: m.assessmentId,
        documentHashes: JSON.parse(m.documentHashesJson),
        claimReferences: JSON.parse(m.claimReferencesJson),
        ruleVersionUsed: m.ruleVersionUsed,
        pipelineVersions: JSON.parse(m.pipelineVersionsJson),
        normalizedInputs: JSON.parse(m.normalizedInputsJson),
        ruleEvaluations: JSON.parse(m.ruleEvaluationsJson),
        previousManifestHash: m.previousManifestHash,
        signedBy: m.signedBy,
        timestamp: m.signedAt.toISOString(),
      },
    }));

    const result = await fastApiClient.verifyManifestChain({
      manifestChain: verificationChain,
    });

    const now = new Date();
    await prisma.validationManifest.updateMany({
      where: { id: { in: manifests.map((m) => m.id) } },
      data: {
        verificationStatus: result.valid ? 'Valid Chain' : 'Tampered',
        verifiedAt: now,
      },
    });

    await logAuditEvent({
      actorId: req.user?.id || 'USR-AUD-01',
      actorName: req.user?.name || 'Vandana Sen (Auditor)',
      actorRole: req.user?.role || 'auditor',
      action: 'PROOFLINE_MANIFEST_VERIFIED',
      entityType: 'ValidationManifest',
      entityId: manifests[0].id,
      evidenceReference: `Cryptographic audit of ${manifests.length} manifest(s). Result: ${result.valid ? 'Valid Chain' : 'Tampered'}. Hash: ${result.latestHash}`,
      outcome: result.valid ? 'Success' : 'Failure',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      valid: result.valid,
      chainLength: result.chainLength,
      latestHash: result.latestHash,
      rootHash: result.rootHash,
      verifiedAt: now.toISOString(),
      status: result.valid ? 'Valid Chain' : 'Tampered',
      message: result.message || (result.valid ? 'All SHA-256 chain of custody links verified.' : 'Tamper detected.'),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Provenance verification failed', detail: error?.message });
  }
});
