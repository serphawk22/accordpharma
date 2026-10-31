'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/store';
import { Lead, LeadConversation, LeadMeeting, LeadNote } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  Stethoscope,
  Plus,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  Send,
  Award,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const REPS_LIST = [
  { id: 'usr-1', name: 'Marcus Vance', territory: 'Territory West - California', role: 'Senior Hospital Specialist' },
  { id: 'usr-2', name: 'Elena Rostova', territory: 'Territory South - Texas', role: 'Cardiovascular Rep' },
  { id: 'usr-3', name: 'David Chen', territory: 'Territory East - New York', role: 'Oncology Specialist' },
  { id: 'usr-4', name: 'Sarah Jenkins', territory: 'Territory Midwest', role: 'Strategic Accounts Lead' },
];

const PRODUCTS_LIST = [
  'OncoTarget-700 (Zenocamtinib)',
  'CardioVas-XR (Vasocordin Extended-Release)',
  'NeuroShield-IV (Cerebrolysin-X)',
  'Immunex-Alpha (Interleukin-15 Fusion)',
];

import { clientStore } from '@/lib/clientStore';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'conversations' | 'meetings' | 'notes' | 'qualification'>('conversations');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);

  // New Lead Form State
  const [formData, setFormData] = useState({
    full_name: '',
    title: 'Associate Director of Medical Oncology',
    institution: '',
    specialty: 'Oncology',
    source: 'Medical Conference Lead',
    estimated_value: 240000,
    email: '',
    phone: '',
    territory: 'Territory South - Texas',
    assigned_rep: 'David Chen',
  });

  // Convert Form State
  const [convertForm, setConvertForm] = useState({
    deal_name: '',
    estimated_value: 250000,
    expected_close_date: '2026-12-15',
    target_product: 'OncoTarget-700 (Zenocamtinib)',
    rep_name: 'David Chen',
  });

  // Action Form States inside Drawer
  const [newNoteText, setNewNoteText] = useState('');
  const [newConvo, setNewConvo] = useState({
    type: 'call' as LeadConversation['type'],
    summary: '',
    sentiment: 'very_receptive' as LeadConversation['sentiment'],
    outcome: '',
  });
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '2026-11-10',
    time: '14:00',
    duration_minutes: 30,
    location: 'Hospital Medical Staff Room / MS Teams',
  });

  // Load leads from clientStore (cached) and backend (PostgreSQL)
  useEffect(() => {
    const cached = clientStore.getLeads();
    setLeads(cached);
    if (cached.length > 0) setSelectedLead(cached[0]);
    setLoading(false);

    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        if (data.items?.length) {
          const local = clientStore.getLeads();
          const localIds = new Set(local.map((l) => l.id));
          const merged = [...local, ...data.items.filter((d: any) => !localIds.has(d.id))];
          setLeads(merged);
          if (merged.length > 0 && !selectedLead) {
            setSelectedLead(merged[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const refreshLeads = (updatedActiveId?: string) => {
    const fresh = clientStore.getLeads();
    setLeads(fresh);
    const targetId = updatedActiveId || selectedLead?.id;
    if (targetId) {
      const current = fresh.find((l) => l.id === targetId) || fresh[0] || null;
      setSelectedLead(current);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.assigned_rep && lead.assigned_rep.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleOpenLeadDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDrawer(true);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let created: Lead;
      if (res.ok) {
        created = await res.json();
      } else {
        created = {
          id: `ld-${Date.now()}`,
          full_name: formData.full_name,
          title: formData.title,
          institution: formData.institution,
          specialty: formData.specialty,
          status: 'new',
          source: formData.source,
          estimated_value: Number(formData.estimated_value),
          email: formData.email,
          phone: formData.phone,
          territory: formData.territory,
          assigned_rep: formData.assigned_rep,
          qualification_score: 30,
          qualification_details: {
            prescribing_authority: true,
            active_patient_volume: false,
            budget_readiness: false,
            formulary_alignment: false,
          },
          notes: [],
          conversations: [],
          meetings: [],
          created_at: new Date().toISOString(),
        };
      }

      const updated = clientStore.saveLead(created);
      setLeads(updated);
      setSelectedLead(created);
      setShowCreateModal(false);
      setFormData({
        full_name: '',
        title: 'Associate Director of Medical Oncology',
        institution: '',
        specialty: 'Oncology',
        source: 'Medical Conference Lead',
        estimated_value: 240000,
        email: '',
        phone: '',
        territory: 'Territory South - Texas',
        assigned_rep: 'David Chen',
      });
    } catch (err) {
      console.error('Failed to create lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRep = (leadId: string, repName: string) => {
    const updated = clientStore.updateLead(leadId, { assigned_rep: repName });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === leadId) || null);
  };

  const handleToggleQualificationCheck = (
    key: 'prescribing_authority' | 'active_patient_volume' | 'budget_readiness' | 'formulary_alignment'
  ) => {
    if (!selectedLead) return;
    const curDetails = selectedLead.qualification_details || {
      prescribing_authority: false,
      active_patient_volume: false,
      budget_readiness: false,
      formulary_alignment: false,
    };
    const nextDetails = {
      ...curDetails,
      [key]: !curDetails[key],
    };
    const updated = clientStore.qualifyLead(selectedLead.id, nextDetails);
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id) || null);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteText.trim()) return;
    const updated = clientStore.addLeadNote(selectedLead.id, newNoteText.trim(), selectedLead.assigned_rep || 'Marcus Vance');
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id) || null);
    setNewNoteText('');
  };

  const handleAddConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newConvo.summary.trim()) return;
    const updated = clientStore.addLeadConversation(selectedLead.id, {
      type: newConvo.type,
      summary: newConvo.summary.trim(),
      sentiment: newConvo.sentiment,
      outcome: newConvo.outcome.trim() || 'Follow-up scheduled with institutional staff.',
      rep_name: selectedLead.assigned_rep || 'Marcus Vance',
    });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id) || null);
    setNewConvo({
      type: 'call',
      summary: '',
      sentiment: 'very_receptive',
      outcome: '',
    });
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newMeeting.title.trim()) return;
    const scheduledISO = `${newMeeting.date}T${newMeeting.time}:00Z`;
    const updated = clientStore.addLeadMeeting(selectedLead.id, {
      title: newMeeting.title.trim(),
      scheduled_at: scheduledISO,
      duration_minutes: Number(newMeeting.duration_minutes),
      location: newMeeting.location.trim(),
      status: 'scheduled',
    });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id) || null);
    setNewMeeting({
      title: '',
      date: '2026-11-10',
      time: '14:00',
      duration_minutes: 30,
      location: 'Hospital Medical Staff Room / MS Teams',
    });
  };

  const handleOpenConvertModal = (lead: Lead) => {
    setConversionLead(lead);
    setConvertForm({
      deal_name: `${lead.institution} - ${lead.specialty} Formulary Adoption`,
      estimated_value: lead.estimated_value || 250000,
      expected_close_date: '2026-12-20',
      target_product:
        lead.specialty === 'Cardiology'
          ? 'CardioVas-XR (Vasocordin Extended-Release)'
          : 'OncoTarget-700 (Zenocamtinib)',
      rep_name: lead.assigned_rep || 'David Chen',
    });
    setShowConvertModal(true);
  };

  const handleExecuteConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionLead) return;

    fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: convertForm.deal_name,
        estimated_value: Number(convertForm.estimated_value),
        expected_close_date: convertForm.expected_close_date,
        product_name: convertForm.target_product,
        rep_name: convertForm.rep_name,
        stage: 'PROSPECTING',
      }),
    }).catch(() => {});

    const updated = clientStore.updateLead(conversionLead.id, { status: 'converted' });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === conversionLead.id) || null);
    setShowConvertModal(false);
    setConversionSuccessMsg(
      `Successfully converted ${conversionLead.full_name} into Commercial Opportunity "${convertForm.deal_name}"!`
    );
    setTimeout(() => setConversionSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* SUCCESS CONVERSION BANNER */}
      {conversionSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                Prescriber Lead Converted!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {conversionSuccessMsg}
              </p>
            </div>
          </div>
          <Link
            href="/pipeline"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            <span>View in Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <UserPlus className="w-3.5 h-3.5" /> Acquisition &amp; Prescriber Prospects
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Lead Management &amp; Conversion Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign sales representatives, log clinical conversations, schedule detailing meetings, qualify prescribers, and convert leads into institutional pipeline deals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <Bilingual textKey="btnNewLead" fallback="Add Physician Lead" />
          </button>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Leads</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{leads.length}</div>
          <span className="text-[11px] text-slate-400">Prescriber prospects</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Contacted</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {leads.filter((l) => l.status === 'contacted').length}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">Active touchpoints</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Qualified</span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {leads.filter((l) => l.status === 'qualified').length}
          </div>
          <span className="text-[11px] text-sky-600 font-semibold">≥70% Adoption score</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Converted</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {leads.filter((l) => l.status === 'converted').length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Transferred to deals</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-semibold text-slate-500">Pipeline Pipeline TAM</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            ${leads.reduce((acc, l) => acc + (l.estimated_value || 0), 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-600 font-semibold">Total potential TAM</span>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'new', 'contacted', 'qualified', 'converted'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st} ({st === 'all' ? leads.length : leads.filter((l) => l.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prescriber, hospital, rep, specialty..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Physician / Prescriber</th>
                <th className="p-3.5">Institution &amp; Title</th>
                <th className="p-3.5">Assigned Specialist</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Qualification Propensity</th>
                <th className="p-3.5">Est. Annual TAM</th>
                <th className="p-3.5">Territory</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredLeads.map((lead) => {
                const score = lead.qualification_score || 25;
                const statusBadge =
                  lead.status === 'qualified'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300'
                    : lead.status === 'converted'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : lead.status === 'contacted'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => handleOpenLeadDrawer(lead)}
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm">
                          {lead.full_name
                            .split(' ')
                            .slice(1, 3)
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {lead.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5">
                            <span>{lead.specialty}</span>
                            <span>•</span>
                            <span>{lead.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{lead.institution}</div>
                      <div className="text-[10px] text-slate-400">{lead.title}</div>
                    </td>

                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.assigned_rep || 'David Chen'}
                        onChange={(e) => handleAssignRep(lead.id, e.target.value)}
                        className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        {REPS_LIST.map((rep) => (
                          <option key={rep.id} value={rep.name}>
                            {rep.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusBadge}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 70
                                ? 'bg-sky-500'
                                : score >= 45
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{score}%</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">
                      ${(lead.estimated_value || 0).toLocaleString()}
                    </td>

                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{lead.territory}</td>

                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'converted' ? (
                          <>
                            <button
                              onClick={() => handleOpenLeadDrawer(lead)}
                              className="px-2.5 py-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/60 rounded-lg border border-sky-200 dark:border-sky-800/40 transition-all hover:bg-sky-100"
                            >
                              Detail &amp; Notes
                            </button>
                            <button
                              onClick={() => handleOpenConvertModal(lead)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/40 transition-all hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Convert
                            </button>
                          </>
                        ) : (
                          <Link
                            href="/pipeline"
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1"
                          >
                            <span>In Pipeline</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLIDE-OVER LEAD DOSSIER & CONVERSION WORKSPACE */}
      {showDrawer && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end transition-opacity backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in-right overflow-hidden">
            {/* DRAWER TOP BAR */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  {selectedLead.full_name
                    .split(' ')
                    .slice(1, 3)
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedLead.full_name}
                    </h2>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        selectedLead.status === 'qualified'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300'
                          : selectedLead.status === 'converted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      }`}
                    >
                      {selectedLead.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedLead.title} • {selectedLead.institution}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedLead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedLead.phone}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ASSIGNED SALES REP & QUALIFICATION STRIP */}
            <div className="p-4 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  <Bilingual textKey="lblAssignedRep" fallback="Assigned Sales Specialist" />
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLead.assigned_rep || 'David Chen'}
                    onChange={(e) => handleAssignRep(selectedLead.id, e.target.value)}
                    className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500"
                  >
                    {REPS_LIST.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  <span>
                    <Bilingual textKey="lblQualificationScore" fallback="Qualification Propensity" />
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-extrabold">
                    {selectedLead.qualification_score || 25}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (selectedLead.qualification_score || 0) >= 70
                        ? 'bg-gradient-to-r from-sky-500 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                    }`}
                    style={{ width: `${selectedLead.qualification_score || 25}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Prospect</span>
                  <span>70% Threshold (Qualified)</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* DRAWER TABS */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
              {[
                { id: 'conversations', label: 'tabConversations', fallback: 'Touchpoints & Calls', count: selectedLead.conversations?.length || 0 },
                { id: 'meetings', label: 'tabMeetings', fallback: 'Detailing & Meetings', count: selectedLead.meetings?.length || 0 },
                { id: 'notes', label: 'tabNotes', fallback: 'Clinical Notes', count: selectedLead.notes?.length || 0 },
                { id: 'qualification', label: 'tabQualification', fallback: 'Qualification Engine' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as any)}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    drawerTab === tab.id
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Bilingual textKey={tab.label as any} fallback={tab.fallback} />
                  {tab.count !== undefined && (
                    <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: CONVERSATIONS */}
              {drawerTab === 'conversations' && (
                <div className="space-y-5">
                  {/* Inline Conversation Logger */}
                  <form
                    onSubmit={handleAddConversation}
                    className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3"
                  >
                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                      Log Prescriber Interaction
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Channel</label>
                        <select
                          value={newConvo.type}
                          onChange={(e) => setNewConvo({ ...newConvo, type: e.target.value as any })}
                          className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5"
                        >
                          <option value="call">Phone Call</option>
                          <option value="in_person">In-Person Detailing</option>
                          <option value="email">Email Exchange</option>
                          <option value="conference">Conference / Poster Encounter</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Prescriber Sentiment</label>
                        <select
                          value={newConvo.sentiment}
                          onChange={(e) => setNewConvo({ ...newConvo, sentiment: e.target.value as any })}
                          className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5"
                        >
                          <option value="very_receptive">Very Receptive (High Interest)</option>
                          <option value="neutral">Neutral (Need More Data)</option>
                          <option value="skeptical">Skeptical (Adverse Profile Questions)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Interaction Summary</label>
                      <input
                        type="text"
                        required
                        value={newConvo.summary}
                        onChange={(e) => setNewConvo({ ...newConvo, summary: e.target.value })}
                        placeholder="Discussed clinical safety endpoints and once-daily dosing..."
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Clinical Outcome &amp; Next Action</label>
                      <input
                        type="text"
                        value={newConvo.outcome}
                        onChange={(e) => setNewConvo({ ...newConvo, outcome: e.target.value })}
                        placeholder="Agreed to review Phase III monograph before next hospital P&T round"
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <Bilingual textKey="btnLogTouchpoint" fallback="Log Touchpoint" />
                      </button>
                    </div>
                  </form>

                  {/* Conversation History Timeline */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Encounter History ({selectedLead.conversations?.length || 0})
                    </h5>
                    {(!selectedLead.conversations || selectedLead.conversations.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No touchpoints logged yet. Use the form above to record the first physician discussion.
                      </div>
                    ) : (
                      selectedLead.conversations.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                              {c.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(c.occurred_at).toLocaleDateString()} by {c.rep_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{c.summary}</p>
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                            <ArrowRight className="w-3 h-3 text-sky-500 shrink-0 mt-0.5" />
                            <span>
                              <strong>Outcome:</strong> {c.outcome}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MEETINGS */}
              {drawerTab === 'meetings' && (
                <div className="space-y-5">
                  {/* Inline Meeting Scheduler */}
                  <form
                    onSubmit={handleAddMeeting}
                    className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3"
                  >
                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Schedule Detailing Meeting
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Meeting Objective</label>
                      <input
                        type="text"
                        required
                        value={newMeeting.title}
                        onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                        placeholder="e.g. In-Service Lunch: Clinical Monograph & Safety Presentation"
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={newMeeting.date}
                          onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Time</label>
                        <input
                          type="time"
                          value={newMeeting.time}
                          onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Duration</label>
                        <select
                          value={newMeeting.duration_minutes}
                          onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: Number(e.target.value) })}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium"
                        >
                          <option value="15">15 min</option>
                          <option value="30">30 min</option>
                          <option value="45">45 min</option>
                          <option value="60">60 min</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Location / Video Link</label>
                      <input
                        type="text"
                        value={newMeeting.location}
                        onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                        placeholder="Cardiology Dept Conference Room or MS Teams"
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <Bilingual textKey="btnScheduleMeeting" fallback="Schedule Meeting" />
                      </button>
                    </div>
                  </form>

                  {/* Scheduled Meetings List */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Scheduled Briefings ({selectedLead.meetings?.length || 0})
                    </h5>
                    {(!selectedLead.meetings || selectedLead.meetings.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No meetings scheduled. Book a detailing session with the doctor above.
                      </div>
                    ) : (
                      selectedLead.meetings.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">{m.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                {new Date(m.scheduled_at).toLocaleString()} ({m.duration_minutes}m)
                              </span>
                              <span>•</span>
                              <span>{m.location}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                            {m.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: NOTES */}
              {drawerTab === 'notes' && (
                <div className="space-y-5">
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Add Internal Medical / Sales Note
                    </label>
                    <textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Doctor is interested in patient inclusion criteria for EGFR Exon-20..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <Bilingual textKey="btnAddLeadNote" fallback="Add Internal Note" />
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Physician Notes History ({selectedLead.notes?.length || 0})
                    </h5>
                    {(!selectedLead.notes || selectedLead.notes.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No notes recorded for this physician lead.
                      </div>
                    ) : (
                      selectedLead.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
                        >
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {n.text}
                          </p>
                          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-semibold">
                            <span>Author: {n.author}</span>
                            <span>{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: QUALIFICATION ENGINE */}
              {drawerTab === 'qualification' && (
                <div className="space-y-6">
                  <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-2xl border border-sky-200 dark:border-sky-800/60">
                    <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-black text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      Prescriber Adoption Readiness Framework
                    </div>
                    <p className="text-xs text-sky-900 dark:text-sky-200 mt-1">
                      Check each clinical and commercial criterion to calculate qualification propensity. A minimum score of 70% qualifies this lead for commercial opportunity conversion.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        key: 'prescribing_authority' as const,
                        labelKey: 'lblPrescribingAuthority' as const,
                        fallback: 'Has Institutional Prescribing Authority',
                        pts: '+30 pts',
                        desc: 'Verified active hospital privileges and ability to write formulary orders directly.',
                      },
                      {
                        key: 'active_patient_volume' as const,
                        labelKey: 'lblPatientVolume' as const,
                        fallback: 'Treats >15 Eligible Patients / Month',
                        desc: 'Prescriber sees a continuous patient volume matching target indication criteria.',
                        pts: '+25 pts',
                      },
                      {
                        key: 'budget_readiness' as const,
                        labelKey: 'lblBudgetReadiness' as const,
                        fallback: 'Budget / P&T Request Active',
                        desc: 'Hospital department or formulary committee has approved funding allocation.',
                        pts: '+25 pts',
                      },
                      {
                        key: 'formulary_alignment' as const,
                        labelKey: 'lblFormularyAlignment' as const,
                        fallback: 'Formulary Protocol Alignment Met',
                        desc: 'Product fits clinical hospital guidelines without requiring off-label approval.',
                        pts: '+20 pts',
                      },
                    ].map((item) => {
                      const isChecked = Boolean(selectedLead.qualification_details?.[item.key]);
                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggleQualificationCheck(item.key)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 text-sky-600 rounded cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                <Bilingual textKey={item.labelKey} fallback={item.fallback} />
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isChecked
                                    ? 'bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {item.pts}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Total Propensity Score</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {selectedLead.qualification_score || 0}%
                      </div>
                    </div>
                    {(selectedLead.qualification_score || 0) >= 70 ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Ready for Opportunity Conversion
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        Needs {70 - (selectedLead.qualification_score || 0)}% more to qualify
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DRAWER FOOTER / CONVERSION TRIGGER */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Prescribing Potential TAM</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  ${(selectedLead.estimated_value || 0).toLocaleString()} / year
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedLead.status !== 'converted' ? (
                  <button
                    onClick={() => handleOpenConvertModal(selectedLead)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <Bilingual textKey="btnConvertToOpp" fallback="Convert to Opportunity" />
                  </button>
                ) : (
                  <Link
                    href="/pipeline"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    <span>View Deal in Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT TO OPPORTUNITY MODAL */}
      {showConvertModal && conversionLead && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Convert Lead into Commercial Deal
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Transfers {conversionLead.full_name} into Pipeline Opportunities &amp; Account HCPs.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteConversion} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <Bilingual textKey="lblDealName" fallback="Institutional Opportunity Name" />
                </label>
                <input
                  required
                  type="text"
                  value={convertForm.deal_name}
                  onChange={(e) => setConvertForm({ ...convertForm, deal_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Bilingual textKey="lblTargetProduct" fallback="Therapeutic In Scope" />
                  </label>
                  <select
                    value={convertForm.target_product}
                    onChange={(e) => setConvertForm({ ...convertForm, target_product: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  >
                    {PRODUCTS_LIST.map((prod) => (
                      <option key={prod} value={prod}>
                        {prod}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Bilingual textKey="lblEstimatedAnnualValue" fallback="Estimated Value ($)" />
                  </label>
                  <input
                    type="number"
                    required
                    value={convertForm.estimated_value}
                    onChange={(e) => setConvertForm({ ...convertForm, estimated_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Bilingual textKey="lblExpectedCloseDate" fallback="Target Close Date" />
                  </label>
                  <input
                    type="date"
                    required
                    value={convertForm.expected_close_date}
                    onChange={(e) => setConvertForm({ ...convertForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Bilingual textKey="lblAssignedRep" fallback="Commercial Rep" />
                  </label>
                  <select
                    value={convertForm.rep_name}
                    onChange={(e) => setConvertForm({ ...convertForm, rep_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  >
                    {REPS_LIST.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                ✓ Converts lead stage to <strong>Converted</strong><br />
                ✓ Inserts deal in <strong>Pipeline (Qualification stage)</strong> with 65% win probability<br />
                ✓ Registers prescriber in <strong>Healthcare Professionals Directory</strong>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20"
                >
                  Confirm &amp; Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Add Physician Prospect</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. Gregory House, MD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Clinical Specialty</label>
                  <input
                    required
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital / Medical Center</label>
                <input
                  required
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="e.g. Johns Hopkins Medical Institute"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@institution.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="ASCO Oncology Congress">ASCO Oncology Congress</option>
                    <option value="AHA Scientific Sessions">AHA Scientific Sessions</option>
                    <option value="Medical Representative Field Scout">Medical Rep Field Scout</option>
                    <option value="Formulary Inbound Inquiry">Formulary Inbound Inquiry</option>
                    <option value="KOL Referral">KOL Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Representative</label>
                  <select
                    value={formData.assigned_rep}
                    onChange={(e) => setFormData({ ...formData, assigned_rep: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    {REPS_LIST.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Est. Prescribing TAM ($)</label>
                <input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
