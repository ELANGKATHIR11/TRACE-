# TRACE Implementation Audit, Verification Matrix & Runtime Report
**Project:** TRACE — Trustworthy Regulatory Assurance & Compliance Engine  
**Problem Statement:** AICTE Smart India Hackathon 2026 (SIH26261) — *“AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification.”*  
**Date:** October 2026 | **Environment:** Native Windows 11, NVIDIA GeForce RTX 5060 Laptop GPU (CUDA 13.0, 8.00 GB VRAM) with CPU Fallback, PostgreSQL 18 (Port `5433`), Express.js 5 + Prisma ORM, Python FastAPI (`dgpu-core`), React 19 + TypeScript + Vite.

---

## 1. Executive Summary & Decision-Support Framing

TRACE is an end-to-end regulatory compliance decision-support platform engineered for AICTE approval workflows. All outputs—including OCR extractions, rule evaluations, cross-document discrepancy checks, anomaly indicators, ML/DL priority scores, and downloadable reports—are **decision-support findings** designed to assist authorized human scrutiny officers. TRACE never automatically declares an institution fraudulent or issues a final statutory approval, rejection, penalty, or adverse regulatory decision without authorized human sign-off.

### Verified Execution Summary
* **PostgreSQL 18 (`127.0.0.1:5433`):** Active with 37 Prisma models persisted (`Application`, `Document`, `DocumentVersion`, `DocumentPage`, `BoundingBox`, `ExtractedField`, `ComplianceFinding`, `CorrectiveTask`, `RuleSet`, `RegulatoryClause`, `RuleImpactReport`, `ProoflineManifest`, `MlModelRecord`, `DatasetManifest`, `AuditEvent`, `Session`, etc.).
* **Executable Dataset Manager (`python scripts/datasets.py {list,download,validate,prepare,status}`):** Implemented, executed, and verified.
  * Automatically downloaded, checksum-verified (`SHA-256: c31735649e4f441bcbb4fd0f379574f7520b42286e80b01d80b445649d54761f`), extracted (`809 files`, `199 scanned forms`, `9,743 annotated entities`), and split (`139 train / 29 val / 31 test`) the official **FUNSD** (*Form Understanding in Noisy Scanned Documents*) dataset (`26.502 MiB`).
  * Evaluated **SROIE** (skipped unauthenticated download because the official ICDAR RRC portal requires interactive user login; HTML response gates are never treated as dataset content) and **CORD** (probed official HuggingFace metadata card `naver-clova-ix/cord-v2`; skipped `~1,950 MiB` bulk download to strictly enforce the **850 MiB** working limit / **900 MiB** hard cap).
  * Generated and split (`336 train / 72 val / 72 test`) the explicitly labeled **TRACE Synthetic Regulatory Corpus** (`0.184 MiB`).
  * **Total Retained Dataset Footprint:** **`26.701 MiB`** (3.14% of the `850 MiB` working limit and 2.97% of the `900 MiB` hard cap).
* **TypeScript Typecheck (`npm run lint`):** **0 errors**.
* **Production Frontend Build (`npm run build`):** **Clean Vite production bundle**.
* **Node/Express & E2E Test Suite (`npm test`):** **8/8 test suites passed (46/46 tests passing)**, including all mandatory Master Prompt Scenarios A through J (`src/tests/scenarios-master.test.ts`).
* **Python FastAPI AI/ML Engine Test Suite (`pytest tests/test_fastapi_engine.py`):** **8/8 tests passing**, including live held-out model evaluation with confusion matrices and dataset manager verification.

---

## 2. Phase Zero & Final Implementation Matrix

| Feature | Existing implementation | Verified working? | Missing work | Required changes | Test evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Authentication, Session Security & Tenant Isolation** | `server/routes/auth.ts`, `server/middleware/auth.ts` (`requireAuth`, `requireRoles`, `assertTenantAccess`) | **YES (Verified)** | None | Added `assertTenantAccess` across `applications.ts`, `documents.ts`, `findings.ts`, `tasks.ts`, `institutions.ts`, and `reports.ts` so institution users (`INST-VIEPS-01`) cannot read/mutate other institutions (`INST-KCE-02`). | `src/tests/auth-isolation.test.ts` (9/9 passed) & `Scenario J` in `src/tests/scenarios-master.test.ts` |
| **2. Secure Document Intake & Magic-Byte Validation** | `server/routes/documents.ts` (`validateFileSignature`, Multer storage outside public dir, SHA-256 hashing) | **YES (Verified)** | None | Enforced `%PDF-`, PNG, JPEG, TIFF magic-byte verification; rejects disguised `.exe` (`MZ`) payloads with HTTP 400 and logs security rejection. | `Scenario B & C` in `src/tests/scenarios-master.test.ts` |
| **3. Multi-Format OCR & Layout Extraction Pipeline** | `fastapi_engine/main.py` (`/api/ocr/extract`), `server/services/ocr-engine.ts` (PyMuPDF + EasyOCR GPU/CPU fallback) | **YES (Verified)** | None | Extracts per-page text, bounding boxes, and confidence scores; routes low-confidence fields (`<75%`) to manual verification. | `Scenario A` in `src/tests/scenarios-master.test.ts` |
| **4. Executable Dataset Manager (`scripts/datasets.py`)** | `scripts/datasets.py`, `POST /api/ml/datasets/manage`, `datasets/dataset_manifest.json` | **YES (Verified)** | None | Created `scripts/datasets.py {list,download,validate,prepare,status}`; downloaded FUNSD (`26.502 MiB`), evaluated SROIE & CORD, prepared `70/15/15` splits, and wired to Page 7 (`SettingsPage.tsx`). | `test_held_out_model_evaluation_and_dataset_manager` in `tests/test_fastapi_engine.py` |
| **5. Document Classification Baseline & DL Models** | `train_models.py`, `fastapi_engine/routers/system_ml.py` (`DocTextTFIDFClassifier`, `DocumentLayoutCNN`, `ComplianceRiskGBDT`) | **YES (Verified)** | None | Added TF-IDF + Logistic Regression text classifier (`doc-text-tfidf-logreg`) with low-confidence `"unknown / needs_review"` routing; added live held-out evaluation with confusion matrices in `/system_ml/models/{id}/evaluate`. | `test_tfidf_document_classifier_and_low_confidence_routing` & `test_held_out_model_evaluation_and_dataset_manager` in `tests/test_fastapi_engine.py` |
| **6. Deterministic Rule Engine & Cross-Document Checks** | `server/services/validation-engine.ts`, `POST /api/documents/:id/validate`, `fastapi_engine/routers/chronograph.py` | **YES (Verified)** | None | Evaluates statutory cutoff dates (`APH-2026-CL-4.2.b` 30-Jun-2026), certificate expiry, cross-document date conflicts (`DOC-2026-101` vs `DOC-2026-102`), and exact SHA-256 duplicate hashes. | `src/tests/validation-engine.test.ts` (3/3 passed) & `Scenario B & C` in `src/tests/scenarios-master.test.ts` |
| **7. Structured Anomaly & Forensic Triage Indicators** | `server/services/validation-engine.ts` (`StructuredAnomalyIndicator`), `fastapi_engine/main.py` (ELA + PDF `/Sig` inspection) | **YES (Verified)** | None | Emits structured indicators (`indicator_code`, `reason`, `evidence_reference`, `confidence_or_severity`, `limitations`, `recommended_next_action`) with non-accusatory decision-support phrasing. | `Scenario B & C` & `Scenario I` in `src/tests/scenarios-master.test.ts` |
| **8. Issuing-Authority Verification Adapters** | `POST /api/documents/:id/verify-issuer` in `server/routes/documents.ts` | **YES (Verified)** | None | Implemented adapter-based verification (`LOCAL_REGISTRY_CHECK`, `MISMATCH_CHECK`, `EXTERNAL_AUTHORITY_TEST_UNAVAILABLE`) returning controlled statuses (`VERIFIED`, `MISMATCH_DETECTED`, `SOURCE_UNAVAILABLE`, `MANUAL_REVIEW_REQUIRED`) with audit trail. | `Scenario E` in `src/tests/scenarios-master.test.ts` |
| **9. Reviewer Field Edit Preservation** | `POST /api/documents/:id/confirm-field` in `server/routes/documents.ts` | **YES (Verified)** | None | Preserves `originalOcrValue` in `ExtractedField` metadata and `AuditEvent` payload when a reviewer overrides an extracted value. | `Scenario D` in `src/tests/scenarios-master.test.ts` |
| **10. Feature A — Full 11-Node Compliance Evidence Graph** | `GET /api/applications/:id/evidence-graph` in `server/routes/applications.ts`, `EvidenceGraphView.tsx` | **YES (Verified)** | None | Queries and links `Application`, `InstitutionalRecord`, `Document`, `DocumentVersion`, `ExtractedField`, `VerificationAttempt`, `RegulationClause`, `RuleVersion`, `ValidationRun`, `Finding`, `CorrectiveTask`, and `ReviewerDecision`. | `Scenario F` in `src/tests/scenarios-master.test.ts` |
| **11. Feature B — Regulation Change Impact Simulator** | `server/routes/rules.ts`, `fastapi_engine/routers/rulereplay.py`, `RuleReplayView.tsx` | **YES (Verified)** | None | Runs non-destructive shadow replay across historical applications, persists `RuleImpactReport`, and enforces `regulatory_admin` role check on `/publish`. | `Scenario G` in `src/tests/scenarios-master.test.ts` |
| **12. Feature C — Uncertainty-Aware Review Queue** | `server/routes/review-queue.ts`, `fastapi_engine/routers/reviewpilot.py`, `ReviewPilotQueueView.tsx` | **YES (Verified)** | None | Ranks applications by composite priority score combining missing mandatory documents, critical findings, OCR uncertainty, and verification gaps with human-readable factor breakdowns. | `src/tests/differentiated-features.test.ts` |
| **13. Feature D — Document Version Diff & Revalidation** | `GET /api/documents/:id/version-diff`, `POST /api/documents/:id/remediate`, `DeltaScanView.tsx` | **YES (Verified)** | None | Preserves `v1.0` history when `v2.0` is uploaded, computes SHA-256 delta, field-level diffs, and page line diffs, and updates linked finding status. | `Scenario H` in `src/tests/scenarios-master.test.ts` |
| **14. Synchronized PDF & JSON Validation Reports** | `server/routes/reports.ts` (`GET /api/reports/application/:id`, `/json`, `/pdf`), `ReportsAuditPage.tsx` | **YES (Verified)** | None | Generates structured JSON and multi-page binary PDF reports from the exact same persisted validation run with full evidence citations and decision-support disclaimers. | `Scenario I` in `src/tests/scenarios-master.test.ts` |
| **15. Prompt-Injection Guarded Local Regulatory Copilot** | `server/routes/copilot.ts`, `CopilotDrawer.tsx` | **YES (Verified)** | None | Strips untrusted instruction-override patterns (`ignore previous instructions`, `<script>`, etc.), queries local Ollama when available, and falls back deterministically to cited statutory clauses. | `src/tests/offline-copilot.test.ts` (3/3 passed) |

---

## 3. AI/ML & Deep Learning Engineering Inventory & Measured Held-Out Metrics

All models in TRACE are trained via `train_models.py` using reproducible splits (`70% train / 15% val / 15% test`) and saved under `fastapi_engine/models/` alongside `held_out_eval_splits.npz` so that `POST /system_ml/models/{id}/evaluate` computes live precision, recall, Macro-F1, and confusion matrices on the held-out test set. All models are explicitly labeled **"Experimental Prototype"** and never represented as calibrated real-world fraud detectors.

| Model ID | Name & Architecture | Task & Output | Artifact Path & Size | Measured Held-Out Test Metrics (`training_summary.json`) | Runtime Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `doc-text-tfidf-logreg` | **DocTextTFIDFClassifier** (`TF-IDF (1,2)-gram + LogisticRegression`) | Classifies OCR text into 5 regulatory categories (`Infrastructure & Completion Certificate`, `Fire & Safety NOC`, `Sworn Regulatory Affidavit`, `Financial Corpus & FDR`, `Land & Building Plan`) | `fastapi_engine/models/doc_text_tfidf_logreg.joblib` (`0.098 MB`) | **Test Samples:** `90` \| **Accuracy:** `100.0%` \| **Macro F1:** `1.0000` (Held-out synthetic text split). Labeled *Experimental Prototype*. | Routes any document with predicted probability `< 0.55` or insufficient text (`< 5 chars`) to `"unknown / needs_review"` for human classification. |
| `doc-layout-cnn` | **DocumentLayoutCNN** (`PyTorch 3-Layer ConvNet + BatchNorm + Dropout`) | Visual page layout classification (`Certificate/NOC`, `Sworn Affidavit`, `Financial FDR`, `Architectural Site Plan`) | `fastapi_engine/models/document_layout_cnn.pt` (`2.101 MB`) | **Test Samples:** `180` \| **Accuracy:** `100.0%` \| **Macro F1:** `1.0000` (Held-out synthetic layout tensors; a perfect score on templated synthetic data means the task is too easy, so it shows nothing about real documents). Labeled *Experimental Prototype*. | Uses NVIDIA RTX 5060 GPU (`cuda:0`) when available; automatically falls back to PyTorch CPU execution and deterministic filename/keyword heuristics if disabled. |
| `compliance-risk-gbdt` | **ComplianceRiskGBDT** (`Scikit-Learn GradientBoostingClassifier`) | Case uncertainty & scrutiny urgency scoring (`Low Risk`, `Moderate Risk`, `High/Urgent Risk`) | `fastapi_engine/models/compliance_risk_gbdt.joblib` (`0.616 MB`) | **Test Samples:** `225` \| **Accuracy:** `92.44%` \| **Macro Precision:** `88.32%` \| **Macro Recall:** `90.22%` \| **Macro F1:** `89.19%` \| **Confusion matrix:** `[[27,2,0],[5,40,4],[0,6,141]]` (Held-out synthetic split; class labels are generated from a formula, so this is not real-world evidence). Labeled *Experimental Prototype*. | Falls back to deterministic weighted scoring in `reviewpilot.py` if model artifact is disabled or unavailable. |

---

## 4. Dataset Manifest & Storage Audit (`scripts/datasets.py status`)

Executed via `python scripts/datasets.py {list,download,validate,prepare,status}` and persisted in `datasets/dataset_manifest.json`:

| Dataset ID | Name & Official Source | License | Retrieval & Preparation Status | Splits (`Train / Val / Test`) | Retained Disk Size | Synthetic / Real Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `funsd` | **FUNSD — Form Understanding in Noisy Scanned Documents** (`https://guillaumejaume.github.io/FUNSD/dataset.zip`) | Non-Commercial Research & Educational Use Only (FUNSD License) | **DOWNLOADED_AND_PREPARED** (`SHA-256: c31735649e4f441bcbb4fd0f379574f7520b42286e80b01d80b445649d54761f`, `199 forms`, `9,743 entities`) | `139 Train / 29 Val / 31 Test` (`199 forms`) | **`26.502 MiB`** | **Real Public Scanned Form Benchmark** |
| `trace-regulatory-synth` | **TRACE AICTE Regulatory Compliance Corpus** (`local://datasets/trace-regulatory-synth`) | MIT / Internal SIH 2026 Demonstration Fixture | **PREPARED_SYNTHETIC** (`SHA-256: 85cde79e603538792c213b21cb841d5ef598bcd32e5052921b33ae65b9228cb0`) | `336 Train / 72 Val / 72 Test` (`480 records`) | **`0.184 MiB`** | **Explicitly Labeled Synthetic Benchmark** |
| `sroie` | **SROIE — Scanned Receipts OCR and Information Extraction (ICDAR 2019)** (`https://rrc.cvc.uab.es/?ch=13`) | ICDAR 2019 Competition Academic Research Terms | **SKIPPED_AUTH_REQUIRED** (Official RRC portal requires interactive user login; unauthenticated probe timed out / gated) | N/A | **`0.000 MiB`** | Public Competition Benchmark (Auth-Gated) |
| `cord` | **CORD — Consolidated Receipt Dataset for Post-OCR Parsing** (`https://huggingface.co/datasets/naver-clova-ix/cord-v2`) | CC-BY-4.0 (Clova AI Research, NAVER Corp.) | **SKIPPED_SIZE_CAP_EXCEEDED** (Probed official HF API `sha: 7f0115a4b758a71d6473b8d085751692da2fef98`; full `~1,950 MiB` archive skipped to enforce `<850 MiB` working cap) | N/A | **`0.000 MiB`** | Public Receipt Benchmark (`>850 MiB` Cap) |

* **Combined Retained Datasets Size:** **`26.701 MiB`** (strictly below the **850.0 MiB** conservative working limit and **900.0 MiB** hard cap).
* **Combined Trained Model Artifacts Size:** **`2.81 MiB`** (`fastapi_engine/models/`).

---

## 5. Known Limitations & Unavailable Official Integrations

1. **External Issuing-Authority Portals (Offline / Unconfigured in Local Sandbox):**
   * Live government verification APIs (Municipal Building Plan Sanction Portals, State Fire Service Portals, Core Banking FDR Verification Gateways) require restricted government VPN credentials not available in a local hackathon sandbox.
   * TRACE implements an honest adapter pattern (`POST /api/documents/:id/verify-issuer`):
     * `LOCAL_REGISTRY_CHECK` verifies certificate format and reference numbers against the local seeded institutional registry (`VERIFIED` / `MISMATCH_DETECTED`).
     * `EXTERNAL_AUTHORITY_TEST_UNAVAILABLE` honestly returns `SOURCE_UNAVAILABLE` with `"External issuing-authority gateway is not configured or unreachable in offline local mode"` and recommends manual scrutiny rather than faking an external API success.
2. **Antivirus / Malware Scanning:**
   * Upload security enforces strict file extension allowlists (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`), file size caps (`25 MB`), UUID storage paths outside public directories, and cryptographic magic-byte inspection (`%PDF-`, PNG/JPEG/TIFF headers) to block disguised executables (`MZ`).
   * Local ClamAV daemon scanning is **optional and not active by default** on standard Windows 11 installations; TRACE documents this transparently and relies on magic-byte and parser sandboxing.
3. **Visual Forensics & Tamper Triage Limitations:**
   * Error Level Analysis (ELA), Laplacian blur variance, and PDF `/Sig` dictionary checks provide **triage indicators only**. All forensic flags use cautious decision-support wording (`"Visual or metadata anomaly indicator requiring manual inspection"`).
4. **Local LLM / Ollama Availability:**
   * The Evidence-Grounded Regulatory Copilot (`POST /api/copilot/query`) connects to `http://127.0.0.1:11434` (`qwen2.5:1.5b-instruct`) when Ollama is running locally. When Ollama is offline, TRACE automatically executes a deterministic statutory RAG fallback that cites exact `RegulatoryClause` and `ComplianceFinding` records from PostgreSQL and includes an explicit offline-mode notice.

---

## 6. Native Windows 11 Setup, Startup & Verification Commands

No Docker, WSL, or paid cloud services are required. Run all commands natively on Windows 11 from `f:\trace-—-regulatory-assurance-&-compliance-engine`:

### 1. Start PostgreSQL 18 (Port 5433)
```powershell
& "F:\Postgres\bin\postgres.exe" -D ".postgres_data" -p 5433
```

### 2. Push Schema & Seed Reference Data
```powershell
npm run db:push
npm run db:seed
```

### 3. Manage Datasets & Train Local Models
```powershell
# List, download, prepare splits, validate annotations, and check storage budget (<850 MiB)
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" scripts/datasets.py list
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" scripts/datasets.py download
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" scripts/datasets.py prepare
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" scripts/datasets.py validate
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" scripts/datasets.py status

# Train and evaluate all 3 local models on 70/15/15 splits
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" train_models.py
```

### 4. Start Full-Stack TRACE Platform (Express + Vite + Auto-Spawned FastAPI Engine)
```powershell
npm run dev
```
* **Web UI & API Gateway:** `http://localhost:3000`
* **Python FastAPI AI/ML Service:** `http://127.0.0.1:8000`

### 5. Run Complete Automated Verification Suites
```powershell
# TypeScript Static Analysis
npm run lint

# Full Vitest Unit, Integration & Master Scenarios (Scenarios A through J)
npm test

# Python FastAPI OCR, Forensics, ML Evaluation & Dataset Manager Pytest Suite
& "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" -m pytest tests/test_fastapi_engine.py -v

# Production Frontend Build Check
npm run build
```
