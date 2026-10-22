import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTraceStore } from '../../lib/store';
import { ApplicationCategory, AcademicYear } from '../../types/domain';
import {
  CheckCircle2,
  Upload,
  AlertTriangle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const intakeSchema = z.object({
  institutionId: z.string().min(1, 'Institution selection is required'),
  category: z.enum([
    'Extension of Approval (EoA)',
    'New Technical Program',
    'Increase in Intake',
    'Closure of Program / Course',
    'ODL / Online Learning Approval',
  ]),
  academicYear: z.enum(['2026-27', '2025-26', '2024-25']),
  programName: z
    .string()
    .min(5, 'Program name must be at least 5 characters')
    .max(120, 'Program name too long'),
  currentIntake: z.number().min(0).max(1200),
  requestedIntake: z.number().min(15, 'Minimum intake must be at least 15 seats').max(1200),
  ruleSetId: z.string().min(1),
  nodalDeclarationAccepted: z.boolean(),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

const INTAKE_STAGES = [
  '1. Select Institution',
  '2. Category & Academic Year',
  '3. Configurable Checklist',
  '4. Application Information',
  '5. Upload Supporting Docs',
  '6. Automated Validation',
  '7. Resolve Findings',
  '8. Submit for Review',
];

export const ApplicationIntakePage: React.FC = () => {
  const { state, createApplicationFromIntake } = useTraceStore();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<
    { title: string; fileName: string; fileSize: string; clauseId: string; isDuplicate?: boolean }[]
  >([
    {
      title: 'Building Completion & Structural Stability Certificate',
      fileName: 'Block_Completion_Cert_2026.pdf',
      fileSize: '2.1 MB',
      clauseId: 'APH-2026-CL-4.1.a',
    },
    {
      title: 'Sworn Notarized Affidavit (Form-A)',
      fileName: 'Notarized_Affidavit_FormA.pdf',
      fileSize: '1.4 MB',
      clauseId: 'APH-2026-CL-4.2.b',
    },
  ]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [preValidationRun, setPreValidationRun] = useState(true);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      institutionId: state.institutions[0].id,
      category: 'Increase in Intake',
      academicYear: '2026-27',
      programName: 'B.Tech — Artificial Intelligence & Cyber-Physical Engineering',
      currentIntake: 120,
      requestedIntake: 180,
      ruleSetId: state.ruleSets[0].id,
      nodalDeclarationAccepted: true,
    },
  });

  const watchedValues = watch();
  const activeRuleSet =
    state.ruleSets.find((r) => r.id === watchedValues.ruleSetId) || state.ruleSets[0];

  // Filter clauses dynamically by the selected category (Screen B requirement: do not hard-code legal requirements)
  const applicableClauses = activeRuleSet.clauses.filter((c) =>
    c.applicableCategories.includes(watchedValues.category)
  );

  const handleSimulatedUpload = (clauseId: string, reqDocTitle: string) => {
    const fileName = `${reqDocTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)}_2026.pdf`;
    const alreadyExists = uploadedFiles.some((f) => f.fileName === fileName);
    if (alreadyExists) {
      setDuplicateWarning(
        `Duplicate Upload Warning: "${fileName}" is already attached to this intake session.`
      );
      toast.warning(`Duplicate file detected: ${fileName}`);
      return;
    }
    setDuplicateWarning(null);
    setUploadedFiles((prev) => [
      ...prev,
      {
        title: reqDocTitle,
        fileName,
        fileSize: '1.7 MB',
        clauseId,
      },
    ]);
    toast.success(`Uploaded "${fileName}" (100% complete)`);
  };

  const missingMandatoryDocs = applicableClauses.filter(
    (c) => !uploadedFiles.some((u) => u.clauseId === c.id)
  );

  const onSaveDraft = () => {
    const appId = createApplicationFromIntake({
      institutionId: watchedValues.institutionId,
      category: watchedValues.category as ApplicationCategory,
      academicYear: watchedValues.academicYear as AcademicYear,
      programName: watchedValues.programName,
      currentIntake: Number(watchedValues.currentIntake),
      requestedIntake: Number(watchedValues.requestedIntake),
      ruleSetId: watchedValues.ruleSetId,
      submitImmediately: false,
      uploadedFiles,
    });
    navigate(`/applications?appId=${appId}`);
  };

  const onFinalSubmit = handleSubmit((data: any) => {
    const appId = createApplicationFromIntake({
      institutionId: data.institutionId,
      category: data.category as ApplicationCategory,
      academicYear: data.academicYear as AcademicYear,
      programName: data.programName,
      currentIntake: Number(data.currentIntake),
      requestedIntake: Number(data.requestedIntake),
      ruleSetId: data.ruleSetId,
      submitImmediately: true,
      uploadedFiles,
    });
    navigate(`/applications?appId=${appId}`);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            8-STAGE CONFIGURABLE APPLICATION INTAKE WORKSPACE
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            New Regulatory Application Intake
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Requirements dynamically load from the selected rule-set configuration ({activeRuleSet.code}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </button>
        </div>
      </div>

      {/* 8-Stage Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {INTAKE_STAGES.map((label, idx) => {
          const isCurrent = idx === activeStep;
          const isDone = idx < activeStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`rounded-md border p-2.5 text-left transition-colors ${
                isCurrent
                  ? 'border-[#0F766E] bg-teal-50/70 text-slate-900'
                  : isDone
                  ? 'border-emerald-200 bg-white text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] font-semibold truncate">{label}</div>
              <div className="mt-0.5 text-[10px] font-mono">
                {isDone ? 'Completed' : isCurrent ? 'Active Stage' : 'Pending'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage Content Card */}
      <form onSubmit={onFinalSubmit} className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        {activeStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 1: Select Applying Technical Institution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {state.institutions.map((inst) => (
                <label
                  key={inst.id}
                  className={`cursor-pointer rounded-lg border p-4 text-xs transition-colors ${
                    watchedValues.institutionId === inst.id
                      ? 'border-[#0F766E] bg-teal-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={inst.id}
                    {...register('institutionId')}
                    className="sr-only"
                  />
                  <div className="font-mono text-[11px] text-[#0F766E]">{inst.permanentId}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{inst.name}</div>
                  <div className="mt-1 text-slate-600">
                    {inst.city}, {inst.state} · {inst.type}
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-slate-500">
                    Campus: {inst.campusAreaAcres} Acres · Built-up: {inst.builtUpAreaSqm} Sq.m
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 2: Select Application Category, Academic Year & Rule-Set Version
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Application Category
                </label>
                <select
                  {...register('category')}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Increase in Intake">Increase in Intake</option>
                  <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
                  <option value="New Technical Program">New Technical Program</option>
                  <option value="Closure of Program / Course">Closure of Program / Course</option>
                  <option value="ODL / Online Learning Approval">ODL / Online Learning Approval</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                <select
                  {...register('academicYear')}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Applicable Regulatory Rule-Set
                </label>
                <select
                  {...register('ruleSetId')}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900"
                >
                  {state.ruleSets.map((rs) => (
                    <option key={rs.id} value={rs.id}>
                      {rs.code} ({rs.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 3: Dynamically Loaded Regulatory Checklist ({applicableClauses.length} Clauses for{' '}
              {watchedValues.category})
            </h2>
            <p className="text-xs text-slate-600">
              Loaded from <strong>{activeRuleSet.title}</strong> ({activeRuleSet.version}). Only clauses applicable to <em>{watchedValues.category}</em> are enforced.
            </p>
            <div className="space-y-2.5">
              {applicableClauses.map((clause) => (
                <div
                  key={clause.id}
                  className="rounded border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0F766E]">
                      {clause.id} ({clause.clauseNumber})
                    </span>
                    <span className="font-mono text-slate-500">{clause.sourcePage}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{clause.title}</div>
                  <p className="mt-0.5 text-slate-600">{clause.description}</p>
                  <div className="mt-2 text-[11px] text-slate-700">
                    <strong>Mandatory Supporting Evidence:</strong>{' '}
                    {clause.requiredEvidence.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 4: Enter Program & Intake Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Technical Program Title
                </label>
                <input
                  type="text"
                  {...register('programName')}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
                {errors.programName && (
                  <p className="mt-1 text-red-600">{errors.programName.message}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Sanctioned Intake
                </label>
                <input
                  type="number"
                  {...register('currentIntake', { valueAsNumber: true })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Requested Sanctioned Intake (AY {watchedValues.academicYear})
                </label>
                <input
                  type="number"
                  {...register('requestedIntake', { valueAsNumber: true })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                />
                {errors.requestedIntake && (
                  <p className="mt-1 text-red-600">{errors.requestedIntake.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 5: Upload Supporting Evidence Documents
            </h2>
            {duplicateWarning && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}
            <div className="space-y-3">
              {applicableClauses.map((clause) => {
                const attached = uploadedFiles.find((u) => u.clauseId === clause.id);
                return (
                  <div
                    key={clause.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-slate-200 p-3.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {clause.requiredEvidence[0]} (Required by {clause.clauseNumber})
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Accepted formats: PDF, TIFF (Max 15 MB) · Mandatory Check
                      </div>
                      {attached && (
                        <div className="mt-1 font-mono text-emerald-700 font-medium">
                          Attached: {attached.fileName} ({attached.fileSize})
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulatedUpload(clause.id, clause.requiredEvidence[0])
                      }
                      className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#0F766E]" />
                      {attached ? 'Test Duplicate Upload' : 'Attach Synthetic PDF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Stage 6: Review Automated Pre-Submission Screening Results
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPreValidationRun(true);
                  toast.success('Executed pre-submission checklist & OCR legibility screening.');
                }}
                className="rounded bg-[#0F766E] px-3 py-1.5 text-xs font-medium text-white"
              >
                Re-Run Pre-Screening
              </button>
            </div>
            {preValidationRun && (
              <div className="space-y-2.5 text-xs">
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="font-semibold text-slate-900">
                    Attached Evidence Files: {uploadedFiles.length} / {applicableClauses.length} Clauses Covered
                  </div>
                  <p className="mt-1 text-slate-600">
                    Missing Mandatory Documents: {missingMandatoryDocs.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Stage 7: Pre-Submission Deficiency Check
            </h2>
            {missingMandatoryDocs.length > 0 ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-4 text-xs space-y-2">
                <div className="font-semibold text-amber-900">
                  {missingMandatoryDocs.length} Mandatory Document(s) Still Pending Attachment:
                </div>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">
                  {missingMandatoryDocs.map((m) => (
                    <li key={m.id}>
                      {m.clauseNumber}: {m.requiredEvidence.join(', ')}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="mt-2 rounded bg-amber-800 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Return to Stage 5 to Attach Missing Documents
                </button>
              </div>
            ) : (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                All required document slots for {watchedValues.category} are populated.
              </div>
            )}
          </div>
        )}

        {activeStep === 7 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">
              Stage 8: Authorized Submission & State Distinction Notice
            </h2>
            <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                Important Regulatory State Distinction
              </div>
              <p className="text-slate-600 leading-relaxed">
                Submitting this dossier transitions its state from <strong>Saved Draft</strong> to{' '}
                <strong>Submitted for Scrutiny (Validation in progress)</strong>. Submission and automated OCR screening do <strong>not</strong> constitute an <strong>Officially Approved Outcome</strong>, which requires Authorized Reviewer verification and Scrutiny Committee recording.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d]"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Application for Authorized Review
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Save as Draft Only
              </button>
            </div>
          </div>
        )}

        {/* Stepper Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous Stage
          </button>
          {activeStep < INTAKE_STAGES.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveStep((s) => Math.min(INTAKE_STAGES.length - 1, s + 1))}
              className="inline-flex items-center gap-1 rounded bg-[#101B2D] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Next Stage
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
