import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { CalendarClock, AlertTriangle, Clock, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const ComplianceCalendarPage: React.FC = () => {
  const { state, openFindingDrawer } = useTraceStore();
  const navigate = useNavigate();

  const calendarEvents = [
    ...state.tasks.map((t) => ({
      id: t.id,
      date: t.dueDate,
      type: 'Corrective Task SLA',
      title: `${t.id}: ${t.title}`,
      subtitle: `${t.institutionName} (${t.applicationCode})`,
      owner: t.assigneeName,
      status: t.status,
      onClick: () => navigate(`/workflows?taskId=${t.id}`),
    })),
    ...state.requirements.map((r) => ({
      id: r.id,
      date: r.deadline,
      type: 'Compliance Obligation',
      title: `${r.code}: ${r.title}`,
      subtitle: `${r.clauseRef} (${r.ruleVersion})`,
      owner: r.assignedOwner,
      status: r.status,
      onClick: () => navigate('/compliance'),
    })),
    ...state.documents
      .filter((d) => d.expiryDate)
      .map((d) => ({
        id: d.id,
        date: d.expiryDate!,
        type: 'Certificate Expiry',
        title: `Expiry: ${d.title}`,
        subtitle: `Document ${d.id} · App ${d.applicationId}`,
        owner: d.uploadedBy,
        status: d.validationState,
        onClick: () => navigate(`/document-intelligence?docId=${d.id}`),
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="text-xs text-slate-500">COMPLIANCE CALENDAR & SLA SCHEDULE</div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Regulatory Deadlines, Expiring Certificates & Corrective Task SLAs
        </h1>
        <p className="mt-0.5 text-xs text-slate-600">
          Unified schedule of overdue remediation tasks, upcoming statutory renewals, and application SLA cutoffs.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {calendarEvents.map((ev) => (
          <div
            key={`${ev.type}-${ev.id}`}
            onClick={ev.onClick}
            className="cursor-pointer p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 text-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-center font-mono shrink-0">
                <div className="text-[10px] text-slate-500">DUE DATE</div>
                <div className="font-bold text-slate-900 mt-0.5">{ev.date}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#0F766E]">
                  <span>{ev.type}</span>
                  <span>·</span>
                  <span>Owner: {ev.owner}</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">{ev.title}</div>
                <div className="text-slate-500 mt-0.5">{ev.subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`font-mono font-semibold ${
                  ev.status === 'Overdue'
                    ? 'text-red-600'
                    : ev.status === 'Satisfied' || ev.status === 'Completed' || ev.status === 'Validated'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {ev.status}
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
