import React, { useState } from 'react';
import { api } from '../../lib/api-client';
import {
  GitCompare,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Lock,
  Layers,
  Send,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';

interface RuleReplayViewProps {
  sourceRulesetCode: string;
  targetRulesetCode: string;
  userRole: string;
}

export const RuleReplayView: React.FC<RuleReplayViewProps> = ({
  sourceRulesetCode,
  targetRulesetCode,
  userRole,
}) => {
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [replayResult, setReplayResult] = useState<any | null>(null);
  const [approvalNote, setApprovalNote] = useState<string>(
    'Reviewed shadow evaluation impact across applications. Approved for formal regulatory publication.'
  );
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const handleRunComparison = async () => {
    setIsComparing(true);
    try {
      const res = await api.compareRegulations(sourceRulesetCode, targetRulesetCode);
      setComparisonResult(res.comparison);
      toast.success(
        `Ruleset diff complete: ${res.comparison.changedClausesCount} modified, ${res.comparison.addedClausesCount} added, ${res.comparison.removedClausesCount} removed provisions.`
      );
    } catch (err: any) {
      toast.error(`Ruleset comparison failed: ${err.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleRunShadowReplay = async () => {
    setIsReplaying(true);
    try {
      const res = await api.replayRegulations('v2.0', targetRulesetCode);
      setReplayResult(res.impactReport);
      toast.success(
        `Shadow Replay complete: ${res.impactReport.totalApplicationsImpacted}/${res.impactReport.totalApplicationsTested} applications impacted. Production records preserved.`
      );
    } catch (err: any) {
      toast.error(`Shadow replay failed: ${err.message}`);
    } finally {
      setIsReplaying(false);
    }
  };

  const handlePublishRuleset = async () => {
    if (userRole !== 'regulatory_system_administrator') {
      toast.error('Only Regulatory System Administrators can publish changes.');
      return;
    }
    if (!replayResult) {
      toast.error('Execute Shadow Replay simulation before authorized publication.');
      return;
    }
    setIsPublishing(true);
    try {
      const res = await api.publishImpactReport(replayResult.id, approvalNote);
      setReplayResult((prev: any) => (prev ? { ...prev, ...res.report, isPublished: true, isDraft: false } : prev));
      toast.success('Regulatory edition formally published! Impact report signed off and audit trail persisted.');
    } catch (err: any) {
      toast.error(`Publishing failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-purple-700 font-bold">
              Feature 2 · RuleReplay
            </span>
            <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
              Regulatory Change Impact Simulator
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Ruleset Version Comparison & Shadow-Mode Impact Assessment
          </h3>
          <p className="mt-0.5 text-slate-500 text-[11px]">
            Simulates regulatory amendments against stored institution evidence without altering live application records until authorized review and sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunComparison}
            disabled={isComparing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <GitCompare className={`h-3.5 w-3.5 text-purple-700 ${isComparing ? 'animate-spin' : ''}`} />
            {isComparing ? 'Comparing...' : 'Compare Clauses'}
          </button>

          <button
            onClick={handleRunShadowReplay}
            disabled={isReplaying}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-700 px-3.5 py-1.5 font-medium text-white shadow-sm hover:bg-purple-800 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${isReplaying ? 'animate-pulse' : ''}`} />
            {isReplaying ? 'Replaying in Shadow Mode...' : 'Run Shadow Replay'}
          </button>
        </div>
      </div>

      {/* Epistemic Trust Banner */}
      <div className="rounded border border-purple-200 bg-purple-50/40 p-2.5 text-[11px] text-purple-900 flex items-start gap-2">
        <Lock className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <strong>Statutory Shadow Protection:</strong> RuleReplay executes strictly in shadow mode against persistent evidence. It will never automatically alter production approval decisions or enforce unreviewed LLM interpretations. Authorized administrative review is mandatory.
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 text-xs">
              Clause-by-Clause Differences ({sourceRulesetCode} vs {targetRulesetCode})
            </span>
            <div className="flex gap-2 font-mono text-[10px]">
              <span className="text-amber-700 font-bold">{comparisonResult.changedClausesCount} Modified</span>
              <span className="text-emerald-700 font-bold">{comparisonResult.addedClausesCount} Added</span>
              <span className="text-slate-500 font-bold">{comparisonResult.removedClausesCount} Removed</span>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {comparisonResult.diffs?.map((d: any, idx: number) => (
              <div key={idx} className="rounded border border-slate-200 bg-white p-2.5 space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-purple-800">{d.clauseNumber}: {d.title}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold uppercase text-slate-700">{d.changeType}</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  <strong>Impact:</strong> {d.impactSummary}
                </div>
                {d.oldText && d.newText && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-600">
                    <div className="p-1.5 rounded bg-red-50 border border-red-200 line-clamp-2">Old: {d.oldText}</div>
                    <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 line-clamp-2">New: {d.newText}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shadow Replay Impact Report */}
      {replayResult && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">Impact Assessment Report</span>
              <h4 className="font-bold text-slate-900 text-xs mt-0.5">{replayResult.reportTitle}</h4>
            </div>
            <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800">
              Shadow Complete (Unpublished)
            </span>
          </div>

          {/* Metric KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="rounded border border-slate-200 bg-slate-50 p-2">
              <div className="text-[10px] text-slate-400">Applications Tested</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">{replayResult.totalApplicationsTested}</div>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 p-2">
              <div className="text-[10px] text-amber-700">Impacted Applications</div>
              <div className="text-base font-bold text-amber-800 mt-0.5">{replayResult.totalApplicationsImpacted}</div>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-2">
              <div className="text-[10px] text-red-700">New Critical Deficiencies</div>
              <div className="text-base font-bold text-red-800 mt-0.5">+{replayResult.criticalFindingsDelta}</div>
            </div>
            <div className="rounded border border-purple-200 bg-purple-50 p-2">
              <div className="text-[10px] text-purple-700">Major Findings Delta</div>
              <div className="text-base font-bold text-purple-800 mt-0.5">+{replayResult.majorFindingsDelta}</div>
            </div>
          </div>

          {/* Impacted Applications Detail List */}
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800 text-xs">Simulated Outcome Shifts Across Applications:</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {replayResult.impactedApplications?.map((ia: any) => (
                <div key={ia.applicationId} className="rounded border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ia.applicationCode} · {ia.programName}</span>
                    <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                      {ia.outcomeChanged ? 'Outcome Flip' : 'Findings Delta'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div>Current Baseline: <strong className="text-slate-700">{ia.currentOutcome}</strong></div>
                    <div>Shadow Outcome: <strong className="text-purple-700">{ia.shadowOutcome}</strong></div>
                  </div>
                  <div className="text-[10px] text-slate-600 font-sans">
                    <strong>Remediation:</strong> {ia.remediationRequired}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-publication Remediation Tasks */}
          {replayResult.remediationTasks?.length > 0 && (
            <div className="rounded border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
              <h5 className="font-bold text-slate-800 text-xs">Automated Pre-publication Remediation Advisory:</h5>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                {replayResult.remediationTasks.map((t: any, idx: number) => (
                  <li key={idx}>
                    <strong>[{t.applicationCode}]</strong> {t.taskTitle} — {t.suggestedAction}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Authorized Administrative Publication */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs">
                Authorized Administrator Sign-Off & Official Publication
              </label>
              {userRole !== 'regulatory_system_administrator' && (
                <span className="text-[10px] font-mono text-red-600">
                  (Requires Regulatory System Administrator Role)
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              disabled={userRole !== 'regulatory_system_administrator'}
              className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs font-mono"
            />
            <button
              onClick={handlePublishRuleset}
              disabled={isPublishing || userRole !== 'regulatory_system_administrator'}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 font-semibold text-white shadow hover:bg-[#0D655E] disabled:opacity-40"
            >
              <FileCheck2 className="h-4 w-4" />
              {isPublishing ? 'Publishing...' : 'Authorize & Formally Publish Ruleset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
