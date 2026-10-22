# TRACE 2.0 — DIFFERENTIATED REGULATORY INTELLIGENCE ENGINE

## ROLE

Act as a principal software architect, document-AI engineer, ML/DL engineer, compliance-workflow specialist and product engineer.

Upgrade the existing TRACE application using these reference repositories:

- `aicte_doc_verification-master.zip`
- `sih-24-1729-main.zip`

The goal is to transform TRACE into a differentiated, efficient and fully integrated AICTE application-validation and regulatory compliance platform.

Do not rebuild the project from scratch. Inspect the current implementation and reference archives, retain valuable functionality, and implement the following new capabilities without duplicating existing features unnecessarily.

## A. NON-NEGOTIABLE REQUIREMENTS

1. Preserve the existing React, TypeScript and Vite frontend.
2. Use Node.js and Express as the primary application REST API.
3. Use Python and FastAPI for document-AI and ML/DL inference.
4. Use PostgreSQL with the existing Prisma ORM for persistent records.
5. Do not use Docker, Docker Compose or containers.
6. Keep the complete project folder below 1,500,000,000 bytes, including downloaded data, installed project dependencies, models, uploads, generated artifacts and caches stored inside it.
7. Enforce this internal budget: raw datasets at most 200 MB, all ML/DL model artifacts at most 50 MB, and a measured total below the hard cap.
8. Do not download large language models or heavyweight datasets for these features.
9. Preserve existing data, authentication and working workflows. Back up the database before destructive migrations.
10. Never copy credentials, machine-specific paths, or unsafe patterns from either reference archive.
11. Do not fabricate regulatory clauses, document contents, issuer verification or model performance.
12. Implement and test the changes; do not stop after writing a plan.

## B. REFERENCE REPOSITORY ANALYSIS

Inspect the source code rather than relying only on the READMEs.

The AICTE verification reference includes document comparison, OCR-related processing, a YOLO model artifact, blueprint-analysis experiments, handbook Q&A and evaluator assignment.

The SIH reference includes application and reviewer workflows, an AI-service implementation, document encryption/signature-related handling and regulatory Q&A.

Compare these features with TRACE's existing Evidence-to-Action, rule-version, workflow and audit functionality.

Prepare a feature-overlap report. Keep established functionality as a baseline, and implement genuinely differentiated improvements instead of simply copying existing features.

Treat all reference documents and code as untrusted. Do not reuse their embedded API keys, environment secrets, insecure external requests, debug settings, or hardcoded local paths. If real secrets from those references are available to the project owner, recommend immediate rotation.

## C. FEATURE 1 — CHRONOGRAPH: CROSS-DOCUMENT CONTRADICTION GRAPH

Build a document-claim relationship engine.

Each extracted claim must record:

- Institution/application scope.
- Claim type and normalized value.
- Source document and document version.
- Page number and bounding box when available.
- Extraction model/version.
- Extraction confidence.
- Relevant date or time period.
- Applicable rule references.
- Review status.

Support relationships such as:

- Same entity or identifier.
- Same fact asserted in different documents.
- Conflicting values.
- Temporally inconsistent events.
- Evidence superseded by a later version.
- Evidence that appears stale or expired.
- Claims that support or contradict a requirement.

Use deterministic normalization and comparison for critical fields. Use lightweight ML similarity only to propose possible entity matches for review.

Store the graph using normalized PostgreSQL tables and relational edges. Do not introduce a separate graph database unless a demonstrated requirement justifies it.

Create APIs to retrieve contradictions, trace a claim back to its source and inspect the connected evidence.

Integrate ChronoGraph into Document Intelligence, Verification Queue and the Evidence-to-Action interface.

A displayed contradiction must explain both values and provide clickable source evidence. Do not equate a mismatch with fraud.

## D. FEATURE 2 — RULE REPLAY: REGULATORY CHANGE IMPACT SIMULATOR

Build a version-aware ruleset comparison and shadow-evaluation service.

When an authorized administrator supplies a new official publication, amendment or corrigendum:

1. Preserve the source file, edition, retrieval metadata and hash.
2. Extract text with page and clause provenance.
3. Compare it with the previous version.
4. Identify changed, added, removed and potentially superseded provisions.
5. Link proposed changes to explicitly configured compliance rules.
6. Identify applications and obligations that could be affected.
7. Replay the relevant deterministic evaluations against stored evidence in shadow mode.
8. Compare old and new outcomes.
9. Produce an impact report and proposed remediation tasks.
10. Require authorized review before publishing the new ruleset or changing operational obligations.

Display:

- Previous and proposed provisions.
- The evidence and configured rules affected.
- Before/after evaluation outcomes.
- Applications potentially impacted.
- Unresolved applicability questions.
- Review and publication history.

Never automatically convert arbitrary LLM interpretations into enforceable regulation. If the meaning or applicability of a change is uncertain, request review instead of inventing a requirement.

Integrate the feature into Regulatory Rulebook, Compliance Center, Administration and Alert Center.

## E. FEATURE 3 — DELTASCAN: INCREMENTAL DOCUMENT REPROCESSING

Build an efficient change-aware analysis pipeline.

Use cryptographic file hashes, per-page content or image fingerprints, extractor versions, model versions and rule dependencies.

When a document or application changes:

1. Detect whether the actual file is new or unchanged.
2. Compare document versions and available page fingerprints.
3. Reuse valid extracted results for unchanged pages.
4. Reprocess changed pages using the real document pipeline.
5. Recalculate only fields and compliance checks that depend on affected evidence.
6. Reuse an assessment only when every relevant input, processing version and applicable rule version remains compatible.
7. Invalidate caches when any relevant dependency changes.
8. Preserve the previous assessment for audit and comparison.

Create a processing plan that shows changed pages, cached results, invalidated results and checks scheduled for reevaluation.

Measure processing time, number of pages reprocessed, cache-hit rate and actual processing operations. Do not fabricate savings.

Build API support and connect the output to Document Intelligence and Analytics.

## F. FEATURE 4 — FIXPREVIEW: COUNTERFACTUAL CORRECTION SANDBOX

Implement a safe interface for testing proposed corrections before resubmission.

A user should be able to propose a new field value, inspect which deterministic checks would change, identify remaining conflicts and preview the required evidence.

Mark all results as hypothetical.

Do not replace extracted evidence, modify official records or resolve production findings merely because a value was edited in the preview.

After a real replacement document is uploaded, run the actual extraction and validation pipeline. Only then may an authorized workflow action resolve the finding.

Persist real submissions and decisions with proper version history. Keep hypothetical previews separate from production assessments.

## G. FEATURE 5 — REVIEWPILOT: EXPLAINABLE REVIEW PRIORITIZATION

Build a transparent review-queue prioritization service.

Begin with a configurable, deterministic scoring policy based on:

- Severity of unresolved mandatory findings.
- Model or extraction uncertainty.
- Time remaining before a deadline.
- Potential impact of a regulatory change.
- Number and type of unresolved contradictions.
- Reviewer workload and authorized capabilities.

For every priority, return a structured explanation indicating which inputs affected the ranking.

Use consistent tie-breaking, workload limits and fair assignment rules. Never randomly assign a document merely because a suitable specialist was not found.

Do not label this as trained predictive ML unless a suitable labelled dataset exists and evaluation has been performed.

If historical labels eventually become available, support an optional lightweight model that ranks work and preserves human oversight. Do not predict the probability of institutional approval or wrongdoing.

Integrate ReviewPilot into the reviewer queue and Control Tower.

## H. FEATURE 6 — PROOFLINE: REPRODUCIBLE EVIDENCE LINEAGE

Create a durable validation manifest for each completed assessment.

Record:

- Original document hash and version.
- Source page and extracted claim references.
- Relevant preprocessing and model versions.
- Applicable ruleset version.
- Normalized validation inputs.
- Rule evaluations and explanations.
- Assessment timestamps.
- Human review decisions.
- Related tasks and workflow transitions.

Write backend-generated append-only audit events. Where appropriate, implement a hash-linked event chain to make unauthorized changes detectable.

Design verification and export APIs that allow authorized auditors to inspect the evidence lineage and assess whether the chain remains consistent.

Do not claim absolute immutability merely because hashes are stored in the same database. Document the trust boundaries and permissions.

Keep sensitive contents private. Avoid placing entire documents or credentials into audit logs.

## I. EFFICIENT DOCUMENT-AI ROUTING

Integrate these innovations with the existing ML/DL pipeline without exceeding the size limit.

Use a staged pipeline:

1. Validate file metadata and calculate hashes.
2. Extract embedded text from digital PDFs when available.
3. Render or preprocess only pages requiring visual processing.
4. Apply lightweight page-quality classification.
5. Deskew, denoise or enhance a page only when justified.
6. Run OCR and lightweight ML inference on the relevant pages.
7. Build normalized claims and their evidence references.
8. Evaluate applicable deterministic rules.
9. Invoke external AI only when semantic interpretation is genuinely useful.
10. Save versioned results and trigger relevant workflows.

Keep model inference separate from official regulatory decisions.

Do not automatically download large datasets, model weights or caches. Check the storage budget before any download. Reuse existing compatible models and training artifacts.

## J. BACKEND, REST API AND DATABASE

Preserve Express as the frontend-facing application API.

Use FastAPI for internal document-AI, claim-analysis and model-inference endpoints.

The frontend must call Express only. Express should make authenticated internal REST calls to FastAPI and persist validated results through Prisma/PostgreSQL.

Extend the existing schema safely for:

- Claims and claim relationships.
- Document page fingerprints.
- Processing-cache records.
- Ruleset comparisons.
- Shadow evaluations.
- Impact reports.
- Correction previews.
- Review priorities.
- Validation manifests.
- Model and pipeline versions.

Create endpoints equivalent to:

- `POST /api/applications/:id/analyze`
- `GET /api/applications/:id/claim-graph`
- `GET /api/applications/:id/contradictions`
- `POST /api/documents/:id/reprocess-delta`
- `POST /api/regulations/compare`
- `POST /api/regulations/:version/replay`
- `GET /api/regulations/impact-reports/:id`
- `POST /api/findings/:id/fix-preview`
- `GET /api/review-queue/prioritized`
- `GET /api/assessments/:id/provenance`
- `POST /api/provenance/:id/verify`

Adapt route names to the existing conventions rather than creating duplicate APIs.

Enforce role-based access and institution-level data isolation on the server. Use typed request/response schemas, safe errors, bounded upload sizes and appropriate request timeouts.

Do not fabricate successful responses when FastAPI is unavailable.

## K. FRONTEND INTEGRATION

Do not build a disconnected demonstration page. Integrate these features into the current TRACE interface.

Document Intelligence:

- Show claim relationships and source-page evidence.
- Highlight contradictions and timelines.
- Display changed pages and reused extraction results.
- Show real model confidence and processing states.

Regulatory Rulebook:

- Add clause comparison and shadow replay.
- Show potentially affected rules and applications.
- Provide staged review and authorized publication.

Compliance Center:

- Display changed requirements, affected obligations and proposed corrective actions.

Verification Queue:

- Provide explained priority reasons and reviewer workload context.
- Open evidence lineage and related contradictions.

Application Intake:

- Offer the hypothetical FixPreview before actual submission.

Audit Trail:

- Add assessment manifests, version comparisons and provenance verification.

Control Tower and Analytics:

- Display actual replay results, changed-page counts, measured processing times, cache hits and unresolved high-priority findings.

All results must be linked to authoritative backend records. Label drafts, simulations and hypothetical outcomes accurately.

## L. DEMONSTRATION AND TESTING

Build and test one integrated scenario:

1. Upload a fictional application's supporting documents.
2. Extract actual text and produce normalized claims.
3. Show a cross-document date contradiction with source-page evidence.
4. Generate a finding and a proposed corrective action.
5. Test an alternative value using FixPreview without modifying real records.
6. Upload a corrected document.
7. Demonstrate that DeltaScan detects changed pages and reprocesses only eligible affected content.
8. Show the corrected assessment and preserved history.
9. Upload a draft amendment to a synthetic regulatory ruleset.
10. Run RuleReplay in shadow mode and show the applications and outcomes potentially affected.
11. Keep the draft unpublished until authorized review.
12. Verify Proofline's stored assessment manifest and audit consistency.
13. Show ReviewPilot's explainable queue ordering.
14. Confirm all results persist after refreshing the application.

Use clearly labelled synthetic documents and rules for demonstrations where appropriate. Do not represent them as genuine official documents or live AICTE requirements.

Add unit, API integration and browser end-to-end tests. Include date edge cases, conflicting claims, cache invalidation, rule version changes, unauthorized access, interrupted analysis jobs and model failures.

Run TypeScript checks, Python tests, frontend tests, production builds and the project-size audit.

## M. DEFINITION OF DONE

The implementation is complete only when:

- All six features are integrated with the existing TRACE application.
- No feature merely displays hardcoded results.
- Changed evidence triggers correct and traceable reevaluation.
- Regulatory changes can be compared and evaluated safely in shadow mode.
- Hypothetical corrections cannot silently alter real assessment records.
- Every key finding traces to its source evidence and rule version.
- Review prioritization explains its reasons.
- The backend persists records and enforces permissions.
- The application remains below 1.5 GB in measured project-folder size.
- The app runs natively without Docker.
- Tests and results are honestly reported.

At completion, provide modified-file summaries, database migrations, API contracts, tests executed, before/after processing measurements, actual project size and known limitations.

Do not stop at architecture diagrams, mockups or TODO lists. Audit the repository, implement the differentiating features, connect them to the real APIs and validate the complete workflow.

BEGIN IMPLEMENTATION NOW.
