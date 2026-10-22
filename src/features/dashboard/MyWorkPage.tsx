import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { getPermissions } from '../../lib/permissions';
import {
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const MyWorkPage: React.FC = () => {
  const { state, openFindingDrawer, updateTaskStatus } = useTraceStore();
  const navigate = useNavigate();
  const perms = getPermissions(state.currentUser.role);

  const myTasks = state.tasks.filter(
    (t) =>
      t.assigneeName === state.currentUser.name ||
      t.assigneeRole === state.currentUser.role ||
      state.currentUser.role === 'authorized_reviewer' ||
      state.currentUser.role === 'regulatory_system_administrator'
  );

  const myApplications = state.applications.filter((a) =>
    state.currentUser.institutionId
      ? a.institutionId === state.currentUser.institutionId
      : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>MY WORKBENCH</span>
            <span>·</span>
            <span className="font-mono text-[#0F766E]">{state.currentUser.badgeCode}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {state.currentUser.name} — {state.currentUser.roleLabel}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            {state.currentUser.permissionsDescription}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/document-intelligence?docId=DOC-2026-101&page=2')}
            className="rounded-md bg-[#0F766E] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0d645d]"
          >
            Open Document Intelligence Workbench
          </button>
        </div>
      </div>

      {/* Role-Specific Permissions Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-[#0F766E]" />
          Active Role Authorization Matrix ({state.currentUser.roleLabel})
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {[
            { label: 'Upload Remediation Doc', allowed: perms.canUploadRemediationDocument },
            { label: 'Run Validation Engine', allowed: perms.canRunValidation },
            { label: 'Confirm/Edit OCR Field', allowed: perms.canConfirmOrEditExtraction },
            { label: 'Assign Corrective Task', allowed: perms.canAssignCorrectiveTask },
            { label: 'Resolve Finding', allowed: perms.canResolveFinding },
            { label: 'Publish Rule Version', allowed: perms.canPublishRuleSet },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded border px-2.5 py-2 ${
                item.allowed
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <div className="font-semibold">{item.allowed ? 'Authorized' : 'Restricted'}</div>
              <div className="text-[11px] mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Corrective Tasks */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Assigned Corrective & Verification Tasks ({myTasks.length})
            </h2>
            <p className="text-xs text-slate-500">
              Tasks assigned to your role or under your scrutiny oversight
            </p>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="text-xs font-medium text-[#0F766E] hover:underline"
          >
            Open Full Workflow Board →
          </button>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {myTasks.map((task) => (
            <div
              key={task.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-900">{task.id}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#0F766E]">{task.status}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-600">Due: {task.dueDate}</span>
                  <span>·</span>
                  <span className="text-slate-600">Assignee: {task.assigneeName}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                <div className="text-xs text-slate-600">
                  Required Action: {task.requiredAction}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.findingId && (
                  <button
                    onClick={() => openFindingDrawer(task.findingId!)}
                    className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open Finding ({task.findingId})
                  </button>
                )}
                <button
                  onClick={() => navigate(`/document-intelligence?appId=${task.applicationId}`)}
                  className="rounded bg-[#0F766E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d645d]"
                >
                  Remediate / Inspect Document
                </button>
                {task.status !== 'Completed' && (
                  <button
                    onClick={() =>
                      updateTaskStatus(
                        task.id,
                        'In Progress',
                        `Marked In Progress by ${state.currentUser.name}`
                      )
                    }
                    className="rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Mark In Progress
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications in Scope */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
          Applications in Your Scope ({myApplications.length})
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Application ID</th>
                <th className="py-2.5 px-3 font-semibold">Institution & Program</th>
                <th className="py-2.5 px-3 font-semibold">Workflow Stage</th>
                <th className="py-2.5 px-3 font-semibold">Unresolved Findings</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myApplications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{app.code}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{app.programName}</div>
                    <div className="text-slate-500">{app.institutionName}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{app.workflowStage}</td>
                  <td className="py-3 px-3 font-mono">
                    <span
                      className={
                        app.unresolvedFindingsCount > 0
                          ? 'font-bold text-red-600'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {app.unresolvedFindingsCount} open
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate(`/applications?appId=${app.id}`)}
                      className="inline-flex items-center gap-1 font-medium text-[#0F766E] hover:underline"
                    >
                      Open Dossier
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
