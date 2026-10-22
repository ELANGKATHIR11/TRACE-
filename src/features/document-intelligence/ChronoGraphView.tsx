import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import { ClaimItem, ClaimRelationshipItem } from '../../types/domain';
import {
  GitCompare,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  Scale,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChronoGraphViewProps {
  applicationId: string;
  onNavigateToEvidence?: (docId: string, pageNumber: number, bboxId?: string) => void;
}

export const ChronoGraphView: React.FC<ChronoGraphViewProps> = ({
  applicationId,
  onNavigateToEvidence,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [contradictions, setContradictions] = useState<ClaimRelationshipItem[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadGraphData = async () => {
    setIsLoading(true);
    try {
      const graph = await api.getClaimGraph(applicationId);
      if (graph.nodes) {
        setClaims(
          graph.nodes.map((n: any) => ({
            id: n.id,
            applicationId: graph.applicationId,
            institutionId: '',
            documentId: n.documentId,
            documentTitle: n.documentTitle,
            documentVersion: 'v1.0',
            claimType: n.claimType,
            claimKey: n.claimKey,
            rawValue: n.rawValue,
            normalizedValue: n.normalizedValue,
            pageNumber: n.pageNumber,
            confidence: n.confidence,
            reviewStatus: n.reviewStatus,
          }))
        );
      }
      const contraRes = await api.getContradictions(applicationId);
      if (contraRes.contradictions) {
        setContradictions(
          contraRes.contradictions.map((c: any) => ({
            id: c.id,
            applicationId,
            sourceClaimId: c.source?.claimId || '',
            targetClaimId: c.target?.claimId || '',
            relationType: c.relationType,
            severity: c.severity,
            explanation: c.explanation,
            sourceValueSummary: c.source?.value || '',
            targetValueSummary: c.target?.value || '',
            status: c.status || 'Open',
            sourceEvidenceDocTitle: c.source?.documentTitle,
            sourceEvidencePage: c.source?.pageNumber,
            targetEvidenceDocTitle: c.target?.documentTitle,
            targetEvidencePage: c.target?.pageNumber,
          }))
        );
      }
    } catch (err: any) {
      console.warn('Could not load claim graph initially, can trigger analyze:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [applicationId]);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await api.analyzeApplicationClaims(applicationId);
      toast.success(
        `ChronoGraph Analysis Complete: ${res.totalClaims} claims extracted, ${res.totalContradictions} contradictions flagged.`
      );
      await loadGraphData();
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContradictions = contradictions.filter((c) => {
    if (filterType === 'ALL') return true;
    return c.relationType === filterType;
  });

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#0F766E] font-bold">
              Feature 1 · ChronoGraph
            </span>
            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
              Cross-Document Contradiction Engine
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Cross-Document Claim Relationships & Timeline Mismatches
          </h3>
          <p className="mt-0.5 text-slate-500 text-[11px]">
            Extracts facts across documents, performs deterministic value & temporal comparisons, and traces contradictions to source evidence without assuming fraud.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3 py-1.5 font-medium text-white shadow-sm hover:bg-[#0D655E] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Extracting Claims...' : 'Re-Run ChronoGraph'}
        </button>
      </div>

      {/* Discrepancy Integrity Notice */}
      <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Statutory Discrepancy Policy:</strong> A detected cross-document value mismatch or temporal lapse indicates conflicting records or typographical variance. All contradictions display clickable source evidence for both assertions to facilitate physical scrutiny before any official finding.
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
        <div className="rounded border border-slate-100 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-400">Total Claims</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{claims.length}</div>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-400">Contradictions</div>
          <div className="text-base font-bold text-red-600 mt-0.5">{contradictions.length}</div>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-400">Value Mismatches</div>
          <div className="text-base font-bold text-amber-700 mt-0.5">
            {contradictions.filter((c) => c.relationType === 'VALUE_MISMATCH').length}
          </div>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-400">Temporal/Expired</div>
          <div className="text-base font-bold text-teal-800 mt-0.5">
            {contradictions.filter((c) => ['TEMPORAL_CONTRADICTION', 'STALE_EXPIRED'].includes(c.relationType)).length}
          </div>
        </div>
      </div>

      {/* Contradictions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-xs">
            Detected Cross-Document Inconsistencies ({filteredContradictions.length})
          </h4>
          <div className="flex gap-1 text-[10px] font-mono">
            {['ALL', 'VALUE_MISMATCH', 'TEMPORAL_CONTRADICTION', 'STALE_EXPIRED'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded px-2 py-0.5 ${
                  filterType === t
                    ? 'bg-[#0F766E] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filteredContradictions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#0F766E]" />
                Extracting and parsing document claims...
              </div>
            ) : (
              <div>
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">No active contradictions found for this application scope.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Re-Run ChronoGraph" to execute fresh cross-document claim parsing.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContradictions.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-red-200 bg-red-50/30 p-3.5 space-y-2.5 transition-all hover:bg-red-50/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        c.severity === 'Critical'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {c.severity}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                      Relation: {c.relationType}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Status: {c.status}</span>
                </div>

                <p className="text-slate-800 leading-relaxed font-sans">{c.explanation}</p>

                {/* Side-by-side Evidence Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {/* Source Assertion */}
                  <div className="rounded border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Evidence A (Source Document)</div>
                      <div className="font-bold text-slate-900 mt-0.5 line-clamp-1">{c.sourceEvidenceDocTitle}</div>
                      <div className="mt-1 text-slate-600">
                        Asserted Value: <strong className="text-slate-900">{c.sourceValueSummary}</strong>
                      </div>
                    </div>
                    {onNavigateToEvidence && c.sourceEvidencePage && (
                      <button
                        onClick={() => onNavigateToEvidence(c.sourceClaimId, c.sourceEvidencePage!)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#0F766E] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Inspect Page {c.sourceEvidencePage}
                      </button>
                    )}
                  </div>

                  {/* Target Assertion */}
                  <div className="rounded border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Evidence B (Conflicting Counterpart)</div>
                      <div className="font-bold text-slate-900 mt-0.5 line-clamp-1">{c.targetEvidenceDocTitle}</div>
                      <div className="mt-1 text-slate-600">
                        Counter Value: <strong className="text-slate-900">{c.targetValueSummary}</strong>
                      </div>
                    </div>
                    {onNavigateToEvidence && c.targetEvidencePage && (
                      <button
                        onClick={() => onNavigateToEvidence(c.targetClaimId, c.targetEvidencePage!)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#0F766E] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Inspect Page {c.targetEvidencePage}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim Inventory Table */}
      {claims.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-xs">
              Extracted Claim Inventory ({claims.length} claims across application documents)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-48 border border-slate-200 rounded">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-2">Claim Key</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Normalized Value</th>
                  <th className="p-2">Document</th>
                  <th className="p-2">Page</th>
                  <th className="p-2">Confidence</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {claims.map((cl) => (
                  <tr key={cl.id} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold text-slate-900">{cl.claimKey}</td>
                    <td className="p-2 text-slate-600">{cl.claimType}</td>
                    <td className="p-2 font-bold text-[#0F766E]">{cl.normalizedValue}</td>
                    <td className="p-2 text-slate-700 truncate max-w-[140px]">{cl.documentTitle || cl.documentId}</td>
                    <td className="p-2 text-slate-600">P.{cl.pageNumber}</td>
                    <td className="p-2 text-slate-600">{(cl.confidence * 100).toFixed(0)}%</td>
                    <td className="p-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                        {cl.reviewStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
