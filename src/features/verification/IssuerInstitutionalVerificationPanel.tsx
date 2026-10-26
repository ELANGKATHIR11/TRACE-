import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  GitCompare,
  Network,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  FileSignature,
  Search,
  Sparkles,
  PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTraceStore } from '../../lib/store';
import { api } from '../../lib/api-client';

export const IssuerInstitutionalVerificationPanel: React.FC = () => {
  const { state, recordIndependentIssuerVerification } = useTraceStore();
  const [selectedAppId, setSelectedAppId] = useState<string>(
    state.applications[0]?.id || 'APP-2026-0842'
  );
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [longitudinalData, setLongitudinalData] = useState<any>(null);
  const [vragResults, setVragResults] = useState<any>(null);
  const [vragQuery, setVragQuery] = useState<string>(
    'AICTE APH 2026-27 Clause 4.2(b) infrastructure readiness handover cutoff date'
  );
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingVrag, setLoadingVrag] = useState(false);

  // Human review interrupt resume inputs
  const [resumeDecision, setResumeDecision] = useState<string>(
    'Require Rectification / Revised Certificate (Keep Under Scrutiny)'
  );
  const [resumeRationale, setResumeRationale] = useState<string>(
    'Verified chronological mismatch on Completion Certificate (14-Aug-2026 vs 30-Jun-2026 statutory cutoff). Assigned rectification to Institution Compliance Officer; no automatic rejection applied.'
  );

  const isReviewerOrAdmin = [
    'authorized_reviewer',
    'scrutiny_committee_lead',
    'regulatory_system_administrator',
  ].includes(state.currentUser.role);

  const loadApplicationData = useCallback(async (appId: string) => {
    try {
      setLoadingWorkflow(true);
      const [longRes, wfRes] = await Promise.all([
        api.getLongitudinalComparison(appId).catch(() => null),
        api.executeLangGraphWorkflow(appId, 'latest').catch(() => null),
      ]);
      if (longRes) setLongitudinalData(longRes);
      if (wfRes) setWorkflowData(wfRes);
    } catch (err: any) {
      console.warn('[Issuer & LangGraph Panel]', err);
    } finally {
      setLoadingWorkflow(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      loadApplicationData(selectedAppId);
    }
  }, [selectedAppId, loadApplicationData]);

  const handleRunLangGraph = async () => {
    try {
      setLoadingWorkflow(true);
      toast.info(`Executing 9-Stage LangGraph Supervisor-Worker Workflow for ${selectedAppId}...`);
      const res = await api.executeLangGraphWorkflow(selectedAppId, 'latest');
      setWorkflowData(res);
      toast.success(
        `LangGraph execution finished (${res.checkpointerBackend} checkpoint). Status: ${res.workflowStatus}`
      );
    } catch (err: any) {
      toast.error(`LangGraph workflow failed: ${err.message}`);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const handleResumeHumanReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReviewerOrAdmin) {
      toast.error('Only Authorized Reviewers or Scrutiny Leads can resume a human-review interrupt.');
      return;
    }
    try {
      setLoadingResume(true);
      const res = await api.resumeLangGraphHumanReview(selectedAppId, {
        decision: resumeDecision,
        rationale: resumeRationale,
        runId: 'latest',
      });
      toast.success(`Stage 8 Human-Review Interrupt resumed and persisted to PostgreSQL checkpoint.`);
      // Refresh workflow state
      const stateSnap = await api.getLangGraphCheckpointState(selectedAppId, 'latest');
      if (stateSnap?.found && stateSnap.state) {
        setWorkflowData((prev: any) => ({
          ...prev,
          workflowStatus: stateSnap.state.workflowStatus,
          requiresHumanInterrupt: stateSnap.state.requiresHumanInterrupt,
          stageStatuses: stateSnap.state.stageStatuses,
        }));
      } else if (res.stage8) {
        setWorkflowData((prev: any) => ({
          ...prev,
          workflowStatus: res.workflowStatus,
          requiresHumanInterrupt: false,
          stageStatuses: {
            ...(prev?.stageStatuses || {}),
            STAGE_8_HUMAN_REVIEW_GOVERNANCE: res.stage8,
          },
        }));
      }
    } catch (err: any) {
      toast.error(`Failed to resume checkpoint: ${err.message}`);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleSearchVragMrag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingVrag(true);
      const res = await api.searchApplicationVragMrag(selectedAppId, vragQuery, 6);
      setVragResults(res);
    } catch (err: any) {
      toast.error(`VRAG/MRAG search failed: ${err.message}`);
    } finally {
      setLoadingVrag(false);
    }
  };

  const stagesList = workflowData?.stageStatuses
    ? Object.values(workflowData.stageStatuses).sort(
        (a: any, b: any) => (a.stageNumber ?? 0) - (b.stageNumber ?? 0)
      )
    : [];

  const appDocuments = state.documents.filter((d) => d.applicationId === selectedAppId);

  return (
    <div className="space-y-6">
      {/* Application Selector & LangGraph Execution Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
            <Network className="h-4 w-4" />
            <span>SIH PS 26261 · 9-STAGE LANGGRAPH SUPERVISOR–WORKER & ISSUER VERIFICATION</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Institutional Record Matching, Longitudinal Comparison & External Issuer Verification
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Executes durable PostgreSQL-checkpointed LangGraph workers across Stages 0–8, multi-year longitudinal institutional records, and cryptographic/issuer adapters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            aria-label="Select Application for LangGraph & Issuer Verification"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#0F766E] focus:outline-hidden"
          >
            {state.applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.code} — {app.institutionName} ({app.category})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunLangGraph}
            disabled={loadingWorkflow}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors disabled:opacity-50"
          >
            {loadingWorkflow ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>Run 9-Stage LangGraph Pipeline</span>
          </button>
        </div>
      </div>

      {/* Section 1: Exact 9-Stage Verification Pipeline (Stages 0 to 8) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Exact 9-Stage PS 26261 Verification Pipeline (LangGraph Durable State)
            </h3>
            <p className="text-xs text-slate-500">
              Thread ID: <span className="font-mono text-slate-700">{workflowData?.threadId || `trace-app-${selectedAppId}-run-latest`}</span> · Checkpointer: <span className="font-mono font-semibold text-[#0F766E] uppercase">{workflowData?.checkpointerBackend || 'postgresql'}</span>
            </p>
          </div>
          {workflowData?.workflowStatus && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                workflowData.workflowStatus === 'PAUSED_FOR_HUMAN_REVIEW'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {workflowData.workflowStatus === 'PAUSED_FOR_HUMAN_REVIEW' ? (
                <PauseCircle className="h-3.5 w-3.5 text-amber-700" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              )}
              {workflowData.workflowStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stagesList.map((st: any) => {
            const badgeColor =
              st.status === 'PASS'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : st.status === 'FAIL'
                ? 'bg-red-50 text-red-800 border-red-200'
                : st.status === 'FLAGGED'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200';
            return (
              <div
                key={st.stageCode}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      STAGE {st.stageNumber}
                    </span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeColor}`}>
                      {st.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-900">{st.title}</div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{st.summary}</p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60">
                  {st.stageCode}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage 8 Human-Review Interrupt Action Box */}
        {workflowData?.requiresHumanInterrupt && (
          <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50/70 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Stage 8 Human-Review Interrupt Active — Statutory Decision Required
                </h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  {workflowData.humanInterruptReason}
                </p>
              </div>
            </div>

            <form onSubmit={handleResumeHumanReview} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                  Authorized Reviewer Action
                </label>
                <select
                  disabled={!isReviewerOrAdmin}
                  value={resumeDecision}
                  onChange={(e) => setResumeDecision(e.target.value)}
                  className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="Require Rectification / Revised Certificate (Keep Under Scrutiny)">
                    Require Rectification / Revised Certificate
                  </option>
                  <option value="Schedule Physical EVC / Expert Committee Inspection">
                    Schedule Physical EVC Inspection
                  </option>
                  <option value="Override Flag with Documented Statutory Justification">
                    Override Flag with Statutory Justification
                  </option>
                  <option value="Recommend Extension of Approval (EoA) after Verification">
                    Recommend Approval (EoA)
                  </option>
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    Mandatory Audit Rationale (Recorded with {state.currentUser.name})
                  </label>
                  <input
                    type="text"
                    disabled={!isReviewerOrAdmin}
                    value={resumeRationale}
                    onChange={(e) => setResumeRationale(e.target.value)}
                    className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isReviewerOrAdmin || loadingResume}
                  className="rounded bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-50 whitespace-nowrap"
                >
                  {loadingResume ? 'Persisting...' : 'Record & Resume Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Section 2: Differentiator 2 — Longitudinal Institutional Comparison (Multi-Year History) */}
      {longitudinalData && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
                <GitCompare className="h-4 w-4" />
                <span>DIFFERENTIATOR 2 · LONGITUDINAL INSTITUTIONAL COMPARISON</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Multi-Cycle Historical Record Comparison ({longitudinalData.institutionName} · {longitudinalData.permanentId})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="rounded bg-slate-100 px-2.5 py-1 text-slate-800">
                Intake Delta: +{longitudinalData.deltas?.intakeDeltaSeats} seats (+{longitudinalData.deltas?.intakeDeltaPercent}%)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Academic Year</th>
                  <th className="py-2.5 px-3">Application Code</th>
                  <th className="py-2.5 px-3">Sanctioned / Requested Intake</th>
                  <th className="py-2.5 px-3">Built-Up Area (sq.m)</th>
                  <th className="py-2.5 px-3">Campus Land (Acres)</th>
                  <th className="py-2.5 px-3">Fire NOC Reference</th>
                  <th className="py-2.5 px-3">Cycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {longitudinalData.priorCycles?.map((c: any) => (
                  <tr key={c.academicYear} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{c.academicYear} (Authorized Prior)</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{c.applicationCode}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.approvedIntake} seats</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{c.builtUpAreaSqm.toLocaleString()} sq.m</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{c.landAreaAcres} Acres</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{c.fireNocRef} (exp {c.fireNocValidUntil})</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        {c.completionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {longitudinalData.currentCycle && (
                  <tr className="bg-teal-50/40 font-medium">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0F766E]">
                      {longitudinalData.currentCycle.academicYear} (Current Submission)
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900">{longitudinalData.currentCycle.applicationCode}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0F766E]">
                      {longitudinalData.currentCycle.requestedIntake} seats (Prior: {longitudinalData.currentCycle.priorSanctionedIntake})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900">
                      {longitudinalData.currentCycle.builtUpAreaSqm.toLocaleString()} sq.m (Min Req: {longitudinalData.currentCycle.requiredBuiltUpAreaSqm.toLocaleString()})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900">{longitudinalData.currentCycle.landAreaAcres} Acres</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{longitudinalData.currentCycle.fireNocRef}</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {longitudinalData.currentCycle.currentWorkflowStage}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {longitudinalData.anomalies?.length > 0 && (
            <div className="space-y-2 pt-2">
              {longitudinalData.anomalies.map((anom: any) => (
                <div
                  key={anom.code}
                  className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-amber-900">[{anom.code}]</span>{' '}
                    <span className="text-amber-950">{anom.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Stage 4 External Issuer & Cryptographic Signature Adapters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <FileSignature className="h-4 w-4" />
            <span>STAGE 4 · ISSUER ADAPTERS & CRYPTOGRAPHIC SIGNATURE VERIFICATION</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            Statutory Authority Verification & Adapter Provenance (Live vs Simulated Clearly Labeled)
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {appDocuments.map((doc) => {
            const isConfirmed = doc.issuerVerification.includes('Confirmed');
            return (
              <div
                key={doc.id}
                className="rounded-lg border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{doc.id}</span>
                    <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                      SHA-256: {(doc.versions?.[0]?.sha256Preview || doc.id).slice(0, 16)}...
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        isConfirmed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {isConfirmed
                        ? 'ADAPTER: AUTHORIZED_LOCAL_REGISTRY'
                        : 'ADAPTER: SIMULATED_SANDBOX (Pending External Authority Confirmation)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold">Cryptographic Integrity:</span> {doc.integrityScreening} ·{' '}
                    <span className="font-semibold">Issuer Status:</span> {doc.issuerVerification}
                  </div>
                </div>

                {isReviewerOrAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        recordIndependentIssuerVerification({
                          documentId: doc.id,
                          status: 'Confirmed via issuing authority record',
                          note: 'Verified against issuing authority reference registry by authorized reviewer.',
                        })
                      }
                      className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      Confirm Issuer Record
                    </button>
                    <button
                      onClick={() =>
                        recordIndependentIssuerVerification({
                          documentId: doc.id,
                          status: 'Issuer query timed out — manual follow-up',
                          note: 'External issuer portal unavailable; marked for manual verification follow-up.',
                        })
                      }
                      className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
                    >
                      Flag Discrepancy
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Hybrid VRAG + MRAG Qdrant Evidence Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <Sparkles className="h-4 w-4" />
            <span>VRAG + MRAG HYBRID EVIDENCE RETRIEVAL (LOCAL PERSISTENT QDRANT)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            Query Across Regulatory Handbook Clauses, Document Text Chunks, VRAG Visual Page Descriptions & Authorized Records
          </h3>
        </div>

        <form onSubmit={handleSearchVragMrag} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={vragQuery}
            onChange={(e) => setVragQuery(e.target.value)}
            placeholder="Search clauses, extracted document chunks, visual page descriptions..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F766E] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={loadingVrag}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{loadingVrag ? 'Retrieving...' : 'Hybrid RRF Search'}</span>
          </button>
        </form>

        {vragResults && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] text-slate-500 font-mono">
              Retrieved {vragResults.resultsCount} result(s) · Tenant Isolation Filter: institutionId={vragResults.institutionIdFilter} · Embedding Status: {vragResults.embeddingStatus}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vragResults.results?.map((item: any) => (
                <div
                  key={item.recordId}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#0F766E] uppercase">
                      {item.collection}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      RRF: {item.rrfScore} · Lexical: {item.lexicalScore}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">{item.recordId}</div>
                  <p className="text-[11px] text-slate-600 line-clamp-3">
                    {item.payload?.indexedText || item.payload?.visualDescription || item.payload?.textSnippet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
