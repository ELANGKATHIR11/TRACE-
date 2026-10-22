import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TraceStoreProvider } from './lib/store';
import { AppShell } from './components/layout/AppShell';
import { ControlTowerPage } from './features/dashboard/ControlTowerPage';
import { MyWorkPage } from './features/dashboard/MyWorkPage';
import { ApplicationsPage } from './features/applications/ApplicationsPage';
import { ApplicationIntakePage } from './features/applications/ApplicationIntakePage';
import { DocumentIntelligencePage } from './features/document-intelligence/DocumentIntelligencePage';
import { VerificationQueuePage } from './features/verification/VerificationQueuePage';
import { ComplianceCenterPage } from './features/compliance/ComplianceCenterPage';
import { ComplianceCalendarPage } from './features/compliance/ComplianceCalendarPage';
import { RegulatoryRulebookPage } from './features/rules/RegulatoryRulebookPage';
import { RegulatoryCopilotPage } from './features/copilot/RegulatoryCopilotPage';
import { WorkflowManagementPage } from './features/workflows/WorkflowManagementPage';
import { AlertCenterPage } from './features/alerts/AlertCenterPage';
import { InstitutionsPage } from './features/institutions/InstitutionsPage';
import { AnalyticsReportsPage } from './features/analytics/AnalyticsReportsPage';
import { AuditTrailPage } from './features/audit/AuditTrailPage';
import { AdministrationPage } from './features/administration/AdministrationPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ControlTowerPage />} />
        <Route path="/my-work" element={<MyWorkPage />} />
        <Route path="/alerts" element={<AlertCenterPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/intake" element={<ApplicationIntakePage />} />
        <Route path="/document-intelligence" element={<DocumentIntelligencePage />} />
        <Route path="/verification-queue" element={<VerificationQueuePage />} />
        <Route path="/compliance" element={<ComplianceCenterPage />} />
        <Route path="/rules" element={<RegulatoryRulebookPage />} />
        <Route path="/calendar" element={<ComplianceCalendarPage />} />
        <Route path="/copilot" element={<RegulatoryCopilotPage />} />
        <Route path="/workflows" element={<WorkflowManagementPage />} />
        <Route path="/institutions" element={<InstitutionsPage />} />
        <Route path="/analytics" element={<AnalyticsReportsPage />} />
        <Route path="/audit" element={<AuditTrailPage />} />
        <Route path="/admin/users" element={<AdministrationPage />} />
        <Route path="/admin/rules-config" element={<AdministrationPage />} />
        <Route path="/admin/settings" element={<AdministrationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TraceStoreProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="bottom-right" richColors closeButton />
        </BrowserRouter>
      </TraceStoreProvider>
    </QueryClientProvider>
  );
}
