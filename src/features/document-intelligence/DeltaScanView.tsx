import React, { useState } from 'react';
import { api } from '../../lib/api-client';
import {
  Zap,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  TrendingDown,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeltaScanViewProps {
  documentId: string;
  documentTitle: string;
  currentVersion: string;
  totalPages: number;
  onRefreshDocument?: () => void;
}

export const DeltaScanView: React.FC<DeltaScanViewProps> = ({
  documentId,
  documentTitle,
  currentVersion,
  totalPages,
  onRefreshDocument,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [deltaResult, setDeltaResult] = useState<any | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [versionDiff, setVersionDiff] = useState<any | null>(null);

  const handleLoadVersionDiff = async () => {
    setIsLoadingDiff(true);
    try {
      const res = await api.getDocumentVersionDiff(documentId);
      setVersionDiff(res);
      toast.success(`Loaded version diff for ${res.documentTitle} (${res.currentVersion}).`);
    } catch (err: any) {
      toast.error(`Failed to load version diff: ${err.message}`);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const handleExecuteDeltaScan = async () => {
    setIsRunning(true);
    try {
      const res = await api.reprocessDelta(documentId);
      setDeltaResult(res.reprocessingPlan);
      toast.success(
        `DeltaScan complete: ${res.metrics.pagesReused}/${res.metrics.totalPages} pages cached (${res.metrics.estimatedSavingsPercent}% savings) in ${res.metrics.processingTimeMs}ms.`
      );
      if (onRefreshDocument) {
        onRefreshDocument();
      }
    } catch (err: any) {
      toast.error(`DeltaScan execution error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-600 font-bold">
              Feature 3 · DeltaScan
            </span>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Incremental Document Reprocessing Engine
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Per-Page Content Fingerprinting & Smart Cache Invalidation
          </h3>
          <p className="mt-0.5 text-slate-500 text-[11px]">
            Uses SHA-256 visual and content page hashes to reuse unchanged OCR outputs, re-processing only modified pages and re-evaluating dependent rule checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadVersionDiff}
            disabled={isLoadingDiff}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileCheck className="h-3.5 w-3.5 text-[#0F766E]" />
            {isLoadingDiff ? 'Comparing Versions...' : 'Inspect Version Diff (v1.0 vs v2.0)'}
          </button>

          <button
            onClick={handleExecuteDeltaScan}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${isRunning ? 'animate-bounce' : ''}`} />
            {isRunning ? 'Calculating Delta Plan...' : 'Execute DeltaScan'}
          </button>
        </div>
      </div>

      {/* Document Version Diff Panel (Feature D) */}
      {versionDiff && (
        <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/30 p-3.5">
          <div className="flex items-center justify-between border-b border-teal-200 pb-2">
            <span className="font-bold text-slate-900 text-xs">
              Immutable Version Lineage & Field/Text Diff ({versionDiff.versionComparison?.previousVersion?.version} → {versionDiff.versionComparison?.currentVersion?.version})
            </span>
            <span className="rounded bg-teal-100 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0F766E]">
              {versionDiff.versionComparison?.sha256Changed ? 'SHA-256 Updated' : 'Identical Digest'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded border border-slate-200 bg-white p-2">
              <div className="font-bold text-slate-700">Prior Version ({versionDiff.versionComparison?.previousVersion?.version})</div>
              <div className="text-slate-500 truncate">{versionDiff.versionComparison?.previousVersion?.fileName}</div>
              <div className="text-slate-400">SHA256: {versionDiff.versionComparison?.previousVersion?.sha256?.slice(0, 20)}...</div>
            </div>
            <div className="rounded border border-emerald-200 bg-white p-2">
              <div className="font-bold text-emerald-800">Current Version ({versionDiff.versionComparison?.currentVersion?.version})</div>
              <div className="text-slate-600 truncate">{versionDiff.versionComparison?.currentVersion?.fileName}</div>
              <div className="text-slate-400">SHA256: {versionDiff.versionComparison?.currentVersion?.sha256?.slice(0, 20)}...</div>
            </div>
          </div>

          {versionDiff.fieldDiffs?.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 text-[11px]">Extracted Field Changes:</div>
              {versionDiff.fieldDiffs.map((fd: any) => (
                <div key={fd.fieldId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[10px]">
                  <span className="font-bold text-slate-800">{fd.label} (p.{fd.pageNumber})</span>
                  <span>
                    <span className="text-red-600 line-through mr-1.5">{fd.previousValue}</span>
                    <ArrowRight className="inline h-3 w-3 text-slate-400 mr-1.5" />
                    <span className="text-emerald-700 font-bold">{fd.currentValue}</span>
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold">{fd.status}</span>
                </div>
              ))}
            </div>
          )}

          {versionDiff.textLineDiffs?.some((tl: any) => tl.changeType === 'MODIFIED') && (
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 text-[11px]">Modified Document Text Lines:</div>
              {versionDiff.textLineDiffs
                .filter((tl: any) => tl.changeType === 'MODIFIED')
                .map((tl: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="rounded border border-red-200 bg-red-50 p-1.5 text-red-900">
                      - [p.{tl.pageNumber}] {tl.previousLine}
                    </div>
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-900">
                      + [p.{tl.pageNumber}] {tl.currentLine}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Target Document Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 p-2.5 font-mono text-[11px]">
        <div>
          <span className="text-slate-400">Target Document:</span>{' '}
          <strong className="text-slate-800">{documentTitle}</strong>
        </div>
        <div className="flex items-center gap-3 text-slate-600">
          <span>Version: <strong>{currentVersion}</strong></span>
          <span>Pages: <strong>{totalPages}</strong></span>
          <span>Engine: <strong>PyMuPDF + GPU EasyOCR</strong></span>
        </div>
      </div>

      {/* Measured Metrics Bar */}
      {deltaResult ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono text-[11px]">
            <div className="rounded border border-slate-200 bg-white p-2.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Layers className="h-3 w-3" /> Total Pages
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">{deltaResult.totalPages}</div>
            </div>

            <div className="rounded border border-emerald-200 bg-emerald-50/50 p-2.5">
              <div className="text-[10px] text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Cached & Reused
              </div>
              <div className="text-base font-bold text-emerald-800 mt-1">{deltaResult.pagesReused}</div>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50/50 p-2.5">
              <div className="text-[10px] text-amber-700 flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3" /> Reprocessed
              </div>
              <div className="text-base font-bold text-amber-800 mt-1">{deltaResult.pagesReprocessed}</div>
            </div>

            <div className="rounded border border-blue-200 bg-blue-50/50 p-2.5">
              <div className="text-[10px] text-blue-700 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Execution Time
              </div>
              <div className="text-base font-bold text-blue-800 mt-1">{deltaResult.processingTimeMs} ms</div>
            </div>

            <div className="rounded border border-teal-200 bg-teal-50/50 p-2.5">
              <div className="text-[10px] text-teal-700 flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3" /> Compute Savings
              </div>
              <div className="text-base font-bold text-teal-800 mt-1">{deltaResult.estimatedSavingsPercent}%</div>
            </div>
          </div>

          {/* Page-by-Page Processing Plan Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>Incremental Processing Plan & Cache Decisions</span>
              <span className="font-mono text-[10px] text-slate-400">
                Hit Rate: {(deltaResult.cacheHitRate * 100).toFixed(1)}%
              </span>
            </div>

            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-100/70 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Page #</th>
                  <th className="p-2.5">Fingerprint (SHA-256)</th>
                  <th className="p-2.5">Pipeline Decision</th>
                  <th className="p-2.5">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {deltaResult.pageDecisions?.map((pd: any) => (
                  <tr key={pd.pageNumber} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">Page {pd.pageNumber}</td>
                    <td className="p-2.5 text-slate-500">{pd.pageHash || 'hash-match'}</td>
                    <td className="p-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          pd.action === 'CACHE_HIT_REUSED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {pd.action}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 font-sans">{pd.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Affected Rule Checks */}
          {deltaResult.affectedRuleChecks && deltaResult.affectedRuleChecks.length > 0 && (
            <div className="rounded border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-[#0F766E]" />
                Selective Re-evaluation Triggered for Affected Checks:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 font-mono text-[11px]">
                {deltaResult.affectedRuleChecks.map((chk: string, idx: number) => (
                  <li key={idx}>{chk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
          <HardDrive className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
          <p className="font-semibold text-slate-700">DeltaScan plan not yet calculated for this version.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click "Execute DeltaScan" to compute cryptographic page hashes, identify cached pages, and measure actual compute savings.
          </p>
        </div>
      )}
    </div>
  );
};
