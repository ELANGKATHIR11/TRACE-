import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { ROLE_PERMISSIONS, WORKFLOW_STAGES_ORDERED } from '../../lib/permissions';
import {
  Users,
  Sliders,
  Settings,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';

export const AdministrationPage: React.FC = () => {
  const { state, switchDemoUserRole, setEngineMode, resetDemoDataset } = useTraceStore();
  const location = useLocation();

  const initialTab = location.pathname.includes('rules-config')
    ? 'rules'
    : location.pathname.includes('settings')
    ? 'settings'
    : 'users';

  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'settings'>(initialTab);
  const [slaDays, setSlaDays] = useState<number>(21);
  const [escalationHours, setEscalationHours] = useState<number>(48);
  const [inAppAlertsEnabled, setInAppAlertsEnabled] = useState<boolean>(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">SYSTEM ADMINISTRATION & RBAC GOVERNANCE</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Users & 5 Roles, Rule Configuration & Backend Contract Settings
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Manage the 5 RBAC personas, workflow SLA thresholds, and inspect the integrated Express/FastAPI backend contract.
          </p>
        </div>

        <button
          onClick={resetDemoDataset}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All Demo Data to Baseline
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-[#0F766E]" />
          Users & 5 RBAC Roles
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium ${
            activeTab === 'rules' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <Sliders className="h-3.5 w-3.5 text-[#0F766E]" />
          Workflow & Rule Configuration
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium ${
            activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <Settings className="h-3.5 w-3.5 text-[#0F766E]" />
          System Settings & API Contract
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-slate-800">
            <strong>Demonstration Role Switcher Disclosure (Screen M Mandate):</strong> Switching roles below or in the top bar is an explicitly labelled demonstration facility for SIH evaluation. In production deployment, role authorization is enforced strictly via backend session tokens.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.users.map((u) => {
              const isCurrent = state.currentUser.id === u.id;
              const perms = ROLE_PERMISSIONS[u.role];
              return (
                <div
                  key={u.id}
                  className={`rounded-lg border bg-white p-4 text-xs space-y-3 ${
                    isCurrent
                      ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0F766E]">{u.badgeCode}</span>
                    {isCurrent ? (
                      <span className="font-semibold text-emerald-700">Active Session Role</span>
                    ) : (
                      <button
                        onClick={() => switchDemoUserRole(u.id)}
                        className="rounded bg-[#101B2D] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                      >
                        Switch to Demo Role
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{u.name}</div>
                    <div className="font-semibold text-slate-700">{u.roleLabel}</div>
                    <div className="text-slate-500 mt-0.5">{u.organization}</div>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{u.permissionsDescription}</p>
                  <div className="border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-500">
                    Can Upload Docs: {perms.canUploadRemediationDocument ? 'YES' : 'NO'} · Can Resolve Findings:{' '}
                    {perms.canResolveFinding ? 'YES' : 'NO'} · Read-Only:{' '}
                    {perms.isReadOnlyAuditor ? 'YES' : 'NO'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4 text-xs">
          <h2 className="text-base font-bold text-slate-900">
            Configurable Internal Workflow Stages & Escalation Thresholds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Application Scrutiny SLA Window (Days)
              </label>
              <input
                type="number"
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Overdue Task Level-1 Escalation Trigger (Hours Past Due)
              </label>
              <input
                type="number"
                value={escalationHours}
                onChange={(e) => setEscalationHours(Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-700 mb-2">
              Configured 8-Stage Internal Workflow Sequence:
            </div>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_STAGES_ORDERED.map((stg, idx) => (
                <span
                  key={stg}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px]"
                >
                  0{idx + 1}. {stg}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => toast.success('Saved workflow & SLA configuration preferences.')}
            className="rounded bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d]"
          >
            Save Workflow Configuration
          </button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Execution Engine & Notification Preferences
            </h2>
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Active Copilot & Document Validation Engine Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEngineMode('demo')}
                  className={`rounded border px-3 py-2 font-medium ${
                    state.engineMode === 'demo'
                      ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  Deterministic Statutory Rules & RAG (100% Offline)
                </button>
                <button
                  onClick={() => setEngineMode('live_ai')}
                  className={`rounded border px-3 py-2 font-medium ${
                    state.engineMode === 'live_ai'
                      ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  Local Offline AI Mode (Ollama / Qwen2.5 100% Offline)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span>Enable Real-Time In-App Compliance Alerts</span>
              <input
                type="checkbox"
                checked={inAppAlertsEnabled}
                onChange={(e) => setInAppAlertsEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#0F766E]"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-[#0F766E]" />
              100% Offline Backend & Hardware Architecture
            </h2>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5">
                <div className="font-bold text-emerald-900">
                  [100% OFFLINE] GET /api/health
                </div>
                <div className="text-slate-600">
                  Native PostgreSQL (Port 5433) + Miniconda dgpu-core GPU status check
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5">
                <div className="font-bold text-emerald-900">
                  [100% OFFLINE] POST /api/copilot/query
                </div>
                <div className="text-slate-600">
                  Local Ollama (Qwen2.5) & Statutory PostgreSQL RAG 4-tier epistemic copilot
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5">
                <div className="font-bold text-emerald-900">
                  [100% OFFLINE] POST /api/documents/upload & /validate
                </div>
                <div className="text-slate-600">
                  Miniconda dgpu-core GPU OCR (RTX 5060 + EasyOCR) & deterministic clause validation
                </div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <div className="font-bold text-slate-800">
                  [SECURE ISOLATION] Air-Gapped GovTech Deployment
                </div>
                <div className="text-slate-600">
                  Zero external cloud calls, zero Google/Gemini dependencies, all evidence and models remain strictly on local premises.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
