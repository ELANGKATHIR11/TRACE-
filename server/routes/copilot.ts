import { Router } from 'express';
import { prisma } from '../db/prisma';

export const copilotRouter = Router();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:1.5b-instruct';

copilotRouter.post('/query', async (req, res) => {
  try {
    const { question, applicationId } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    // Retrieve genuine stored regulatory clauses from local PostgreSQL
    const storedClauses = await prisma.regulatoryClause.findMany({
      include: { source: true },
      take: 12,
    });

    // Retrieve application context if provided
    let appRecord: any = null;
    let docEvidence: any[] = [];
    if (applicationId) {
      appRecord = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          institution: true,
          findings: { where: { lifecycleStatus: { not: 'Resolved' } } },
          documents: {
            include: { extractedFields: true },
          },
        },
      });

      if (appRecord) {
        docEvidence = appRecord.documents.map((d: any) => ({
          documentTitle: d.title,
          category: d.category,
          currentVersion: d.currentVersion,
          validationState: d.validationState,
          extractedFields: d.extractedFields.map((f: any) => ({
            key: f.key,
            label: f.label,
            extractedValue: f.extractedValue,
            ocrConfidence: f.ocrConfidence,
          })),
        }));
      }
    }

    // Deterministic fallback response builder (guaranteed 100% offline & source-grounded)
    const buildDeterministicResponse = () => {
      const qLower = question.toLowerCase();
      const relevantClause =
        storedClauses.find(
          (c) =>
            qLower.includes(c.clauseNumber.toLowerCase()) ||
            (qLower.includes('cutoff') && c.clauseNumber.includes('4.2.b')) ||
            (qLower.includes('fire') && c.clauseNumber.includes('4.5')) ||
            (qLower.includes('land') && c.clauseNumber.includes('2.1')) ||
            (qLower.includes('building') && c.clauseNumber.includes('4.2'))
        ) || storedClauses[0];

      return {
        summaryAnswer: `According to statutory AICTE standards (${relevantClause.source.title}, Clause ${relevantClause.clauseNumber}), technical institutions must ensure all infrastructure facilities and legal titles strictly satisfy statutory readiness before scrutiny cutoffs.`,
        directlySupportedStatements: [
          {
            statement: relevantClause.excerpt,
            clauseId: relevantClause.id,
            ruleVersion: 'APH 2026-27 v2.0 (Statutory)',
            sourcePage: relevantClause.pageReference,
          },
        ],
        systemComputedFindings:
          appRecord?.findings?.length > 0
            ? appRecord.findings.map((f: any) => `${f.clauseNumber}: ${f.discrepancyNote}`)
            : ['No active non-conformances flagged for the selected application context.'],
        explanatorySuggestions: [
          relevantClause.remediationGuidance ||
            'Verify all attested dates across the Completion Certificate and Occupancy Certificate against the 30-Jun-2026 cutoff.',
          'Reconcile counter-affidavit signatories with the authorized board resolution prior to scrutiny submission.',
        ],
        uncertaintyWarnings: [
          'Automated local screening certifies document text and cryptographic integrity, not third-party issuer authenticity.',
          'Statutory norms mandate on-site physical verification by an Expert Visit Committee (EVC).',
        ],
        recommendedNextActions: [
          'Review flagged records in the Verification Queue and Evidence-to-Action drawer.',
          'Upload corrected revision documents if date discrepancies or missing seals are identified.',
        ],
      };
    };

    // Attempt Local Offline LLM inference via Ollama if running
    let localAiSuccess = false;
    let localAiData: any = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const systemPrompt = `You are TRACE Offline Regulatory Copilot, an evidence-grounded compliance assistant for Indian technical education.
CRITICAL EPISTEMIC RULES:
1. Never claim OCR confidence guarantees legal authenticity.
2. Ground all answers strictly in the provided STORED REGULATORY CLAUSES.
3. Return ONLY a valid JSON object with the exact keys:
   "summaryAnswer" (string),
   "directlySupportedStatements" (array of objects with { "statement", "clauseId", "ruleVersion", "sourcePage" }),
   "systemComputedFindings" (array of strings),
   "explanatorySuggestions" (array of strings),
   "uncertaintyWarnings" (array of strings),
   "recommendedNextActions" (array of strings).`;

      const userPrompt = `QUESTION: ${question}

STORED REGULATORY CLAUSES:
${JSON.stringify(
  storedClauses.map((c) => ({
    clauseId: c.id,
    clauseNumber: c.clauseNumber,
    title: c.title,
    excerpt: c.excerpt,
    source: c.source.title,
    page: c.pageReference,
  })),
  null,
  2
)}

APPLICATION CONTEXT:
${JSON.stringify(
  appRecord
    ? {
        code: appRecord.code,
        category: appRecord.category,
        institution: appRecord.institution.name,
        stage: appRecord.currentStage,
        findings: appRecord.findings,
      }
    : 'None',
  null,
  2
)}

DOCUMENT EVIDENCE:
${JSON.stringify(docEvidence, null, 2)}`;

      const ollamaResp = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: LOCAL_LLM_MODEL,
          prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 1024,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (ollamaResp.ok) {
        const ollamaJson: any = await ollamaResp.json();
        const parsed = JSON.parse(ollamaJson.response || '{}');
        if (parsed.summaryAnswer && Array.isArray(parsed.directlySupportedStatements)) {
          localAiData = parsed;
          localAiSuccess = true;
        }
      }
    } catch {
      // Local Ollama unavailable or timed out; deterministic local fallback will be used
      localAiSuccess = false;
    }

    if (localAiSuccess && localAiData) {
      res.json({
        mode: 'local_offline_llm',
        model: LOCAL_LLM_MODEL,
        offline: true,
        generatedAt: new Date().toISOString(),
        data: localAiData,
      });
      return;
    }

    // Default 100% offline deterministic statutory retrieval
    const deterministicData = buildDeterministicResponse();
    res.json({
      mode: 'local_statutory_retrieval',
      model: 'deterministic_regulatory_rag',
      offline: true,
      generatedAt: new Date().toISOString(),
      data: deterministicData,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Copilot query failed', detail: error?.message });
  }
});
