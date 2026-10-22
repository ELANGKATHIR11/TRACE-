import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  BarChart3,
  History,
  Lock,
  Download,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { AnalyticsReportsPage } from '../analytics/AnalyticsReportsPage';
import { AuditTrailPage } from '../audit/AuditTrailPage';
import { ProoflineManifestView } from '../audit/ProoflineManifestView';

export const ReportsAuditPage: React.FC = () => {
  const { state } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'audit'
      ? 'audit'
      : tabParam === 'proofline'
      ? 'proofline'
      : 'analytics';

  const setTab = (tab: 'analytics' | 'audit' | 'proofline') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const auditCount = state.auditEvents.length;

  const selectedAppId = searchParams.get('app') || state.applications[0]?.id || 'APP-2026-0842';

  return (
    <div className="space-y-6">
      {/* 3 Consolidated Navigation Tabs for Page 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs">
          <button
            onClick={() => setTab('analytics')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Operational Analytics & Ageing</span>
          </button>

          <button
            onClick={() => setTab('audit')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Searchable Audit Events</span>
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 font-mono text-[10px] text-slate-700">
              {auditCount}
            </span>
          </button>

          <button
            onClick={() => setTab('proofline')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'proofline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Proofline Cryptographic Manifest</span>
            <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#0F766E]">
              SHA-256
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Immutable Backend-Generated Event Log</span>
        </div>
      </div>

      {/* Render active tab */}
      {activeTab === 'analytics' && <AnalyticsReportsPage />}
      {activeTab === 'audit' && <AuditTrailPage />}
      {activeTab === 'proofline' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#0F766E]" />
                  Proofline Cryptographic Audit Manifest & Merkle Root Chain
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cryptographic integrity proof verifying tamper-evident sequential chaining of scrutiny decisions, document hashes, and rule evaluations.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Application:</span>
                <select
                  aria-label="Application Dossier for Proofline Manifest"
                  value={selectedAppId}
                  onChange={(e) => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set('app', e.target.value);
                    setSearchParams(nextParams);
                  }}
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-800"
                >
                  {state.applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.programName.slice(0, 20)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ProoflineManifestView applicationId={selectedAppId} />
          </div>
        </div>
      )}
    </div>
  );
};
