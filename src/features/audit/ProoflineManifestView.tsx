import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Link2,
  FileText,
  RefreshCw,
  Download,
  Fingerprint,
  Cpu,
  Layers,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProoflineManifestViewProps {
  applicationId: string;
}

export const ProoflineManifestView: React.FC<ProoflineManifestViewProps> = ({
  applicationId,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [manifest, setManifest] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  const loadManifest = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProvenanceManifest(applicationId);
      setManifest(res.manifest);
    } catch (err: any) {
      console.warn('Failed to load provenance manifest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadManifest();
    }
  }, [applicationId]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyProvenanceChain(applicationId);
      setVerificationResult(res);
      if (res.valid) {
        toast.success(`Proofline audit verified: Cryptographic chain length ${res.chainLength} intact with zero tampering.`);
      } else {
        toast.error(`Tampering flagged: ${(res as any).reason || res.message || 'Chain verification failed'}`);
      }
    } catch (err: any) {
      toast.error(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportManifest = () => {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proofline_Manifest_${manifest.assessmentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Validation manifest JSON exported.');
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
              Feature 6 · Proofline
            </span>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              Reproducible Validation Manifest & Lineage Chain
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Durable Tamper-Evident Assessment Manifest & Audit Chain
          </h3>
          <p className="mt-0.5 text-slate-500 text-[11px]">
            Records document hashes, claim provenance, pipeline versions, and evaluations in a hash-linked cryptographic chain of custody.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportManifest}
            disabled={!manifest}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Manifest
          </button>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying || !manifest}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Auditing Hash Chain...' : 'Verify Chain Integrity'}
          </button>
        </div>
      </div>

      {/* Trust Boundaries Notice */}
      <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700 flex items-start gap-2 font-mono">
        <Lock className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong>Trust Boundaries & Integrity Policy:</strong> Manifests are hash-linked sequentially (each manifest embeds the SHA-256 digest of its predecessor). Storage in PostgreSQL is secured via append-only triggers and RBAC permissions to guarantee tamper-detection without requiring blockchain overhead.
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-700 mb-1" />
          Loading validation manifest...
        </div>
      ) : manifest ? (
        <div className="space-y-4">
          {/* Verification Status Banner */}
          <div
            className={`rounded-lg border p-3 flex items-center justify-between font-mono text-[11px] ${
              verificationResult?.valid || manifest.verificationStatus === 'Valid Chain'
                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950'
                : 'border-red-300 bg-red-50 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Chain Integrity: {manifest.verificationStatus}</span>
            </div>
            <span className="text-[10px] text-slate-600">
              Signed by: {manifest.signedBy} · {new Date(manifest.signedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Cryptographic Hash-Linkage Card */}
          <div className="rounded border border-slate-200 bg-white p-3 font-mono text-[11px] space-y-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[10px]">
              <Link2 className="h-3.5 w-3.5 text-emerald-700" />
              Cryptographic Hash Pointers
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-[10px] text-slate-400">Current Manifest SHA-256</div>
                <div className="font-bold text-slate-900 mt-0.5 break-all text-[10px]">
                  {manifest.manifestHash}
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-[10px] text-slate-400">Previous Manifest Link (Parent)</div>
                <div className="font-bold text-slate-600 mt-0.5 break-all text-[10px]">
                  {manifest.previousManifestHash}
                </div>
              </div>
            </div>
          </div>

          {/* Document Hashes & Extractor Versions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Document Hashes */}
            <div className="rounded border border-slate-200 bg-white p-3 space-y-1.5 font-mono text-[11px]">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Fingerprint className="h-3.5 w-3.5 text-emerald-700" />
                Verified Document Fingerprints
              </div>
              <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                {manifest.documentHashes?.map((dh: any, idx: number) => (
                  <div key={idx} className="rounded bg-slate-50 p-1.5 border border-slate-100">
                    <div className="font-semibold text-slate-900 text-[10px] truncate">{dh.title} ({dh.version})</div>
                    <div className="text-[9px] text-slate-500 break-all">{dh.sha256}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline & Rule Environment */}
            <div className="rounded border border-slate-200 bg-white p-3 space-y-1.5 font-mono text-[11px]">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-emerald-700" />
                Pipeline Engine & Ruleset Environment
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Applicable Ruleset:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[160px]">{manifest.ruleVersionUsed}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">TRACE Core:</span>
                  <span className="font-semibold text-slate-800">{manifest.pipelineVersions?.traceCore}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">PyMuPDF / OCR:</span>
                  <span className="font-semibold text-slate-800">
                    {manifest.pipelineVersions?.pymupdf} · {manifest.pipelineVersions?.easyocr}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Hardware Target:</span>
                  <span className="font-semibold text-slate-800">CUDA {manifest.pipelineVersions?.pytorchCuda} GPU</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluated Rule Explanations */}
          <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
            <h5 className="font-bold text-slate-800 text-xs">Audited Rule Evaluations & Provenance Explanations:</h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {manifest.ruleEvaluations?.map((re: any, idx: number) => (
                <div key={idx} className="rounded border border-slate-100 bg-slate-50 p-2 font-mono text-[11px] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-800">{re.ruleClauseId}</span>
                    <span className="text-slate-600 font-sans ml-2">{re.explanation}</span>
                  </div>
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold shrink-0">
                    {re.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No completed validation manifest generated yet for {applicationId}.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Manifests are produced when an application undergoes scrutiny or review completion.
          </p>
        </div>
      )}
    </div>
  );
};
