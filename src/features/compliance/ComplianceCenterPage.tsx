import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  FileText,
  Scale,
  Info,
  ListChecks,
  GitCommitHorizontal,
} from 'lucide-react';

export const ComplianceCenterPage: React.FC = () => {
  const { state, openFindingDrawer } = useTraceStore();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'matrix' | 'timeline'>('matrix');
  const [instFilter, setInstFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredReqs = useMemo(() => {
    return state.requirements.filter((r) => {
      if (instFilter !== 'ALL' && r.institutionId !== instFilter) return false;
      if (catFilter !== 'ALL' && r.category !== catFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });
  }, [state.requirements, instFilter, catFilter, statusFilter]);

  const satisfiedCount = filteredReqs.filter((r) => r.status === 'Satisfied').length;
  const awaitingCount = filteredReqs.filter((r) => r.status === 'Awaiting evidence').length;
  const remediationCount = filteredReqs.filter((r) => r.status === 'Under remediation').length;
  const overdueCount = filteredReqs.filter((r) => r.status === 'Overdue').length;
  const upcomingCount = filteredReqs.filter((r) => r.status === 'Upcoming').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">INSTITUTIONAL COMPLIANCE CENTER</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Requirement Matrix, Obligations & Compliance Timeline
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Every requirement links to its regulatory source clause, academic-year edition, and verified evidence status.
          </p>
        </div>

        {/* View Switcher: Requirement Matrix vs Institution Compliance Timeline */}
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs shrink-0">
          <button
            onClick={() => setViewMode('matrix')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListChecks className="h-3.5 w-3.5 text-[#0F766E]" />
            1. Requirement Matrix
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCommitHorizontal className="h-3.5 w-3.5 text-[#0F766E]" />
            2. Compliance Timeline
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner (Screen E Mandate) */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">
            Checklist Completeness Notice:
          </span>{' '}
          Requirement matrix status summarizes submitted evidence and automated/reviewer checks. It must never be interpreted as an official approval probability or legal compliance guarantee.
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500">Satisfied Requirements</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-700">{satisfiedCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500">Under Remediation</div>
          <div className="mt-1 font-mono text-xl font-bold text-red-600">{remediationCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500">Awaiting Evidence</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-700">{awaitingCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500">Upcoming Obligations</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#0F766E]">{upcomingCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500">Overdue Actions</div>
          <div className="mt-1 font-mono text-xl font-bold text-red-700">{overdueCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <select
          aria-label="Filter by Institution"
          value={instFilter}
          onChange={(e) => setInstFilter(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">All Institutions</option>
          {state.institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by Requirement Category"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">All Requirement Categories</option>
          <option value="Land & Built-up Area">Land & Built-up Area</option>
          <option value="Fire & Structural Safety">Fire & Structural Safety</option>
          <option value="Faculty Norms & Cadre">Faculty Norms & Cadre</option>
          <option value="Financial Corpus & FDR">Financial Corpus & FDR</option>
        </select>

        <select
          aria-label="Filter by Obligation Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">All Obligation Statuses</option>
          <option value="Satisfied">Satisfied</option>
          <option value="Under remediation">Under remediation</option>
          <option value="Awaiting evidence">Awaiting evidence</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* View 1: Requirement Matrix */}
      {viewMode === 'matrix' ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-3.5 font-semibold">Req Code & Category</th>
                  <th className="py-3 px-3.5 font-semibold">Requirement & Next Action</th>
                  <th className="py-3 px-3.5 font-semibold">Source Clause & Version</th>
                  <th className="py-3 px-3.5 font-semibold">Supporting Evidence</th>
                  <th className="py-3 px-3.5 font-semibold">Owner & Deadline</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReqs.map((req) => {
                  const linkedFinding = state.findings.find(
                    (f) => f.requirementId === req.code || f.requirementId === req.id
                  );
                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3.5 font-mono">
                        <div className="font-bold text-slate-900">{req.code}</div>
                        <div className="text-[10px] text-slate-500">{req.category}</div>
                      </td>
                      <td className="py-3 px-3.5 max-w-md">
                        <div className="font-semibold text-slate-900">{req.title}</div>
                        <div className="mt-0.5 text-slate-600 text-[11px]">
                          Next: {req.nextRequiredAction}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <button
                          onClick={() =>
                            navigate(`/rules?clause=${encodeURIComponent(req.clauseId)}`)
                          }
                          className="font-mono font-medium text-[#0F766E] hover:underline flex items-center gap-1"
                        >
                          {req.clauseRef}
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {req.ruleVersion} · AY {req.academicYear}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        {req.evidenceDocumentId ? (
                          <button
                            onClick={() =>
                              navigate(`/document-intelligence?docId=${req.evidenceDocumentId}`)
                            }
                            className="text-left hover:underline text-slate-800 font-medium"
                          >
                            <div className="truncate max-w-[200px]">
                              {req.evidenceDocumentTitle}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {req.evidenceDocumentId} · {req.evidenceValidationState}
                            </div>
                          </button>
                        ) : (
                          <span className="text-red-600 font-medium">No Evidence Uploaded</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-900">{req.assignedOwner}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          Due: {req.deadline}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`font-semibold ${
                              req.status === 'Satisfied'
                                ? 'text-emerald-700'
                                : req.status === 'Overdue' || req.status === 'Under remediation'
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {req.status}
                          </span>
                          {linkedFinding && (
                            <button
                              onClick={() => openFindingDrawer(linkedFinding.id)}
                              className="font-mono text-[10px] text-[#0F766E] hover:underline"
                            >
                              Trace {linkedFinding.id} →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View 2: Institution Compliance Timeline */
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Chronological Compliance & Obligation Timeline
          </h2>
          <div className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-px before:bg-slate-200">
            {[...filteredReqs]
              .sort((a, b) => a.deadline.localeCompare(b.deadline))
              .map((req) => (
                <div key={req.id} className="relative pl-9">
                  <div
                    className={`absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      req.status === 'Satisfied'
                        ? 'bg-emerald-600'
                        : req.status === 'Overdue' || req.status === 'Under remediation'
                        ? 'bg-red-600'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        Deadline: {req.deadline} · {req.code} ({req.status})
                      </span>
                      <span className="font-mono text-slate-500">
                        {req.clauseRef} · {req.ruleVersion}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{req.title}</div>
                    <div className="mt-1 text-slate-600">
                      Assigned Owner: <strong>{req.assignedOwner}</strong> · Next Action:{' '}
                      {req.nextRequiredAction}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
