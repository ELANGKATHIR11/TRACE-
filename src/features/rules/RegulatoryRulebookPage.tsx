import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { getPermissions } from '../../lib/permissions';
import {
  BookOpen,
  CheckCircle2,
  GitCompare,
  ShieldAlert,
  Lock,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { RuleReplayView } from './RuleReplayView';

export const RegulatoryRulebookPage: React.FC = () => {
  const { state, publishRuleSetVersion } = useTraceStore();
  const [searchParams] = useSearchParams();
  const highlightedClause = searchParams.get('clause') || '';

  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string>(state.ruleSets[0]?.id || '');
  const [showDiffComparison, setShowDiffComparison] = useState<boolean>(true);
  const [approvalNote, setApprovalNote] = useState<string>(
    'Reviewed clause diffs and impact analysis for AY 2026-27.'
  );

  const activeRuleSet =
    state.ruleSets.find((r) => r.id === selectedRuleSetId) || state.ruleSets[0] || null;
  const perms = getPermissions(state.currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            REGULATORY RULEBOOK & VERSION GOVERNANCE
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Source Handbooks, Versioned Clauses & Change Comparison
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Explicitly separates published regulatory rules from draft interpretations and official scrutiny decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiffComparison((d) => !d)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            <GitCompare className="h-3.5 w-3.5 text-[#0F766E]" />
            {showDiffComparison ? 'Hide Version Diffs' : 'Show Version Diffs'}
          </button>
        </div>
      </div>

      {/* Rule-Set Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.ruleSets.map((rs) => {
          const isSelected = rs.id === activeRuleSet.id;
          return (
            <div
              key={rs.id}
              onClick={() => setSelectedRuleSetId(rs.id)}
              className={`cursor-pointer rounded-lg border p-4 text-xs transition-colors ${
                isSelected
                  ? 'border-[#0F766E] bg-white ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#0F766E]">
                  {rs.code} · Version {rs.version}
                </span>
                <span
                  className={`uppercase font-mono text-[11px] font-bold ${
                    rs.status === 'published'
                      ? 'text-emerald-700'
                      : rs.status === 'draft'
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  Status: {rs.status}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900">{rs.title}</div>
              <div className="mt-1 text-slate-600">
                Source: {rs.sourceDocument} · Effective: {rs.effectiveDate}
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Impacted Apps: {rs.impactedApplicationsCount}</span>
                <span>Impacted Obligations: {rs.impactedObligationsCount}</span>
                <span>Clauses: {rs.clauses.length}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RuleReplay Regulatory Change Simulator (Feature 2) */}
      {showDiffComparison && (
        <RuleReplayView
          sourceRulesetCode="APH-2025-V1"
          targetRulesetCode="APH-2026-V2"
          userRole={state.currentUser.role}
        />
      )}

      {/* Controlled Rule Publication Gate (for Draft Rule-Sets) */}
      {activeRuleSet.status === 'draft' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold text-amber-950 text-sm">
                Controlled Rule Publication Gate — {activeRuleSet.code} ({activeRuleSet.version})
              </div>
              <p className="mt-0.5 text-slate-700">
                Uploaded handbooks or LLM-extracted interpretations are never treated as active rules automatically. Only a <strong>Regulatory System Administrator</strong> may publish a rule-set version after review.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              className="flex-1 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs"
              placeholder="Enter publication approval note..."
            />
            <button
              onClick={() => publishRuleSetVersion(activeRuleSet.id, approvalNote)}
              disabled={!perms.canPublishRuleSet}
              className={`inline-flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-semibold ${
                perms.canPublishRuleSet
                  ? 'bg-[#0F766E] text-white hover:bg-[#0d645d]'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
              }`}
              title={
                perms.canPublishRuleSet
                  ? 'Publish this rule-set version'
                  : 'Switch to Regulatory System Administrator (Rajeshwari Nair) to publish rule-sets'
              }
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              {perms.canPublishRuleSet
                ? `Publish ${activeRuleSet.version} Now`
                : 'Switch to System Admin Role to Publish'}
            </button>
          </div>
        </div>
      )}

      {/* Clauses List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          Clauses in {activeRuleSet.code} ({activeRuleSet.clauses.length})
        </h2>

        {activeRuleSet.clauses.map((clause) => {
          const isHighlighted =
            highlightedClause &&
            (clause.id.toLowerCase().includes(highlightedClause.toLowerCase()) ||
              highlightedClause.toLowerCase().includes(clause.id.toLowerCase()));

          return (
            <div
              key={clause.id}
              className={`rounded-lg border bg-white p-4 text-xs space-y-2.5 ${
                isHighlighted
                  ? 'border-[#0F766E] ring-2 ring-[#14B8A6]/40'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#0F766E] text-sm">
                    {clause.id}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-slate-800">{clause.clauseNumber}</span>
                  <span>·</span>
                  <span className="text-slate-500">{clause.category}</span>
                </div>
                <span className="font-mono text-slate-500">
                  Source Reference: {clause.sourcePage}
                </span>
              </div>

              <div className="text-sm font-bold text-slate-900">{clause.title}</div>
              <p className="text-slate-700 leading-relaxed">{clause.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500">
                    APPLICABLE CATEGORIES
                  </div>
                  <div className="mt-1 font-medium text-slate-800">
                    {clause.applicableCategories.join(' · ')}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500">
                    REQUIRED SUPPORTING EVIDENCE
                  </div>
                  <div className="mt-1 font-medium text-slate-800">
                    {clause.requiredEvidence.join(' · ')}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500">
                    VALIDATION PREDICATE
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#0F766E]">
                    {clause.validationLogicSummary}
                  </div>
                </div>
              </div>

              {showDiffComparison && clause.changeDiffFromPrior && (
                <div className="mt-2 rounded border border-teal-200 bg-teal-50/50 p-3 text-xs">
                  <div className="font-semibold text-teal-950 flex items-center justify-between">
                    <span>
                      Version Diff vs {clause.changeDiffFromPrior.priorVersion}
                    </span>
                    <span className="font-mono text-[11px] text-[#0F766E]">
                      Change Type: {clause.changeDiffFromPrior.changeType}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-600">
                    <strong>Prior Text:</strong> "{clause.changeDiffFromPrior.priorText}"
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
