import React, { useState } from 'react';
import { api } from '../../lib/api-client';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Info,
  ShieldAlert,
  FileText,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface FixPreviewSandboxProps {
  findingId: string;
  findingTitle: string;
  fieldKey?: string;
  extractedValue?: string;
  expectedValue?: string;
}

export const FixPreviewSandbox: React.FC<FixPreviewSandboxProps> = ({
  findingId,
  findingTitle,
  fieldKey,
  extractedValue,
  expectedValue,
}) => {
  const [proposedValue, setProposedValue] = useState<string>(expectedValue || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  const handleSimulate = async () => {
    if (!proposedValue.trim()) {
      toast.error('Enter a proposed value to test hypothetical fix.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.simulateFixPreview(findingId, fieldKey || 'field_correction', proposedValue.trim());
      setPreviewResult(res);
      toast.info(`FixPreview outcome: ${res.hypotheticalStatus}. Records kept unmodified.`);
    } catch (err: any) {
      toast.error(`FixPreview error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-4 text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-teal-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <FlaskConical className="h-4 w-4 text-[#0F766E]" />
          <span>FixPreview — Counterfactual Correction Sandbox (Feature 4)</span>
        </div>
        <span className="rounded bg-teal-100 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-800">
          Hypothetical Simulator
        </span>
      </div>

      <p className="text-[11px] text-slate-600">
        Test hypothetical field values and inspect compliance outcomes prior to official resubmission.
      </p>

      {/* Hypothetical Non-Destructive Protection Banner */}
      <div className="rounded bg-white/80 border border-teal-200 p-2 text-[10px] text-slate-700 flex items-start gap-1.5 font-mono">
        <Lock className="h-3.5 w-3.5 text-[#0F766E] shrink-0 mt-0.5" />
        <span>
          <strong>NON-DESTRUCTIVE SANDBOX:</strong> Values entered below do NOT alter extracted evidence, modify official records, or resolve production findings. Real replacement uploads and scrutiny are strictly required.
        </span>
      </div>

      {/* Current vs Proposed Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="rounded border border-slate-200 bg-white p-2">
          <span className="text-[10px] text-slate-400">Current Extracted Value</span>
          <div className="font-bold text-slate-800 mt-0.5">{extractedValue || 'None recorded'}</div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2">
          <span className="text-[10px] text-slate-400">Statutory Norm Target</span>
          <div className="font-bold text-[#0F766E] mt-0.5">{expectedValue || 'Statutory requirement'}</div>
        </div>
      </div>

      {/* Proposed Correction Form */}
      <div className="space-y-1.5">
        <label className="block font-bold text-slate-800 text-[11px]">
          Hypothetical Proposed Correction:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            placeholder="e.g. 2027-06-30 or 2.50 Acres (10,117 sq.m)"
            className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
          />
          <button
            type="button"
            onClick={handleSimulate}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded bg-[#0F766E] px-3 py-1.5 font-semibold text-white shadow-xs hover:bg-[#0d645d] disabled:opacity-50"
          >
            <Play className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Simulating...' : 'Test Counterfactual'}
          </button>
        </div>
      </div>

      {/* Simulation Result Card */}
      {previewResult && (
        <div className="mt-3 rounded border border-slate-200 bg-white p-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-slate-800">Hypothetical Evaluation Outcome:</span>
            <span
              className={`rounded px-2 py-0.5 font-bold text-[10px] ${
                previewResult.hypotheticalStatus === 'Would Resolve'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : previewResult.hypotheticalStatus === 'Partially Resolved'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {previewResult.hypotheticalStatus}
            </span>
          </div>

          <p className="text-slate-800 font-sans leading-relaxed">
            {previewResult.previewOutcomeSummary}
          </p>

          {previewResult.remainingConflicts?.length > 0 && (
            <div className="rounded bg-red-50 p-2 text-red-900 border border-red-200">
              <div className="font-bold">Remaining Conflicts Flagged:</div>
              <ul className="list-disc pl-4 mt-0.5 font-mono text-[10px]">
                {previewResult.remainingConflicts.map((c: string, idx: number) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded bg-slate-50 p-2 text-slate-700 border border-slate-200 font-sans">
            <strong>Required Statutory Evidence for Official Resubmission:</strong>
            <p className="mt-0.5 text-[10px] text-slate-600">{previewResult.requiredEvidenceGuidance}</p>
          </div>
        </div>
      )}
    </div>
  );
};
