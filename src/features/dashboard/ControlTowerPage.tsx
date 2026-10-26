import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  FileSearch,
  ShieldAlert,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Play,
  FilePlus2,
  ClipboardCheck,
  CalendarClock,
  History,
} from 'lucide-react';

export const ControlTowerPage: React.FC = () => {
  const { state, openFindingDrawer } = useTraceStore();
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');

  const filteredApps = useMemo(() => {
    return state.applications.filter((app) => {
      if (selectedYear !== 'ALL' && app.academicYear !== selectedYear) return false;
      if (selectedCategory !== 'ALL' && app.category !== selectedCategory) return false;
      if (selectedInstitution !== 'ALL' && app.institutionId !== selectedInstitution) return false;
      if (selectedStage !== 'ALL' && app.workflowStage !== selectedStage) return false;
      return true;
    });
  }, [state.applications, selectedYear, selectedCategory, selectedInstitution, selectedStage]);

  const filteredAppIds = new Set(filteredApps.map((a) => a.id));

  const activeFindings = state.findings.filter(
    (f) => filteredAppIds.has(f.applicationId) && f.status !== 'Resolved'
  );
  const mandatoryUnresolvedAppsCount = filteredApps.filter(
    (a) => a.mandatoryFindingsCount > 0
  ).length;
  const awaitingVerificationCount = filteredApps.filter(
    (a) =>
      a.workflowStage === 'Under review' ||
      a.workflowStage === 'Ready for authorized review' ||
      a.workflowStage === 'Validation in progress'
  ).length;
  const overdueTasks = state.tasks.filter(
    (t) =>
      filteredAppIds.has(t.applicationId) &&
      (t.status === 'Overdue' || (t.status !== 'Completed' && t.dueDate < '2026-10-21'))
  );
  const obligationsDueSoon = state.requirements.filter(
    (r) =>
      filteredAppIds.has(r.applicationId) &&
      (r.status === 'Upcoming' || r.status === 'Awaiting evidence' || r.status === 'Under remediation')
  );
  const docsAwaitingManual = state.documents.filter(
    (d) =>
      filteredAppIds.has(d.applicationId) &&
      (d.validationState === 'Verification pending' ||
        d.validationState === 'Needs manual review' ||
        d.validationState === 'Mismatch detected' ||
        d.validationState === 'Missing information')
  );

  // Stage distribution chart data
  const stageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      counts[a.workflowStage] = (counts[a.workflowStage] || 0) + 1;
    });
    return Object.entries(counts).map(([stage, count]) => ({
      stage,
      count,
    }));
  }, [filteredApps]);

  // Application ageing chart data
  const ageingData = useMemo(() => {
    return filteredApps.map((a) => ({
      code: a.code,
      days: a.ageingDays,
      institution: a.institutionName.split('(')[0].trim(),
      stage: a.workflowStage,
    }));
  }, [filteredApps]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>REGULATORY CONTROL TOWER</span>
            <span>·</span>
            <span>AY 2026-27 SCRUTINY CYCLE</span>
            <span>·</span>
            <span className="font-mono text-[#0F766E]">
              Engine: {state.engineMode === 'live_ai' ? 'Local Offline AI (Ollama / Qwen2.5)' : 'Deterministic Statutory Rules'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Operational Assurance & Scrutiny Overview
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            All metrics, charts, and queues below derive live from the unified application, evidence, and audit dataset.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/verification')}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0d645d] transition-colors whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            Upload & Verify Document
          </button>
          <button
            onClick={() => navigate('/intake')}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <FilePlus2 className="h-3.5 w-3.5 text-[#0F766E]" />
            New Application Intake
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="h-3.5 w-3.5 text-[#0F766E]" />
          <span>Operational Filters:</span>
        </div>

        <select
          aria-label="Filter by Academic Year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
        >
          <option value="ALL">All Academic Years</option>
          <option value="2026-27">AY 2026-27</option>
          <option value="2025-26">AY 2025-26</option>
        </select>

        <select
          aria-label="Filter by Application Category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
        >
          <option value="ALL">All Categories</option>
          <option value="Increase in Intake">Increase in Intake</option>
          <option value="New Technical Program">New Technical Program</option>
          <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
        </select>

        <select
          aria-label="Filter by Institution"
          value={selectedInstitution}
          onChange={(e) => setSelectedInstitution(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 max-w-xs truncate"
        >
          <option value="ALL">All Institutions ({state.institutions.length})</option>
          {state.institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by Workflow Stage"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
        >
          <option value="ALL">All Workflow Stages</option>
          <option value="Corrections required">Corrections required</option>
          <option value="Awaiting additional evidence">Awaiting additional evidence</option>
          <option value="Under review">Under review</option>
          <option value="Ready for authorized review">Ready for authorized review</option>
          <option value="Review completed">Review completed</option>
        </select>

        {(selectedYear !== 'ALL' ||
          selectedCategory !== 'ALL' ||
          selectedInstitution !== 'ALL' ||
          selectedStage !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedYear('ALL');
              setSelectedCategory('ALL');
              setSelectedInstitution('ALL');
              setSelectedStage('ALL');
            }}
            className="text-xs font-medium text-[#0F766E] hover:underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 6 Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <button
          onClick={() => navigate('/applications')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-[#0F766E] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Applications</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {filteredApps.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {state.institutions.length} registered institutions
          </div>
        </button>

        <button
          onClick={() => navigate('/verification?tab=queue')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-[#0F766E] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Awaiting Verification</span>
            <ClipboardCheck className="h-3.5 w-3.5 text-[#0F766E]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {awaitingVerificationCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Active in scrutiny & review queue
          </div>
        </button>

        <button
          onClick={() => navigate('/verification?tab=queue&filter=mandatory')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-red-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Unresolved Findings</span>
            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {activeFindings.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            In {mandatoryUnresolvedAppsCount} applications with mandatory holds
          </div>
        </button>

        <button
          onClick={() => navigate('/verification?tab=studio')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-amber-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Docs Needing Review</span>
            <FileSearch className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {docsAwaitingManual.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Mismatch, missing annex, or pending issuer check
          </div>
        </button>

        <button
          onClick={() => navigate('/tasks?tab=board&filter=overdue')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-red-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Overdue Tasks</span>
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {overdueTasks.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Escalated to Level 1 Scrutiny Lead
          </div>
        </button>

        <button
          onClick={() => navigate('/compliance')}
          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-[#0F766E] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Obligations Due Soon</span>
            <CalendarClock className="h-3.5 w-3.5 text-[#0F766E]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {obligationsDueSoon.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Includes expiring NOCs & remediation deadlines
          </div>
        </button>
      </div>

      {/* Prioritized Evidence-to-Action Queue + Workflow Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prioritized Action Queue (7 columns) */}
        <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Prioritized Evidence-to-Action Queue
              </h2>
              <p className="text-xs text-slate-500">
                Click any finding to open the 11-link Evidence-to-Action Traceability Drawer or inspect supporting documents.
              </p>
            </div>
            <button
              onClick={() => navigate('/verification?tab=queue')}
              className="text-xs font-medium text-[#0F766E] hover:underline whitespace-nowrap"
            >
              View Full Queue →
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {state.findings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                <p className="font-semibold text-slate-800">No Open Deficiencies or Findings</p>
                <p className="text-[11px] text-slate-400">
                  All mock findings have been cleared. Upload documents in Verification Studio to evaluate regulatory rules and generate real findings.
                </p>
              </div>
            ) : (
              state.findings.map((finding) => {
              const isResolved = finding.status === 'Resolved';
              return (
                <div
                  key={finding.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900">{finding.id}</span>
                      <span>·</span>
                      <span
                        className={`font-semibold ${
                          isResolved
                            ? 'text-emerald-700'
                            : finding.severity === 'Critical'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {isResolved ? 'Resolved' : `${finding.severity} — ${finding.status}`}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-slate-600">{finding.applicationCode}</span>
                      <span>·</span>
                      <span className="font-mono text-[#0F766E]">{finding.clauseNumber.split(' ')[0]} {finding.clauseNumber.split(' ')[1]}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {finding.title}
                    </div>
                    <div className="text-xs text-slate-600">
                      {finding.institutionName} · Extracted:{' '}
                      <span className="font-mono font-medium text-slate-900">
                        {finding.extractedValue}
                      </span>{' '}
                      vs Expected:{' '}
                      <span className="font-mono text-slate-700">{finding.expectedValue}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {finding.documentId && (
                      <button
                        onClick={() =>
                          navigate(
                            `/verification?tab=studio&docId=${finding.documentId}&page=${
                              finding.pageNumber || 1
                            }`
                          )
                        }
                        className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        Inspect Doc
                      </button>
                    )}
                    <button
                      onClick={() => openFindingDrawer(finding.id)}
                      className="inline-flex items-center gap-1 rounded bg-[#101B2D] px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      Traceability Chain
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Charts Column: Applications by Stage & Application Ageing (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Applications by Configurable Workflow Stage
                </h2>
                <p className="text-xs text-slate-500">
                  Click any bar to filter the Applications registry
                </p>
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={150}
                    tick={{ fontSize: 11, fill: '#334155' }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Applications"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      const stg = data?.payload?.stage || data?.stage;
                      if (stg) {
                        navigate(`/applications?stage=${encodeURIComponent(stg)}`);
                      }
                    }}
                  >
                    {stageChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          entry.stage === 'Corrections required'
                            ? '#DC2626'
                            : entry.stage === 'Awaiting additional evidence'
                            ? '#D97706'
                            : entry.stage === 'Review completed' ||
                              entry.stage === 'Ready for authorized review'
                            ? '#16A34A'
                            : '#0F766E'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Application Ageing (Days in Scrutiny Queue)
                </h2>
                <p className="text-xs text-slate-500">
                  SLA target window: 21 days from initial submission
                </p>
              </div>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageingData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                  <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                    }}
                  />
                  <Bar
                    dataKey="days"
                    name="Ageing (Days)"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      const code = data?.payload?.code || data?.code;
                      if (code) {
                        navigate(`/applications?appId=${encodeURIComponent(code)}`);
                      }
                    }}
                  >
                    {ageingData.map((entry, index) => (
                      <Cell
                        key={`age-${index}`}
                        fill={entry.days > 20 ? '#DC2626' : entry.days > 12 ? '#D97706' : '#0F766E'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Institution Compliance Overview, Reviewer Workload & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institution Compliance Overview */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Institution Checklist Completeness
            </h2>
            <button
              onClick={() => navigate('/applications?tab=institutions')}
              className="text-xs font-medium text-[#0F766E] hover:underline"
            >
              Registry →
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Note: Completeness reflects uploaded checklist items, not an official approval guarantee.
          </p>
          <div className="mt-3 space-y-3">
            {state.institutions.map((inst) => (
              <div
                key={inst.id}
                onClick={() => navigate(`/applications?tab=institutions&id=${inst.id}`)}
                className="cursor-pointer rounded border border-slate-200 p-3 hover:border-[#0F766E] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 truncate pr-2">
                    {inst.name}
                  </span>
                  <span className="font-mono font-bold text-[#0F766E]">
                    {inst.checklistCompletionPct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0F766E]"
                    style={{ width: `${inst.checklistCompletionPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{inst.permanentId}</span>
                  <span>
                    {inst.openFindingsCount} open findings · {inst.upcomingObligationsCount} obligations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines & Escalations */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Upcoming Deadlines & Overdue Tasks
            </h2>
            <button
              onClick={() => navigate('/tasks?tab=calendar')}
              className="text-xs font-medium text-[#0F766E] hover:underline"
            >
              Calendar →
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            {state.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks?tab=board&taskId=${task.id}`)}
                className="cursor-pointer rounded border border-slate-200 p-3 hover:bg-slate-50 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">{task.id}</span>
                  <span
                    className={`font-mono font-semibold ${
                      task.status === 'Overdue'
                        ? 'text-red-600'
                        : task.status === 'Completed'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    Due: {task.dueDate} ({task.status})
                  </span>
                </div>
                <div className="mt-1 font-medium text-slate-900">{task.title}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Assignee: {task.assigneeName} · App: {task.applicationCode}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workflow & Audit Activity */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <History className="h-4 w-4 text-[#0F766E]" />
              Recent Workflow & Audit Activity
            </h2>
            <button
              onClick={() => navigate('/reports?tab=audit')}
              className="text-xs font-medium text-[#0F766E] hover:underline"
            >
              Full Audit Trail →
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            {state.auditEvents.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="rounded border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{evt.actionType || (evt as any).action || 'ACTIVITY'}</span>
                  <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <div className="mt-0.5 font-medium text-slate-900">{evt.actionLabel || (evt as any).action || 'System Event'}</div>
                <div className="mt-0.5 text-[11px] text-slate-600">
                  {evt.actorName} · {evt.newState || 'Completed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
