import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  TraceStateStore,
  EngineMode,
  UserRole,
  WorkflowStage,
  IssuerVerificationStatus,
  ApplicationCategory,
  AcademicYear,
  CopilotMessage,
} from '../types/domain';
import { api } from './api-client';
import { toast } from 'sonner';

export interface CreateTaskInput {
  findingId: string;
  applicationId: string;
  title: string;
  description: string;
  assigneeName: string;
  assigneeRole: UserRole;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  dueDate: string;
  requiredAction: string;
}

export interface CreateApplicationInput {
  institutionId: string;
  category: ApplicationCategory;
  academicYear: AcademicYear;
  programName: string;
  requestedIntake: number;
  currentIntake: number;
  ruleSetId: string;
  submitImmediately: boolean;
  uploadedFiles: { title: string; fileName: string; fileSize: string; clauseId: string }[];
}

interface TraceStoreContextValue {
  state: TraceStateStore;
  isLoading: boolean;
  refreshState: () => Promise<void>;
  activeFindingDrawerId: string | null;
  openFindingDrawer: (findingId: string) => void;
  closeFindingDrawer: () => void;
  setEngineMode: (mode: EngineMode) => void;
  switchDemoUserRole: (userId: string) => void;
  resetDemoDataset: () => void;
  createCorrectiveTask: (input: CreateTaskInput) => string;
  uploadCorrectedDocumentVersion: (params: {
    documentId: string;
    fileName: string;
    fileSize: string;
    correctedDateValue: string;
    changeNote: string;
  }) => void;
  runDocumentValidation: (documentId: string) => Promise<{
    passed: boolean;
    mode: EngineMode;
    summary: string;
  }>;
  confirmOrCorrectExtractedField: (params: {
    documentId: string;
    fieldId: string;
    newValue?: string;
    comment?: string;
  }) => void;
  recordIndependentIssuerVerification: (params: {
    documentId: string;
    status: IssuerVerificationStatus;
    note: string;
  }) => void;
  addDocumentReviewerNote: (documentId: string, note: string) => void;
  resolveFinding: (findingId: string, decisionNote: string) => boolean;
  transitionApplicationStage: (
    applicationId: string,
    newStage: WorkflowStage,
    note: string
  ) => boolean;
  updateTaskStatus: (
    taskId: string,
    status: 'Open' | 'In Progress' | 'Awaiting Verification' | 'Completed' | 'Overdue',
    comment?: string
  ) => void;
  acknowledgeAlert: (alertId: string) => void;
  retryFailedAlertDelivery: (alertId: string, channelIndex: number) => void;
  publishRuleSetVersion: (ruleSetId: string, approvalNote: string) => boolean;
  createApplicationFromIntake: (input: CreateApplicationInput) => string;
  sendCopilotQuery: (question: string, applicationId?: string) => Promise<void>;
}

const emptyState: TraceStateStore = {
  engineMode: 'live_ai',
  currentUser: {
    id: 'USR-REV-01',
    name: 'Dr. Arvind Deshmukh',
    role: 'authorized_reviewer',
    roleLabel: 'Authorized Reviewer / Verifier',
    title: 'Senior Scrutiny Lead — Technical Education Cell',
    organization: 'TRACE Regulatory Scrutiny Panel',
    email: 'arvind.deshmukh@trace-scrutiny.demo.in',
    badgeCode: 'REV-LEAD-01',
    permissionsDescription:
      'Authorized to inspect evidence, confirm/correct OCR fields, create & assign corrective tasks, resolve findings, and transition workflow stages.',
  },
  users: [],
  institutions: [],
  applications: [],
  documents: [],
  findings: [],
  tasks: [],
  requirements: [],
  alerts: [],
  auditEvents: [],
  ruleSets: [],
  copilotHistory: [],
};

const TraceStoreContext = createContext<TraceStoreContextValue | undefined>(undefined);

export const TraceStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TraceStateStore>(emptyState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFindingDrawerId, setActiveFindingDrawerId] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const serverState = await api.getState();
      if (serverState && serverState.applications) {
        setState((prev) => ({
          ...serverState,
          copilotHistory: prev.copilotHistory || [],
        }));
      }
    } catch (err: any) {
      console.error('[Store] Failed to fetch server state:', err);
      toast.error(`Database connection issue: ${err.message || 'Unable to sync with PostgreSQL'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const openFindingDrawer = useCallback((findingId: string) => {
    setActiveFindingDrawerId(findingId);
  }, []);

  const closeFindingDrawer = useCallback(() => {
    setActiveFindingDrawerId(null);
  }, []);

  const setEngineMode = useCallback((mode: EngineMode) => {
    setState((prev) => ({
      ...prev,
      engineMode: mode,
    }));
    toast.info(
      mode === 'live_ai'
        ? 'Switched to Local Offline AI & Hardware GPU Processing (/api/*)'
        : 'Switched to Deterministic Offline Rules & Local RAG'
    );
  }, []);

  const switchDemoUserRole = useCallback(
    async (userId: string) => {
      try {
        const res = await api.switchRole(userId);
        if (res.success && res.user) {
          toast.success(`Role switched to ${res.user.roleLabel} (${res.user.name})`);
          await refreshState();
        }
      } catch (err: any) {
        toast.error(`Role switch failed: ${err.message}`);
      }
    },
    [refreshState]
  );

  const resetDemoDataset = useCallback(async () => {
    toast.info('Reloading authoritative dataset from PostgreSQL...');
    await refreshState();
    toast.success('Database state synchronized.');
  }, [refreshState]);

  const createCorrectiveTask = useCallback(
    (input: CreateTaskInput): string => {
      const generatedId = `TSK-${Date.now().toString().slice(-4)}`;
      api
        .createTask(input)
        .then((res) => {
          toast.success(`Task ${res.task.taskCode || generatedId} persisted to database and notification dispatched.`);
          refreshState();
        })
        .catch((err) => {
          toast.error(`Failed to persist corrective task: ${err.message}`);
        });
      return generatedId;
    },
    [refreshState]
  );

  const uploadCorrectedDocumentVersion = useCallback(
    (params: {
      documentId: string;
      fileName: string;
      fileSize: string;
      correctedDateValue: string;
      changeNote: string;
    }) => {
      api
        .remediateDocument(params.documentId, params)
        .then((res) => {
          toast.success(res.message || 'Version v2.0 registered in PostgreSQL.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Remediation upload failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const runDocumentValidation = useCallback(
    async (documentId: string) => {
      try {
        const outcome = await api.validateDocument(documentId);
        await refreshState();
        if (outcome.passed) {
          toast.success('Document validation passed: all deterministic criteria satisfied.');
        } else {
          toast.warning(`Deficiency identified: ${outcome.summary}`);
        }
        return {
          passed: outcome.passed,
          mode: state.engineMode,
          summary: outcome.summary,
        };
      } catch (err: any) {
        toast.error(`Validation error: ${err.message}`);
        return {
          passed: false,
          mode: state.engineMode,
          summary: err.message || 'Validation request failed',
        };
      }
    },
    [refreshState, state.engineMode]
  );

  const confirmOrCorrectExtractedField = useCallback(
    (params: { documentId: string; fieldId: string; newValue?: string; comment?: string }) => {
      api
        .confirmField(params.documentId, params)
        .then(() => {
          toast.success('Extracted field updated and audit trail logged.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Field update failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const recordIndependentIssuerVerification = useCallback(
    (params: { documentId: string; status: IssuerVerificationStatus; note: string }) => {
      api
        .verifyIssuer(params.documentId, params.status, params.note)
        .then(() => {
          toast.success(`Issuer verification status updated to: ${params.status}`);
          refreshState();
        })
        .catch((err) => {
          toast.error(`Issuer verification update failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const addDocumentReviewerNote = useCallback(
    (documentId: string, note: string) => {
      api
        .addDocumentNote(documentId, note)
        .then(() => {
          toast.success('Reviewer note saved to PostgreSQL.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Failed to add note: ${err.message}`);
        });
    },
    [refreshState]
  );

  const resolveFinding = useCallback(
    (findingId: string, decisionNote: string): boolean => {
      api
        .resolveFinding(findingId, decisionNote)
        .then(() => {
          toast.success('Compliance finding marked Resolved in database.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Failed to resolve finding: ${err.message}`);
        });
      return true;
    },
    [refreshState]
  );

  const transitionApplicationStage = useCallback(
    (applicationId: string, newStage: WorkflowStage, note: string): boolean => {
      api
        .transitionStage(applicationId, newStage, note)
        .then(() => {
          toast.success(`Application transitioned to: ${newStage}`);
          refreshState();
        })
        .catch((err) => {
          toast.error(`Stage transition rejected: ${err.message}`);
        });
      return true;
    },
    [refreshState]
  );

  const updateTaskStatus = useCallback(
    (
      taskId: string,
      status: 'Open' | 'In Progress' | 'Awaiting Verification' | 'Completed' | 'Overdue',
      comment?: string
    ) => {
      api
        .updateTaskStatus(taskId, status, comment)
        .then(() => {
          toast.success(`Task status updated to: ${status}`);
          refreshState();
        })
        .catch((err) => {
          toast.error(`Task update failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      api
        .acknowledgeAlert(alertId)
        .then(() => {
          toast.success('Alert acknowledged.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Acknowledge failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const retryFailedAlertDelivery = useCallback(
    (alertId: string, _channelIndex: number) => {
      api
        .retryAlert(alertId)
        .then(() => {
          toast.info('Delivery retry initiated.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Retry failed: ${err.message}`);
        });
    },
    [refreshState]
  );

  const publishRuleSetVersion = useCallback(
    (ruleSetId: string, approvalNote: string): boolean => {
      api
        .publishRuleSet(ruleSetId, approvalNote)
        .then(() => {
          toast.success('Rule set version published and broadcast to all scrutiny workflows.');
          refreshState();
        })
        .catch((err) => {
          toast.error(`Rule publication failed: ${err.message}`);
        });
      return true;
    },
    [refreshState]
  );

  const createApplicationFromIntake = useCallback(
    (input: CreateApplicationInput): string => {
      const generatedCode = `APP-2026-0${Date.now().toString().slice(-4)}`;
      api
        .createApplication(input)
        .then((res) => {
          toast.success(`Application ${res.applicationId || generatedCode} created in PostgreSQL.`);
          refreshState();
        })
        .catch((err) => {
          toast.error(`Intake creation failed: ${err.message}`);
        });
      return generatedCode;
    },
    [refreshState]
  );

  const sendCopilotQuery = useCallback(
    async (question: string, applicationId?: string) => {
      const userMsg: CopilotMessage = {
        id: `COP-U-${Date.now()}`,
        role: 'user',
        timestamp: new Date().toISOString(),
        content: question,
        executionMode: state.engineMode,
      };

      setState((prev) => ({
        ...prev,
        copilotHistory: [...(prev.copilotHistory || []), userMsg],
      }));

      try {
        const response = await api.queryCopilot(question, applicationId);
        const assistantMsg: CopilotMessage = {
          id: `COP-A-${Date.now()}`,
          role: 'assistant',
          timestamp: response.generatedAt || new Date().toISOString(),
          content: response.data.summaryAnswer || 'Analysis complete.',
          executionMode: state.engineMode,
          structuredResponse: {
            summaryAnswer: response.data.summaryAnswer || 'Analysis complete.',
            directlySupportedStatements: response.data.directlySupportedStatements || [],
            systemComputedFindings: response.data.systemComputedFindings || [],
            explanatorySuggestions: response.data.explanatorySuggestions || [],
            uncertaintyWarnings: response.data.uncertaintyWarnings || [],
            recommendedNextActions: response.data.recommendedNextActions || [],
          },
        };

        setState((prev) => ({
          ...prev,
          copilotHistory: [...(prev.copilotHistory || []), assistantMsg],
        }));
      } catch (err: any) {
        toast.error(`Copilot query failed: ${err.message}`);
      }
    },
    []
  );

  return (
    <TraceStoreContext.Provider
      value={{
        state,
        isLoading,
        refreshState,
        activeFindingDrawerId,
        openFindingDrawer,
        closeFindingDrawer,
        setEngineMode,
        switchDemoUserRole,
        resetDemoDataset,
        createCorrectiveTask,
        uploadCorrectedDocumentVersion,
        runDocumentValidation,
        confirmOrCorrectExtractedField,
        recordIndependentIssuerVerification,
        addDocumentReviewerNote,
        resolveFinding,
        transitionApplicationStage,
        updateTaskStatus,
        acknowledgeAlert,
        retryFailedAlertDelivery,
        publishRuleSetVersion,
        createApplicationFromIntake,
        sendCopilotQuery,
      }}
    >
      {children}
    </TraceStoreContext.Provider>
  );
};

export const useTraceStore = (): TraceStoreContextValue => {
  const context = useContext(TraceStoreContext);
  if (!context) {
    throw new Error('useTraceStore must be used within a TraceStoreProvider');
  }
  return context;
};
