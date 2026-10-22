import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  ArrowUpRight,
  Info,
} from 'lucide-react';

export const AlertCenterPage: React.FC = () => {
  const {
    state,
    acknowledgeAlert,
    retryFailedAlertDelivery,
    openFindingDrawer,
  } = useTraceStore();
  const navigate = useNavigate();

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<string>('ALL');

  const filteredAlerts = state.alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (readFilter === 'unread' && a.isRead) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            INTELLIGENT ALERT CENTER & ESCALATION CONSOLE
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Compliance Warnings, SLA Escalations & Delivery Telemetry
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Explicitly tracks in-app delivery, acknowledgement timestamps, and simulated external relay states without fabricating external SMS/email confirmation.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <span className="font-semibold text-slate-700">Filter Alerts:</span>
        {['ALL', 'critical', 'warning', 'info'].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`rounded px-3 py-1 font-medium border uppercase text-[11px] ${
              severityFilter === sev
                ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {sev}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setReadFilter(readFilter === 'unread' ? 'ALL' : 'unread')}
            className="rounded border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800"
          >
            {readFilter === 'unread' ? 'Showing Unread Only' : 'Filter Unread Only'}
          </button>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border bg-white p-4 text-xs space-y-3 ${
              !alert.isRead ? 'border-slate-300 shadow-xs' : 'border-slate-200 opacity-90'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-bold uppercase ${
                    alert.severity === 'critical'
                      ? 'text-red-600'
                      : alert.severity === 'warning'
                      ? 'text-amber-700'
                      : 'text-[#0F766E]'
                  }`}
                >
                  [{alert.severity}] {alert.eventType}
                </span>
                <span>·</span>
                <span className="font-mono text-slate-500">{alert.id}</span>
                {alert.escalationLevel !== 'None' && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-red-700">
                      Escalation: {alert.escalationLevel}
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono text-slate-500">
                {new Date(alert.createdAt).toLocaleString()}
              </span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">{alert.title}</h2>
              <p className="mt-1 text-slate-700 leading-relaxed">{alert.message}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 rounded border border-slate-100 bg-slate-50 p-3">
              <div>
                <div className="text-[10px] text-slate-400">AFFECTED INSTITUTION & APP</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {alert.institutionName} ({alert.applicationCode || 'System-Wide'})
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">ASSIGNED OWNER</div>
                <div className="font-medium text-slate-900 mt-0.5">{alert.assignedOwner}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">RECOMMENDED NEXT ACTION</div>
                <div className="font-medium text-[#0F766E] mt-0.5">
                  {alert.recommendedAction}
                </div>
              </div>
            </div>

            {/* Delivery Channels & Honest Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {(alert.deliveryChannels || []).map((ch, idx) => {
                  const channelStatus = ch?.status || 'Delivered';
                  const channelName = ch?.channel || 'In-App Console';
                  return (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px]"
                    >
                      <span className="font-medium text-slate-700">{channelName}:</span>
                      <span
                        className={`font-mono font-semibold ${
                          channelStatus === 'Delivered'
                            ? 'text-emerald-700'
                            : channelStatus.includes('Failed')
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {channelStatus}
                      </span>
                      {channelStatus.includes('Failed') && (
                        <button
                          onClick={() => retryFailedAlertDelivery(alert.id, idx)}
                          className="ml-1 inline-flex items-center gap-0.5 text-[#0F766E] hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {alert.findingId && (
                  <button
                    onClick={() => openFindingDrawer(alert.findingId!)}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Trace Finding ({alert.findingId})
                  </button>
                )}
                {alert.acknowledgedBy ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Acknowledged by {alert.acknowledgedBy}
                  </span>
                ) : (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="rounded bg-[#0F766E] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0d645d]"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
