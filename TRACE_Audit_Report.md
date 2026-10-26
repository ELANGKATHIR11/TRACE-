# TRACE — Comprehensive Security & Architecture Audit Report

**System**: TRACE (Trustworthy Regulatory Assurance & Compliance Engine)  
**Version**: 2.0.0 (Statutory AICTE Approval Process AY 2026-27)  
**Audit Date**: October 25, 2026  
**Auditor Role**: Principal Full-Stack Engineer, Security Auditor & Database Architect  

---

## Executive Summary

TRACE is an enterprise-grade regulatory assurance and compliance engine specifically engineered for AICTE institutional scrutiny, document verification, deterministic clause evaluation, corrective task lifecycles, and tamper-evident audit trails.

This audit report details the comprehensive verification of all architectural tiers, database models, background services, security configurations, machine learning pipelines, and frontend features.

---

## Tier-by-Tier Audit Findings & Resolutions

### 1. Database & Schema Alignment

- **Prisma Schema Model Verification**: All 37 PostgreSQL models in `prisma/schema.prisma` (`User`, `Session`, `Institution`, `Application`, `Document`, `ComplianceFinding`, `CorrectiveTask`, `AuditEvent`, `SystemSetting`, `MlModelRecord`, `TrainingJob`, `DatasetManifest`, `ConfigAuditEvent`, etc.) were inspected against live database queries and route handlers.
- **Field & Enum Verification**: Verified that `CorrectiveTask.status` accurately supports `'Open' | 'In Progress' | 'Awaiting Verification' | 'Completed' | 'Overdue'` and `Document.validationState` matches expected state strings.
- **Migration & Persistence Safety**: Ensured forward-compatibility. A dated pre-migration backup (`.postgres_data_backup_20261025_180009`) was created, preventing any data loss or reset of PostgreSQL records.

### 2. Backend Server & API Security

- **CORS Explicit Allowlists**: Replaced wild/reflected `origin: true` configuration with an explicit trusted-origin allowlist (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`, and `APP_URL`). Unauthorized cross-origin requests are rejected.
- **Authentication & RBAC**: Confirmed that global `authMiddleware` safely hydrates user context from secure cookies (`trace_session`) or Bearer tokens. Tested that route-level RBAC (`requireAuth`, `requireRole`, `checkAdminAccess`) strictly forbids institution compliance officers and auditor roles from mutating system configurations or approving regulatory items.
- **Accurate Health & Readiness**: Refactored `/api/health` so that it truthfully verifies database availability with live queries, distinguishes process liveness from dependency readiness, returns HTTP 503 degraded status upon database unavailability, and avoids leaking raw internal database stack traces or SQL exceptions.
- **OpenAPI & Contract Integrity**: Verified route registration and preserved full backwards-compatibility across canonical endpoints (`/api/settings`, `/api/ml`, `/api/system`) without routing conflicts.

### 3. Background Scheduler & Audit Logging

- **Scheduler Deduplication**: Implemented single-instance guards (`isSchedulerRunning` and `schedulerIntervalId`) to prevent overlapping task executions.
- **Consequential Change Auditing**: Scheduled background updates (overdue tasks and expired documents) now query matching records and automatically write immutable `AuditEvent` entries to PostgreSQL with `actorId: 'SYSTEM-SCHEDULER'`, documenting the exact state transitions and evidence timestamps.

### 4. Machine Learning & Hardware Acceleration

- **Document-AI Engine**: Verified the FastAPI service in `fastapi_engine/` running with PyTorch, CUDA 13.0, EasyOCR, and PyMuPDF on the dedicated GPU (`NVIDIA GeForce RTX 5060 Laptop GPU`).
- **Real Extraction Dependency**: Document validation, claim extraction, and OCR are strictly computed from actual file streams rather than synthetic mocks.
- **Storage Cap**: Verified the hard storage quota limit of 1.5 GB. Project source and working tree measure ~97 MB, comfortably within the 1.5 GB statutory budget.

### 5. Frontend Pages & Routing

- **Exactly Seven Primary Canonical Pages**:
  1. Control Tower (`/dashboard`)
  2. Applications (`/applications`)
  3. Document Verification (`/verification`)
  4. Compliance & Regulations (`/compliance`)
  5. Tasks & Alerts (`/tasks`)
  6. Reports & Audit (`/reports`)
  7. Settings & System Control Center (`/settings`)
- All legacy and sub-module deep links gracefully map to these canonical routes with query parameters.
