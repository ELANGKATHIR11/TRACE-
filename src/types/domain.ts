/**
 * TRACE — Trustworthy Regulatory Assurance & Compliance Engine
 * Strict Domain & 10-Dimension Status Semantics Type Definitions
 */

export type EngineMode = 'demo' | 'live_ai';

/**
 * 5 Distinct RBAC Roles specified in Screen M
 */
export type UserRole =
  | 'authorized_reviewer'
  | 'institution_compliance_officer'
  | 'institution_administrator'
  | 'regulatory_system_administrator'
  | 'auditor';

export interface DemoUserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  title: string;
  organization: string;
  institutionId?: string;
  email: string;
  badgeCode: string;
  permissionsDescription: string;
}

/**
 * 10 Distinct Status Dimensions (Section 7: Important Data & Status Semantics)
 */
// 1. Workflow Status (8 configurable internal stages)
export type WorkflowStage =
  | 'Draft'
  | 'Validation in progress'
  | 'Corrections required'
  | 'Ready for authorized review'
  | 'Under review'
  | 'Awaiting additional evidence'
  | 'Review completed'
  | 'Authorized outcome recorded';

// 2. Document Processing Status (8 distinct validation states in Screen C)
export type DocumentValidationState =
  | 'Validated'
  | 'Needs manual review'
  | 'Missing information'
  | 'Mismatch detected'
  | 'Expired document'
  | 'Verification pending'
  | 'Verification failed'
  | 'Inconclusive';

// 3. Field Extraction Confidence Band
export type ExtractionConfidenceBand = 'High (>=95%)' | 'Moderate (80-94%)' | 'Low (<80%)' | 'Manual Entry';

// 4. Cross-Document Consistency Status
export type CrossDocConsistencyStatus =
  | 'Consistent across records'
  | 'Potential inconsistency detected'
  | 'Missing counterpart document'
  | 'Not applicable';

// 5. Document Integrity Screening Status
export type IntegrityScreeningStatus =
  | 'Signature & hash structure intact'
  | 'Timestamp anomaly flagged'
  | 'Unsigned scan — structure intact'
  | 'Tamper suspicion — manual check required';

// 6. Independent Issuer Verification Status
export type IssuerVerificationStatus =
  | 'Pending external authority confirmation'
  | 'Registry reference format matched (Not issuer-authenticated)'
  | 'Confirmed via issuing authority record'
  | 'Issuer query timed out — manual follow-up';

// 7. Regulatory Rule Evaluation Status
export type RuleEvaluationStatus =
  | 'Criteria satisfied'
  | 'Deficiency triggered'
  | 'Conditional — requires physical scrutiny'
  | 'Rule pending publication';

// 8. Human Review Outcome
export type HumanReviewOutcome =
  | 'Unreviewed'
  | 'Confirmed by reviewer'
  | 'Correction requested'
  | 'Escalated to committee'
  | 'Overridden with justification';

// 9. Compliance Obligation Status
export type ObligationStatus =
  | 'Satisfied'
  | 'Upcoming'
  | 'Awaiting evidence'
  | 'Overdue'
  | 'Under remediation';

// 10. Official Outcome
export type OfficialOutcomeStatus =
  | 'Not yet issued (Internal workflow active)'
  | 'EoA Recommended by Scrutiny Committee'
  | 'Deficiency Notice Issued'
  | 'Official Approval Recorded (Demo Simulation)';

export type ApplicationCategory =
  | 'Extension of Approval (EoA)'
  | 'New Technical Program'
  | 'Increase in Intake'
  | 'Closure of Program / Course'
  | 'ODL / Online Learning Approval';

export type AcademicYear = '2026-27' | '2025-26' | '2024-25';

export type FindingSeverity = 'Critical' | 'Major' | 'Moderate' | 'Observation';

export type FindingLifecycleStatus =
  | 'Open'
  | 'Task Assigned'
  | 'Remediation Uploaded'
  | 'Re-Validation Passed'
  | 'Resolved';

export interface BoundingBox {
  id: string;
  pageNumber: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  label: string;
  category: 'date' | 'identifier' | 'name' | 'area' | 'signature' | 'clause_value';
  status: 'valid' | 'mismatch' | 'warning' | 'info';
}

export interface ExtractedField {
  id: string;
  key: string;
  label: string;
  extractedValue: string;
  matchedApplicationValue: string;
  expectedRuleValue?: string;
  ocrConfidence: number; // 0-100
  confidenceBand: ExtractionConfidenceBand;
  pageNumber: number;
  boundingBoxId: string;
  crossDocStatus: CrossDocConsistencyStatus;
  comparedWithDocId?: string;
  comparedWithDocName?: string;
  comparedWithValue?: string;
  ruleClauseId: string;
  validationState: DocumentValidationState;
  reviewerConfirmed: boolean;
  reviewerComment?: string;
}

export interface SyntheticDocumentPage {
  pageNumber: number;
  title: string;
  headerAuthority: string;
  certificateNumber: string;
  issueDate: string;
  bodyLines: string[];
  stampText: string;
  signatory: string;
}

export interface DocumentVersionRecord {
  version: string; // e.g., "v1.0", "v2.0"
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSize: string;
  sha256Preview: string;
  validationState: DocumentValidationState;
  changeNote: string;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  institutionId: string;
  title: string;
  category: 'Infrastructure' | 'Safety & NOC' | 'Financial' | 'Faculty & Academic' | 'Legal & Affidavit';
  fileType: 'PDF' | 'IMAGE_TIFF';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  expiryDate?: string;
  currentVersion: string;
  versions: DocumentVersionRecord[];
  requiredByClauseId: string;
  isMandatory: boolean;
  // 10-dimension explicit separation
  validationState: DocumentValidationState;
  ocrConfidenceAvg: number;
  crossDocConsistency: CrossDocConsistencyStatus;
  integrityScreening: IntegrityScreeningStatus;
  issuerVerification: IssuerVerificationStatus;
  ruleEvaluation: RuleEvaluationStatus;
  humanReviewOutcome: HumanReviewOutcome;
  pages: SyntheticDocumentPage[];
  boundingBoxes: BoundingBox[];
  extractedFields: ExtractedField[];
  reviewerNotes: {
    id: string;
    author: string;
    role: string;
    timestamp: string;
    note: string;
  }[];
  recommendedNextAction: string;
}

/**
 * Section 6: SIGNATURE FEATURE — EVIDENCE-TO-ACTION TRACEABILITY
 * Connects: Requirement -> Rule version -> Source clause -> Document evidence -> Extracted field ->
 * Validation result -> Severity & uncertainty -> Assigned correction task -> Due date -> Reviewer decision -> Audit history
 */
export interface ComplianceFinding {
  id: string;
  title: string;
  applicationId: string;
  applicationCode: string;
  institutionId: string;
  institutionName: string;
  // Link 1: Requirement
  requirementId: string;
  requirementTitle: string;
  // Link 2: Rule Version
  ruleSetId: string;
  ruleVersion: string;
  academicYear: AcademicYear;
  // Link 3: Source Clause
  clauseId: string;
  clauseNumber: string;
  clauseExcerpt: string;
  sourceDocumentTitle: string;
  sourcePageRef: string;
  // Link 4: Document & Page
  documentId?: string;
  documentTitle?: string;
  pageNumber?: number;
  boundingBoxId?: string;
  // Link 5: Extracted Field
  extractedFieldId?: string;
  extractedFieldLabel?: string;
  fieldKey?: string;
  extractedValue?: string;
  expectedValue: string;
  // Link 6: Multi-layer Validation Result
  validationResult: DocumentValidationState;
  ocrConfidence?: number;
  integrityStatus: IntegrityScreeningStatus;
  issuerAuthStatus: IssuerVerificationStatus;
  ruleEvalStatus: RuleEvaluationStatus;
  // Link 7: Severity & Uncertainty
  severity: FindingSeverity;
  uncertaintyDisclosure: string;
  // Link 8 & 9: Assigned Correction Task & Due Date
  assignedTaskId?: string;
  dueDate: string;
  // Link 10: Reviewer Decision & Lifecycle
  status: FindingLifecycleStatus;
  reviewerDecision: HumanReviewOutcome;
  reviewerDecisionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  // Link 11: Audit Correlation
  correlationId: string;
  createdAt: string;
}

export interface CorrectiveTask {
  id: string;
  title: string;
  description: string;
  applicationId: string;
  applicationCode: string;
  institutionId: string;
  institutionName: string;
  findingId?: string;
  assigneeName: string;
  assigneeRole: UserRole;
  assignedByName: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  createdAt: string;
  dueDate: string;
  workflowStage: WorkflowStage;
  status: 'Open' | 'In Progress' | 'Awaiting Verification' | 'Completed' | 'Overdue';
  requiredAction: string;
  correctionCycle: number;
  comments: {
    id: string;
    author: string;
    roleLabel: string;
    timestamp: string;
    text: string;
  }[];
}

export interface ApplicationVersionSnapshot {
  version: string;
  timestamp: string;
  actor: string;
  stage: WorkflowStage;
  summary: string;
}

export interface ApplicationRecord {
  id: string;
  code: string;
  institutionId: string;
  institutionName: string;
  category: ApplicationCategory;
  academicYear: AcademicYear;
  programName: string;
  requestedIntake: number;
  currentIntake: number;
  workflowStage: WorkflowStage;
  officialOutcome: OfficialOutcomeStatus;
  submissionState: 'Saved Draft' | 'Submitted for Scrutiny' | 'Under Active Verification' | 'Officially Recorded';
  assignedReviewerName: string;
  assignedReviewerId: string;
  priority: 'Critical' | 'High' | 'Standard';
  submittedAt: string;
  lastActivityAt: string;
  slaDueDate: string;
  ageingDays: number;
  ruleSetId: string;
  ruleVersion: string;
  unresolvedFindingsCount: number;
  mandatoryFindingsCount: number;
  documentsCount: number;
  validatedDocumentsCount: number;
  requiredNextAction: string;
  versionHistory: ApplicationVersionSnapshot[];
}

export interface ComplianceRequirementItem {
  id: string;
  institutionId: string;
  applicationId: string;
  code: string;
  title: string;
  category: 'Land & Built-up Area' | 'Fire & Structural Safety' | 'Faculty Norms & Cadre' | 'Financial Corpus & FDR' | 'Laboratory & Barrier-Free';
  sourceDocument: string;
  clauseId: string;
  clauseRef: string;
  academicYear: AcademicYear;
  ruleVersion: string;
  status: ObligationStatus;
  evidenceDocumentId?: string;
  evidenceDocumentTitle?: string;
  evidenceValidationState?: DocumentValidationState;
  assignedOwner: string;
  lastVerifiedDate?: string;
  deadline: string;
  nextRequiredAction: string;
}

export interface RuleClause {
  id: string;
  clauseNumber: string;
  title: string;
  category: string;
  description: string;
  applicableCategories: ApplicationCategory[];
  requiredEvidence: string[];
  validationLogicSummary: string;
  structuredPredicate: string;
  sourcePage: string;
  changeDiffFromPrior?: {
    priorVersion: string;
    priorText: string;
    changeType: 'Threshold Tightened' | 'New Evidence Mandatory' | 'Clarification Added' | 'Unchanged';
  };
}

export interface RuleSetVersion {
  id: string;
  code: string;
  title: string;
  sourceDocument: string;
  edition: string;
  academicYear: AcademicYear;
  version: string;
  effectiveDate: string;
  status: 'draft' | 'under_review' | 'published' | 'superseded';
  publishedBy?: string;
  publishedAt?: string;
  approvedByReviewer?: string;
  impactedApplicationsCount: number;
  impactedObligationsCount: number;
  clauses: RuleClause[];
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  eventType:
    | 'Overdue Task'
    | 'Document Inconsistency'
    | 'Missing Mandatory Evidence'
    | 'Approaching Deadline'
    | 'Expiring Certificate'
    | 'Rulebook Update'
    | 'Reviewer Assignment'
    | 'Remediation Uploaded';
  createdAt: string;
  dueDate?: string;
  applicationId?: string;
  applicationCode?: string;
  institutionId: string;
  institutionName: string;
  findingId?: string;
  taskId?: string;
  assignedOwner: string;
  recommendedAction: string;
  isRead: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  escalationLevel: 'None' | 'Level 1 — Scrutiny Lead' | 'Level 2 — Regional Committee';
  deliveryChannels: {
    channel: 'In-App Console' | 'Institutional Email Relay (Simulated)' | 'SMS Gateway (Not Configured)';
    status: 'Delivered' | 'Simulated Local Only' | 'Failed — Retry Available';
    recipient: string;
    lastAttemptAt: string;
  }[];
}

export interface InstitutionProfile {
  id: string;
  name: string;
  permanentId: string; // Synthetic ID e.g., "SYN-AICTE-1-48902134"
  type: 'Private Self-Financed' | 'State Government Autonomous' | 'Deemed-to-be University';
  state: string;
  city: string;
  address: string;
  establishedYear: number;
  campusAreaAcres: number;
  builtUpAreaSqm: number;
  applicableCategories: ApplicationCategory[];
  programs: {
    id: string;
    name: string;
    level: 'UG (B.Tech / B.Pharm)' | 'PG (M.Tech / MBA)' | 'Diploma';
    sanctionedIntake: number;
    facultyCount: number;
    accreditationStatus: string;
  }[];
  complianceContacts: {
    name: string;
    designation: string;
    role: string;
    email: string;
    phone: string;
  }[];
  openFindingsCount: number;
  upcomingObligationsCount: number;
  checklistCompletionPct: number; // Explicitly labelled as checklist completeness, NOT approval guarantee
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionType:
    | 'APPLICATION_CREATED'
    | 'DOCUMENT_UPLOADED'
    | 'VALIDATION_EXECUTED'
    | 'FINDING_CREATED'
    | 'TASK_ASSIGNED'
    | 'FIELD_EXTRACTION_CONFIRMED'
    | 'FIELD_EXTRACTION_CORRECTED'
    | 'FINDING_RESOLVED'
    | 'WORKFLOW_STAGE_TRANSITION'
    | 'RULE_VERSION_PUBLISHED'
    | 'ALERT_ACKNOWLEDGED'
    | 'ROLE_SWITCHED_DEMO';
  actionLabel: string;
  entityType: 'Application' | 'Document' | 'Finding' | 'Task' | 'RuleSet' | 'Alert' | 'Session';
  entityId: string;
  entityLabel: string;
  applicationId?: string;
  applicationCode?: string;
  previousState?: string;
  newState?: string;
  evidenceOrRuleRef?: string;
  correlationId: string;
  isDemoAction: boolean;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
  applicationId?: string;
  ruleVersionContext?: string;
  executionMode: EngineMode;
  structuredResponse?: {
    summaryAnswer: string;
    directlySupportedStatements: {
      statement: string;
      clauseId: string;
      ruleVersion: string;
      sourcePage: string;
    }[];
    systemComputedFindings: string[];
    explanatorySuggestions: string[];
    uncertaintyWarnings: string[];
    recommendedNextActions: string[];
  };
}

export interface ClaimItem {
  id: string;
  applicationId: string;
  institutionId: string;
  documentId: string;
  documentTitle?: string;
  documentVersion: string;
  claimType: string;
  claimKey: string;
  rawValue: string;
  normalizedValue: string;
  pageNumber: number;
  boundingBoxId?: string;
  confidence: number;
  relevantDate?: string;
  ruleReferences?: string;
  reviewStatus: string;
}

export interface ClaimRelationshipItem {
  id: string;
  applicationId: string;
  sourceClaimId: string;
  targetClaimId: string;
  relationType: 'SAME_ENTITY' | 'CONCURRENT_FACT' | 'VALUE_MISMATCH' | 'TEMPORAL_CONTRADICTION' | 'SUPERSEDED' | 'STALE_EXPIRED' | 'SUPPORTS_REQUIREMENT' | 'CONTRADICTS_REQUIREMENT';
  severity: 'Critical' | 'Major' | 'Moderate' | 'Informational';
  explanation: string;
  sourceValueSummary: string;
  targetValueSummary: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Acknowledged';
  sourceEvidenceDocTitle?: string;
  sourceEvidencePage?: number;
  targetEvidenceDocTitle?: string;
  targetEvidencePage?: number;
}

export interface ReviewPriorityItem {
  id: string;
  applicationId: string;
  priorityScore: number;
  rank: number;
  urgencyBand: 'Immediate' | 'High' | 'Normal' | 'Low';
  scoringFactorsJson: string;
  explanationText: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  reviewerWorkload: number;
  calculatedAt?: string;
}

export interface ImpactReportItem {
  id: string;
  title: string;
  rulesetCode: string;
  summary: string;
  totalApplicationsImpacted: number;
  criticalFindingsDelta: number;
  majorFindingsDelta: number;
  impactedApplicationIds: string;
  remediationTasksJson: string;
  isPublished: boolean;
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface ValidationManifestItem {
  id: string;
  applicationId: string;
  assessmentId: string;
  documentHashesJson: string;
  claimReferencesJson: string;
  ruleVersionUsed: string;
  pipelineVersionsJson: string;
  normalizedInputsJson: string;
  ruleEvaluationsJson: string;
  manifestHash: string;
  previousManifestHash: string;
  signedBy: string;
  signedAt: string;
  verifiedAt?: string;
  verificationStatus: 'Valid Chain' | 'Tampered' | 'Unverified';
}

export interface ReprocessingLogItem {
  id: string;
  documentId: string;
  previousVersion: string;
  newVersion: string;
  totalPages: number;
  pagesReprocessed: number;
  pagesReused: number;
  cacheHitRate: number;
  processingTimeMs: number;
  estimatedSavingsPercent: number;
  planJson: string;
  createdAt: string;
}

export interface FixPreviewItem {
  id: string;
  findingId: string;
  applicationId: string;
  proposedFieldKey: string;
  originalValue: string;
  proposedValue: string;
  isHypothetical: boolean;
  hypotheticalFindingStatus: string;
  remainingConflicts: string[];
  requiredEvidenceGuidance: string;
  previewOutcomeSummary: string;
}

export interface TraceStateStore {
  engineMode: EngineMode;
  currentUser: DemoUserProfile;
  users: DemoUserProfile[];
  institutions: InstitutionProfile[];
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  findings: ComplianceFinding[];
  tasks: CorrectiveTask[];
  requirements: ComplianceRequirementItem[];
  ruleSets: RuleSetVersion[];
  alerts: AlertNotification[];
  auditEvents: AuditEvent[];
  copilotHistory: CopilotMessage[];
  claims?: ClaimItem[];
  claimRelationships?: ClaimRelationshipItem[];
  reviewPriorities?: ReviewPriorityItem[];
  impactReports?: ImpactReportItem[];
  validationManifests?: ValidationManifestItem[];
  reprocessingLogs?: ReprocessingLogItem[];
}
