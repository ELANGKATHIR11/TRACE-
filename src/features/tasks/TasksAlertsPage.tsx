import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  GitBranch,
  Briefcase,
  Bell,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { WorkflowManagementPage } from '../workflows/WorkflowManagementPage';
import { MyWorkPage } from '../dashboard/MyWorkPage';
import { AlertCenterPage } from '../alerts/AlertCenterPage';
import { ComplianceCalendarPage } from '../compliance/ComplianceCalendarPage';

export const TasksAlertsPage: React.FC = () => {
  const { state } = useTraceStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'my-work'
      ? 'my-work'
      : tabParam === 'alerts'
      ? 'alerts'
      : tabParam === 'calendar'
      ? 'calendar'
      : 'board';

  const setTab = (tab: 'board' | 'my-work' | 'alerts' | 'calendar') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const unreadAlertsCount = state.alerts.filter((a) => !a.isRead).length;
  const myTasksCount = state.tasks.filter((t) => t.status !== 'Completed').length;
  const overdueCount = state.tasks.filter((t) => t.status === 'Overdue').length;

  return (
    <div className="space-y-6">
      {/* 4 Consolidated Navigation Tabs for Page 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs">
          <button
            onClick={() => setTab('board')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Workflow & Kanban Board</span>
            {overdueCount > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-red-700">
                {overdueCount} overdue
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('my-work')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              activeTab === 'my-work'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>My Workbench</span>
            {myTasksCount > 0 && (
              <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#0F766E]">
                {myTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('alerts')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Alert Center & Escalations</span>
            {unreadAlertsCount > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('calendar')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Compliance Calendar</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block font-mono">
          Stage SLAs: 21 Days Max · Escalation: 48h
        </div>
      </div>

      {/* Render active sub-view */}
      {activeTab === 'board' && <WorkflowManagementPage />}
      {activeTab === 'my-work' && <MyWorkPage />}
      {activeTab === 'alerts' && <AlertCenterPage />}
      {activeTab === 'calendar' && <ComplianceCalendarPage />}
    </div>
  );
};
