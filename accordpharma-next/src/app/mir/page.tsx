'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { MedicalInfoRequest } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  HelpCircle,
  ShieldAlert,
  FileQuestion,
  UserCheck,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Search,
  Building2,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react';

const MSL_TEAM = [
  { id: 'msl-1', name: 'Dr. Aris Thorne, PharmD', title: 'Director of Oncology Medical Affairs' },
  { id: 'msl-2', name: 'Dr. Elena Vasquez, MD, PhD', title: 'Senior Neuro-Cardio Medical Science Liaison' },
  { id: 'msl-3', name: 'Dr. Marcus Brody, PhD', title: 'Clinical Pharmacology Lead' },
];

export default function MirPage() {
  const [requests, setRequests] = useState<MedicalInfoRequest[]>(() => db.getMedicalInfoRequests());
  const [searchQuery, setSearchQuery] = useState('');
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedMir, setSelectedMir] = useState<MedicalInfoRequest | null>(requests[0] || null);

  // Form State
  const [formData, setFormData] = useState({
    physician_name: 'Dr. Sarah Lin, MD',
    institution: 'Cedars-Sinai Medical Center',
    specialty: 'Medical Oncology',
    unsolicited_question: '',
    category: 'Clinical Trial Data' as MedicalInfoRequest['category'],
    urgency: 'Standard (3-5 Days)' as MedicalInfoRequest['urgency'],
  });

  // MSL Response State
  const [mslResponseText, setMslResponseText] = useState('');
  const [selectedMslName, setSelectedMslName] = useState(MSL_TEAM[0].name);

  const handleCreateMIR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unsolicited_question.trim()) return;

    const created = db.addMedicalInfoRequest({
      physician_name: formData.physician_name,
      institution: formData.institution,
      specialty: formData.specialty,
      unsolicited_question: formData.unsolicited_question.trim(),
      category: formData.category,
      urgency: formData.urgency,
      commercial_rep: 'Marcus Vance',
      status: 'RECEIVED',
    });

    setRequests([...db.getMedicalInfoRequests()]);
    setSelectedMir(created);
    setShowIntakeModal(false);
    setFormData({
      physician_name: 'Dr. Sarah Lin, MD',
      institution: 'Cedars-Sinai Medical Center',
      specialty: 'Medical Oncology',
      unsolicited_question: '',
      category: 'Clinical Trial Data',
      urgency: 'Standard (3-5 Days)',
    });
  };

  const handleFulfillMIR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMir || !mslResponseText.trim()) return;

    db.updateMIRStatus(
      selectedMir.id,
      'FULFILLED',
      selectedMslName,
      mslResponseText.trim()
    );

    const fresh = [...db.getMedicalInfoRequests()];
    setRequests(fresh);
    setSelectedMir(fresh.find((m) => m.id === selectedMir.id) || null);
    setMslResponseText('');
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.physician_name.toLowerCase().includes(q) ||
      r.institution.toLowerCase().includes(q) ||
      r.unsolicited_question.toLowerCase().includes(q) ||
      r.request_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5 text-cyan-500" /> FDA Off-Label Compliance Wall
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Medical Information Requests (MIR) &amp; MSL Handoff
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compliant intake of unsolicited prescriber scientific questions, routing to Medical Science Liaisons (MSL), and audit trail management.
          </p>
        </div>
        <button
          onClick={() => setShowIntakeModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Log Unsolicited Medical Inquiry</span>
        </button>
      </div>

      {/* COMPLIANCE ALERT STRIP */}
      <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 p-4 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="text-cyan-900 dark:text-cyan-100">Commercial Rep Firewall Protocol:</strong>
          <p className="text-cyan-800 dark:text-cyan-200 mt-0.5 leading-relaxed">
            Commercial sales reps cannot provide unapproved, off-label clinical guidance or combination therapy recommendations. All unsolicited physician inquiries are logged here and transferred exclusively to Medical Affairs MSLs.
          </p>
        </div>
      </div>

      {/* DUAL WORKSPACE: QUEUE & DOSSIER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: REQUEST QUEUE */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Inquiry Queue ({requests.length})</h3>
            <span className="text-[10px] font-bold text-slate-400">All Inquiries Audited</span>
          </div>

          <div className="space-y-3">
            {filteredRequests.map((mir) => {
              const isSelected = selectedMir?.id === mir.id;
              const isFulfilled = mir.status === 'FULFILLED';

              return (
                <div
                  key={mir.id}
                  onClick={() => setSelectedMir(mir)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-700 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{mir.request_number}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isFulfilled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {mir.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-2">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{mir.physician_name}</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{mir.institution}</div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-2 font-medium">
                    &quot;{mir.unsolicited_question}&quot;
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Category: {mir.category}</span>
                    <span>{new Date(mir.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: DETAIL & MSL RESPONSE HUB */}
        {selectedMir && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-cyan-600">{selectedMir.request_number}</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {selectedMir.physician_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedMir.institution} • {selectedMir.specialty}
                </p>
              </div>
              <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl">
                {selectedMir.urgency}
              </span>
            </div>

            {/* UNQUALIFIED / UNSOLICITED QUESTION */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Prescriber&apos;s Unsolicited Inquiry:
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                &quot;{selectedMir.unsolicited_question}&quot;
              </p>
              <div className="text-[10px] text-slate-500 pt-1">
                Transferred by Commercial Rep: <strong>{selectedMir.commercial_rep}</strong>
              </div>
            </div>

            {/* MSL FULFILLMENT & REVIEW */}
            {selectedMir.status !== 'FULFILLED' ? (
              <form onSubmit={handleFulfillMIR} className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Medical Affairs MSL Response
                  </h4>
                  <span className="text-[11px] text-emerald-600 font-bold">Scientific Exchange Mode</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assigned MSL Reviewer</label>
                  <select
                    value={selectedMslName}
                    onChange={(e) => setSelectedMslName(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {MSL_TEAM.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Scientific Evidence Summary &amp; Attached Monograph
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={mslResponseText}
                    onChange={(e) => setMslResponseText(e.target.value)}
                    placeholder="Reference Phase I/II trial data, pharmacology mechanisms, and enclose peer-reviewed publications..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Fulfill &amp; Dispatch Scientific Dossier</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-200 font-bold">
                  <span>Fulfilled by {selectedMir.assigned_msl}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedMir.msl_response_summary}
                </p>
                <div className="text-[10px] text-slate-400 pt-1">
                  Closed on {new Date(selectedMir.closed_at || '').toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INTAKE MODAL */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Log Unsolicited Medical Inquiry (MIR)
              </h3>
              <button onClick={() => setShowIntakeModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMIR} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescriber Name</label>
                  <input
                    type="text"
                    required
                    value={formData.physician_name}
                    onChange={(e) => setFormData({ ...formData, physician_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital / Center</label>
                  <input
                    type="text"
                    required
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unsolicited Physician Question
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.unsolicited_question}
                  onChange={(e) => setFormData({ ...formData, unsolicited_question: e.target.value })}
                  placeholder="Record exact question asked by doctor (e.g. combination regimens, off-label efficacy)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inquiry Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Off-Label Indication">Off-Label Indication</option>
                    <option value="Pediatric Dosing">Pediatric Dosing</option>
                    <option value="Drug Interaction">Drug Interaction</option>
                    <option value="Mechanism of Action">Mechanism of Action</option>
                    <option value="Clinical Trial Data">Clinical Trial Data</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Urgency</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Standard (3-5 Days)">Standard (3-5 Days)</option>
                    <option value="Urgent (24h)">Urgent (24h)</option>
                    <option value="Clinical Emergency">Clinical Emergency</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow"
                >
                  Submit to Medical Affairs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
