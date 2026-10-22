import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { getPermissions } from '../../lib/permissions';
import {
  X,
  FileText,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  ClipboardCheck,
  UserCheck,
  History,
  Info,
  Lock,
  Sparkles,
} from 'lucide-react';
import { FixPreviewSandbox } from './FixPreviewSandbox';

export const EvidenceToActionDrawer: React.FC = () => {
  const {
    state,
    activeFindingDrawerId,
    closeFindingDrawer,
    createCorrectiveTask,
    resolveFinding,
  } = useTraceStore();
  const navigate = useNavigate();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('Prof. Meera Krishnan');
  const [taskDueDate, setTaskDueDate] = useState('2026-10-26');
  const [taskPriority, setTaskPriority] = useState<'Urgent' | 'High' | 'Medium'>('Urgent');
  const [taskAction, setTaskAction] = useState(
    'Upload counter-signed Structural Date Rectification Addendum (v2.0) reconciling Block-C completion date to 01-May-2026'
  );
  const [resolutionNote, setResolutionNote] = useState(
    'Verified rectified completion date (01-May-2026) on Addendum v2.0 against Sworn Affidavit Form-A and Clause 4.2.b cutoff.'
  );

  if (!activeFindingDrawerId) return null;

  const finding = state.findings.find((f) => f.id === activeFindingDrawerId);
  if (!finding) return null;

  const linkedTask = finding.assignedTaskId
    ? state.tasks.find((t) => t.id === finding.assignedTaskId)
    : state.tasks.find((t) => t.findingId === finding.id);

  const linkedDoc = finding.documentId
    ? state.documents.find((d) => d.id === finding.documentId)
    : undefined;

  const relatedAudit = state.auditEvents.filter(
    (e) =>
      e.entityId === finding.id ||
      e.correlationId === finding.correlationId ||
      (finding.documentId && e.entityId === finding.documentId) ||
      (linkedTask && e.entityId === linkedTask.id)
  );

  const perms = getPermissions(state.currentUser.role);
  const isValidationPassed =
    finding.validationResult === 'Validated' ||
    finding.status === 'Re-Validation Passed' ||
    linkedDoc?.validationState === 'Validated';

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createCorrectiveTask({
      findingId: finding.id,
      applicationId: finding.applicationId,
      title:
        taskTitle.trim() ||
        `Remediate ${finding.id}: ${finding.title.slice(0, 56)}`,
      description: `Issued from Evidence-to-Action Traceability chain for ${finding.clauseNumber}. Expected: ${finding.expectedValue}.`,
      assigneeName: taskAssignee,
      assigneeRole: 'institution_compliance_officer',
      priority: taskPriority,
      dueDate: taskDueDate,
      requiredAction: taskAction,
    });
    setShowTaskForm(false);
  };

  const handleResolve = () => {
    resolveFinding(finding.id, resolutionNote);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="e2a-drawer-title"
    >
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-[#101B2D] px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-300 font-mono">
              <span>EVIDENCE-TO-ACTION TRACEABILITY CHAIN</span>
              <span>·</span>
              <span>{finding.id}</span>
              <span>·</span>
              <span>{finding.correlationId}</span>
            </div>
            <h2 id="e2a-drawer-title" className="mt-1 text-base font-semibold text-white">
              {finding.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              {finding.institutionName} · Application{' '}
              <span className="font-mono text-white">{finding.applicationCode}</span>
            </p>
          </div>
          <button
            onClick={closeFindingDrawer}
            className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-400"
            aria-label="Close traceability inspector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable 11-Stage Chain Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Epistemic Separation Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-slate-800">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  Epistemic & Multi-Layer Verification Separation
                </p>
                <p className="mt-0.5 text-slate-700 leading-relaxed">
                  {finding.uncertaintyDisclosure}
                </p>
              </div>
            </div>
          </div>

          {/* Connected Vertical Timeline of the 11 Traceability Links */}
          <div className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-px before:bg-slate-200">
            {/* 1 & 2: Applicable Requirement & Rule Version */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                1
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    1. Applicable Requirement & 2. Rule Version
                  </span>
                  <span className="font-mono text-slate-600">
                    {finding.requirementId} · AY {finding.academicYear}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {finding.requirementTitle}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Evaluated under Rule-Set:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {finding.ruleVersion}
                  </span>
                </p>
              </div>
            </div>

            {/* 3: Source Clause */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                2
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-[#0F766E]" />
                    3. Regulatory Source Clause
                  </span>
                  <button
                    onClick={() => {
                      closeFindingDrawer();
                      navigate(`/compliance?tab=rules&clause=${encodeURIComponent(finding.clauseId)}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                  >
                    Open in Rulebook ({finding.clauseId})
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-900">
                  {finding.clauseNumber} — {finding.sourceDocumentTitle} ({finding.sourcePageRef})
                </p>
                <blockquote className="mt-2 rounded bg-slate-50 p-2.5 text-xs italic text-slate-700 border border-slate-200/80">
                  "{finding.clauseExcerpt}"
                </blockquote>
              </div>
            </div>

            {/* 4 & 5: Document Evidence & Extracted Field */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                3
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#0F766E]" />
                    4. Document Evidence & 5. Extracted Field
                  </span>
                  {finding.documentId && (
                    <button
                      onClick={() => {
                        closeFindingDrawer();
                        navigate(
                          `/verification?tab=studio&docId=${finding.documentId}&page=${
                            finding.pageNumber || 1
                          }&bbox=${finding.boundingBoxId || ''}`
                        );
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                    >
                      Inspect Document & Page {finding.pageNumber || 1}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  Document:{' '}
                  <span className="font-medium text-slate-900">
                    {finding.documentTitle || 'No document attached'}
                  </span>{' '}
                  {linkedDoc && (
                    <span className="font-mono text-slate-500">
                      ({linkedDoc.currentVersion})
                    </span>
                  )}
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">
                      Extracted Value ({finding.extractedFieldLabel || 'Field'})
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
                      {finding.extractedValue || 'N/A'}
                    </div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                    <div className="text-[11px] text-slate-500">
                      Expected / Counterpart Norm
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-semibold text-[#0F766E]">
                      {finding.expectedValue}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 & 7: 5-Pillar Validation Breakdown & Severity */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                4
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#0F766E]" />
                    6. Multi-Layer Validation Result & 7. Severity
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    Severity: {finding.severity}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
                    <span className="text-slate-500">OCR Legibility Confidence:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {finding.ocrConfidence ? `${finding.ocrConfidence}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
                    <span className="text-slate-500">Validation Result:</span>
                    <span
                      className={`font-semibold ${
                        isValidationPassed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {linkedDoc?.validationState || finding.validationResult}
                    </span>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
                    <span className="text-slate-500">Document Integrity Screening:</span>
                    <span className="font-medium text-slate-800">{finding.integrityStatus}</span>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
                    <span className="text-slate-500">Independent Issuer Auth:</span>
                    <span className="font-medium text-amber-800">{finding.issuerAuthStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FixPreview: Counterfactual Sandbox Simulation */}
            <div className="relative pl-10">
              <FixPreviewSandbox
                findingId={finding.id}
                findingTitle={finding.title}
                fieldKey={finding.fieldKey}
                extractedValue={finding.extractedValue}
                expectedValue={finding.expectedValue}
              />
            </div>

            {/* 8 & 9: Assigned Corrective Task & Deadline */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                5
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-[#0F766E]" />
                    8. Assigned Corrective Task & 9. Due Date
                  </span>
                  {linkedTask && (
                    <button
                      onClick={() => {
                        closeFindingDrawer();
                        navigate(`/tasks?tab=board&taskId=${linkedTask.id}`);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                    >
                      View in Workflow Board ({linkedTask.id})
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {linkedTask ? (
                  <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {linkedTask.id}: {linkedTask.title}
                      </span>
                      <span className="font-mono font-medium text-slate-700">
                        Status: {linkedTask.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Assignee: <span className="font-medium text-slate-900">{linkedTask.assigneeName}</span> · Due Date:{' '}
                      <span className="font-mono font-semibold text-slate-900">{linkedTask.dueDate}</span>
                    </div>
                    <div className="text-slate-600">
                      Required Action: {linkedTask.requiredAction}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs text-slate-600">
                      No corrective task assigned yet. Target SLA Deadline:{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {finding.dueDate}
                      </span>
                    </p>
                    {perms.canAssignCorrectiveTask && !showTaskForm && (
                      <button
                        onClick={() => setShowTaskForm(true)}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d645d]"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Create & Assign Corrective Task
                      </button>
                    )}

                    {showTaskForm && (
                      <form
                        onSubmit={handleCreateTask}
                        className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs"
                      >
                        <div className="font-semibold text-slate-900">
                          Assign Corrective Task for {finding.id}
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700">Task Title</label>
                          <input
                            type="text"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder={`Remediate ${finding.id}: Upload Rectified Block-C Certificate`}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-medium text-slate-700">Assignee</label>
                            <select
                              value={taskAssignee}
                              onChange={(e) => setTaskAssignee(e.target.value)}
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                            >
                              <option value="Prof. Meera Krishnan">
                                Prof. Meera Krishnan (VIEPS Compliance Officer)
                              </option>
                              <option value="Dr. S. Raghavan">
                                Dr. S. Raghavan (VIEPS Principal)
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-medium text-slate-700">SLA Due Date</label>
                            <input
                              type="date"
                              value={taskDueDate}
                              onChange={(e) => setTaskDueDate(e.target.value)}
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700">
                            Required Remediation Action
                          </label>
                          <textarea
                            rows={2}
                            value={taskAction}
                            onChange={(e) => setTaskAction(e.target.value)}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowTaskForm(false)}
                            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded bg-[#0F766E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d645d]"
                          >
                            Confirm & Assign Task
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 10: Reviewer Decision & Finding Resolution Gate */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                6
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-[#0F766E]" />
                    10. Human Reviewer Decision & Resolution Gate
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    Lifecycle: {finding.status}
                  </span>
                </div>

                {finding.status === 'Resolved' ? (
                  <div className="mt-2 rounded border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Finding Resolved by {finding.resolvedBy}
                    </div>
                    <p className="mt-1 text-slate-700">{finding.reviewerDecisionNote}</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2.5">
                    {!isValidationPassed ? (
                      <div className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                        <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800">
                            Resolution Gate Locked:
                          </span>{' '}
                          Finding cannot be resolved until a corrected document is uploaded and the configured validation check passes.
                        </div>
                      </div>
                    ) : (
                      <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-900">
                        <span className="font-semibold">Validation Check Passed:</span> Configured rule evaluation is now satisfied. Authorized Reviewer can formally resolve this finding.
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Reviewer Verification Note
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        Active Role: <strong className="text-slate-700">{state.currentUser.roleLabel}</strong>
                      </span>
                      <button
                        onClick={handleResolve}
                        disabled={!isValidationPassed || !perms.canResolveFinding}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          isValidationPassed && perms.canResolveFinding
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve Finding
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 11: Immutable Audit History */}
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                7
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[#0F766E]" />
                    11. Recorded Audit Trail ({relatedAudit.length} events)
                  </span>
                  <button
                    onClick={() => {
                      closeFindingDrawer();
                      navigate(`/reports?tab=audit&app=${finding.applicationId}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                  >
                    Open Full Audit Log
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 space-y-2">
                  {relatedAudit.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>{evt.id} · {evt.actionType}</span>
                        <span>{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="mt-0.5 font-medium text-slate-900">{evt.actionLabel}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        Actor: {evt.actorName} ({evt.actorRole}) · State: {evt.previousState} →{' '}
                        <span className="font-medium text-slate-800">{evt.newState}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
