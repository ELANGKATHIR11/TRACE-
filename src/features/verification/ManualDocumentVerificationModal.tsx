import React, { useState } from 'react';
import { api } from '../../lib/api-client';
import { useTraceStore } from '../../lib/store';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Cpu,
  Clock,
  Sparkles,
  ShieldCheck,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export const ManualDocumentVerificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { state, refreshState } = useTraceStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clauseId, setClauseId] = useState<string>('APH-2026-CL-4.2.b');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setVerificationResult(null);
    }
  };

  const handleVerify = async () => {
    if (!selectedFile) {
      toast.error('Please select a file from your system to verify.');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clauseId', clauseId);

      const result = await api.verifyManualFile(formData);
      setVerificationResult(result);
      if (result.passed) {
        toast.success(`Verification Passed: ${result.summary}`);
      } else {
        toast.warning(`Deficiency Detected: ${result.summary}`);
      }
    } catch (err: any) {
      toast.error(`Verification failed: ${err.message || 'Error executing OCR verification'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 rounded-lg text-[#0F766E] border border-teal-200">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Manual Document Verification & Screening Engine
              </h2>
              <p className="text-xs text-slate-500">
                Input any file directly from your local disk for GPU-accelerated OCR extraction & deterministic AICTE rules verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* File Picker Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              1. Select File from Local System
            </label>
            <label
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <Upload className={`h-8 w-8 mb-2 ${selectedFile ? 'text-emerald-600' : 'text-[#0F766E]'}`} />
              <span className="text-sm font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Click to Browse File or Drag & Drop Here'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                {selectedFile
                  ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB · Ready for parsing`
                  : 'Supported formats: PDF, PNG, JPG, JPEG, TIFF (Max 25 MB)'}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          {/* Verification Target Clause */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                2. Regulatory Rule Clause to Verify Against
              </label>
              <select
                value={clauseId}
                onChange={(e) => setClauseId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 font-mono shadow-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="APH-2026-CL-4.2.b">
                  APH-2026-CL-4.2.b (Handover / Cutoff Date &lt;= 30-Jun-2026)
                </option>
                <option value="APH-2026-CL-4.1.a">
                  APH-2026-CL-4.1.a (Structural Stability & Built-Up Area)
                </option>
                <option value="APH-2026-CL-3.1">
                  APH-2026-CL-3.1 (Approved Intake & Faculty Ratio Verification)
                </option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleVerify}
                disabled={!selectedFile || isVerifying}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0d645d] disabled:opacity-50 transition-colors"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing via Python OCR & Rules Engine...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    <span>Run Verification Check</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Results Panel */}
          {verificationResult && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-xs animate-in fade-in">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {verificationResult.passed ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Verification Check Passed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-700 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Deficiency / Mismatch Detected</span>
                    </div>
                  )}
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Engine: {verificationResult.ocrEngine}
                </span>
              </div>

              {/* Summary Banner */}
              <div
                className={`p-3 rounded-lg border font-medium ${
                  verificationResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {verificationResult.summary}
              </div>

              {/* Extracted Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Total Pages</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {verificationResult.totalPages}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">File SHA-256</div>
                  <div className="font-mono text-[10px] text-slate-700 mt-0.5 truncate" title={verificationResult.sha256}>
                    {verificationResult.sha256.slice(0, 12)}...
                  </div>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Integrity Screening</div>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {verificationResult.integrityScreening}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Extracted Fields</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {verificationResult.extractedFields?.length || 0}
                  </div>
                </div>
              </div>

              {/* Detailed Extracted Fields */}
              {verificationResult.extractedFields?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800">Extracted Clause Fields:</div>
                  <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                    {verificationResult.extractedFields.map((field: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{field.label}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Key: {field.key} · Confidence: {field.ocrConfidence}%
                          </div>
                        </div>
                        <div className="font-mono font-bold text-[#0F766E] text-xs">
                          {field.extractedValue}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              {verificationResult.findings?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-red-800">Triggered Findings:</div>
                  <div className="space-y-2">
                    {verificationResult.findings.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-red-200 bg-red-50/50 space-y-1"
                      >
                        <div className="font-bold text-red-900">{f.title}</div>
                        <div className="text-slate-700">{f.note}</div>
                        <div className="font-mono text-[11px] text-slate-600">
                          Extracted: <strong>{f.extractedValue}</strong> | Expected:{' '}
                          <strong>{f.expectedValue}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 rounded-b-xl text-xs">
          <span className="text-slate-500">
            Supports AICTE APH 2026-27 automated document compliance verification
          </span>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
