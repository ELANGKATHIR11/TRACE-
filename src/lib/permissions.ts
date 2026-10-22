import { UserRole, WorkflowStage } from '../types/domain';

export interface RolePermissionMatrix {
  canCreateApplication: boolean;
  canUploadRemediationDocument: boolean;
  canRunValidation: boolean;
  canConfirmOrEditExtraction: boolean;
  canAssignCorrectiveTask: boolean;
  canResolveFinding: boolean;
  canTransitionWorkflowStage: boolean;
  canPublishRuleSet: boolean;
  canAcknowledgeAlerts: boolean;
  canManageUsersAndSettings: boolean;
  isReadOnlyAuditor: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionMatrix> = {
  authorized_reviewer: {
    canCreateApplication: false,
    canUploadRemediationDocument: false,
    canRunValidation: true,
    canConfirmOrEditExtraction: true,
    canAssignCorrectiveTask: true,
    canResolveFinding: true,
    canTransitionWorkflowStage: true,
    canPublishRuleSet: false,
    canAcknowledgeAlerts: true,
    canManageUsersAndSettings: false,
    isReadOnlyAuditor: false,
  },
  institution_compliance_officer: {
    canCreateApplication: true,
    canUploadRemediationDocument: true,
    canRunValidation: true,
    canConfirmOrEditExtraction: false,
    canAssignCorrectiveTask: false,
    canResolveFinding: false,
    canTransitionWorkflowStage: false,
    canPublishRuleSet: false,
    canAcknowledgeAlerts: true,
    canManageUsersAndSettings: false,
    isReadOnlyAuditor: false,
  },
  institution_administrator: {
    canCreateApplication: true,
    canUploadRemediationDocument: true,
    canRunValidation: true,
    canConfirmOrEditExtraction: false,
    canAssignCorrectiveTask: true,
    canResolveFinding: false,
    canTransitionWorkflowStage: false,
    canPublishRuleSet: false,
    canAcknowledgeAlerts: true,
    canManageUsersAndSettings: false,
    isReadOnlyAuditor: false,
  },
  regulatory_system_administrator: {
    canCreateApplication: true,
    canUploadRemediationDocument: true,
    canRunValidation: true,
    canConfirmOrEditExtraction: true,
    canAssignCorrectiveTask: true,
    canResolveFinding: true,
    canTransitionWorkflowStage: true,
    canPublishRuleSet: true,
    canAcknowledgeAlerts: true,
    canManageUsersAndSettings: true,
    isReadOnlyAuditor: false,
  },
  auditor: {
    canCreateApplication: false,
    canUploadRemediationDocument: false,
    canRunValidation: false,
    canConfirmOrEditExtraction: false,
    canAssignCorrectiveTask: false,
    canResolveFinding: false,
    canTransitionWorkflowStage: false,
    canPublishRuleSet: false,
    canAcknowledgeAlerts: false,
    canManageUsersAndSettings: false,
    isReadOnlyAuditor: true,
  },
};

export function getPermissions(role: UserRole): RolePermissionMatrix {
  return ROLE_PERMISSIONS[role];
}

export const WORKFLOW_STAGES_ORDERED: WorkflowStage[] = [
  'Draft',
  'Validation in progress',
  'Corrections required',
  'Ready for authorized review',
  'Under review',
  'Awaiting additional evidence',
  'Review completed',
  'Authorized outcome recorded',
];

export function canRoleTransitionToStage(role: UserRole, targetStage: WorkflowStage): boolean {
  if (role === 'auditor') return false;
  if (role === 'institution_compliance_officer' || role === 'institution_administrator') {
    return targetStage === 'Draft' || targetStage === 'Validation in progress' || targetStage === 'Ready for authorized review';
  }
  return true;
}
