import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  LayoutDashboard,
  Briefcase,
  Bell,
  FolderKanban,
  FilePlus2,
  ScanSearch,
  ClipboardCheck,
  ShieldCheck,
  BookOpen,
  CalendarClock,
  Bot,
  GitBranch,
  Building2,
  BarChart3,
  History,
  Users,
  Sliders,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Cpu,
  UserCircle2,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { EvidenceToActionDrawer } from '../traceability/EvidenceToActionDrawer';

interface NavGroup {
  groupLabel: string;
  items: {
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | string;
  }[];
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    setEngineMode,
    switchDemoUserRole,
    resetDemoDataset,
    openFindingDrawer,
  } = useTraceStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDemoWalkthrough, setShowDemoWalkthrough] = useState(true);

  const unreadAlertsCount = state.alerts.filter((a) => !a.isRead).length;
  const openFindingsCount = state.findings.filter((f) => f.status !== 'Resolved').length;
  const myTasksCount = state.tasks.filter((t) => t.status !== 'Completed').length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navGroups: NavGroup[] = [
    {
      groupLabel: 'OVERVIEW',
      items: [
        { label: 'Control Tower', path: '/', icon: LayoutDashboard },
        { label: 'My Work', path: '/my-work', icon: Briefcase, badge: myTasksCount },
        { label: 'Notifications', path: '/alerts', icon: Bell, badge: unreadAlertsCount },
      ],
    },
    {
      groupLabel: 'APPLICATION MANAGEMENT',
      items: [
        { label: 'Applications', path: '/applications', icon: FolderKanban },
        { label: 'Application Intake', path: '/intake', icon: FilePlus2 },
        { label: 'Document Intelligence', path: '/document-intelligence', icon: ScanSearch },
        {
          label: 'Verification Queue',
          path: '/verification-queue',
          icon: ClipboardCheck,
          badge: openFindingsCount,
        },
      ],
    },
    {
      groupLabel: 'COMPLIANCE',
      items: [
        { label: 'Compliance Center', path: '/compliance', icon: ShieldCheck },
        { label: 'Regulatory Rulebook', path: '/rules', icon: BookOpen },
        { label: 'Compliance Calendar', path: '/calendar', icon: CalendarClock },
        { label: 'Regulatory Copilot', path: '/copilot', icon: Bot },
      ],
    },
    {
      groupLabel: 'OPERATIONS',
      items: [
        { label: 'Workflow Management', path: '/workflows', icon: GitBranch },
        { label: 'Institutions', path: '/institutions', icon: Building2 },
        { label: 'Reports & Analytics', path: '/analytics', icon: BarChart3 },
        { label: 'Audit Trail', path: '/audit', icon: History },
      ],
    },
    {
      groupLabel: 'ADMINISTRATION',
      items: [
        { label: 'Users & Roles', path: '/admin/users', icon: Users },
        { label: 'Rule Configuration', path: '/admin/rules-config', icon: Sliders },
        { label: 'System Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  // Calculate current step in the 10/13-Step Live Demo Journey
  const targetFinding = state.findings.find((f) => f.id === 'FND-2026-001');
  const targetDoc = state.documents.find((d) => d.id === 'DOC-2026-101');
  const hasTaskAssigned = Boolean(targetFinding?.assignedTaskId);
  const hasRemediationUploaded =
    (targetDoc?.versions.length || 1) > 1 || targetFinding?.status === 'Remediation Uploaded';
  const hasValidationPassed = targetDoc?.validationState === 'Validated';
  const isFindingResolved = targetFinding?.status === 'Resolved';

  const currentBreadcrumb =
    navGroups
      .flatMap((g) => g.items)
      .find((i) => i.path === location.pathname)?.label || 'Workspace';

  const searchResults = searchQuery.trim()
    ? [
        ...state.applications
          .filter(
            (a) =>
              a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.programName.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((a) => ({
            type: 'Application',
            id: a.id,
            label: `${a.code} — ${a.programName}`,
            sub: `${a.institutionName} · ${a.workflowStage}`,
            onSelect: () => navigate(`/applications?appId=${a.id}`),
          })),
        ...state.findings
          .filter(
            (f) =>
              f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.clauseId.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((f) => ({
            type: 'Finding',
            id: f.id,
            label: `${f.id} — ${f.title}`,
            sub: `Clause ${f.clauseId} · Status: ${f.status}`,
            onSelect: () => openFindingDrawer(f.id),
          })),
        ...state.documents
          .filter(
            (d) =>
              d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((d) => ({
            type: 'Document',
            id: d.id,
            label: `${d.id} — ${d.title}`,
            sub: `${d.validationState} · Version ${d.currentVersion}`,
            onSelect: () => navigate(`/document-intelligence?docId=${d.id}`),
          })),
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-[#F6F8FB] text-[#172033]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#101B2D] text-slate-200 border-r border-slate-800 transition-all duration-150 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
        aria-label="Primary Sidebar Navigation"
      >
        {/* Brand Identity */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap overflow-hidden focus-visible:outline-2 focus-visible:outline-teal-400 rounded"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0F766E] text-white font-display font-bold text-sm border border-[#14B8A6]/40">
              TR
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="font-display text-base font-bold tracking-tight text-white leading-none">
                  TRACE
                </div>
                <div className="text-[10px] text-slate-400 tracking-tight mt-0.5">
                  Regulatory Assurance Engine
                </div>
              </div>
            )}
          </NavLink>
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.groupLabel}>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">
                  {group.groupLabel}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-[#0F766E] text-white'
                            : 'text-slate-300 hover:bg-[#1A2942] hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!sidebarCollapsed && item.badge !== undefined && Number(item.badge) > 0 && (
                        <span className="ml-2 font-mono text-[11px] font-semibold text-teal-200">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Active Demo Environment Notice */}
        {!sidebarCollapsed && (
          <div className="border-t border-slate-800/80 p-3 text-[11px] text-slate-400">
            <div className="font-medium text-slate-200">SIH 2026 Prototype Environment</div>
            <p className="mt-0.5 leading-snug text-slate-400">
              Synthetic regulatory dataset. Not affiliated with or endorsed by official AICTE portals.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60">
          <div className="flex w-72 flex-col bg-[#101B2D] text-white h-full p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-display font-bold text-lg">TRACE</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-300 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {navGroups.map((group) => (
                <div key={group.groupLabel}>
                  <div className="text-[10px] font-semibold text-slate-400 mb-1">
                    {group.groupLabel}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }: { isActive: boolean }) =>
                            `flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium ${
                              isActive
                                ? 'bg-[#0F766E] text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-4 lg:px-6">
          {/* Left: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
              <span className="font-medium text-slate-500">TRACE</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentBreadcrumb}</span>
            </nav>
          </div>

          {/* Center: Global Search & Command Trigger */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <button
              onClick={() => setCommandOpen(true)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-[#F6F8FB] px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                Search applications, findings, clauses, documents...
              </span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right: Hybrid Engine Mode Toggle + Demo Role Switcher + Notifications + Reset */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Hybrid Engine Toggle (Confirmed Decision 1) */}
            <div
              className="hidden sm:flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs"
              role="group"
              aria-label="Validation and Copilot Engine Mode"
            >
              <button
                onClick={() => setEngineMode('demo')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  state.engineMode === 'demo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Deterministic statutory rules engine & RAG (100% offline)"
              >
                <Cpu className="h-3 w-3 text-[#0F766E]" />
                Offline Rules & RAG
              </button>
              <button
                onClick={() => setEngineMode('live_ai')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  state.engineMode === 'live_ai'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Local offline AI via Ollama / dgpu-core (100% offline)"
              >
                <Sparkles className="h-3 w-3" />
                Local Offline AI
              </button>
            </div>

            {/* Explicitly Labelled Demo Role Switcher */}
            <div className="flex items-center gap-1.5 rounded-md border border-teal-700/30 bg-teal-50/60 px-2.5 py-1">
              <UserCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
              <div className="text-[10px] leading-tight hidden xl:block">
                <span className="font-semibold text-[#0F766E]">DEMO ROLE:</span>
              </div>
              <select
                aria-label="Switch Active Demonstration User Role"
                value={state.currentUser.id}
                onChange={(e) => switchDemoUserRole(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer max-w-[195px] truncate"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.roleLabel} — {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications Bell */}
            <button
              onClick={() => navigate('/alerts')}
              className="relative rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              aria-label={`Notifications (${unreadAlertsCount} unread)`}
              title="Open Alert Center"
            >
              <Bell className="h-4 w-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Reset Demo State Button */}
            <button
              onClick={resetDemoDataset}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              title="Reset demonstration dataset to initial baseline"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden xl:inline">Reset Demo</span>
            </button>
          </div>
        </header>

        {/* Interactive 10/13-Step Demonstration Walkthrough Ribbon */}
        {showDemoWalkthrough && (
          <div className="border-b border-slate-200 bg-slate-900 px-4 lg:px-6 py-2 text-xs text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="font-semibold text-white">
                  SIH 2026 Interactive Demo Flow (APP-2026-0842):
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  onClick={() => navigate('/document-intelligence?docId=DOC-2026-101&page=2')}
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700 text-slate-200"
                >
                  <span>1. Inspect Date Mismatch (DOC-2026-101)</span>
                </button>
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <button
                  onClick={() => openFindingDrawer('FND-2026-001')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                    hasTaskAssigned
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      : 'bg-teal-900/80 text-teal-100 hover:bg-teal-800'
                  }`}
                >
                  {hasTaskAssigned && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  <span>2. Open Rule & Assign Task</span>
                </button>
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <button
                  onClick={() => {
                    switchDemoUserRole('USR-ICO-01');
                    navigate('/document-intelligence?docId=DOC-2026-101&page=2');
                  }}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                    hasRemediationUploaded
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {hasRemediationUploaded && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  <span>3. Switch to Institution Officer & Upload v2.0</span>
                </button>
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <button
                  onClick={() => navigate('/document-intelligence?docId=DOC-2026-101&page=2')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                    hasValidationPassed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {hasValidationPassed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  <span>4. Run Validation</span>
                </button>
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <button
                  onClick={() => {
                    switchDemoUserRole('USR-REV-01');
                    openFindingDrawer('FND-2026-001');
                  }}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                    isFindingResolved
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {isFindingResolved && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  <span>5. Switch to Reviewer & Resolve Finding</span>
                </button>
              </div>

              <button
                onClick={() => setShowDemoWalkthrough(false)}
                className="text-slate-400 hover:text-white text-[11px]"
                aria-label="Hide demo guide"
              >
                Hide Guide
              </button>
            </div>
          </div>
        )}

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette & Search Modal */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 pt-20 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Global Command Palette and Search"
        >
          <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center border-b border-slate-200 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400 mr-2.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Application ID (APP-2026-0842), Finding (FND-2026-001), Clause, or Institution..."
                className="w-full text-sm text-slate-900 focus:outline-none"
              />
              <button
                onClick={() => setCommandOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 ml-2"
              >
                Esc
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {searchQuery.trim() === '' ? (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-slate-400">
                    QUICK NAVIGATION & DEMO ACTIONS
                  </div>
                  <button
                    onClick={() => {
                      setCommandOpen(false);
                      openFindingDrawer('FND-2026-001');
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    <span className="font-medium text-slate-900">
                      Inspect Finding FND-2026-001 (Cross-Document Date Mismatch)
                    </span>
                    <span className="font-mono text-[11px] text-[#0F766E]">Evidence-to-Action</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommandOpen(false);
                      navigate('/document-intelligence?docId=DOC-2026-101&page=2');
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    <span className="font-medium text-slate-900">
                      Open AI Document Intelligence — DOC-2026-101 Page 2
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">Workbench</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommandOpen(false);
                      navigate('/intake');
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    <span className="font-medium text-slate-900">
                      Start New 8-Stage Application Intake
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">/intake</span>
                  </button>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching records found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      setCommandOpen(false);
                      item.onSelect();
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.sub}</div>
                    </div>
                    <span className="font-mono text-[11px] text-[#0F766E]">{item.type}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Evidence-to-Action Traceability Drawer */}
      <EvidenceToActionDrawer />
    </div>
  );
};
