import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  Bot,
  Send,
  Scale,
  AlertTriangle,
  Sparkles,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  Lock,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What requirements still need evidence for this application?',
  'Why is DOC-2026-101 flagged for a cross-document mismatch despite 98.4% OCR confidence?',
  'What changed between APH 2026-27 v2.0 and v2.1-Draft for Clause 4.2.b?',
  'Can high OCR confidence or a matching registration number prove a certificate is genuine?',
];

export const RegulatoryCopilotPage: React.FC = () => {
  const { state, sendCopilotQuery, setEngineMode, openFindingDrawer } = useTraceStore();
  const navigate = useNavigate();

  const [selectedAppId, setSelectedAppId] = useState<string>(state.applications[0].id);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const handleAsk = async (qText: string) => {
    const query = qText.trim();
    if (!query) return;
    setQuestionInput('');
    setErrorState(null);
    setIsLoading(true);
    try {
      await sendCopilotQuery(query, selectedAppId);
    } catch (err: any) {
      setErrorState(
        err?.message ||
          'Local Offline AI endpoint failed. Never silently substituting synthetic results—please retry or switch to Offline Rules & RAG.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>CITATION-FIRST REGULATORY COPILOT</span>
            <span>·</span>
            <span className="font-mono text-[#0F766E]">
              4-TIER EPISTEMIC GROUNDING
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Source-Grounded Regulatory & Evidence Assistant
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Every response strictly separates directly supported regulatory clauses, system-computed findings, AI suggestions, and uncertainty warnings.
          </p>
        </div>

        {/* Context Selector */}
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700">Application Context:</label>
          <select
            aria-label="Select Application Context for Copilot"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
          >
            {state.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.institutionName.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Untrusted Document Data Security Notice (Screen G Requirement) */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#0F766E] shrink-0" />
          <span>
            <strong>Untrusted Document Isolation Active:</strong> OCR text extracted from uploaded certificates is sand-boxed as passive evidence data and cannot override regulatory rules, role permissions, or system policies.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">
          Rule Context: {state.ruleSets[0].code}
        </span>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Suggested Queries:</span>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            disabled={isLoading}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:border-[#0F766E] hover:bg-teal-50/40 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Explicit Error & Retry State if Local Offline AI fails */}
      {errorState && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-amber-800">
              Local Offline AI Query Exception
            </div>
            <p className="mt-0.5 text-amber-700">{errorState}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEngineMode('demo')}
              className="rounded bg-white border border-amber-300 px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100"
            >
              Switch to Offline Rules & RAG
            </button>
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 max-h-[540px] overflow-y-auto">
        {state.copilotHistory.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-4 text-xs ${
              msg.role === 'user'
                ? 'border-slate-200 bg-slate-50 ml-auto max-w-2xl'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
              <span className="font-bold text-slate-800">
                {msg.role === 'user'
                  ? `${state.currentUser.name} (${state.currentUser.roleLabel})`
                  : 'TRACE Regulatory Copilot'}
              </span>
              <span>
                Mode: {msg.executionMode === 'live_ai' ? 'Local Offline AI' : 'Offline Rules & RAG'} ·{' '}
                {msg.ruleVersionContext}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-900 leading-relaxed">{msg.content}</p>

            {/* 4-Tier Epistemic Structured Breakdown */}
            {msg.structuredResponse && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                {/* Tier 1: Directly Supported Regulatory Statements */}
                <div className="rounded border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-[#0F766E]" />
                    1. Directly Supported Regulatory Statements
                  </div>
                  {msg.structuredResponse.directlySupportedStatements.map((st, idx) => (
                    <div key={idx} className="rounded bg-white p-2 border border-slate-200/80">
                      <p className="text-slate-800">{st.statement}</p>
                      <button
                        onClick={() =>
                          navigate(`/rules?clause=${encodeURIComponent(st.clauseId)}`)
                        }
                        className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#0F766E] hover:underline"
                      >
                        Citation: {st.clauseId} ({st.ruleVersion}, {st.sourcePage})
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tier 2: System-Computed Findings */}
                <div className="rounded border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-[#0F766E]" />
                    2. System-Computed Findings
                  </div>
                  <ul className="space-y-1.5 text-slate-800">
                    {msg.structuredResponse.systemComputedFindings.map((fText, idx) => (
                      <li key={idx} className="rounded bg-white p-2 border border-slate-200/80">
                        {fText}
                        {fText.includes('FND-2026-001') && (
                          <button
                            onClick={() => openFindingDrawer('FND-2026-001')}
                            className="ml-2 font-mono text-[11px] font-semibold text-[#0F766E] hover:underline"
                          >
                            [Inspect FND-2026-001]
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tier 3: Explanatory AI Suggestions */}
                <div className="rounded border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
                    3. Explanatory AI-Generated Suggestions
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {msg.structuredResponse.explanatorySuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Tier 4: Unverified or Unavailable Information (Uncertainty Warnings) */}
                <div className="rounded border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    4. Epistemic Uncertainty & Unverified Warnings
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-800">
                    {msg.structuredResponse.uncertaintyWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(questionInput);
        }}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-2"
      >
        <input
          type="text"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          placeholder="Ask a regulatory compliance or evidence question grounded in APH 2026-27 clauses..."
          className="flex-1 px-3 py-2 text-xs text-slate-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {isLoading ? 'Analyzing...' : 'Ask Copilot'}
        </button>
      </form>
    </div>
  );
};
