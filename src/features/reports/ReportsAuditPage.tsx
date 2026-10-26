import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { api } from '../../lib/api-client';
import {
  BarChart3,
  History,
  Lock,
  Download,
  ShieldCheck,
  FileText,
  FileJson,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnalyticsReportsPage } from '../analytics/AnalyticsReportsPage';
import { AuditTrailPage } from '../audit/AuditTrailPage';
import { ProoflineManifestView } from '../audit/ProoflineManifestView';

export const ReportsAuditPage: React.FC = () => {
  const { state } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportPreview, setReportPreview] = useState<any | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'audit'
      ? 'audit'
      : tabParam === 'proofline'
      ? 'proofline'
      : 'analytics';

  const setTab = (tab: 'analytics' | 'audit' | 'proofline') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const auditCount = state.auditEvents.length;

  const selectedAppId = searchParams.get('app') || state.applications[0]?.id || 'APP-2026-0842';

  const handlePreviewValidationReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await api.getValidationReport(selectedAppId);
      setReportPreview(res.report);
      toast.success(`Loaded canonical validation report ${res.report.reportMetadata.reportId}.`);
    } catch (err: any) {
      toast.error(`Failed to load validation report: ${err.message}`);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadPdf = () => {
    const url = api.getValidationReportPdfUrl(selectedAppId);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Downloading official PDF Validation Report for ${selectedAppId}...`);
  };

  const handleDownloadJson = () => {
    const url = api.getValidationReportJsonUrl(selectedAppId);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Downloading canonical JSON Validation Report for ${selectedAppId}...`);
  };

  return (
    <div className="space-y-6">
      {/* 3 Consolidated Navigation Tabs for Page 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs">
          <button
            onClick={() => setTab('analytics')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Operational Analytics & Ageing</span>
          </button>

          <button
            onClick={() => setTab('audit')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Searchable Audit Events</span>
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 font-mono text-[10px] text-slate-700">
              {auditCount}
            </span>
          </button>

          <button
            onClick={() => setTab('proofline')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === 'proofline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Proofline Cryptographic Manifest</span>
            <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#0F766E]">
              SHA-256
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Immutable Backend-Generated Event Log</span>
        </div>
      </div>

      {/* Canonical Application Validation Report Generator Banner (PDF + JSON from same Validation Run) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-50 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0F766E]">
                OFFICIAL DOSSIER VALIDATION REPORT
              </span>
              <span className="text-[11px] text-slate-500">
                Synchronized PDF & JSON Export from Persisted Validation Run
              </span>
            </div>
            <h2 className="mt-1 text-sm font-bold text-slate-900">
              Generate & Download Evidence-Linked Application Validation Report
            </h2>
            <p className="text-[11px] text-slate-600">
              Includes checklist coverage, OCR field confidence, rule evaluation outcomes, cross-document contradictions, anomaly indicators, issuer verification, corrective tasks, and decision-support disclaimers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Select Application for Validation Report"
              value={selectedAppId}
              onChange={(e) => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('app', e.target.value);
                setSearchParams(nextParams);
                setReportPreview(null);
              }}
              className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-800"
            >
              {state.applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.programName.slice(0, 28)}
                </option>
              ))}
            </select>

            <button
              onClick={handlePreviewValidationReport}
              disabled={isLoadingReport}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5 text-[#0F766E]" />
              {isLoadingReport ? 'Loading...' : 'Inspect Report Summary'}
            </button>

            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-1.5 font-semibold text-white shadow-xs hover:bg-[#0D655E]"
            >
              <FileText className="h-3.5 w-3.5" />
              Download PDF Report
            </button>

            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-teal-700 bg-teal-50/60 px-3 py-1.5 font-semibold text-[#0F766E] hover:bg-teal-100/60"
            >
              <FileJson className="h-3.5 w-3.5" />
              Download JSON Report
            </button>
          </div>
        </div>

        {reportPreview && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-500">Report ID:</span>{' '}
                <strong className="text-slate-900">{reportPreview.reportMetadata?.reportId}</strong>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Validation Run:</span>{' '}
                <strong className="text-[#0F766E]">{reportPreview.reportMetadata?.validationRunId}</strong>
              </div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                Stage: {reportPreview.applicationReference?.workflowStage}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono text-[11px]">
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">Documents Received</div>
                <div className="text-sm font-bold text-slate-900">
                  {reportPreview.documentInventory?.receivedDocumentsCount} / {reportPreview.documentInventory?.totalRequiredMandatoryClauses}
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-white p-2">
                <div className="text-[10px] text-emerald-700">Checks Passed</div>
                <div className="text-sm font-bold text-emerald-800">
                  {reportPreview.ruleEvaluationOutcomes?.checksCompletedSuccessfully?.length || 0}
                </div>
              </div>
              <div className="rounded border border-red-200 bg-white p-2">
                <div className="text-[10px] text-red-700">Checks Failed</div>
                <div className="text-sm font-bold text-red-800">
                  {reportPreview.ruleEvaluationOutcomes?.checksFailed?.length || 0}
                </div>
              </div>
              <div className="rounded border border-amber-200 bg-white p-2">
                <div className="text-[10px] text-amber-700">Pending External</div>
                <div className="text-sm font-bold text-amber-800">
                  {reportPreview.ruleEvaluationOutcomes?.checksPendingExternalVerification?.length || 0}
                </div>
              </div>
              <div className="rounded border border-purple-200 bg-white p-2">
                <div className="text-[10px] text-purple-700">Anomaly Indicators</div>
                <div className="text-sm font-bold text-purple-800">
                  {reportPreview.anomalyAndForensicIndicators?.length || 0}
                </div>
              </div>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-950 font-mono">
              {reportPreview.reportMetadata?.decisionSupportDisclaimer}
            </div>
          </div>
        )}
      </div>

      {/* Render active tab */}
      {activeTab === 'analytics' && <AnalyticsReportsPage />}
      {activeTab === 'audit' && <AuditTrailPage />}
      {activeTab === 'proofline' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#0F766E]" />
                  Proofline Cryptographic Audit Manifest & Merkle Root Chain
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cryptographic integrity proof verifying tamper-evident sequential chaining of scrutiny decisions, document hashes, and rule evaluations.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Application:</span>
                <select
                  aria-label="Application Dossier for Proofline Manifest"
                  value={selectedAppId}
                  onChange={(e) => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set('app', e.target.value);
                    setSearchParams(nextParams);
                  }}
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-800"
                >
                  {state.applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.programName.slice(0, 20)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ProoflineManifestView applicationId={selectedAppId} />
          </div>
        </div>
      )}
    </div>
  );
};
