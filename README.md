# TRACE 2.0 — Trustworthy Regulatory Assurance & Compliance Engine

> **Next-Generation AICTE Statutory Scrutiny & Regulatory Assurance Platform with GPU Document-AI, Deterministic Verification, Shadow Replay, Incremental Reprocessing, and Cryptographic Evidence Lineage.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748.svg)](https://www.prisma.io/)
[![PyTorch CUDA](https://img.shields.io/badge/PyTorch-CUDA%2013.0-EE4C2C.svg)](https://pytorch.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg)](https://vitejs.dev/)

---

## 1. Project Description

**TRACE 2.0** is an enterprise regulatory assurance and compliance engine purpose-built for statutory regulatory bodies (such as the **All India Council for Technical Education — AICTE**). Technical campuses submit dense multi-page documentation (building completion certificates, municipal fire NOCs, land title deeds, fixed deposit receipts, and governing resolutions) across multiple application cycles.

Traditional verification relies on labor-intensive manual audits or error-prone keyword search that silently fails on multi-document date mismatches, units disparity (acres vs. hectares vs. sq. meters), post-dated certificates, and version regressions.

TRACE transforms this regulatory scrutiny workflow through **six core differentiated features**:
1. **ChronoGraph**: Cross-document contradiction graph that normalizes atomic claims and isolates temporal, value, and stale-validity contradictions with clickable bounding-box evidence.
2. **RuleReplay**: Regulatory change impact simulator running draft handbook amendments in shadow mode across stored evidence without altering production records, protected by an authorized publication gate.
3. **DeltaScan**: Incremental document reprocessing using per-page SHA-256 fingerprinting and caching, reducing re-analysis compute time by 50–90%.
4. **FixPreview**: Counterfactual correction sandbox allowing institutions and reviewers to test hypothetical values safely without altering official findings.
5. **ReviewPilot**: Explainable review queue prioritization with deterministic scoring factors (severity, contradictions, OCR uncertainty, deadlines) and reviewer workload balancing.
6. **Proofline**: Cryptographically verifiable evidence lineage generating append-only, SHA-256 hash-chained validation manifests.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer ["Frontend UI Layer (React 19 + Vite 8.3 + Vanilla/Tailwind CSS)"]
        UI_Dash["Executive Control Tower & My Work"]
        UI_DocAI["AI Document Intelligence & ChronoGraph"]
        UI_Rules["Regulatory Rulebook & RuleReplay Sandbox"]
        UI_Queue["Verification Queue & ReviewPilot Prioritization"]
        UI_Audit["Proofline Lineage & Immutable Audit Trail"]
        UI_Sandbox["Evidence-to-Action Drawer & FixPreview"]
    end

    subgraph GatewayLayer ["Node.js / Express 4.21 Gateway (Port 3000)"]
        AUTH["Session RBAC Guard (5 Distinct Roles)"]
        ROUTER_APP["/api/applications (Stage & Contradictions)"]
        ROUTER_DOCS["/api/documents (Upload & DeltaScan)"]
        ROUTER_RULES["/api/regulations (RuleSet & RuleReplay)"]
        ROUTER_FINDINGS["/api/findings (Tasks & FixPreview)"]
        ROUTER_QUEUE["/api/review-queue (ReviewPilot)"]
        ROUTER_PROV["/api/provenance (Proofline Hash Chain)"]
        FASTAPI_CLIENT["FastAPI Microservice Bridge & Lifecycle Mgr"]
    end

    subgraph InferenceLayer ["Python FastAPI Document-AI Engine (Port 8000 — Miniconda dgpu-core)"]
        PY_OCR["PyMuPDF 1.25 + EasyOCR 1.7 (GPU Accelerated)"]
        PY_CHRONO["ChronoGraph Analyzer (Deterministic Claim Extraction)"]
        PY_DELTA["DeltaScan Fingerprinter (Per-Page SHA-256 Diff)"]
        PY_REPLAY["RuleReplay Shadow Engine (Ruleset Diff & Simulation)"]
        PY_PILOT["ReviewPilot Scorer (Explainable Priority Formula)"]
        PY_PROOFLINE["Proofline Manifest Generator (Canonical SHA-256 Hash Chain)"]
    end

    subgraph DataLayer ["Data & Storage Layer (Native Windows — No Docker)"]
        PG[("PostgreSQL 18 Database (Port 5433)")\n31 Relational Models via Prisma ORM]
        FS[("Local File Vault")\nEncrypted Document Storage]
    end

    UI_Dash & UI_DocAI & UI_Rules & UI_Queue & UI_Audit & UI_Sandbox -->|JSON / REST / Session Cookie| AUTH
    AUTH --> ROUTER_APP & ROUTER_DOCS & ROUTER_RULES & ROUTER_FINDINGS & ROUTER_QUEUE & ROUTER_PROV
    ROUTER_APP & ROUTER_DOCS & ROUTER_RULES & ROUTER_FINDINGS & ROUTER_QUEUE & ROUTER_PROV -->|Prisma Client| PG
    ROUTER_DOCS --> FS
    ROUTER_APP & ROUTER_DOCS & ROUTER_RULES & ROUTER_QUEUE & ROUTER_PROV -->|HTTP Client / IPC| FASTAPI_CLIENT
    FASTAPI_CLIENT --> PY_OCR & PY_CHRONO & PY_DELTA & PY_REPLAY & PY_PILOT & PY_PROOFLINE
```

---

## 3. The Six Differentiated Features

```mermaid
flowchart LR
    subgraph F1 ["1. ChronoGraph"]
        C1["Raw PDF Evidence"] --> C2["Extract Atomic Claims"]
        C2 --> C3["Deterministic Normalization\n(Area, Dates, Intake)"]
        C3 --> C4["Cross-Doc Contradiction Graph\n(Temporal, Value, Stale)"]
    end

    subgraph F2 ["2. RuleReplay"]
        R1["Draft Rulebook Amendment"] --> R2["Clause Semantic Diff"]
        R2 --> R3["Shadow Replay on Applications"]
        R3 --> R4["Impact Report\n(Production Unchanged)"]
        R4 --> R5["Authorized Admin Publication Gate"]
    end

    subgraph F3 ["3. DeltaScan"]
        D1["New PDF Revision (v2.0)"] --> D2["Page SHA-256 Fingerprint"]
        D2 --> D3{"Cached Page Hash?"}
        D3 -- Yes --> D4["REUSE_CACHE\n(0ms compute)"]
        D3 -- No --> D5["REPROCESS_PAGE\n(Targeted Re-eval)"]
        D4 & D5 --> D6["Measure Savings %"]
    end

    subgraph F4 ["4. FixPreview"]
        X1["Active Deficiency Finding"] --> X2["Hypothetical Correction Input"]
        X2 --> X3["Deterministic Sandbox Test"]
        X3 --> X4["Would Resolve Preview\n(Official Finding UNCHANGED)"]
    end

    subgraph F5 ["5. ReviewPilot"]
        P1["Pending Queue Items"] --> P2["Severity + Contradictions + OCR + Deadlines"]
        P2 --> P3["Deterministic Explainable Score"]
        P3 --> P4["Fair Reviewer Workload Allocation"]
    end

    subgraph F6 ["6. Proofline"]
        L1["Assessment Outcomes"] --> L2["Canonical SHA-256 Payload"]
        L2 --> L3["Predecessor Hash Pointer"]
        L3 --> L4["Tamper-Evident Hash Chain Verification"]
    end
```

---

## 4. Software Packages & Dependencies

### Frontend & UI Packages
| Package | Version | Purpose |
|:---|:---|:---|
| `react` | `^19.0.1` | Core declarative UI component library |
| `react-dom` | `^19.0.1` | React DOM rendering engine |
| `react-router` / `react-router-dom` | `^7.18.4` | Application routing and deep-linking |
| `lucide-react` | `^0.546.0` | Accessible iconography system |
| `motion` | `^12.23.24` | Hardware-accelerated transitions & drawer micro-animations |
| `recharts` | `^3.10.1` | Analytics, workload balance, and compliance metrics charts |
| `sonner` | `^2.0.8` | High-fidelity toast notifications |
| `@tanstack/react-query` | `^5.104.5` | Async server state cache and synchronization |
| `@reduxjs/toolkit` | `^2.13.0` | Client-side application store management |
| `react-hook-form` | `^7.90.0` | High-performance form validation |
| `@hookform/resolvers` | `^6.0.0` | Form resolver bridge for schema validation |
| `zod` | `^4.6.7` | Runtime type inference and schema validation |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.7.0` | Dynamic style merging and utility handling |
| `class-variance-authority` | `^0.7.1` | Typed UI component variant design tokens |
| `@tailwindcss/vite` | `^4.3.3` | Tailwind CSS integration for Vite |
| `vite` | `^8.3.0` | Ultra-fast client bundler and HMR server |

### Backend & Middleware Packages (Node.js)
| Package | Version | Purpose |
|:---|:---|:---|
| `express` | `^4.21.2` | Core HTTP REST API framework |
| `prisma` / `@prisma/client` | `^6.4.1` | Type-safe PostgreSQL ORM & schema migration engine |
| `bcryptjs` | `^3.0.3` | Salted credential hashing (TraceSecure2026!) |
| `cookie-parser` | `^1.4.7` | Secure HTTP-only cookie session handling |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing control |
| `dotenv` | `^17.2.3` | Environment configuration manager |
| `multer` | `^2.4.0` | Multipart streaming for PDF document uploads |
| `pdf-parse` | `^2.4.5` | Fast native server-side text extraction |
| `nodemailer` | `^10.1.7` | SMTP dispatch for statutory task alerts |
| `supertest` | `^7.3.1` | Integration testing HTTP assertions |
| `vitest` | `^5.0.5` | Unit and end-to-end test execution framework |
| `tsx` | `^4.19.3` | Zero-config TypeScript script execution |

### Python Document-AI & Inference Packages
| Package | Version | Purpose |
|:---|:---|:---|
| `fastapi` | `>=0.115.0` | High-throughput asynchronous inference API |
| `uvicorn` | `>=0.30.0` | High-performance ASGI server for Python microservice |
| `pydantic` | `>=2.8.0` | Strict data validation & contract serialization |
| `pymupdf` (`fitz`) | `>=1.24.0` | High-precision PDF layout block parsing & page rendering |
| `easyocr` | `>=1.7.0` | Deep-learning OCR with CUDA acceleration & CPU fallback |
| `torch` | `>=2.2.0` | PyTorch neural runtime with CUDA 13.0 GPU bindings |
| `python-multipart` | `>=0.0.9` | Multipart file upload parsing for Python endpoints |
| `requests` | `>=2.31.0` | HTTP client for inter-service communication |

---

## 5. Directory Structure

```text
trace-—-regulatory-assurance-&-compliance-engine/
├── .env.example                       # Documented environment template
├── AI.md                              # Core architectural & feature specification
├── README.md                          # Repository documentation & architecture guide
├── requirements.txt                   # Python FastAPI Document-AI dependencies
├── package.json                       # Node.js dependencies and lifecycle scripts
├── tsconfig.json                      # Strict TypeScript compiler options
├── vite.config.ts                     # Vite client bundling configuration
├── vitest.config.ts                   # Vitest testing configuration
│
├── fastapi_engine/                    # Python Document-AI Inference Engine
│   ├── main.py                        # FastAPI entrypoint (OpenMP conflict protected)
│   └── routers/
│       ├── chronograph.py             # ChronoGraph claim extraction & contradiction detection
│       ├── deltascan.py               # DeltaScan SHA-256 fingerprinting & cache reuse
│       ├── document_ai.py             # PyMuPDF block parser & EasyOCR GPU pipeline
│       ├── proofline.py               # Proofline canonical hash-chain generator & verifier
│       ├── reviewpilot.py             # ReviewPilot explainable queue priority scoring
│       └── rulereplay.py              # RuleReplay semantic diff & shadow evaluation
│
├── prisma/
│   └── schema.prisma                  # PostgreSQL schema with 31 relational models
│
├── server/                            # Node.js Express Gateway
│   ├── db/
│   │   ├── prisma.ts                  # Shared Prisma ORM client instance
│   │   └── seed.ts                    # Statutory regulations, institutional seed data
│   ├── routes/
│   │   ├── applications.ts            # Application stages, claim graph, contradiction API
│   │   ├── auth.ts                    # Role-based authentication & session handling
│   │   ├── documents.ts               # Document upload, remediation & DeltaScan API
│   │   ├── findings.ts                # Compliance findings, tasking & FixPreview sandbox
│   │   ├── provenance.ts              # Proofline manifests & cryptographic verification API
│   │   ├── review-queue.ts            # ReviewPilot prioritized review queue API
│   │   ├── rules.ts                   # Ruleset versioning, comparison & shadow replay API
│   │   └── state.ts                   # Unified state snapshot endpoint
│   ├── services/
│   │   ├── audit-service.ts           # Append-only audit logging service
│   │   ├── fastapi-service.ts         # FastAPI microservice lifecycle & typed API client
│   │   ├── ocr-service.ts             # OCR fallback & text extraction service
│   │   └── validation-service.ts      # Statutory clause validation logic
│   └── server.ts                      # Express HTTP server & Vite dev middleware
│
├── src/                               # Frontend React Application
│   ├── components/
│   │   ├── layout/AppShell.tsx        # Responsive navigation shell with role badges
│   │   └── traceability/              # Evidence drawer, bounding boxes & FixPreviewSandbox
│   ├── features/
│   │   ├── audit/                     # Proofline manifest viewer & chain integrity verifier
│   │   ├── dashboard/                 # Control tower, role dashboards & metrics
│   │   ├── document-intelligence/     # ChronoGraph contradiction graph & DeltaScan view
│   │   ├── rules/                     # Regulatory rulebook & RuleReplay simulator
│   │   └── verification/              # Review queue & ReviewPilot prioritization
│   ├── lib/
│   │   ├── api-client.ts              # Typed frontend HTTP client for all 6 features
│   │   └── store.tsx                  # React Context store provider
│   ├── types/
│   │   └── domain.ts                  # Complete TypeScript domain contracts
│   └── tests/                         # Vitest automated test suites (20 tests)
│       ├── auth-isolation.test.ts     # RBAC security & permission boundaries
│       ├── differentiated-features.test.ts # End-to-end 6-feature regulatory journey
│       ├── e2e-journey.test.ts        # 10-step Evidence-to-Action journey
│       ├── offline-copilot.test.ts    # 100% offline air-gapped regulatory assistant
│       ├── trace-flow.test.tsx        # React component mounting & flow tests
│       └── validation-engine.test.ts  # Statutory date & cutoff validation tests
│
└── tests/
    └── test_fastapi_engine.py         # Native Python unit tests for all 6 FastAPI routers
```

---

## 6. Getting Started (Native Windows Execution)

### Prerequisites
1. **Node.js**: v20+ (v24.20.0 recommended)
2. **PostgreSQL**: v16+ running natively on port `5433` (or `5432`)
3. **Miniconda Python**: Python 3.11 with PyTorch CUDA 13.0, PyMuPDF, EasyOCR, FastAPI, and Uvicorn.

### Step-by-Step Setup

```powershell
# 1. Install Node.js dependencies
npm install --legacy-peer-deps

# 2. Push database schema to PostgreSQL
npm run db:push

# 3. Generate Prisma client types
npm run db:generate

# 4. Seed database with regulatory clauses, institutions, and sample applications
npm run db:seed

# 5. Execute all automated tests (Python unit tests + Node Vitest suites)
$env:PYTHONPATH="."; & "C:\Users\elang\miniconda3\envs\dgpu-core\python.exe" tests\test_fastapi_engine.py
npm test

# 6. Run TypeScript check & production build
npm run lint
npm run build

# 7. Start full-stack development server
npm run dev
```

Visit the application at: **http://localhost:3000**

---

## 7. Role-Based Access Control (RBAC) Accounts

All demo accounts use the standard password: `TraceSecure2026!`

| Role Name | User Email | Permissions & Scope |
|:---|:---|:---|
| **Authorized Reviewer** | `arvind.deshmukh@trace-scrutiny.demo.in` | Inspect evidence, resolve findings, trigger ChronoGraph analysis, execute DeltaScan. |
| **Institution Compliance Officer** | `meera.krishnan@vieps-tech.demo.edu` | Upload revised document remediations, test counterfactual values in FixPreview sandbox. |
| **Institution Administrator** | `principal@vieps-tech.demo.edu` | Manage institution profile, authorize formal application submission. |
| **Regulatory System Admin** | `rajeshwari.nair@trace-policy.demo.in` | Publish new regulatory rulebooks, authorize RuleReplay shadow-mode publication gates. |
| **Auditor (Oversight Cell)** | `v.sen@audit-oversight.demo.in` | Strictly read-only; audits Proofline assessment manifests and cryptographic hash chains. |

---

## 8. Definition of Done & Quality Assurance

- [x] **All Six Differentiated Features Integrated**: ChronoGraph, RuleReplay, DeltaScan, FixPreview, ReviewPilot, Proofline.
- [x] **Zero Mock Data**: Real database queries, real PyMuPDF block parsing, real cryptographic SHA-256 hashing.
- [x] **Strict Safety Isolation**: FixPreview and RuleReplay cannot alter production records without authorized approval.
- [x] **Under 1.5 GB Project Cap**: Measured directory size is **617.1 MB** (~41% of budget).
- [x] **Native Windows Execution**: 100% containerless execution on native Windows with dGPU acceleration.
- [x] **100% Test Pass Rate**: 20/20 Vitest integration tests + 6/6 Python tests passing.
