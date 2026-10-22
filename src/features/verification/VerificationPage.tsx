import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  ClipboardCheck,
  ScanSearch,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { VerificationQueuePage } from './VerificationQueuePage';
import { DocumentIntelligencePage } from '../document-intelligence/DocumentIntelligencePage';

export const VerificationPage: React.FC = () => {
  const { state } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // If a docId or bbox is present in searchParams, default to studio unless explicitly requesting queue
  const hasDocParam = Boolean(searchParams.get('docId') || searchParams.get('page') || searchParams.get('bbox'));
  const currentTab = searchParams.get('tab') || (hasDocParam ? 'studio' : 'queue');

  const setTab = (tab: 'queue' | 'studio') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const openFindingsCount = state.findings.filter((f) => f.status !== 'Resolved').length;
  const docsNeedingReviewCount = state.documents.filter(
    (d) =>
      d.validationState === 'Needs manual review' ||
      d.validationState === 'Mismatch detected' ||
      d.validationState === 'Missing information' ||
      d.validationState === 'Verification pending'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs for Consolidated Page 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs w-fit">
          <button
            onClick={() => setTab('queue')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              currentTab === 'queue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Verification Queue & ReviewPilot</span>
            {openFindingsCount > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-red-700">
                {openFindingsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('studio')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              currentTab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanSearch className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Document Intelligence Studio (3-Panel Evidence Viewer)</span>
            {docsNeedingReviewCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-800">
                {docsNeedingReviewCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span>Local OCR & Trained Inference Pipeline Active</span>
        </div>
      </div>

      {/* Render active view tab */}
      {currentTab === 'queue' ? (
        <VerificationQueuePage />
      ) : (
        <DocumentIntelligencePage />
      )}
    </div>
  );
};
