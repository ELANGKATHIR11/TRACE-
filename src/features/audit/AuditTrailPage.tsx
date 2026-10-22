import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { History, Search, Lock, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ProoflineManifestView } from './ProoflineManifestView';

export const AuditTrailPage: React.FC = () => {
  const { state } = useTraceStore();
  const [searchParams] = useSearchParams();

  const initialAppFilter = searchParams.get('app') || 'ALL';
  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState(initialAppFilter);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [showProofline, setShowProofline] = useState<boolean>(true);

  const filteredEvents = useMemo(() => {
    return state.auditEvents.filter((evt) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !evt.actionLabel.toLowerCase().includes(q) &&
        !evt.actorName.toLowerCase().includes(q) &&
        !evt.correlationId.toLowerCase().includes(q) &&
        !evt.entityId.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (appFilter !== 'ALL' && evt.applicationId !== appFilter) return false;
      if (actionFilter !== 'ALL' && evt.actionType !== actionFilter) return false;
      return true;
    });
  }, [state.auditEvents, search, appFilter, actionFilter]);

  const handleExportAuditLog = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRACE_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported immutable audit trail records (JSON).');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">EVIDENCE-ORIENTED IMMUTABLE AUDIT LOG</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            System & Scrutiny Audit Trail
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Read-only cryptographic-style correlation log of all application, extraction, task, rule, and review mutations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProofline((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              showProofline
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {showProofline ? 'Hide Proofline Manifest' : 'Proofline Manifest & Audit Chain (Feature 6)'}
          </button>

          <button
            onClick={handleExportAuditLog}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Audit Log (JSON)
          </button>
        </div>
      </div>

      {showProofline && (
        <ProoflineManifestView
          applicationId={appFilter !== 'ALL' ? appFilter : (state.applications[0]?.id || 'APP-2026-0842')}
        />
      )}

      {/* Read-Only Governance Notice */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 flex items-center gap-2">
        <Lock className="h-4 w-4 text-[#0F766E] shrink-0" />
        <span>
          <strong>Read-Only Audit Integrity Policy:</strong> Audit events are append-only. No role—including System Administrators—is provided a control to alter or delete recorded audit history.
        </span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <div className="md:col-span-6 relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Actor, Correlation ID, Entity ID, or Action..."
            className="w-full rounded border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs"
          />
        </div>
        <div className="md:col-span-3">
          <select
            aria-label="Filter by Application"
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">All Applications</option>
            {state.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            aria-label="Filter by Event Type"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">All Event Types</option>
            <option value="APPLICATION_CREATED">APPLICATION_CREATED</option>
            <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
            <option value="VALIDATION_EXECUTED">VALIDATION_EXECUTED</option>
            <option value="FINDING_CREATED">FINDING_CREATED</option>
            <option value="TASK_ASSIGNED">TASK_ASSIGNED</option>
            <option value="FINDING_RESOLVED">FINDING_RESOLVED</option>
            <option value="WORKFLOW_STAGE_TRANSITION">WORKFLOW_STAGE_TRANSITION</option>
            <option value="RULE_VERSION_PUBLISHED">RULE_VERSION_PUBLISHED</option>
            <option value="ROLE_SWITCHED_DEMO">ROLE_SWITCHED_DEMO</option>
          </select>
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-3.5 font-semibold">Timestamp & Event ID</th>
                <th className="py-3 px-3.5 font-semibold">Actor & Role</th>
                <th className="py-3 px-3.5 font-semibold">Action & Affected Entity</th>
                <th className="py-3 px-3.5 font-semibold">Previous → New State</th>
                <th className="py-3 px-3.5 font-semibold">Evidence / Rule Ref & Correlation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                    <div className="font-bold text-slate-900">
                      {new Date(evt.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">{evt.id}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900">{evt.actorName}</div>
                    <div className="text-[11px] text-slate-500">{evt.actorRole}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-mono text-[10px] font-bold text-[#0F766E]">
                      {evt.actionType}
                    </div>
                    <div className="font-semibold text-slate-900">{evt.actionLabel}</div>
                    <div className="text-[11px] text-slate-500">
                      {evt.entityType}: {evt.entityLabel}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px]">
                    <span className="text-slate-500">{evt.previousState || 'N/A'}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="font-semibold text-slate-900">{evt.newState || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px]">
                    <div className="text-slate-800">{evt.evidenceOrRuleRef || '—'}</div>
                    <div className="text-[10px] text-slate-500">
                      Correlation: {evt.correlationId}
                    </div>
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
