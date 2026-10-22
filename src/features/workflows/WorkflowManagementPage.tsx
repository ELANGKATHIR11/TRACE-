import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { WORKFLOW_STAGES_ORDERED, getPermissions } from '../../lib/permissions';
import { WorkflowStage } from '../../types/domain';
import {
  GitBranch,
  Kanban,
  Table2,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from 'lucide-react';

export const WorkflowManagementPage: React.FC = () => {
  const {
    state,
    openFindingDrawer,
    createCorrectiveTask,
    updateTaskStatus,
    transitionApplicationStage,
  } = useTraceStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialFilter = searchParams.get('filter') || 'ALL';
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);

  // New Task Form State
  const [newTaskFindingId, setNewTaskFindingId] = useState<string>(state.findings[0].id);
  const [newTaskTitle, setNewTaskTitle] = useState<string>(
    'Upload Counter-Signed Block-C Date Rectification Addendum (v2.0)'
  );
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('Prof. Meera Krishnan');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('2026-10-26');
  const [newTaskPriority, setNewTaskPriority] = useState<'Urgent' | 'High' | 'Medium'>('Urgent');
  const [newTaskAction, setNewTaskAction] = useState<string>(
    'Submit signed Municipal/Structural Addendum confirming commissioning date 01-May-2026'
  );

  const perms = getPermissions(state.currentUser.role);

  const filteredTasks = state.tasks.filter((t) => {
    if (statusFilter === 'overdue') return t.status === 'Overdue';
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    return true;
  });

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finding = state.findings.find((f) => f.id === newTaskFindingId) || state.findings[0];
    createCorrectiveTask({
      findingId: finding.id,
      applicationId: finding.applicationId,
      title: newTaskTitle,
      description: `Assigned via Workflow Management for ${finding.clauseNumber}`,
      assigneeName: newTaskAssignee,
      assigneeRole: 'institution_compliance_officer',
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      requiredAction: newTaskAction,
    });
    setShowNewTaskModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            CONFIGURABLE WORKFLOW & TASK AUTOMATION ENGINE
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Workflow Stages, Corrective Task Board & SLA Transitions
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Note: The 8 stages below represent configurable internal scrutiny workflow stages, not an assertion of every statutory AICTE portal state.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <Kanban className="h-3.5 w-3.5 text-[#0F766E]" />
              Stage & Task Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <Table2 className="h-3.5 w-3.5 text-[#0F766E]" />
              Table View
            </button>
          </div>

          <button
            onClick={() => setShowNewTaskModal(true)}
            disabled={!perms.canAssignCorrectiveTask}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold ${
              perms.canAssignCorrectiveTask
                ? 'bg-[#0F766E] text-white hover:bg-[#0d645d]'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Corrective Task
          </button>
        </div>
      </div>

      {/* 8 Configurable Workflow Stages Pipeline */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-bold text-slate-800 mb-3">
          8 Configurable Internal Scrutiny Stages (Application Distribution)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {WORKFLOW_STAGES_ORDERED.map((stg, index) => {
            const appsInStage = state.applications.filter((a) => a.workflowStage === stg);
            return (
              <div
                key={stg}
                className="rounded border border-slate-200 bg-slate-50/70 p-2.5 text-xs flex flex-col justify-between"
              >
                <div className="text-[10px] font-mono text-slate-400">STAGE 0{index + 1}</div>
                <div className="mt-1 font-semibold text-slate-900 leading-snug">{stg}</div>
                <div className="mt-2 font-mono text-sm font-bold text-[#0F766E]">
                  {appsInStage.length} app(s)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-700">Filter Corrective Tasks:</span>
        {['ALL', 'Open', 'In Progress', 'Awaiting Verification', 'Overdue', 'Completed'].map(
          (st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st === 'Overdue' ? 'overdue' : st)}
              className={`rounded px-2.5 py-1 font-medium border ${
                (statusFilter === 'overdue' && st === 'Overdue') || statusFilter === st
                  ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Open', 'In Progress', 'Awaiting Verification', 'Overdue', 'Completed'] as const).map(
            (colStatus) => {
              const colTasks = filteredTasks.filter((t) => t.status === colStatus);
              if (colTasks.length === 0 && colStatus === 'Open' && filteredTasks.length > 0) {
                // still show column
              }
              return (
                <div
                  key={colStatus}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="font-bold text-slate-900">{colStatus}</span>
                    <span className="font-mono text-slate-500">{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No tasks in {colStatus}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-slate-900">{task.id}</span>
                          <span
                            className={
                              task.priority === 'Urgent'
                                ? 'text-red-600 font-bold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            {task.priority} · Cycle #{task.correctionCycle}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        <div className="text-[11px] text-slate-600">
                          Owner: <strong>{task.assigneeName}</strong> · Due:{' '}
                          <span className="font-mono">{task.dueDate}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Action: {task.requiredAction}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80">
                          {task.findingId && (
                            <button
                              onClick={() => openFindingDrawer(task.findingId!)}
                              className="rounded bg-[#101B2D] px-2 py-1 text-[11px] font-medium text-white"
                            >
                              Trace {task.findingId}
                            </button>
                          )}
                          <select
                            aria-label={`Change status for task ${task.id}`}
                            value={task.status}
                            onChange={(e) =>
                              updateTaskStatus(
                                task.id,
                                e.target.value as any,
                                `Transitioned via Workflow Board`
                              )
                            }
                            className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Verification">Awaiting Verification</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-3.5 font-semibold">Task ID & Priority</th>
                <th className="py-3 px-3.5 font-semibold">Title & Required Action</th>
                <th className="py-3 px-3.5 font-semibold">Application & Finding</th>
                <th className="py-3 px-3.5 font-semibold">Assignee & Due Date</th>
                <th className="py-3 px-3.5 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono">
                    <div className="font-bold text-slate-900">{t.id}</div>
                    <div className="text-[10px] text-slate-500">{t.priority}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900">{t.title}</div>
                    <div className="text-slate-500 text-[11px]">{t.requiredAction}</div>
                  </td>
                  <td className="py-3 px-3.5 font-mono">
                    <div>{t.applicationCode}</div>
                    {t.findingId && (
                      <button
                        onClick={() => openFindingDrawer(t.findingId!)}
                        className="text-[#0F766E] hover:underline text-[11px]"
                      >
                        {t.findingId}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-medium text-slate-900">{t.assigneeName}</div>
                    <div className="font-mono text-[11px] text-slate-500">Due: {t.dueDate}</div>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-semibold">
                    {t.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Corrective Task Modal */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateTaskSubmit}
            className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 space-y-4 text-xs shadow-xl"
          >
            <h2 className="text-base font-bold text-slate-900">
              Create & Assign Corrective Task
            </h2>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Linked Compliance Finding
              </label>
              <select
                value={newTaskFindingId}
                onChange={(e) => setNewTaskFindingId(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              >
                {state.findings.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} ({f.applicationCode}) — {f.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignee</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                >
                  <option value="Prof. Meera Krishnan">
                    Prof. Meera Krishnan (VIEPS Compliance Officer)
                  </option>
                  <option value="Dr. S. Raghavan">Dr. S. Raghavan (VIEPS Principal)</option>
                  <option value="Prof. Ananya Reddy">Prof. Ananya Reddy (Nalanda Institute)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SLA Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Required Corrective Action
              </label>
              <textarea
                rows={2}
                value={newTaskAction}
                onChange={(e) => setNewTaskAction(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="rounded border border-slate-300 px-3.5 py-1.5 font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-[#0F766E] px-4 py-1.5 font-semibold text-white hover:bg-[#0d645d]"
              >
                Create & Assign Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
