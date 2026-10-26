import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTraceStore } from '../../lib/store';
import { Building2, Search, MapPin, Users, FileText, ArrowUpRight, ShieldAlert } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const { state, openFindingDrawer } = useTraceStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialInstId = searchParams.get('id') || state.institutions[0]?.id || '';
  const [search, setSearch] = useState('');
  const [selectedInstId, setSelectedInstId] = useState(initialInstId);

  const filteredInstitutions = state.institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.permanentId.toLowerCase().includes(search.toLowerCase()) ||
      i.city.toLowerCase().includes(search.toLowerCase())
  );

  const activeInst =
    state.institutions.find((i) => i.id === selectedInstId) || filteredInstitutions[0] || null;

  const instApps = state.applications.filter((a) => a.institutionId === activeInst?.id);
  const instFindings = state.findings.filter((f) => f.institutionId === activeInst?.id);
  const instDocs = state.documents.filter((d) => d.institutionId === activeInst?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="text-xs text-slate-500">TECHNICAL INSTITUTION REGISTRY</div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Registered Institutions, Approved Programs & Compliance Dossiers
        </h1>
        <p className="mt-0.5 text-xs text-slate-600">
          360-degree view of institutional identifiers, programs, contacts, submitted documents, and open findings.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Institution Name, Permanent ID, or City..."
          className="w-full rounded border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {filteredInstitutions.map((inst) => {
            const isSelected = inst.id === activeInst?.id;
            return (
              <div
                key={inst.id}
                onClick={() => setSelectedInstId(inst.id)}
                className={`cursor-pointer rounded-lg border p-4 text-xs transition-colors ${
                  isSelected
                    ? 'border-[#0F766E] bg-white ring-2 ring-[#0F766E]/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px] text-[#0F766E]">
                  <span>{inst.permanentId}</span>
                  <span>Est. {inst.establishedYear}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">{inst.name}</div>
                <div className="mt-1 text-slate-600">
                  {inst.city}, {inst.state} · {inst.type}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 font-mono text-[11px] text-slate-500">
                  <span>Findings: {inst.openFindingsCount} open</span>
                  <span>Checklist: {inst.checklistCompletionPct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Profile Dossier (8 cols) */}
        {activeInst && (
          <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-6 space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="font-mono text-xs text-[#0F766E]">
                  Permanent ID: {activeInst.permanentId} · {activeInst.type}
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{activeInst.name}</h2>
                <p className="mt-0.5 text-slate-600 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {activeInst.address}
                </p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-right font-mono shrink-0">
                <div className="text-[10px] text-slate-500">CAMPUS INFRASTRUCTURE</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {activeInst.campusAreaAcres} Acres · {activeInst.builtUpAreaSqm.toLocaleString()} Sq.m
                </div>
              </div>
            </div>

            {/* Approved Technical Programs */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">
                Approved & Applied Technical Programs ({(activeInst.programs || []).length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(activeInst.programs || []).map((prg) => (
                  <div
                    key={prg.id}
                    className="rounded border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="font-semibold text-slate-900">{prg.name}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-600">
                      Intake: {prg.sanctionedIntake} seats · Faculty: {prg.facultyCount}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#0F766E]">
                      {prg.accreditationStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Contacts */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">
                Authorized Compliance & Nodal Contacts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(activeInst.complianceContacts || []).map((c, idx) => (
                  <div key={idx} className="rounded border border-slate-200 p-3">
                    <div className="font-semibold text-slate-900">
                      {c.name} ({c.role})
                    </div>
                    <div className="text-slate-600">{c.designation}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500">
                      {c.email} · {c.phone}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications & Open Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 mb-2">
                  Application History ({instApps.length})
                </h3>
                <div className="space-y-2">
                  {instApps.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/applications?appId=${a.id}`)}
                      className="cursor-pointer rounded border border-slate-200 p-2.5 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">{a.code}</div>
                        <div className="text-slate-600">{a.category}</div>
                      </div>
                      <span className="font-medium text-[#0F766E]">{a.workflowStage}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-2">
                  Compliance Findings ({instFindings.length})
                </h3>
                <div className="space-y-2">
                  {instFindings.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => openFindingDrawer(f.id)}
                      className="cursor-pointer rounded border border-slate-200 p-2.5 hover:bg-slate-50"
                    >
                      <div className="flex justify-between font-mono">
                        <span className="font-bold text-slate-900">{f.id}</span>
                        <span
                          className={
                            f.status === 'Resolved' ? 'text-emerald-700' : 'text-red-600'
                          }
                        >
                          {f.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-800 truncate">{f.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
