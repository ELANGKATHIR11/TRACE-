import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { WORKFLOW_STAGES_ORDERED, getPermissions } from '../../lib/permissions';
import { WorkflowStage } from '../../types/domain';
import {
  ClipboardCheck,
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Scale,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ReviewPilotQueueView } from './ReviewPilotQueueView';

export const VerificationQueuePage: React.FC = () => {
  const {
    state,
    openFindingDrawer,
    resolveFinding,
    transitionApplicationStage,
  } = useTraceStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialFilter = searchParams.get('filter') || 'ALL';
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState(initialFilter);
  const [selectedAppId, setSelectedAppId] = useState(state.applications[0].id);
  const [stageSelect, setStageSelect] = useState<WorkflowStage>('Ready for authorized review');
  const [reviewActionNote, setReviewActionNote] = useState(
    'Verified rectified completion date (01-May-2026) and multi-layer checks.'
  );
  const [showReviewPilot, setShowReviewPilot] = useState<boolean>(true);

  const perms = getPermissions(state.currentUser.role);

  const filteredQueue = useMemo(() => {
    return state.applications.filter((app) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !app.code.toLowerCase().includes(q) &&
        !app.institutionName.toLowerCase().includes(q) &&
        !app.programName.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (queueFilter === 'mandatory' && app.mandatoryFindingsCount === 0) return false;
      if (queueFilter === 'ready' && app.unresolvedFindingsCount > 0) return false;
      return true;
    });
  }, [state.applications, search, queueFilter]);

  const activeApp =
    state.applications.find((a) => a.id === selectedAppId) || filteredQueue[0];

  const appFindings = state.findings.filter((f) => f.applicationId === activeApp?.id);
  const appDocs = state.documents.filter((d) => d.applicationId === activeApp?.id);
  const appTasks = state.tasks.filter((t) => t.applicationId === activeApp?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">AUTHORIZED REVIEWER WORKBENCH</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Application Verification & Scrutiny Queue
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Inspect evaluated rules, findings, corrective tasks, and execute role-authorized workflow transitions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowReviewPilot((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-all ${
              showReviewPilot
                ? 'bg-blue-700 text-white shadow-xs'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showReviewPilot ? 'Hide ReviewPilot Prioritization' : 'Show ReviewPilot Prioritization (Feature 5)'}
          </button>
          <div className="rounded border border-slate-200 bg-white px-3 py-1.5">
            Active Verifier: <strong className="text-slate-900">{state.currentUser.name}</strong> (
            {state.currentUser.roleLabel})
          </div>
        </div>
      </div>

      {showReviewPilot && (
        <ReviewPilotQueueView
          selectedAppId={selectedAppId}
          onSelectApplication={(appId) => {
            setSelectedAppId(appId);
            setQueueFilter('ALL');
          }}
        />
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter verification queue by Application ID, Institution, or Reviewer..."
            className="w-full rounded border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          {[
            { id: 'ALL', label: 'All Queued Applications' },
            { id: 'mandatory', label: 'With Mandatory Findings' },
            { id: 'ready', label: '0 Open Findings (Ready)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setQueueFilter(tab.id)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                queueFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workbench Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue Table (6 cols) */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-3 font-semibold">Application & Priority</th>
                  <th className="py-3 px-3 font-semibold">Institution & Category</th>
                  <th className="py-3 px-3 font-semibold">Findings</th>
                  <th className="py-3 px-3 font-semibold">Stage & SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((app) => {
                  const isSelected = activeApp?.id === app.id;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-900">{app.code}</div>
                        <div
                          className={`text-[10px] font-semibold ${
                            app.priority === 'Critical'
                              ? 'text-red-600'
                              : app.priority === 'High'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {app.priority} · {app.ageingDays}d ageing
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {app.institutionName}
                        </div>
                        <div className="text-slate-500 text-[11px]">{app.category}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {app.unresolvedFindingsCount > 0 ? (
                          <span className="font-bold text-red-600">
                            {app.unresolvedFindingsCount} open
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">All resolved</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{app.workflowStage}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Due {app.slaDueDate}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detailed Verification Inspector (6 cols) */}
        {activeApp && (
          <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="font-mono text-xs text-[#0F766E]">
                  {activeApp.code} · Assigned to {activeApp.assignedReviewerName}
                </div>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">
                  {activeApp.institutionName}
                </h2>
                <p className="text-xs text-slate-600">
                  {activeApp.programName} ({activeApp.category})
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700">
                Stage: {activeApp.workflowStage}
              </span>
            </div>

            {/* Findings & Resolution Section */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-800">
                Evaluated Findings & Deficiency Status ({appFindings.length})
              </div>
              {appFindings.map((f) => {
                const linkedDoc = state.documents.find((d) => d.id === f.documentId);
                const canResolveNow =
                  f.validationResult === 'Validated' ||
                  f.status === 'Re-Validation Passed' ||
                  linkedDoc?.validationState === 'Validated';

                return (
                  <div
                    key={f.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {f.id} · {f.clauseNumber}
                      </span>
                      <span
                        className={`font-semibold ${
                          f.status === 'Resolved'
                            ? 'text-emerald-700'
                            : canResolveNow
                            ? 'text-teal-700'
                            : 'text-red-700'
                        }`}
                      >
                        {f.status} ({linkedDoc?.validationState || f.validationResult})
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{f.title}</div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      Extracted: {f.extractedValue} | Expected: {f.expectedValue}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => openFindingDrawer(f.id)}
                        className="rounded bg-[#101B2D] px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Open Evidence-to-Action Drawer
                      </button>
                      {f.documentId && (
                        <button
                          onClick={() =>
                            navigate(
                              `/document-intelligence?docId=${f.documentId}&page=${
                                f.pageNumber || 1
                              }`
                            )
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Inspect Document ({linkedDoc?.currentVersion})
                        </button>
                      )}
                      {f.status !== 'Resolved' && (
                        <button
                          onClick={() => resolveFinding(f.id, reviewActionNote)}
                          disabled={!canResolveNow || !perms.canResolveFinding}
                          className={`ml-auto rounded px-3 py-1 text-xs font-semibold ${
                            canResolveNow && perms.canResolveFinding
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'cursor-not-allowed bg-slate-200 text-slate-400'
                          }`}
                          title={
                            canResolveNow
                              ? 'Resolve finding now that validation passed'
                              : 'Validation check must pass before resolving'
                          }
                        >
                          Resolve Finding
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Corrective Tasks */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800">
                Linked Corrective Tasks ({appTasks.length})
              </div>
              {appTasks.length === 0 ? (
                <p className="text-slate-500">
                  No corrective tasks created yet for this application.
                </p>
              ) : (
                appTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-slate-200 p-2.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {t.id}: {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Owner: {t.assigneeName} · Due: {t.dueDate}
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">{t.status}</span>
                  </div>
                ))
              )}
            </div>

            {/* Complete Review / Stage Transition */}
            <div className="border-t border-slate-200 pt-4 space-y-2.5 text-xs">
              <div className="font-bold text-slate-800">
                Record Authorized Verification Outcome & Stage Transition
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  aria-label="Select Next Workflow Stage"
                  value={stageSelect}
                  onChange={(e) => setStageSelect(e.target.value as WorkflowStage)}
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  {WORKFLOW_STAGES_ORDERED.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    transitionApplicationStage(activeApp.id, stageSelect, reviewActionNote)
                  }
                  disabled={!perms.canTransitionWorkflowStage}
                  className="rounded bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d645d] disabled:opacity-40"
                >
                  Execute Authorized Transition
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
