'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { PatientHubCase } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Building2,
  CreditCard,
  Truck,
  FileCheck2,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function HubServicesPage() {
  const [cases, setCases] = useState<PatientHubCase[]>(() => db.getHubCases());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    patient_pseudonym: 'PT-9931-IL',
    prescriber_name: 'Dr. Christopher Palmer, MD',
    institution: 'Baylor Scott & White Medical Center',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    diagnosis_code: 'C34.90 (EGFR-Exon 20 insertion NSCLC)',
    primary_payer: 'Blue Cross Blue Shield Federal',
    copay_card_enrolled: true,
    patient_out_of_pocket: 0,
    specialty_pharmacy: 'Accredo Health Specialty Pharmacy',
    time_to_first_dose_days: 5,
  });

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.addHubCase({
      patient_pseudonym: formData.patient_pseudonym,
      prescriber_name: formData.prescriber_name,
      institution: formData.institution,
      product_name: formData.product_name,
      diagnosis_code: formData.diagnosis_code,
      primary_payer: formData.primary_payer,
      prior_auth_status: 'SUBMITTED',
      copay_card_enrolled: formData.copay_card_enrolled,
      patient_out_of_pocket: Number(formData.patient_out_of_pocket),
      specialty_pharmacy: formData.specialty_pharmacy,
      time_to_first_dose_days: Number(formData.time_to_first_dose_days),
    });
    setCases([...db.getHubCases()]);
    setShowEnrollModal(false);
  };

  const handleStatusChange = (id: string, status: PatientHubCase['prior_auth_status']) => {
    db.updateHubCaseStatus(id, status);
    setCases([...db.getHubCases()]);
  };

  const filteredCases = cases.filter((c) => {
    const matchesFilter = filterStatus === 'all' || c.prior_auth_status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.patient_pseudonym.toLowerCase().includes(query) ||
      c.prescriber_name.toLowerCase().includes(query) ||
      c.institution.toLowerCase().includes(query) ||
      c.primary_payer.toLowerCase().includes(query) ||
      c.product_name.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const approvedCount = cases.filter((c) => c.prior_auth_status === 'APPROVED' || c.prior_auth_status === 'DISPENSED').length;
  const avgTtfd = Math.round(cases.reduce((acc, c) => acc + c.time_to_first_dose_days, 0) / cases.length);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-1">
            <HeartHandshake className="w-3.5 h-3.5" /> Reimbursement &amp; Patient Access Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Patient Hub Services &amp; Copay Assistance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prior Authorization (PA) appeal support, $0 copay assistance card enrollment, and Specialty Pharmacy (SP) fulfillment tracking.
          </p>
        </div>
        <button
          onClick={() => setShowEnrollModal(true)}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-pink-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll Patient in Hub Services</span>
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Active Hub Cases</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{cases.length}</div>
          <span className="text-[11px] text-slate-400">HIPAA de-identified</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">PA Approval Rate</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {Math.round((approvedCount / cases.length) * 100)}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{approvedCount} Cases cleared</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Avg. Time-To-First-Dose</span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{avgTtfd} Days</div>
          <span className="text-[11px] text-sky-600 font-semibold">Triage to dispense</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Copay Card Utilization</span>
          <div className="text-2xl font-black text-pink-600 dark:text-pink-400 mt-1">
            {cases.filter((c) => c.copay_card_enrolled).length} pts
          </div>
          <span className="text-[11px] text-pink-600 font-semibold">$0 - $25 Out-of-pocket</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'SUBMITTED', 'APPROVED', 'APPEAL_SUBMITTED', 'DISPENSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-pink-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient ID, doctor, payer, drug..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* CASES TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Patient Pseudonym &amp; Case #</th>
                <th className="p-3.5">Prescriber &amp; Center</th>
                <th className="p-3.5">Product &amp; Diagnosis</th>
                <th className="p-3.5">Primary Payer</th>
                <th className="p-3.5">Prior Auth Status</th>
                <th className="p-3.5">Copay Assist.</th>
                <th className="p-3.5">Specialty Pharmacy</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredCases.map((c) => {
                const statusBadge =
                  c.prior_auth_status === 'APPROVED' || c.prior_auth_status === 'DISPENSED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : c.prior_auth_status === 'APPEAL_SUBMITTED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';

                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="font-mono text-pink-600 dark:text-pink-400">{c.patient_pseudonym}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.case_number}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.prescriber_name}</div>
                      <div className="text-[10px] text-slate-400">{c.institution}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.product_name}</div>
                      <div className="text-[10px] text-slate-400">{c.diagnosis_code}</div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{c.primary_payer}</td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge}`}>
                        {c.prior_auth_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {c.copay_card_enrolled ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <CreditCard className="w-3.5 h-3.5" /> Enrolled (${c.patient_out_of_pocket} OOP)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">Standard OOP</span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300 text-[11px]">
                      <div>{c.specialty_pharmacy}</div>
                      <div className="text-[10px] text-slate-400">TTFD: {c.time_to_first_dose_days} Days</div>
                    </td>

                    <td className="p-3.5 text-right">
                      <select
                        value={c.prior_auth_status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value as any)}
                        className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
                      >
                        <option value="SUBMITTED">Submitted</option>
                        <option value="APPROVED">Approved</option>
                        <option value="APPEAL_SUBMITTED">Appeal Submitted</option>
                        <option value="DISPENSED">Dispensed</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ENROLL MODAL */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Enroll Patient in Access Hub</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    De-Identified ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_pseudonym}
                    onChange={(e) => setFormData({ ...formData, patient_pseudonym: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescribing Doctor</label>
                  <input
                    type="text"
                    required
                    value={formData.prescriber_name}
                    onChange={(e) => setFormData({ ...formData, prescriber_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product</label>
                  <select
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="OncoTarget-700 (Zenocamtinib)">OncoTarget-700</option>
                    <option value="CardioVas-XR (Vasocordin ER)">CardioVas-XR</option>
                    <option value="NeuroShield-IV (Cerebrolysin-X)">NeuroShield-IV</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Payer</label>
                  <input
                    type="text"
                    required
                    value={formData.primary_payer}
                    onChange={(e) => setFormData({ ...formData, primary_payer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow"
                >
                  Submit to Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
