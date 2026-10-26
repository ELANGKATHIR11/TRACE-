# TRACE Verification Matrix & Final Runtime Report

**Project:** TRACE — Trustworthy Regulatory Assurance & Compliance Engine  
**Problem Statement:** AICTE Smart India Hackathon 2026 (SIH26261)  
**Hardware & Runtime:** Native Windows 11, NVIDIA GeForce RTX 5060 Laptop GPU (CUDA 13.0, 8.00 GB VRAM), PostgreSQL 18 (Port 5433), Node Express 5, Python 3.11 (`dgpu-core`), React 19 + TypeScript + Vite.

---

## 1. Verified Implementation of Requested Items

### A. Real OCR Error-Rate Evaluation on FUNSD (CER & WER)
- **Script:** [`scripts/evaluate_ocr_funsd.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/scripts/evaluate_ocr_funsd.py)
- **Report Artifact:** [`fastapi_engine/models/funsd_ocr_evaluation.json`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/models/funsd_ocr_evaluation.json)
- **Evaluation Mechanism:** Runs EasyOCR text detection and recognition against ground-truth form annotations on the held-out test split of the official **FUNSD** (*Form Understanding in Noisy Scanned Documents*) dataset.
- **Measured Metrics:**
  - **Overall Character Error Rate (CER):** `59.61%` (Character Accuracy: `40.39%`)
  - **Overall Word Error Rate (WER):** `77.71%` (Word Accuracy: `22.29%`)
  - **Evaluated Test Tokens:** `3,194` reference characters across `498` reference words on real historical noisy carbon-copy scanned forms.
  - **Honest Finding:** High CER/WER on noisy historical scans demonstrates why TRACE enforces low-confidence routing (`< 75%` confidence) to human scrutiny rather than hallucinating perfect accuracy on complex physical scans.

---

### B. Near-Duplicate Text Content Detector
- **Implementation:** [`server/services/validation-engine.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/services/validation-engine.ts) (`computeNormalizedTextSimilarity`)
- **Mechanism:** In addition to exact SHA-256 binary hash matching (`EXACT_HASH_DUPLICATE`), the engine aggregates text across OCR document pages and computes normalized token Jaccard similarity across sibling documents in the same application.
- **Trigger Threshold:** When similarity exceeds `85%`, it emits the structured anomaly indicator `NEAR_DUPLICATE_TEXT_CONTENT` with cautious decision-support wording:
  - **Indicator Code:** `NEAR_DUPLICATE_TEXT_CONTENT`
  - **Severity:** `Medium (High Textual Overlap)`
  - **Limitations:** *"Automated bag-of-words token similarity. May reflect standard statutory boilerplate or identical template forms without fraudulent intent."*
  - **Next Action:** *"Perform manual side-by-side inspection to confirm whether distinct schedules or identical filings were submitted."*
- **Test Evidence:** Verified in **Scenario K** of [`src/tests/scenarios-master.test.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/tests/scenarios-master.test.ts).

---

### C. Service-Restart Persistence Verification
- **Implementation:** Verified in **Scenario L** of [`src/tests/scenarios-master.test.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/tests/scenarios-master.test.ts).
- **Mechanism:** Mutates system settings in PostgreSQL, tears down the Express application instance, boots a brand new `createExpressApp()` instance with distinct HTTP agent context, and verifies that mutated settings, application records (`APP-2026-0842`), and validation states remain intact and queryable from the database.

---

### D. Live Training Job API Dispatch & Administrative Cancellation
- **Implementation:** Verified in **Scenario M** of [`src/tests/scenarios-master.test.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/tests/scenarios-master.test.ts).
- **Mechanism:**
  1. Administrative caller dispatches `POST /api/settings/training` with target model `funsd-entity-mlp`, dataset `funsd-benchmark-v1`, and hyperparameter bounds.
  2. Express validates storage budget and allowlisted dataset status, creates a persistent `TrainingJob` record in PostgreSQL, and dispatches the job to FastAPI.
  3. Live progress polling via `GET /api/settings/training/:jobId` confirms active worker initialization and status tracking.
  4. Caller dispatches `POST /api/settings/training/:jobId/cancel` to cleanly verify administrative abort capabilities. Status persists as `Cancelled`.

---

## 2. Test Suite Execution Summary

| Suite | Command | Total Tests | Status |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | `npm run lint` | Full codebase | **PASS (0 errors)** |
| **Master Scenarios (A through M)** | `npm test -- src/tests/scenarios-master.test.ts` | 12 tests | **PASS (12/12 passed)** |
| **Complete Vitest Suite** | `npm test` | 8 files / 49 tests | **PASS (49/49 passed)** |
| **Python FastAPI AI/ML Engine** | `pytest tests/test_fastapi_engine.py -v` | 8 tests | **PASS (8/8 passed)** |
| **Production Frontend Build** | `npm run build` | Full bundle | **PASS (Vite client generated in 706ms)** |
