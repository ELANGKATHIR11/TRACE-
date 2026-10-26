import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { getPermissions } from '../../lib/permissions';
import { IssuerVerificationStatus } from '../../types/domain';
import {
  ScanSearch,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Scale,
  ArrowUpRight,
  Edit3,
  MessageSquarePlus,
  ClipboardCheck,
  ShieldCheck,
  Info,
  GitFork,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChronoGraphView } from './ChronoGraphView';
import { DeltaScanView } from './DeltaScanView';

export const DocumentIntelligencePage: React.FC = () => {
  const {
    state,
    openFindingDrawer,
    uploadCorrectedDocumentVersion,
    uploadRealDocument,
    runDocumentValidation,
    confirmOrCorrectExtractedField,
    recordIndependentIssuerVerification,
    addDocumentReviewerNote,
  } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const paramDocId = searchParams.get('docId');
  const paramAppId = searchParams.get('appId');
  const paramPage = Number(searchParams.get('page') || 1);
  const paramBbox = searchParams.get('bbox') || '';

  const initialDoc =
    state.documents.find((d) => d.id === paramDocId) ||
    state.documents.find((d) => d.applicationId === paramAppId) ||
    state.documents[0] ||
    null;

  const [selectedDocId, setSelectedDocId] = useState<string>(initialDoc?.id || '');
  const [selectedPage, setSelectedPage] = useState<number>(paramPage);
  const [selectedVersion, setSelectedVersion] = useState<string>(initialDoc?.currentVersion || 'v1.0');
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [activeBboxId, setActiveBboxId] = useState<string>(paramBbox);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isUploadingReal, setIsUploadingReal] = useState<boolean>(false);

  // Field editing & note state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editedFieldValue, setEditedFieldValue] = useState<string>('');
  const [newReviewerNote, setNewReviewerNote] = useState<string>('');
  const [issuerStatusInput, setIssuerStatusInput] = useState<IssuerVerificationStatus>(
    'Confirmed via issuing authority record'
  );
  const [activeViewTab, setActiveViewTab] = useState<'dossier' | 'chronograph' | 'deltascan'>('dossier');

  // Sync URL query params when navigated from Evidence-to-Action or Demo Walkthrough
  useEffect(() => {
    if (paramDocId && state.documents.some((d) => d.id === paramDocId)) {
      setSelectedDocId(paramDocId);
    }
    if (paramPage) {
      setSelectedPage(paramPage);
    }
    if (paramBbox) {
      setActiveBboxId(paramBbox);
    }
  }, [paramDocId, paramPage, paramBbox, state.documents]);

  const currentDoc =
    state.documents.find((d) => d.id === selectedDocId) || state.documents[0] || null;

  useEffect(() => {
    if (currentDoc) {
      setSelectedVersion(currentDoc.currentVersion);
      if (selectedPage > currentDoc.pages.length) {
        setSelectedPage(1);
      }
    }
  }, [currentDoc?.id, currentDoc?.currentVersion, currentDoc?.pages?.length, selectedPage]);

  const currentPageData =
    currentDoc?.pages?.find((p) => p.pageNumber === selectedPage) || currentDoc?.pages?.[0] || null;

  const pageBoundingBoxes = currentDoc?.boundingBoxes?.filter(
    (b) => b.pageNumber === currentPageData?.pageNumber
  ) || [];

  const linkedFinding = currentDoc ? state.findings.find((f) => f.documentId === currentDoc.id) : null;
  const perms = getPermissions(state.currentUser.role);

  const handleUploadSyntheticCorrected = () => {
    if (!currentDoc) return;
    uploadCorrectedDocumentVersion({
      documentId: currentDoc.id,
      fileName: 'VIEPS_BlockC_Structural_Addendum_v2_Rectified.pdf',
      fileSize: '2.5 MB',
      correctedDateValue: '01-May-2026',
      changeNote:
        'Counter-signed Municipal & Structural Engineer Addendum (v2.0) rectifying Schedule-B completion date to 01-May-2026.',
    });
    setSelectedPage(2);
  };

  const handleFileInputUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReal(true);
    try {
      // If we have an existing document, we upload it as real replacement or new document
      const targetApp = currentDoc?.applicationId || state.applications[0]?.id || 'APP-2026-0842';
      const targetInst = currentDoc?.institutionId || state.currentUser?.institutionId || state.institutions[0]?.id || 'INST-VIEPS-01';

      const uploadRes = await uploadRealDocument({
        file,
        applicationId: targetApp,
        institutionId: targetInst,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: currentDoc?.category || 'Infrastructure',
        clauseId: currentDoc?.requiredByClauseId || 'APH-2026-CL-4.2.b',
      });

      if (uploadRes?.document?.id) {
        setSelectedDocId(uploadRes.document.id);
        setSelectedPage(1);
      }
    } catch {
      // Toast already shown in store
    } finally {
      setIsUploadingReal(false);
      e.target.value = '';
    }
  };

  const handleRunValidation = async () => {
    if (!currentDoc) return;
    setIsValidating(true);
    try {
      await runDocumentValidation(currentDoc.id);
    } catch {
      // handled in store
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadSyntheticSummary = () => {
    const text = [
      `TRACE SYNTHETIC DOCUMENT DOSSIER EXPORT`,
      `Document ID: ${currentDoc.id} (${currentDoc.currentVersion})`,
      `Title: ${currentDoc.title}`,
      `Validation State: ${currentDoc.validationState}`,
      `OCR Legibility Avg: ${currentDoc.ocrConfidenceAvg}%`,
      `Integrity Screening: ${currentDoc.integrityScreening}`,
      `Independent Issuer Auth: ${currentDoc.issuerVerification}`,
      `---`,
      ...currentDoc.pages.flatMap((p) => [
        `PAGE ${p.pageNumber}: ${p.title}`,
        ...p.bodyLines,
        `Signatory: ${p.signatory}`,
        `---`,
      ]),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.id}_${currentDoc.currentVersion}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded synthetic evidence transcript for ${currentDoc.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>AI DOCUMENT INTELLIGENCE WORKBENCH</span>
            <span>·</span>
            <span className="font-mono text-[#0F766E]">
              3-PANEL SYNCHRONIZED EVIDENCE INSPECTOR
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Document Authenticity Screening, OCR Extraction & Cross-Document Verification
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Corrected Synthetic Document Action */}
          <button
            onClick={handleUploadSyntheticCorrected}
            disabled={!perms.canUploadRemediationDocument}
            title={
              perms.canUploadRemediationDocument
                ? 'Upload corrected synthetic Addendum v2.0 (01-May-2026)'
                : 'Switch to Institution Compliance Officer (Prof. Meera Krishnan) in the top bar to upload remediation documents'
            }
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              perms.canUploadRemediationDocument
                ? 'bg-[#101B2D] text-white hover:bg-slate-800'
                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Corrected Synthetic Doc (v2.0)
          </button>

          {/* Run Validation Action */}
          <button
            onClick={handleRunValidation}
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d645d] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {isValidating
              ? 'Running Validation...'
              : `Run Validation (${state.engineMode === 'live_ai' ? 'Local Offline AI' : 'Deterministic Rules'})`}
          </button>

          {linkedFinding && (
            <button
              onClick={() => openFindingDrawer(linkedFinding.id)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              Traceability ({linkedFinding.id})
              <ArrowUpRight className="h-3.5 w-3.5 text-[#0F766E]" />
            </button>
          )}
        </div>
      </div>

      {/* Explicit Epistemic Separation Strip (Section 4 & Screen C Mandate) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <div className="border-r border-slate-100 pr-2">
          <div className="text-[10px] text-slate-500">1. OCR Legibility Confidence</div>
          <div className="mt-0.5 font-mono font-bold text-slate-900">
            {currentDoc.ocrConfidenceAvg}% (Text Readability Only)
          </div>
        </div>
        <div className="border-r border-slate-100 pr-2">
          <div className="text-[10px] text-slate-500">2. Document Integrity Screening</div>
          <div className="mt-0.5 font-semibold text-slate-800 truncate">
            {currentDoc.integrityScreening}
          </div>
        </div>
        <div className="border-r border-slate-100 pr-2">
          <div className="text-[10px] text-slate-500">3. Independent Issuer Verification</div>
          <div className="mt-0.5 font-semibold text-amber-800 truncate">
            {currentDoc.issuerVerification}
          </div>
        </div>
        <div className="border-r border-slate-100 pr-2">
          <div className="text-[10px] text-slate-500">4. Regulatory Rule Evaluation</div>
          <div
            className={`mt-0.5 font-semibold ${
              currentDoc.ruleEvaluation === 'Criteria satisfied'
                ? 'text-emerald-700'
                : 'text-red-700'
            }`}
          >
            {currentDoc.ruleEvaluation}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">5. Human Reviewer Outcome</div>
          <div className="mt-0.5 font-semibold text-slate-900">
            {currentDoc.humanReviewOutcome}
          </div>
        </div>
      </div>

      {/* View Switcher: Dossier Inspection vs ChronoGraph Contradictions vs DeltaScan Reprocessing */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveViewTab('dossier')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            activeViewTab === 'dossier'
              ? 'bg-[#101B2D] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Synchronized Dossier Inspection (3-Panels)
        </button>

        <button
          onClick={() => setActiveViewTab('chronograph')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            activeViewTab === 'chronograph'
              ? 'bg-[#0F766E] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <GitFork className="h-3.5 w-3.5" />
          ChronoGraph Contradiction Engine (Feature 1)
        </button>

        <button
          onClick={() => setActiveViewTab('deltascan')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            activeViewTab === 'deltascan'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          DeltaScan Incremental Reprocessing (Feature 3)
        </button>
      </div>

      {activeViewTab === 'chronograph' && currentDoc ? (
        <ChronoGraphView
          applicationId={currentDoc.applicationId}
          onNavigateToEvidence={(claimId, page) => {
            setSelectedPage(page);
            setActiveViewTab('dossier');
          }}
        />
      ) : activeViewTab === 'deltascan' && currentDoc ? (
        <DeltaScanView
          documentId={currentDoc.id}
          documentTitle={currentDoc.title}
          currentVersion={currentDoc.currentVersion}
          totalPages={currentDoc.pages.length}
        />
      ) : !currentDoc ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-[#0F766E]">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Documents Uploaded Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You are in manual testing mode. Drop a real PDF or certificate image below to run it through the Python GPU OCR and deterministic AICTE validation pipeline.
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <label
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                isUploadingReal
                  ? 'border-teal-500 bg-teal-50 animate-pulse'
                  : 'border-[#0F766E] bg-teal-50/20 hover:bg-teal-50/50'
              }`}
            >
              <Upload className="h-6 w-6 text-[#0F766E] mb-2" />
              <span className="text-sm font-semibold text-slate-800">
                {isUploadingReal ? 'Processing with Python GPU OCR...' : 'Click to Browse or Drag Real Document Here'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports PDF, PNG, JPG, JPEG, TIFF (Up to 25 MB)
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                disabled={isUploadingReal}
                onChange={handleFileInputUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      ) : (
      /* 3 SYNCHRONIZED PANELS: LEFT (3 cols) + CENTER (5 cols) + RIGHT (4 cols) */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Document List, Version Selector, Upload Dropzone */}
        <div className="lg:col-span-3 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-800">
              1. Document Dossier List ({state.documents.length})
            </h2>
            <span className="font-mono text-[10px] text-slate-400">LEFT PANEL</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {state.documents.map((doc) => {
              const isSelected = doc.id === currentDoc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setSelectedPage(doc.pages.length > 1 ? 2 : 1);
                    setSearchParams({ docId: doc.id });
                  }}
                  className={`w-full rounded-md border p-2.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'border-[#0F766E] bg-teal-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                    <span>
                      {doc.id} · {doc.fileType} · {doc.currentVersion}
                    </span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 line-clamp-2">
                    {doc.title}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500">App: {doc.applicationId}</span>
                    <span
                      className={`font-semibold ${
                        doc.validationState === 'Validated'
                          ? 'text-emerald-700'
                          : doc.validationState === 'Mismatch detected' ||
                            doc.validationState === 'Missing information'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {doc.validationState}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Version History Selector */}
          <div className="border-t border-slate-100 pt-3 text-xs space-y-2">
            <label className="block font-bold text-slate-800">
              Document Version History ({(currentDoc.versions || []).length})
            </label>
            <select
              aria-label="Select Document Version"
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono"
            >
              {(currentDoc.versions || []).map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version} — {v.validationState} ({v.fileName})
                </option>
              ))}
            </select>
            {(currentDoc.versions || []).map((v) => (
              <div
                key={v.version}
                className="rounded border border-slate-100 bg-slate-50 p-2 text-[11px]"
              >
                <div className="font-mono font-semibold text-slate-800">
                  {v.version} · SHA256: {v.sha256Preview}
                </div>
                <div className="text-slate-600 mt-0.5">{v.changeNote}</div>
              </div>
            ))}
          </div>

          {/* Real Document Upload Dropzone */}
          <div className="border-t border-slate-100 pt-3 text-xs">
            <label className="block font-bold text-slate-800 mb-1.5">
              Upload Document for Testing (Real OCR Pipeline)
            </label>
            <label
              className={`flex flex-col items-center justify-center rounded-md border border-dashed p-3 text-center transition-colors ${
                isUploadingReal
                  ? 'border-teal-500 bg-teal-50 animate-pulse cursor-wait'
                  : perms.canUploadRemediationDocument
                  ? 'border-[#0F766E] bg-teal-50/30 cursor-pointer hover:bg-teal-50/60'
                  : 'border-slate-200 bg-slate-50 cursor-not-allowed text-slate-400'
              }`}
            >
              <Upload className="h-4 w-4 text-[#0F766E] mb-1" />
              <span className="font-medium text-slate-800">
                {isUploadingReal ? 'Processing with GPU OCR & Python...' : 'Drop Real PDF / Image or Click to Browse'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {isUploadingReal
                  ? 'Extracting text, bounding boxes & certificates...'
                  : perms.canUploadRemediationDocument
                  ? `Accepts PDF, PNG, JPG, TIFF (Max 25 MB)`
                  : 'Switch to Institution Compliance Officer role to upload'}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                disabled={!perms.canUploadRemediationDocument || isUploadingReal}
                onChange={handleFileInputUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* CENTER PANEL: Interactive Document Preview Canvas & Bounding Box Overlays */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          {/* Viewer Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800">2. Interactive Preview Canvas</span>
              <span className="text-slate-300">·</span>
              <div className="flex items-center gap-1">
                {(currentDoc.pages || []).map((p) => (
                  <button
                    key={p.pageNumber}
                    onClick={() => setSelectedPage(p.pageNumber)}
                    className={`rounded px-2 py-1 font-mono text-[11px] font-semibold ${
                      selectedPage === p.pageNumber
                        ? 'bg-[#101B2D] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Page {p.pageNumber}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomPct((z) => Math.max(80, z - 10))}
                className="rounded border border-slate-200 p-1 hover:bg-slate-50"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-[11px] w-11 text-center">{zoomPct}%</span>
              <button
                onClick={() => setZoomPct((z) => Math.min(130, z + 10))}
                className="rounded border border-slate-200 p-1 hover:bg-slate-50"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDownloadSyntheticSummary}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                title="Download Synthetic Evidence Transcript"
              >
                <Download className="h-3 w-3" />
                Export
              </button>
            </div>
          </div>

          {/* Synthetic Vector Certificate Sheet with Interactive Bounding Box Overlays */}
          <div className="overflow-auto rounded-md border border-slate-300 bg-slate-100 p-4">
            <div
              className="relative mx-auto rounded bg-white p-6 shadow-sm border border-slate-300 transition-transform origin-top"
              style={{
                maxWidth: '640px',
                minHeight: '460px',
                transform: `scale(${zoomPct / 100})`,
              }}
            >
              {/* Synthetic Demonstration Watermark Banner */}
              <div className="mb-3 flex items-center justify-between border-b-2 border-slate-800 pb-2 text-[10px] font-mono">
                <span className="font-bold text-slate-900">
                  {currentPageData.headerAuthority}
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
                  SYNTHETIC DEMO DOCUMENT
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 mb-3">
                <span>Ref: {currentPageData.certificateNumber}</span>
                <span>Issue Date: {currentPageData.issueDate}</span>
              </div>

              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                {currentPageData.title}
              </h3>

              {/* OCR Text Lines with Page References */}
              <div className="space-y-3 text-xs text-slate-800 font-mono leading-relaxed">
                {currentPageData.bodyLines.map((line, idx) => {
                  const isMismatchLine = line.includes('MISMATCH') || line.includes('WARNING');
                  const isRectifiedLine = line.includes('RECTIFIED') || line.includes('SATISFIED');
                  return (
                    <div
                      key={idx}
                      className={`rounded p-2 border transition-colors ${
                        isMismatchLine
                          ? 'border-red-500 bg-red-50/90 text-red-950 font-semibold'
                          : isRectifiedLine
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold'
                          : 'border-slate-200/70 bg-slate-50/50'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 mr-2 select-none">
                        [P{currentPageData.pageNumber}:L{idx + 1}]
                      </span>
                      {line}
                    </div>
                  );
                })}
              </div>

              {/* Interactive Bounding Box Buttons List on Canvas */}
              <div className="mt-5 pt-3 border-t border-dashed border-slate-300">
                <div className="text-[10px] font-semibold text-slate-500 mb-2">
                  CLICKABLE OCR BOUNDING-BOX HIGHLIGHTS ON PAGE {currentPageData.pageNumber}:
                </div>
                <div className="space-y-1.5">
                  {pageBoundingBoxes.map((bbox) => {
                    const isActive = activeBboxId === bbox.id;
                    return (
                      <button
                        key={bbox.id}
                        onClick={() => setActiveBboxId(bbox.id)}
                        className={`w-full flex items-center justify-between rounded border px-2.5 py-1.5 text-left font-mono text-[11px] transition-all ${
                          bbox.status === 'mismatch'
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : bbox.status === 'warning'
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-teal-600 bg-teal-50/60 text-teal-950'
                        } ${isActive ? 'ring-2 ring-[#14B8A6]' : ''}`}
                      >
                        <span className="truncate">
                          [{bbox.id}] {bbox.label}
                        </span>
                        <span className="ml-2 uppercase text-[10px] font-bold shrink-0">
                          {bbox.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Stamp & Signatory Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] font-mono text-slate-500">
                <span>{currentPageData.stampText}</span>
                <span className="font-semibold text-slate-700">{currentPageData.signatory}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Extracted Values, Cross-Doc Comparison, Rule Refs & 7 Reviewer Actions */}
        <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-800">
              3. Extracted Fields & Cross-Document Comparison
            </h2>
            <span className="font-mono text-[10px] text-slate-400">RIGHT PANEL</span>
          </div>

          {/* Extracted Fields List */}
          <div className="space-y-3">
            {(currentDoc.extractedFields || []).map((field) => {
              const isSelectedBox = activeBboxId === field.boundingBoxId;
              const isEditing = editingFieldId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => {
                    setSelectedPage(field.pageNumber);
                    setActiveBboxId(field.boundingBoxId);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 text-xs transition-colors ${
                    field.validationState === 'Mismatch detected' ||
                    field.validationState === 'Missing information'
                      ? 'border-red-300 bg-red-50/40'
                      : field.validationState === 'Verification pending'
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200 bg-slate-50/60'
                  } ${isSelectedBox ? 'ring-2 ring-[#0F766E]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{field.label}</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      Page {field.pageNumber} · OCR {field.ocrConfidence}%
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="rounded bg-white p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-400">Extracted Value</div>
                      <div className="font-bold text-slate-900 mt-0.5">{field.extractedValue}</div>
                    </div>
                    <div className="rounded bg-white p-2 border border-slate-200">
                      <div className="text-[10px] text-slate-400">Matched App / Rule Norm</div>
                      <div className="font-bold text-[#0F766E] mt-0.5">
                        {field.expectedRuleValue || field.matchedApplicationValue}
                      </div>
                    </div>
                  </div>

                  {field.comparedWithDocName && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      <strong>Cross-Doc Check ({field.crossDocStatus}):</strong> Compared against{' '}
                      <em>{field.comparedWithDocName}</em> ({field.comparedWithValue})
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rules?clause=${encodeURIComponent(field.ruleClauseId)}`);
                      }}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#0F766E] hover:underline"
                    >
                      <Scale className="h-3 w-3" />
                      {field.ruleClauseId}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmOrCorrectExtractedField({
                            documentId: currentDoc.id,
                            fieldId: field.id,
                          });
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {field.reviewerConfirmed ? 'Confirmed ✓' : 'Confirm Field'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFieldId(field.id);
                          setEditedFieldValue(field.extractedValue);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="h-3 w-3" />
                        Correct
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2.5 flex items-center gap-2 rounded bg-white p-2 border border-slate-300"
                    >
                      <input
                        type="text"
                        value={editedFieldValue}
                        onChange={(e) => setEditedFieldValue(e.target.value)}
                        className="flex-1 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          confirmOrCorrectExtractedField({
                            documentId: currentDoc.id,
                            fieldId: field.id,
                            newValue: editedFieldValue,
                          });
                          setEditingFieldId(null);
                        }}
                        className="rounded bg-[#0F766E] px-2.5 py-1 text-xs font-medium text-white"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Independent Issuer Verification Action Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0F766E]" />
              Record Independent Issuer Verification Outcome
            </div>
            <p className="text-[11px] text-slate-500">
              Separately record external issuing authority verification (distinct from OCR legibility).
            </p>
            <div className="flex items-center gap-2">
              <select
                aria-label="Independent Issuer Verification Status"
                value={issuerStatusInput}
                onChange={(e) =>
                  setIssuerStatusInput(e.target.value as IssuerVerificationStatus)
                }
                className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
              >
                <option value="Confirmed via issuing authority record">
                  Confirmed via issuing authority record
                </option>
                <option value="Pending external authority confirmation">
                  Pending external authority confirmation
                </option>
                <option value="Registry reference format matched (Not issuer-authenticated)">
                  Registry reference format matched (Not issuer-authenticated)
                </option>
                <option value="Issuer query timed out — manual follow-up">
                  Issuer query timed out — manual follow-up
                </option>
              </select>
              <button
                type="button"
                onClick={() =>
                  recordIndependentIssuerVerification({
                    documentId: currentDoc.id,
                    status: issuerStatusInput,
                    note: `Updated by ${state.currentUser.name}`,
                  })
                }
                className="rounded bg-[#101B2D] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 shrink-0"
              >
                Record
              </button>
            </div>
          </div>

          {/* Recommended Next Action & Reviewer Notes */}
          <div className="border-t border-slate-100 pt-3 text-xs space-y-2.5">
            <div>
              <span className="font-bold text-slate-800">Recommended Next Action:</span>
              <p className="mt-0.5 text-slate-600">{currentDoc.recommendedNextAction}</p>
            </div>

            {linkedFinding && (
              <button
                type="button"
                onClick={() => openFindingDrawer(linkedFinding.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0F766E] py-2 text-xs font-semibold text-white hover:bg-[#0d645d]"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Open Evidence-to-Action & Assign / Resolve ({linkedFinding.id})
              </button>
            )}

            {/* Add Review Note */}
            <div className="space-y-1.5 pt-2">
              <div className="font-bold text-slate-800">
                Reviewer Notes ({currentDoc.reviewerNotes.length})
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newReviewerNote}
                  onChange={(e) => setNewReviewerNote(e.target.value)}
                  placeholder="Add scrutiny observation note..."
                  className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    addDocumentReviewerNote(currentDoc.id, newReviewerNote);
                    setNewReviewerNote('');
                  }}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {(currentDoc.reviewerNotes || []).map((rn) => (
                  <div
                    key={rn.id}
                    className="rounded border border-slate-100 bg-slate-50 p-2 text-[11px]"
                  >
                    <div className="flex justify-between font-mono text-[10px] text-slate-500">
                      <span>{rn.author}</span>
                      <span>{new Date(rn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-0.5 text-slate-800">{rn.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
