'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { ShieldAlert, AlertTriangle, FileSpreadsheet, Plus, CheckCircle2, Clock } from 'lucide-react';

export default function PharmacovigilancePage() {
  const [reports, setReports] = useState([
    {
      id: 'pv-001',
      case_number: 'PV-2026-US-0891',
      product_name: 'CardioVas-XR 100mg Tablets',
      event_term: 'Transient symptomatic hypotension upon initial titration',
      severity: 'Non-Serious (Expected)',
      reporter_type: 'Physician (Cardiologist)',
      outcome: 'Resolved upon dose adjustment to 50mg',
      fda_submission_status: 'Submitted via MedWatch 3500A',
      received_date: '2026-10-21',
    },
    {
      id: 'pv-002',
      case_number: 'PV-2026-US-0892',
      product_name: 'OncoTarget-700 140mg Capsules',
      event_term: 'Grade 2 papulopustular rash over upper thorax',
      severity: 'Non-Serious (Manageable)',
      reporter_type: 'Oncology Nurse Navigator',
      outcome: 'Managed with topical clindamycin and hydrocortisone 1%',
      fda_submission_status: 'Expedited 15-Day ICSR Transmitted',
      received_date: '2026-10-23',
    },
  ]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [formData, setFormData] = useState({
    product_name: 'CardioVas-XR 100mg Tablets',
    event_term: '',
    reporter_type: 'Physician',
    severity: 'Non-Serious',
  });

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      id: `pv-${Date.now()}`,
      case_number: `PV-2026-US-${Math.floor(1000 + Math.random() * 9000)}`,
      product_name: formData.product_name,
      event_term: formData.event_term,
      severity: formData.severity,
      reporter_type: formData.reporter_type,
      outcome: 'Under medical review by Drug Safety Committee',
      fda_submission_status: 'Initial Intake Verified',
      received_date: new Date().toISOString().slice(0, 10),
    };
    setReports([newReport, ...reports]);
    setShowReportModal(false);
    setFormData({
      product_name: 'CardioVas-XR 100mg Tablets',
      event_term: '',
      reporter_type: 'Physician',
      severity: 'Non-Serious',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5" /> GxP Patient Safety &amp; Vigilance
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Pharmacovigilance &amp; Drug Safety
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Individual Case Safety Reports (ICSR), MedDRA coded adverse event tracking, and mandatory regulatory health authority filings.
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <Bilingual textKey="btnReportEvent" fallback="Record Adverse Event (AE)" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Case #</th>
              <th className="p-3.5">Product</th>
              <th className="p-3.5">Adverse Reaction Term (MedDRA)</th>
              <th className="p-3.5">Severity</th>
              <th className="p-3.5">Reporter Source</th>
              <th className="p-3.5">Regulatory Status</th>
              <th className="p-3.5">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-mono font-bold text-sky-600">{r.case_number}</td>
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{r.product_name}</td>
                <td className="p-3.5 text-slate-700 dark:text-slate-200 max-w-xs">{r.event_term}</td>
                <td className="p-3.5">
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {r.severity}
                  </span>
                </td>
                <td className="p-3.5 text-slate-500">{r.reporter_type}</td>
                <td className="p-3.5 font-semibold text-emerald-600">{r.fda_submission_status}</td>
                <td className="p-3.5 text-slate-500">{r.received_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Record Adverse Event (AE)</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Suspect Pharmaceutical</label>
                <select
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="CardioVas-XR 100mg Tablets">CardioVas-XR 100mg Tablets</option>
                  <option value="CardioVas-XR 50mg Tablets">CardioVas-XR 50mg Tablets</option>
                  <option value="OncoTarget-700 140mg Capsules">OncoTarget-700 140mg Capsules</option>
                  <option value="NeuroGuard-IV Infusion 50ml">NeuroGuard-IV Infusion 50ml</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adverse Reaction Symptoms &amp; Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.event_term}
                  onChange={(e) => setFormData({ ...formData, event_term: e.target.value })}
                  placeholder="Describe patient reaction, time to onset, and any corrective interventions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reporter Type</label>
                  <select
                    value={formData.reporter_type}
                    onChange={(e) => setFormData({ ...formData, reporter_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Physician (Prescriber)">Physician (Prescriber)</option>
                    <option value="Hospital Pharmacist">Hospital Pharmacist</option>
                    <option value="Clinical Research Coordinator">Clinical Research Coordinator</option>
                    <option value="Patient / Consumer">Patient / Consumer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Non-Serious (Expected)">Non-Serious (Expected)</option>
                    <option value="Serious (Hospitalization)">Serious (Hospitalization)</option>
                    <option value="Life-Threatening">Life-Threatening</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow"
                >
                  Submit to Drug Safety Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
