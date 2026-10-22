import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TraceStoreProvider } from './lib/store';
import { AppShell } from './components/layout/AppShell';

// EXACTLY SEVEN PRIMARY APPLICATION PAGES
import { ControlTowerPage } from './features/dashboard/ControlTowerPage';
import { ApplicationsPage } from './features/applications/ApplicationsPage';
import { VerificationPage } from './features/verification/VerificationPage';
import { CompliancePage } from './features/compliance/CompliancePage';
import { TasksAlertsPage } from './features/tasks/TasksAlertsPage';
import { ReportsAuditPage } from './features/reports/ReportsAuditPage';
import { SettingsPage } from './features/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Trace ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 rounded-xl border border-red-200 bg-white shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Page Rendering Notice</h2>
          <p className="mt-1 text-xs text-slate-600">
            A temporary component view error occurred while rendering this page.
          </p>
          <div className="mt-4 p-3 rounded bg-slate-50 border border-slate-200 text-left font-mono text-[11px] text-red-600 overflow-x-auto">
            {this.state.error?.message || 'Unknown runtime error'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-5 rounded-md bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d645d] transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppRoutes() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Routes>
          {/* EXACTLY SEVEN PRIMARY CANONICAL APPLICATION ROUTES */}
          <Route path="/dashboard" element={<ControlTowerPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/tasks" element={<TasksAlertsPage />} />
          <Route path="/reports" element={<ReportsAuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* PRESERVED LEGACY & SUB-MODULE REDIRECTS WITH CONTEXTUAL TAB MAPPINGS */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/my-work" element={<Navigate to="/tasks?tab=my-work" replace />} />
          <Route path="/alerts" element={<Navigate to="/tasks?tab=alerts" replace />} />
          <Route path="/workflows" element={<Navigate to="/tasks?tab=board" replace />} />
          <Route path="/calendar" element={<Navigate to="/tasks?tab=calendar" replace />} />
          <Route path="/intake" element={<Navigate to="/applications?tab=intake" replace />} />
          <Route path="/institutions" element={<Navigate to="/applications?tab=institutions" replace />} />
          <Route path="/document-intelligence" element={<Navigate to="/verification?tab=studio" replace />} />
          <Route path="/verification-queue" element={<Navigate to="/verification?tab=queue" replace />} />
          <Route path="/rules" element={<Navigate to="/compliance?tab=rules" replace />} />
          <Route path="/copilot" element={<Navigate to="/compliance?tab=copilot" replace />} />
          <Route path="/analytics" element={<Navigate to="/reports?tab=analytics" replace />} />
          <Route path="/audit" element={<Navigate to="/reports?tab=audit" replace />} />
          <Route path="/admin/*" element={<Navigate to="/settings" replace />} />
          <Route path="/admin" element={<Navigate to="/settings" replace />} />

          {/* CATCH-ALL REDIRECT */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TraceStoreProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px',
              },
            }}
          />
        </BrowserRouter>
      </TraceStoreProvider>
    </QueryClientProvider>
  );
}
