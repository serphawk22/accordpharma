'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { DailyCallPlan } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Navigation,
  Clock,
  Building2,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  Plus,
  FileText,
  UserCheck,
  ChevronRight,
  Package,
} from 'lucide-react';

export default function CallPlannerPage() {
  const [plans, setPlans] = useState<DailyCallPlan[]>(() => db.getDailyCallPlans());
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fast-Log State
  const [postCallSummary, setPostCallSummary] = useState('');
  const [postCallSentiment, setPostCallSentiment] = useState<'receptive' | 'neutral' | 'skeptical'>('receptive');

  // Add Stop Form State
  const [newStop, setNewStop] = useState({
    time_slot: '04:30 PM',
    physician_name: 'Dr. Gregory House, MD',
    institution: 'St. Jude Metropolitan Medical Center',
    department: 'Oncology Outpatient Clinic',
    specialty: 'Oncology',
    pre_call_objective: 'Confirm starter titration tolerability and schedule lunch presentation.',
    target_product: 'OncoTarget-700 (Zenocamtinib)',
    key_clinical_trial: 'ACCORD-LUNG Phase III Trial',
    samples_to_leave: '2 Starter Titration Packs',
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleCompleteCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    db.updateDailyCallPlan(selectedPlan.id, {
      status: 'COMPLETED',
      post_call_summary: postCallSummary.trim() || 'Detailing objective fulfilled; prescriber receptive.',
      sentiment: postCallSentiment,
    });
    setPlans([...db.getDailyCallPlans()]);
    setPostCallSummary('');
  };

  const handleAddStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = db.addDailyCallPlan({
      time_slot: newStop.time_slot,
      physician_name: newStop.physician_name,
      institution: newStop.institution,
      department: newStop.department,
      specialty: newStop.specialty,
      rep_name: 'Marcus Vance',
      date: '2026-10-29',
      status: 'SCHEDULED',
      pre_call_objective: newStop.pre_call_objective,
      target_product: newStop.target_product,
      key_clinical_trial: newStop.key_clinical_trial,
      samples_to_leave: newStop.samples_to_leave,
    });
    setPlans([...db.getDailyCallPlans()]);
    setSelectedPlanId(created.id);
    setShowAddModal(false);
  };

  const completedCount = plans.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Navigation className="w-3.5 h-3.5" /> Field Force Execution &amp; GPS Call Planning
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Daily Hospital Route &amp; Pre-Call Briefing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Optimized territory visit schedule, 10-second prescriber briefing cards, and instant post-call detailing log.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Territory Call Stop</span>
          </button>
        </div>
      </div>

      {/* PROGRESS TRACKER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">Today&apos;s Target Territory Route</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              Thursday, October 29, 2026 • Territory West (Marcus Vance)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {completedCount} of {plans.length} Calls Completed
            </span>
            <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="bg-sky-500 h-full rounded-full transition-all"
                style={{ width: `${(completedCount / plans.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DUAL WORKSPACE: ROUTE LIST & PRE-CALL BRIEFING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TIMELINE LIST (LEFT) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Chronological Route Itinerary</h3>
          <div className="space-y-3">
            {plans.map((p) => {
              const isSelected = p.id === selectedPlanId;
              const isDone = p.status === 'COMPLETED';
              const isInProgress = p.status === 'IN_PROGRESS';

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-md ring-2 ring-sky-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-lg">
                        {p.time_slot}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isInProgress
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="mt-2.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{p.physician_name}</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{p.institution}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span className="font-semibold text-sky-600 dark:text-sky-400">{p.target_product}</span>
                    <span className="text-slate-400">{p.department}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 10-SECOND STRATEGY BRIEFING CARD (RIGHT) */}
        {selectedPlan && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-lg">
                    {selectedPlan.time_slot} Stop
                  </span>
                  <span className="text-xs font-bold text-slate-400">{selectedPlan.specialty}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {selectedPlan.physician_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedPlan.institution} • {selectedPlan.department}
                </p>
              </div>

              {selectedPlan.status === 'COMPLETED' ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-black">
                  <CheckCircle2 className="w-4 h-4" /> Call Completed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-black">
                  <Clock className="w-4 h-4" /> Ready for Visit
                </span>
              )}
            </div>

            {/* PRE-CALL BRIEFING SECTIONS */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Primary Detailing Objective
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                  {selectedPlan.pre_call_objective}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Clinical Trial in Scope
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedPlan.key_clinical_trial}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Package className="w-3 h-3 text-amber-500" /> Samples Allocated
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {selectedPlan.samples_to_leave || 'None allocated'}
                  </div>
                </div>
              </div>

              {selectedPlan.past_objections && (
                <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Past Prescriber Objections
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedPlan.past_objections}</p>
                </div>
              )}
            </div>

            {/* FAST-LOG SECTION */}
            {selectedPlan.status !== 'COMPLETED' ? (
              <form
                onSubmit={handleCompleteCall}
                className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Post-Call Fast-Log &amp; Detailing Summary
                  </h4>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Sentiment:</span>
                    {(['receptive', 'neutral', 'skeptical'] as const).map((sent) => (
                      <button
                        key={sent}
                        type="button"
                        onClick={() => setPostCallSentiment(sent)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize ${
                          postCallSentiment === sent
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {sent}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  required
                  value={postCallSummary}
                  onChange={(e) => setPostCallSummary(e.target.value)}
                  placeholder="Doctor agreed to initiate evaluation cohort; requested reprints on toxicity profile..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Visit &amp; Commit Encounter</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-200">Logged Encounter Summary:</span>
                <p className="text-slate-700 dark:text-slate-300">{selectedPlan.post_call_summary}</p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  Sentiment recorded: <strong>{selectedPlan.sentiment}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD STOP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Add Territory Call Stop</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStopSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    value={newStop.time_slot}
                    onChange={(e) => setNewStop({ ...newStop, time_slot: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physician Name</label>
                  <input
                    type="text"
                    required
                    value={newStop.physician_name}
                    onChange={(e) => setNewStop({ ...newStop, physician_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  required
                  value={newStop.institution}
                  onChange={(e) => setNewStop({ ...newStop, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Objective</label>
                <input
                  type="text"
                  required
                  value={newStop.pre_call_objective}
                  onChange={(e) => setNewStop({ ...newStop, pre_call_objective: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow"
                >
                  Schedule Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
