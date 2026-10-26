# TRACE — SIH 26261 FINAL MASTER REENGINEERING AUDIT & VERIFICATION REPORT
**Problem Statement:** SIH 26261 — *AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification* (AICTE)  
**Architecture:** React 19 + TypeScript + Vite · Node.js + Express · Python + FastAPI · PostgreSQL 18 (Port 5433) + Prisma · LangGraph (PostgreSQL Durable Checkpoints) · Local Persistent Qdrant (`qdrant_storage`) · Centralized Native Local Ollama Gateway (`http://localhost:11434`)

---

## 1. Discovered Local Ollama Models & Capability Matrix

All AI/ML/DL inference in operational workflows is routed strictly through the centralized [`OllamaGateway`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/ollama_gateway.py). No cloud APIs, EasyOCR, sentence-transformers, CLIP, or silent model downloads are executed.

| Installed Ollama Model | Digest | Size | Parameter / Quantization | Discovered Capabilities | Context Window | Operational Assignment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `qwen2.5:1.5b-instruct` | `98b3638b9b8e` | 940.0 MB | `1.5B` / `Q4_K_M` | `completion`, `tools` | 32,768 | **Primary Text & Structured JSON Synthesis** (Stage 7 reports, Copilot RAG explanations) |
| `qwen2.5:0.5b-instruct` | `f6582a3b489a` | 379.0 MB | `494M` / `Q4_K_M` | `completion`, `tools` | 32,768 | **Fast Structured Classification** (Stage 2 document classification) |
| `riven/smolvlm:latest` | `f6cdac2fd42f` | 520.0 MB | `256M` / `F16` | `completion`, `vision` | 8,192 | **Vision-Language Model (VLM)** for scanned-page OCR & VRAG visual page descriptions |
| `qwen2.5-coder:3b` | `f72c60cabf62` | 1,841.0 MB | `3.1B` / `Q4_K_M` | `completion`, `tools`, `insert` | 32,768 | **Complex Rule/Schema Reasoning Fallback** |
| `zenthi-ai:latest` | `f6582a3b489a` | 379.0 MB | `494M` / `Q4_K_M` | `completion`, `tools` | 32,768 | **Secondary Local Assistant Model** |

### Embedding Capability Honesty & Blocker Reporting
- Live probing of `POST http://localhost:11434/api/embed` returned HTTP `501`: `{"error": "This server does not support embeddings. Start it with --embeddings"}` and no dedicated embedding model (e.g., `nomic-embed-text`) is currently installed.
- Per Section 1 ("Never assume a vision or embedding model exists. Do not silently download models. If a required capability is missing, show the exact blocker and a user-controlled installation option; mark the task unavailable until verified"):
  - [`OllamaGateway`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/ollama_gateway.py) reports `blockerCode: "EMBEDDING_CAPABILITY_UNAVAILABLE"` with remediation command `ollama pull nomic-embed-text && ollama serve --embeddings` and exposes a **User-Initiated Model Pull** control in [`SettingsPage.tsx`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/features/settings/SettingsPage.tsx).
  - [`QdrantVragMragEngine`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/qdrant_vrag_mrag.py) maintains all 4 persistent Qdrant collections (`regulatory_chunks`, `document_text_chunks`, `visual_page_descriptions`, `authorized_record_summaries`) and seamlessly executes **Hybrid Reciprocal Rank Fusion (RRF)** combining dense Qdrant vectors (when available) with lexical BM25/token overlap, exact clause-number matching, and strict `institutionId` tenant isolation.

---

## 2. Multi-Agent Supervisor–Worker LangGraph Workflow (PostgreSQL Checkpoints)

Implemented in [`fastapi_engine/services/langgraph_workflow.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/langgraph_workflow.py) and exposed via [`fastapi_engine/routers/workflow.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/workflow.py) and [`server/routes/applications.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/applications.ts):

- **Durable Checkpointer:** Uses `PostgresSaver` (`langgraph-checkpoint-postgres`) backed by `postgresql://postgres@localhost:5433/trace_db` with stable `thread_id = f"trace-app-{application_id}-run-{run_id}"`.
- **8 Graph Nodes Mapping to the Exact 9-Stage PS 26261 Pipeline:**
  1. `triage_supervisor_node` (**Stage 0**: Application Intake & Category Triage)
  2. `idp_crosscheck_worker_node` (**Stage 1**: Internal Consistency · **Stage 2**: Document Completeness & Classification · **Stage 3**: Cross-Verification against Authorized Institutional Records & Multi-Year Longitudinal Comparison)
  3. `forensics_worker_node` (**Stage 5**: SHA-256 Digest, Perceptual Hash `pHash`, Near-Duplicate Text, Chronological Cutoff Discrepancies)
  4. `issuer_verification_worker_node` (**Stage 4**: Cryptographic PDF `/Sig` Check & External Issuer Adapters clearly distinguishing `AUTHORIZED_LOCAL_REGISTRY` vs `SIMULATED_SANDBOX_ADAPTER`)
  5. `regulatory_infrastructure_worker_node` (**Stage 6**: Deterministic APH 2026-27 Clause Evaluation & Infrastructure Readiness Norms)
  6. `vrag_mrag_retrieval_worker_node` (**VRAG + MRAG**: Hybrid Qdrant Retrieval across Regulatory Clauses, Document Chunks, Visual Page Descriptions, and Authorized Records)
  7. `synthesis_report_worker_node` (**Stage 7**: Evidence-Linked Findings Synthesis via local Ollama JSON schema validation & Review Priority Scoring)
  8. `human_review_interrupt_node` (**Stage 8**: Pauses flagged/inconclusive cases at `PAUSED_FOR_HUMAN_REVIEW`—never auto-rejects—and resumes only when an authorized AICTE reviewer submits a decision and rationale via `POST /api/applications/:id/workflow/resume`).

---

## 3. Requirement-to-Code & Verification Matrix

| Requirement / Stage / Differentiator | Implementation Files | Automated Test Coverage | Verification Status |
| :--- | :--- | :--- | :--- |
| **Centralized Native Ollama Gateway** (Discovery, Capability Routing, Schema Validation, Provenance, User-Controlled Pull) | [`ollama_gateway.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/ollama_gateway.py), [`system_ml.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/system_ml.py), [`settings.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/settings.ts) | `test_ollama_gateway_discovery_and_vrag_mrag_qdrant`, `Scenario N` | `IMPLEMENTED_AND_TESTED` |
| **VRAG + MRAG with Local Persistent Qdrant** (`regulatory_chunks`, `document_text_chunks`, `visual_page_descriptions`, `authorized_record_summaries` + RRF + Tenant Isolation) | [`qdrant_vrag_mrag.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/qdrant_vrag_mrag.py), [`workflow.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/workflow.py) | `test_ollama_gateway_discovery_and_vrag_mrag_qdrant`, `Scenario P` | `IMPLEMENTED_AND_TESTED` |
| **Dense Ollama Embedding Vectors** (`/api/embed`) | [`ollama_gateway.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/ollama_gateway.py), [`SettingsPage.tsx`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/features/settings/SettingsPage.tsx) | `test_ollama_gateway_discovery_and_vrag_mrag_qdrant` | `BLOCKED_MISSING_OLLAMA_MODEL` (Local server returns HTTP 501 unless started with `--embeddings` & `nomic-embed-text` pulled; hybrid lexical/clause RRF active) |
| **Multi-Agent Supervisor–Worker LangGraph (Stages 0–8 + PostgreSQL Checkpoints + Human Interrupt & Resume)** | [`langgraph_workflow.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/services/langgraph_workflow.py), [`applications.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/applications.ts), [`IssuerInstitutionalVerificationPanel.tsx`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/features/verification/IssuerInstitutionalVerificationPanel.tsx) | `test_langgraph_9_stage_workflow_postgres_checkpoint_and_interrupt_resume`, `Scenario O` | `IMPLEMENTED_AND_TESTED` |
| **Ollama-Only Document Pipeline** (PyMuPDF native text + Ollama VLM `riven/smolvlm:latest` for scanned pages + OpenCV/pHash/SHA-256 forensics) | [`document_ai.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/document_ai.py), [`process_document.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/scripts/process_document.py) | `test_deltascan_identical_and_modified_pages`, `Scenario A`, `Scenario B & C` | `IMPLEMENTED_AND_TESTED` |
| **Differentiator 1: 11-Node Compliance Evidence Graph** | [`applications.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/applications.ts), [`ReportsAuditPage.tsx`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/features/reports/ReportsAuditPage.tsx) | `Scenario F` | `IMPLEMENTED_AND_TESTED` |
| **Differentiator 2: Longitudinal Institutional Comparison** (AY 2024-25, 2025-26, 2026-27 multi-cycle delta & spike detection) | [`applications.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/applications.ts), [`IssuerInstitutionalVerificationPanel.tsx`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/src/features/verification/IssuerInstitutionalVerificationPanel.tsx) | `Scenario N` | `IMPLEMENTED_AND_TESTED` |
| **Differentiator 3: Regulation Change Impact + Regression (RuleReplay)** | [`rulereplay.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/rulereplay.py), [`regulations.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/regulations.ts) | `test_rulereplay_shadow_evaluation`, `Scenario G` | `IMPLEMENTED_AND_TESTED` |
| **Differentiator 4: Incremental Correction, DeltaScan & Version Diff (`v1.0` -> `v2.0`)** | [`deltascan.py`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/fastapi_engine/routers/deltascan.py), [`documents.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/documents.ts) | `Scenario H` | `IMPLEMENTED_AND_TESTED` |
| **Synchronized Downloadable PDF & JSON Decision-Support Reports** | [`reports.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/reports.ts) | `Scenario I` | `IMPLEMENTED_AND_TESTED` |
| **RBAC, Tenant Isolation & Prompt-Injection Defense** | [`auth.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/middleware/auth.ts), [`copilot.ts`](file:///f:/trace-—-regulatory-assurance-&-compliance-engine/server/routes/copilot.ts) | `Scenario D`, `Scenario J`, `Scenario O`, `Scenario P` | `IMPLEMENTED_AND_TESTED` |
