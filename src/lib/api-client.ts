import {
  TraceStateStore,
  EngineMode,
  UserRole,
  WorkflowStage,
  IssuerVerificationStatus,
  ApplicationCategory,
  AcademicYear,
} from '../types/domain';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Authoritative State Snapshot
  async getState(): Promise<TraceStateStore> {
    return request<TraceStateStore>('/state');
  },

  // Auth & Roles
  async login(email: string, password: string) {
    return request<{ success: boolean; user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },

  async switchRole(userId: string) {
    return request<{ success: boolean; user: any }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Applications
  async createApplication(input: {
    institutionId: string;
    category: ApplicationCategory;
    academicYear: AcademicYear;
    programName: string;
    requestedIntake: number;
    currentIntake: number;
    ruleSetId: string;
    submitImmediately: boolean;
    uploadedFiles: { title: string; fileName: string; fileSize: string; clauseId: string }[];
  }) {
    return request<{ success: boolean; applicationId: string; application: any }>('/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async transitionStage(applicationId: string, newStage: WorkflowStage, note: string) {
    return request<{ success: boolean; application: any }>(`/applications/${applicationId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ newStage, note }),
    });
  },

  // Documents & OCR
  async validateDocument(documentId: string) {
    return request<{
      success: boolean;
      passed: boolean;
      validationState: string;
      crossDocStatus: string;
      ruleEvaluationStatus: string;
      summary: string;
      findingsTriggered: any[];
    }>(`/documents/${documentId}/validate`, {
      method: 'POST',
    });
  },

  async remediateDocument(
    documentId: string,
    params: {
      fileName: string;
      fileSize: string;
      correctedDateValue: string;
      changeNote: string;
    }
  ) {
    return request<{ success: boolean; message: string; version: string }>(
      `/documents/${documentId}/remediate`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  async verifyIssuer(documentId: string, status: IssuerVerificationStatus, note: string) {
    return request<{ success: boolean; document: any }>(`/documents/${documentId}/verify-issuer`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  },

  async confirmField(
    documentId: string,
    params: { fieldId: string; newValue?: string; comment?: string }
  ) {
    return request<{ success: boolean; field: any }>(`/documents/${documentId}/confirm-field`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async addDocumentNote(documentId: string, note: string) {
    return request<{ success: boolean; note: any }>(`/documents/${documentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // Findings
  async resolveFinding(findingId: string, decisionNote: string) {
    return request<{ success: boolean; finding: any }>(`/findings/${findingId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decisionNote }),
    });
  },

  // Tasks
  async createTask(input: {
    findingId: string;
    applicationId: string;
    title: string;
    description: string;
    assigneeName: string;
    assigneeRole: UserRole;
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    dueDate: string;
    requiredAction: string;
  }) {
    return request<{ success: boolean; task: any; taskId: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTaskStatus(
    taskId: string,
    status: 'Open' | 'In Progress' | 'Awaiting Verification' | 'Completed' | 'Overdue',
    comment?: string
  ) {
    return request<{ success: boolean; task: any }>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    });
  },

  // Rules
  async publishRuleSet(ruleSetId: string, approvalNote: string) {
    return request<{ success: boolean; ruleSet: any }>(`/rules/${ruleSetId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ approvalNote }),
    });
  },

  // Alerts
  async acknowledgeAlert(alertId: string) {
    return request<{ success: boolean; alert: any }>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  },

  async retryAlert(alertId: string) {
    return request<{ success: boolean; alert: any }>(`/alerts/${alertId}/retry`, {
      method: 'POST',
    });
  },

  // Regulatory Copilot
  async queryCopilot(question: string, applicationId?: string) {
    return request<{
      mode: string;
      model: string;
      generatedAt: string;
      data: any;
    }>('/copilot/query', {
      method: 'POST',
      body: JSON.stringify({ question, applicationId }),
    });
  },

  // ==========================================
  // FEATURE 1: ChronoGraph
  // ==========================================
  async analyzeApplicationClaims(applicationId: string) {
    return request<{
      success: boolean;
      applicationId: string;
      totalClaims: number;
      claims: any[];
      totalContradictions: number;
      contradictions: any[];
    }>(`/applications/${applicationId}/analyze`, { method: 'POST' });
  },

  async getClaimGraph(applicationId: string) {
    return request<{
      success: boolean;
      applicationId: string;
      applicationCode?: string;
      nodes: any[];
      edges: any[];
      contradictionsCount: number;
    }>(`/applications/${applicationId}/claim-graph`);
  },

  async getContradictions(applicationId: string) {
    return request<{
      success: boolean;
      applicationId: string;
      contradictionsCount: number;
      contradictions: any[];
    }>(`/applications/${applicationId}/contradictions`);
  },

  // ==========================================
  // FEATURE 3: DeltaScan
  // ==========================================
  async reprocessDelta(documentId: string, formData?: FormData) {
    if (formData) {
      const url = `${BASE_URL}/documents/${documentId}/reprocess-delta`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json();
    }
    return request<{
      success: boolean;
      documentId: string;
      logId: string;
      reprocessingPlan: any;
      metrics: any;
    }>(`/documents/${documentId}/reprocess-delta`, { method: 'POST' });
  },

  // ==========================================
  // FEATURE 2: RuleReplay
  // ==========================================
  async compareRegulations(sourceRulesetCode: string, targetRulesetCode: string) {
    return request<{
      success: boolean;
      comparisonId: string;
      comparison: any;
    }>('/regulations/compare', {
      method: 'POST',
      body: JSON.stringify({ sourceRulesetCode, targetRulesetCode }),
    });
  },

  async replayRegulations(version: string, targetRulesetCode: string) {
    return request<{
      success: boolean;
      reportId: string;
      impactReport: any;
    }>(`/regulations/${version}/replay`, {
      method: 'POST',
      body: JSON.stringify({ targetRulesetCode }),
    });
  },

  async getImpactReport(id: string) {
    return request<{
      success: boolean;
      report: any;
    }>(`/regulations/impact-reports/${id}`);
  },

  async publishImpactReport(id: string, approvalNote: string) {
    return request<{
      success: boolean;
      report: any;
    }>(`/regulations/impact-reports/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ approvalNote }),
    });
  },

  // ==========================================
  // FEATURE 4: FixPreview
  // ==========================================
  async simulateFixPreview(findingId: string, proposedFieldKey: string, proposedValue: string) {
    return request<{
      success: boolean;
      previewId: string;
      findingId: string;
      originalValue: string;
      proposedValue: string;
      isHypothetical: boolean;
      hypotheticalStatus: string;
      remainingConflicts: string[];
      requiredEvidenceGuidance: string;
      previewOutcomeSummary: string;
      notice: string;
    }>(`/findings/${findingId}/fix-preview`, {
      method: 'POST',
      body: JSON.stringify({ proposedFieldKey, proposedValue }),
    });
  },

  // ==========================================
  // FEATURE 5: ReviewPilot
  // ==========================================
  async getPrioritizedReviewQueue() {
    return request<{
      success: boolean;
      totalApplicationsPrioritized: number;
      scoringMethodology: string;
      items: any[];
    }>('/review-queue/prioritized');
  },

  // ==========================================
  // FEATURE 6: Proofline
  // ==========================================
  async getProvenanceManifest(id: string) {
    return request<{
      success: boolean;
      manifest: any;
    }>(`/assessments/${id}/provenance`);
  },

  async verifyProvenanceChain(id: string) {
    return request<{
      success: boolean;
      valid: boolean;
      chainLength: number;
      latestHash: string;
      rootHash: string;
      verifiedAt: string;
      status: string;
      message: string;
    }>(`/provenance/${id}/verify`, { method: 'POST' });
  },

  // ==========================================
  // FEATURE 7: Settings & System Control Center
  // ==========================================
  async getSettings() {
    return request<{ settings: any; runtimeMetadata: any }>('/settings');
  },

  async updateGeneralSettings(data: any) {
    return request<{ success: boolean; settings: any; message: string }>('/settings/general', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getProcessingSettings() {
    return request<any>('/settings/processing');
  },

  async updateProcessingSettings(data: any) {
    return request<{ success: boolean; processing: any; message: string }>('/settings/processing', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateRetentionSettings(data: any) {
    return request<{ success: boolean; settings: any; message: string }>('/settings/retention', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getMlModels() {
    return request<{ models: any[]; hardware: any }>('/ml/models');
  },

  async updateModelConfig(modelId: string, data: any) {
    return request<{ success: boolean; model: any }>(`/ml/models/${modelId}/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async enableModel(modelId: string) {
    return request<{ success: boolean; model: any; message: string }>(`/ml/models/${modelId}/enable`, {
      method: 'POST',
    });
  },

  async disableModel(modelId: string) {
    return request<{ success: boolean; model: any; message: string }>(`/ml/models/${modelId}/disable`, {
      method: 'POST',
    });
  },

  async reloadModel(modelId: string) {
    return request<{ success: boolean; reloadResult: any; message: string }>(`/ml/models/${modelId}/reload`, {
      method: 'POST',
    });
  },

  async evaluateModel(modelId: string) {
    return request<{ success: boolean; evaluation: any }>(`/ml/models/${modelId}/evaluate`, {
      method: 'POST',
    });
  },

  async activateModel(modelId: string, version: string, metrics?: any) {
    return request<{ success: boolean; model: any; message: string }>(`/ml/models/${modelId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ version, metrics }),
    });
  },

  async restoreModel(modelId: string) {
    return request<{ success: boolean; model: any; message: string }>(`/ml/models/${modelId}/restore`, {
      method: 'POST',
    });
  },

  async getDatasets() {
    return request<{ datasets: any[] }>('/ml/datasets');
  },

  async startTraining(data: { modelId: string; datasetId: string; epochs?: number; learningRate?: number; batchSize?: number }) {
    return request<{ success: boolean; jobId: string; job: any; message: string }>('/ml/training', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTrainingJob(jobId: string) {
    return request<{ job: any }>(`/ml/training/${jobId}`);
  },

  async cancelTrainingJob(jobId: string) {
    return request<{ success: boolean; job: any }>(`/ml/training/${jobId}/cancel`, {
      method: 'POST',
    });
  },

  async getTrainingHistory() {
    return request<{ jobs: any[] }>('/ml/training-history');
  },

  async getSystemHealth() {
    return request<{
      status: string;
      checkedAt: string;
      totalLatencyMs: number;
      services: Record<string, any>;
      storage: any;
    }>('/system/health');
  },

  async getSystemStorage() {
    return request<any>('/system/storage');
  },

  async getSettingsAudit() {
    return request<{ events: any[] }>('/settings/audit');
  },
};

