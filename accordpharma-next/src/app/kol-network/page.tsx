'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { SunshinePaymentRecord, HealthcareProfessional } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Award,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Star,
  Users,
} from 'lucide-react';

export default function KolNetworkPage() {
  const [hcps] = useState<HealthcareProfessional[]>(() => db.getHCPs());
  const [records, setRecords] = useState<SunshinePaymentRecord[]>(() => db.getSunshineRecords());
  const [activeTab, setActiveTab] = useState<'kols' | 'sunshine'>('kols');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSpendModal, setShowSpendModal] = useState(false);

  // New Spend Form
  const [spendForm, setSpendForm] = useState({
    hcp_name: 'Dr. Gregory House, MD',
    hcp_npi: '1982736450',
    institution: 'St. Jude Metropolitan Medical Center',
    specialty: 'Oncology',
    category: 'Speaker Honorarium' as SunshinePaymentRecord['category'],
    amount: 1500,
    event_title: 'Regional Exon-20 Clinical Roundtable Dinner',
    date: '2026-10-29',
    notes: 'Honorarium for leading 60-min peer clinical case discussion.',
  });

  const kolPhysicians = hcps.filter((h) => h.kol_status || h.prescribing_tier.includes('KOL'));

  const totalSpent = records.reduce((acc, r) => acc + r.amount, 0);

  const handleCreateSpend = (e: React.FormEvent) => {
    e.preventDefault();
    const flag: SunshinePaymentRecord['compliance_flag'] =
      spendForm.category === 'Food & Beverage' && spendForm.amount > 100
        ? 'AUDIT_REVIEW'
        : spendForm.amount >= 4000
        ? 'NEARING_LIMIT'
        : 'COMPLIANT';

    db.addSunshineRecord({
      hcp_name: spendForm.hcp_name,
      hcp_npi: spendForm.hcp_npi,
      institution: spendForm.institution,
      specialty: spendForm.specialty,
      category: spendForm.category,
      amount: Number(spendForm.amount),
      event_title: spendForm.event_title,
      date: spendForm.date,
      rep_or_manager: 'Marcus Vance',
      compliance_flag: flag,
      notes: spendForm.notes,
    });

    setRecords([...db.getSunshineRecords()]);
    setShowSpendModal(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5" /> Medical Affairs &amp; Scientific Exchange
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            KOL Influence Network &amp; Sunshine Act Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track Key Opinion Leader academic influence, clinical trial investigators, and CMS Open Payments transfer of value compliance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSpendModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-md shadow-amber-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Sunshine Act Spend</span>
          </button>
        </div>
      </div>

      {/* KPI STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Academic KOLs</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kolPhysicians.length}</div>
          <span className="text-[11px] text-amber-500 font-bold">Principal Investigators</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">YTD Open Payments Spend</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">CMS Open Payments reportable</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Audit Compliance Rate</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">98.4%</div>
          <span className="text-[11px] text-emerald-600 font-semibold">100% Meals under $100 cap</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Congress Engagements</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">12</div>
          <span className="text-[11px] text-indigo-600 font-semibold">ASCO, AHA, ESMO Sessions</span>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1 gap-2 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('kols')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'kols'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Key Opinion Leaders ({kolPhysicians.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sunshine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'sunshine'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Sunshine Act Spend Ledger ({records.length})</span>
        </button>
      </div>

      {/* TAB 1: KOL SCIENTIFIC PROFILES */}
      {activeTab === 'kols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kolPhysicians.map((k) => (
            <div
              key={k.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-amber-400/60 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-sm shadow">
                    {k.full_name
                      .split(' ')
                      .slice(1, 3)
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {k.full_name}
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </h3>
                    <p className="text-[11px] text-slate-400">{k.title}</p>
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Institution:</span>
                  <strong className="text-slate-900 dark:text-white">{k.account_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clinical Specialty:</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">{k.specialty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prescribing Tier:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{k.prescribing_tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Touchpoints:</span>
                  <span className="font-bold">{k.interactions_count} Sessions</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200">
                <strong>Key Influence Area:</strong> Clinical Trial Investigator for Pivotal Phase III &amp; National Guideline Committee Member.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SUNSHINE ACT OPEN PAYMENTS LEDGER */}
      {activeTab === 'sunshine' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Healthcare Professional</th>
                  <th className="p-3.5">NPI &amp; Institution</th>
                  <th className="p-3.5">Category &amp; Event Title</th>
                  <th className="p-3.5">Transfer Value</th>
                  <th className="p-3.5">Date &amp; Manager</th>
                  <th className="p-3.5">Compliance Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {records.map((r) => {
                  const flagBadge =
                    r.compliance_flag === 'COMPLIANT'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                      : r.compliance_flag === 'NEARING_LIMIT'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{r.hcp_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.specialty}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div>NPI: {r.hcp_npi}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{r.institution}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{r.category}</div>
                        <div className="text-[10px] text-slate-400">{r.event_title}</div>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5">
                        <div>{r.date}</div>
                        <div className="text-[10px] text-slate-400">{r.rep_or_manager}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${flagBadge}`}>
                          {r.compliance_flag.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOG SPEND MODAL */}
      {showSpendModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Log Sunshine Act Transfer of Value
              </h3>
              <button onClick={() => setShowSpendModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSpend} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">HCP Name</label>
                  <input
                    type="text"
                    required
                    value={spendForm.hcp_name}
                    onChange={(e) => setSpendForm({ ...spendForm, hcp_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NPI Number (10 Digits)</label>
                  <input
                    type="text"
                    required
                    value={spendForm.hcp_npi}
                    onChange={(e) => setSpendForm({ ...spendForm, hcp_npi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Category</label>
                  <select
                    value={spendForm.category}
                    onChange={(e) => setSpendForm({ ...spendForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Food & Beverage">Food &amp; Beverage (&lt;$100 Cap)</option>
                    <option value="Speaker Honorarium">Speaker Honorarium (FMV Rate)</option>
                    <option value="Advisory Board Fee">Advisory Board Fee</option>
                    <option value="Travel & Lodging">Travel &amp; Lodging</option>
                    <option value="Research Grant">Research Grant</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={spendForm.amount}
                    onChange={(e) => setSpendForm({ ...spendForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Event / Purpose</label>
                <input
                  type="text"
                  required
                  value={spendForm.event_title}
                  onChange={(e) => setSpendForm({ ...spendForm, event_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSpendModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow"
                >
                  Commit Spend Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
