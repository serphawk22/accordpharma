'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { NextBestAction } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Zap,
  Sparkles,
  CheckCircle2,
  X,
  Mail,
  Calendar,
  FileText,
  UserCheck,
  Send,
  Building2,
  Stethoscope,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function NextBestActionPage() {
  const [actions, setActions] = useState<NextBestAction[]>(() => db.getNextBestActions());
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAccept = (action: NextBestAction) => {
    db.acceptNextBestAction(action.id);
    setActions([...db.getNextBestActions()]);
    setToastMessage(`Executed Next-Best-Action for ${action.physician_name}: "${action.recommended_action}"`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDismiss = (id: string) => {
    db.dismissNextBestAction(id);
    setActions([...db.getNextBestActions()]);
  };

  const filteredActions = actions.filter((a) => {
    if (filterPriority === 'all') return true;
    return a.impact_priority === filterPriority;
  });

  const activeCount = actions.filter((a) => a.status === 'ACTIVE').length;
  const acceptedCount = actions.filter((a) => a.status === 'ACCEPTED').length;

  return (
    <div className="space-y-6">
      {/* TOAST */}
      {toastMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5" /> AI Omnichannel Sales Enablement
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Next-Best-Action (NBA) Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Predictive machine-learning suggestions harmonizing prescriber digital engagement, adverse inquiry triggers, and field visit timing.
          </p>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Active Suggestions</span>
          <div className="text-2xl font-black text-amber-500 mt-1">{activeCount}</div>
          <span className="text-[11px] text-slate-400">High-leverage touchpoints</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Actions Executed</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{acceptedCount}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Rep adherence rate 84%</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">High Impact Queue</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {actions.filter((a) => a.impact_priority === 'HIGH' && a.status === 'ACTIVE').length}
          </div>
          <span className="text-[11px] text-rose-600 font-semibold">Urgent prescriber triggers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Primary Channel</span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">Approved Rep Email</div>
          <span className="text-[11px] text-sky-600 font-semibold">42% Conversion to visit</span>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex gap-2">
        {['all', 'HIGH', 'MEDIUM', 'OPPORTUNITY'].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              filterPriority === p
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {p === 'all' ? 'All Priority Actions' : `${p} Priority`}
          </button>
        ))}
      </div>

      {/* ACTION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredActions.map((item) => {
          const isDone = item.status === 'ACCEPTED';
          const isDismissed = item.status === 'DISMISSED';

          const priorityBadge =
            item.impact_priority === 'HIGH'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
              : item.impact_priority === 'MEDIUM'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300';

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm transition-all space-y-4 ${
                isDone
                  ? 'border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : isDismissed
                  ? 'opacity-40 border-slate-200 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${priorityBadge}`}>
                      {item.impact_priority} PRIORITY
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.trigger_source}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {item.physician_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.institution} • {item.specialty}
                  </p>
                </div>

                <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {item.product_name}
                </span>
              </div>

              {/* RECOMMENDED ACTION */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Recommended Action via {item.suggested_channel}
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-relaxed">
                  {item.recommended_action}
                </p>
              </div>

              {/* RATIONALE */}
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                <strong>Why now?</strong> {item.rationale}
              </div>

              {/* ACTIONS */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isDone ? (
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Action Accepted &amp; Scheduled
                  </span>
                ) : isDismissed ? (
                  <span className="text-xs text-slate-400 font-semibold">Dismissed</span>
                ) : (
                  <>
                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleAccept(item)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
                    >
                      <span>Accept &amp; Execute Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
