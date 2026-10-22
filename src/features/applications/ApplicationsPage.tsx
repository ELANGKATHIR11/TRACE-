import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { WORKFLOW_STAGES_ORDERED } from '../../lib/permissions';
import { WorkflowStage } from '../../types/domain';
import {
  Search,
  FilePlus2,
  ArrowUpRight,
  Download,
  History,
  FileText,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApplicationIntakePage } from './ApplicationIntakePage';
import { InstitutionsPage } from '../institutions/InstitutionsPage';

export const ApplicationsPage: React.FC = () => {
  const { state, openFindingDrawer, transitionApplicationStage } = useTraceStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'registry';
  const initialAppId = searchParams.get('appId') || state.applications[0]?.id;
  const initialStage = searchParams.get('stage') || 'ALL';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [selectedAppId, setSelectedAppId] = useState<string>(initialAppId);
  const [nextStageSelection, setNextStageSelection] = useState<WorkflowStage>(
    'Ready for authorized review'
  );
  const [transitionNote, setTransitionNote] = useState('');

  const setTab = (tab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const filteredApplications = useMemo(() => {
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
      if (categoryFilter !== 'ALL' && app.category !== categoryFilter) return false;
      if (yearFilter !== 'ALL' && app.academicYear !== yearFilter) return false;
      if (stageFilter !== 'ALL' && app.workflowStage !== stageFilter) return false;
      return true;
    });
  }, [state.applications, search, categoryFilter, yearFilter, stageFilter]);

  const selectedApp =
    state.applications.find((a) => a.id === selectedAppId) || filteredApplications[0];

  const appDocuments = state.documents.filter((d) => d.applicationId === selectedApp?.id);
  const appFindings = state.findings.filter((f) => f.applicationId === selectedApp?.id);

  const handleExportCsv = () => {
    const headers = [
      'Application_Code',
      'Institution',
      'Category',
      'Academic_Year',
      'Program',
      'Workflow_Stage',
      'Unresolved_Findings',
      'SLA_Due_Date',
    ];
    const rows = filteredApplications.map((a) => [
      a.code,
      `"${a.institutionName}"`,
      `"${a.category}"`,
      a.academicYear,
      `"${a.programName}"`,
      `"${a.workflowStage}"`,
      a.unresolvedFindingsCount,
      a.slaDueDate,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TRACE_Applications_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported filtered applications table to CSV.');
  };

  const selectedInst = state.institutions.find((i) => i.id === selectedApp?.institutionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">APPLICATION MANAGEMENT REGISTRY</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Regulatory Applications & Dossiers
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Track submission state, configurable scrutiny stages, version snapshots, and linked evidence findings.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setTab('intake')}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0d645d]"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Create Application (8-Stage Intake)
          </button>
        </div>
      </div>

      {/* 3 Unified Tabs for Page 2: Applications */}
      <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs w-fit">
        <button
          onClick={() => setTab('registry')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
            activeTab === 'registry'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderKanban className="h-3.5 w-3.5 text-[#0F766E]" />
          Application Registry & Dossiers
        </button>
        <button
          onClick={() => setTab('intake')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
            activeTab === 'intake'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FilePlus2 className="h-3.5 w-3.5 text-[#0F766E]" />
          New Application Intake Wizard (8 Stages)
        </button>
        <button
          onClick={() => setTab('institutions')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
            activeTab === 'institutions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-3.5 w-3.5 text-[#0F766E]" />
          Technical Institutions Directory
        </button>
      </div>

      {activeTab === 'intake' && <ApplicationIntakePage />}
      {activeTab === 'institutions' && <InstitutionsPage />}

      {activeTab === 'registry' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
            <div className="md:col-span-5 relative flex items-center">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Application ID (APP-2026-0842), Institution, or Program..."
                className="w-full rounded border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
              />
            </div>
        <div className="md:col-span-3">
          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
          >
            <option value="ALL">All Application Categories</option>
            <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
            <option value="Increase in Intake">Increase in Intake</option>
            <option value="New Technical Program">New Technical Program</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            aria-label="Filter by Academic Year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
          >
            <option value="ALL">All Academic Years</option>
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            aria-label="Filter by Workflow Stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
          >
            <option value="ALL">All Stages</option>
            {WORKFLOW_STAGES_ORDERED.map((stg) => (
              <option key={stg} value={stg}>
                {stg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Applications Table (7 cols) */}
        <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-3.5 font-semibold">Application ID</th>
                  <th className="py-3 px-3.5 font-semibold">Institution & Program</th>
                  <th className="py-3 px-3.5 font-semibold">Category & AY</th>
                  <th className="py-3 px-3.5 font-semibold">Workflow Stage</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setSelectedAppId(app.id);
                        setSearchParams({ appId: app.id });
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {app.code}
                        <div className="text-[10px] font-normal text-slate-500">
                          Due {app.slaDueDate}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{app.programName}</div>
                        <div className="text-slate-500 truncate max-w-[240px]">
                          {app.institutionName}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="text-slate-800">{app.category}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          AY {app.academicYear} · {app.currentIntake}→{app.requestedIntake} seats
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`font-semibold ${
                            app.workflowStage === 'Corrections required'
                              ? 'text-red-700'
                              : app.workflowStage === 'Awaiting additional evidence'
                              ? 'text-amber-700'
                              : app.workflowStage === 'Review completed' ||
                                app.workflowStage === 'Ready for authorized review'
                              ? 'text-emerald-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {app.workflowStage}
                        </span>
                        <div className="text-[10px] text-slate-500">{app.submissionState}</div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono">
                        {app.unresolvedFindingsCount > 0 ? (
                          <span className="font-bold text-red-600">
                            {app.unresolvedFindingsCount} open
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">0 open</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Application Detail Dossier (5 cols) */}
        {selectedApp && (
          <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#0F766E]">
                  <span>{selectedApp.code}</span>
                  <span>·</span>
                  <span>{selectedApp.ruleVersion}</span>
                </div>
                <h2 className="mt-1 text-base font-bold text-slate-900">
                  {selectedApp.programName}
                </h2>
                <p className="text-xs text-slate-600">{selectedApp.institutionName}</p>
              </div>
              <button
                onClick={() =>
                  navigate(`/verification?tab=studio&appId=${selectedApp.id}`)
                }
                className="inline-flex items-center gap-1 rounded bg-[#0F766E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d645d] shrink-0"
              >
                Open Docs
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Embedded Institution Information Card */}
            {selectedInst && (
              <div className="rounded-lg border border-teal-200/80 bg-teal-50/40 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Building2 className="h-4 w-4 text-[#0F766E]" />
                    <span>Institution Profile & Verification Norms</span>
                  </div>
                  <button
                    onClick={() => {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.set('tab', 'institutions');
                      nextParams.set('id', selectedInst.id);
                      setSearchParams(nextParams);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F766E] hover:underline"
                  >
                    Inspect Institution
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Permanent ID:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{selectedInst.permanentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>{' '}
                    <span className="font-medium text-slate-900">{selectedInst.city}, {selectedInst.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Authorized Head:</span>{' '}
                    <span className="text-slate-800">
                      {selectedInst.complianceContacts?.[0]?.name || 'Dr. Principal / Head'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Institution Category:</span>{' '}
                    <span className="text-slate-800 truncate block">{selectedInst.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sanctioned Intake:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedInst.programs.reduce((sum, p) => sum + p.sanctionedIntake, 0)} seats ({selectedInst.programs.length} programs)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Checklist Ready:</span>{' '}
                    <span className="font-mono font-semibold text-[#0F766E]">{selectedInst.checklistCompletionPct}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Distinction between Saved, Submitted, and Official Outcome */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">Internal Workflow Stage</div>
                <div className="mt-0.5 font-semibold text-slate-900">
                  {selectedApp.workflowStage}
                </div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">Official Regulatory Outcome</div>
                <div className="mt-0.5 font-semibold text-slate-800">
                  {selectedApp.officialOutcome}
                </div>
              </div>
            </div>

            {/* Linked Compliance Findings */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                <span>Compliance Findings ({appFindings.length})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Click to open Evidence-to-Action chain
                </span>
              </div>
              {appFindings.length === 0 ? (
                <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  All basic checks and cross-document validations satisfied.
                </div>
              ) : (
                <div className="space-y-2">
                  {appFindings.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => openFindingDrawer(f.id)}
                      className="cursor-pointer rounded border border-slate-200 p-3 hover:border-[#0F766E] transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">
                          {f.id} · {f.clauseId}
                        </span>
                        <span
                          className={`font-semibold ${
                            f.status === 'Resolved' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-slate-900">{f.title}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Extracted: <span className="font-mono">{f.extractedValue}</span> · Expected:{' '}
                        <span className="font-mono">{f.expectedValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submitted Documents */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2">
                Submitted Supporting Documents ({appDocuments.length})
              </div>
              <div className="space-y-2">
                {appDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/verification?tab=studio&docId=${doc.id}`)}
                    className="cursor-pointer flex items-center justify-between rounded border border-slate-200 px-3 py-2 hover:bg-slate-50 text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-slate-900 truncate">{doc.title}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {doc.id} · {doc.currentVersion} · OCR {doc.ocrConfidenceAvg}%
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-semibold ${
                        doc.validationState === 'Validated'
                          ? 'text-emerald-700'
                          : doc.validationState === 'Mismatch detected' ||
                            doc.validationState === 'Missing information'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {doc.validationState}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorized Stage Transition Control */}
            <div className="border-t border-slate-200 pt-4 space-y-2.5 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0F766E]" />
                Authorized Stage Transition
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  aria-label="Target Workflow Stage"
                  value={nextStageSelection}
                  onChange={(e) => setNextStageSelection(e.target.value as WorkflowStage)}
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  {WORKFLOW_STAGES_ORDERED.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder="Review justification note..."
                  className="rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  transitionApplicationStage(
                    selectedApp.id,
                    nextStageSelection,
                    transitionNote || `Stage updated by ${state.currentUser.name}`
                  );
                  setTransitionNote('');
                }}
                className="w-full rounded bg-[#101B2D] py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Record Authorized Transition
              </button>
            </div>

            {/* Application Version History */}
            <div className="border-t border-slate-200 pt-3">
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-500" />
                Application Version History
              </div>
              <div className="space-y-2">
                {selectedApp.versionHistory.map((v, i) => (
                  <div key={i} className="rounded bg-slate-50 p-2 text-[11px] border border-slate-100">
                    <div className="flex justify-between font-mono text-slate-500">
                      <span>{v.version} · {v.stage}</span>
                      <span>{new Date(v.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-0.5 text-slate-800">{v.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )}
</div>
);
};
