# TRACE — Security Test & Verification Report

**Date**: October 25, 2026  
**Auditor**: Application Security & Regulatory Assurance Lead  
**Engine**: TRACE 2.0 (Node.js/Express + FastAPI + PostgreSQL/Prisma)

---

## 1. Authentication & Privilege Escalation Security Audit

| Test Objective | Attack Vector Simulated | Expected Outcome | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Anonymous Session Inspection** | `GET /api/auth/me` with no session cookie | HTTP 401 Unauthorized | HTTP 401 `Not authenticated. A valid session is required.` | **PASS** |
| **Anonymous Role Switching** | `POST /api/auth/switch-role` with no session | HTTP 401 Unauthorized | HTTP 401 `Authentication required. An active session is required to switch demo roles.` | **PASS** |
| **Unauthorized Role Escalation** | Institution officer attempts role switch | HTTP 403 Forbidden | HTTP 403 `Role escalation denied. Current role is not authorized.` | **PASS** |
| **Anonymous Settings Mutation** | `PATCH /api/settings/general` with no auth | HTTP 401 Unauthorized | HTTP 401 `Authentication required. Please log in with an administrative account.` | **PASS** |
| **Header Identity Spoofing** | Call with `x-user-role: regulatory_system_administrator` but no session | HTTP 401 Unauthorized | Server ignores `x-user-role` and returns HTTP 401 | **PASS** |
| **Unauthorized Regulatory Publication** | Compliance officer attempts to publish RuleSet | HTTP 403 Forbidden | HTTP 403 `Only Regulatory System Administrators can publish approved rule sets.` | **PASS** |
| **Anonymous Regulatory Publication** | `POST /api/rules/:id/publish` without auth | HTTP 401 Unauthorized | HTTP 401 `Authentication required.` | **PASS** |
| **Anonymous Impact Report Publication** | `POST /api/regulations/impact-reports/:id/publish` without auth | HTTP 401 Unauthorized | HTTP 401 `Authentication required.` | **PASS** |
| **Credential & Hash Leakage** | `POST /api/auth/login` and inspection of response body | No password hashes in payload | Response sanitized via `sanitizeUser()`; zero `$2a$` or `$2b$` bcrypt hashes | **PASS** |
| **Auditor Mutation Guard** | Auditor attempts `PATCH /api/applications/:id/stage` | HTTP 403 Forbidden | HTTP 403 `Auditor access is strictly read-only.` | **PASS** |
| **Tenant Cross-Access Isolation** | Institution user accesses non-belonging institution | HTTP 403 Forbidden | HTTP 403 `Tenant isolation violation: Access to other institutions is restricted.` | **PASS** |

---

## 2. FastAPI Security & Document Pipeline Audit

| Security Boundary | Tested Behavior | Verification Finding | Status |
| :--- | :--- | :--- | :--- |
| **Cross-Origin Resource Sharing (CORS)** | Requests with arbitrary origin headers | Wildcard CORS removed. Only explicit localhost/127.0.0.1 trusted origins permitted. | **PASS** |
| **Missing Document File Handling** | `POST /api/documents/:id/reprocess-delta` with missing file | Synthetic `%PDF-1.4%` generation removed. Returns truthful HTTP 404. | **PASS** |
| **Missing Metadata Verification** | Extracted pages missing certificates or dates | Return explicit `NOT_EXTRACTED` values with `status: "missing"`. | **PASS** |
| **Cryptographic Signature Claims** | Document integrity checks | Returns truthful hash matching; explicitly marks cryptographic signature verification as unavailable. | **PASS** |

---

## 3. Machine Learning Evaluation & Model Governance Audit

| Evaluation Domain | Tested Metric / Operation | Result | Status |
| :--- | :--- | :--- | :--- |
| **Model Classification Status** | `GET /system_ml/models` and metadata inspection | Labeled as `Experimental Prototype` trained on synthetic layout density tensors. | **PASS** |
| **Evaluation Truthfulness** | `POST /system_ml/models/:id/evaluate` | Hardcoded 99.8% vanity metrics removed. Real macro-F1 (0.941) computed against held-out data. | **PASS** |
| **Background Training Execution** | `POST /system_ml/training/start` and status polling | Genuine background worker thread with bounded epochs and administrative cancellation. | **PASS** |
| **Dataset Allowlisting** | Training requested on non-allowlisted dataset | Enforced in `settings.ts`; requests on unauthorized datasets rejected with HTTP 400. | **PASS** |

---

## 4. Audit Trail & Idempotency Audit

| Event / Subsystem | Verification Details | Status |
| :--- | :--- | :--- |
| **Scheduler Run-Lock** | 60-second periodic scheduler uses single-instance interval locks and execution flags. | **PASS** |
| **Automated Event Provenance** | Overdue tasks and expired documents log immutable `AuditEvent` records with actor `SYSTEM-SCHEDULER`. | **PASS** |
| **Graceful Shutdown** | Clean interval cancellation and Prisma disconnection on `SIGINT` / `SIGTERM`. | **PASS** |

---

## 5. Security Verdict

The TRACE 2.0 application has met all P0 and architectural security criteria. No privilege escalation vectors, unauthenticated administrative access paths, or misleading synthetic verifications remain active.
