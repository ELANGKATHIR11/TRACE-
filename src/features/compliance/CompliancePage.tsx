import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  ShieldCheck,
  BookOpen,
  Bot,
  X,
  Sparkles,
  Send,
  Scale,
  AlertTriangle,
  ArrowUpRight,
  GitCompare,
} from 'lucide-react';
import { ComplianceCenterPage } from './ComplianceCenterPage';
import { RegulatoryRulebookPage } from '../rules/RegulatoryRulebookPage';

const SUGGESTED_COPILOT_QUESTIONS = [
  'What requirements still need evidence for this application?',
  'Why is DOC-2026-101 flagged for a cross-document mismatch despite 98.4% OCR confidence?',
  'What changed between APH 2026-27 v2.0 and v2.1-Draft for Clause 4.2.b?',
  'Can high OCR confidence or a matching registration number prove a certificate is genuine?',
];

export const CompliancePage: React.FC = () => {
  const { state, sendCopilotQuery, openFindingDrawer } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'rules' ? 'rules' : 'matrix';
  const isCopilotRequested = searchParams.get('copilot') === 'open' || tabParam === 'copilot';

  const [copilotOpen, setCopilotOpen] = useState<boolean>(isCopilotRequested);
  const [selectedAppId, setSelectedAppId] = useState<string>(state.applications[0]?.id || '');
  const [copilotInput, setCopilotInput] = useState<string>('');
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const setTab = (tab: 'matrix' | 'rules') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const toggleCopilot = () => {
    const next = !copilotOpen;
    setCopilotOpen(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('copilot', 'open');
    } else {
      nextParams.delete('copilot');
      if (nextParams.get('tab') === 'copilot') {
        nextParams.set('tab', 'matrix');
      }
    }
    setSearchParams(nextParams);
  };

  const handleAskCopilot = async (qText: string) => {
    const query = qText.trim();
    if (!query) return;
    setCopilotInput('');
    setCopilotError(null);
    setIsCopilotLoading(true);
    try {
      await sendCopilotQuery(query, selectedAppId || state.applications[0]?.id);
    } catch (err: any) {
      setCopilotError(
        err?.message ||
          'Local AI inference endpoint failed. Please retry or verify offline engine service.'
      );
    } finally {
      setIsCopilotLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs w-fit">
          <button
            onClick={() => setTab('matrix')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Requirement Matrix & Obligations</span>
          </button>
          <button
            onClick={() => setTab('rules')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Regulatory Rulebook & Version Governance</span>
          </button>
        </div>

        {/* Embedded Copilot Side Panel Toggle */}
        <button
          onClick={toggleCopilot}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            copilotOpen
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'border border-teal-700/40 bg-teal-50 text-[#0F766E] hover:bg-teal-100'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>{copilotOpen ? 'Close Regulatory Copilot' : 'Open Regulatory Copilot'}</span>
          <span className="rounded bg-teal-900/20 px-1 py-0.2 text-[10px] font-mono">
            4-Tier Citations
          </span>
        </button>
      </div>

      {/* Main Content Area: Tab view + Sliding Copilot Panel */}
      <div className="relative">
        <div className={copilotOpen ? 'mr-0 xl:mr-[420px] transition-all' : 'transition-all'}>
          {activeTab === 'matrix' ? (
            <ComplianceCenterPage />
          ) : (
            <RegulatoryRulebookPage />
          )}
        </div>

        {/* Embedded Side Panel: Source-Grounded Question Answering */}
        {copilotOpen && (
          <aside
            className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-xl flex flex-col pt-16"
            aria-label="Embedded Regulatory Copilot Panel"
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-teal-300">
                  <Bot className="h-4 w-4" />
                  <span>CITATION-FIRST REGULATORY COPILOT</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Source-Grounded Regulatory Q&A
                </h3>
              </div>
              <button
                onClick={toggleCopilot}
                className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close Copilot Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scope / Application Selector */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs flex items-center justify-between gap-2">
              <span className="text-slate-600 font-medium">Grounding Scope:</span>
              <select
                aria-label="Application Context Scope"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 max-w-[240px] truncate"
              >
                {state.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.programName.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Grounding Disclosure Banner */}
              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-[#0F766E] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Deterministic 4-Tier Epistemic Grounding</span>
                </div>
                <p>
                  Every response cites exact AICTE Approval Process Handbook (APH) edition, statutory clause, extracted evidence value, and human reviewer decision.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Questions
                </div>
                {SUGGESTED_COPILOT_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskCopilot(q)}
                    className="w-full text-left rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-700 hover:bg-teal-50/50 hover:border-teal-300 transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>

              {/* Query History */}
              {state.copilotHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg border p-3.5 space-y-2 text-xs ${
                    msg.role === 'user'
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="font-bold text-slate-800">
                      {msg.role === 'user' ? 'YOU' : 'TRACE REGULATORY COPILOT'}
                    </span>
                    <span>{msg.executionMode === 'live_ai' ? 'Local AI' : 'Deterministic RAG'}</span>
                  </div>

                  <div className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Grounding Citations */}
                  {msg.structuredResponse?.directlySupportedStatements &&
                    msg.structuredResponse.directlySupportedStatements.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Grounding Citations ({msg.structuredResponse.directlySupportedStatements.length}):
                        </div>
                        {msg.structuredResponse.directlySupportedStatements.map((st, sIdx) => (
                          <div
                            key={sIdx}
                            className="rounded bg-slate-50 p-2 border border-slate-200 text-[11px]"
                          >
                            <div className="flex items-center justify-between font-mono text-[#0F766E] font-bold">
                              <span>Clause {st.clauseId}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {st.ruleVersion} · {st.sourcePage}
                              </span>
                            </div>
                            <div className="mt-0.5 text-slate-700 italic">"{st.statement}"</div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {isCopilotLoading && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-teal-200 bg-teal-50/50 text-xs text-[#0F766E]">
                  <div className="h-3.5 w-3.5 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
                  <span>Grounding against regulatory clauses and extracted evidence...</span>
                </div>
              )}

              {copilotError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                  {copilotError}
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskCopilot(copilotInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  placeholder="Ask any statutory clause or evidence question..."
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                />
                <button
                  type="submit"
                  disabled={!copilotInput.trim() || isCopilotLoading}
                  className="rounded-md bg-[#0F766E] px-3 py-2 text-white hover:bg-[#0d645d] disabled:opacity-50"
                  aria-label="Send Query"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
