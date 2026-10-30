'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { PrescriberDecileTarget } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Crosshair,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Stethoscope,
  Filter,
  Plus,
  Search,
  PhoneCall,
  Flame,
} from 'lucide-react';

export default function TargetingMatrixPage() {
  const [targets, setTargets] = useState<PrescriberDecileTarget[]>(() => db.getDecileTargets());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogCall = (id: string) => {
    db.logDecileCall(id);
    setTargets([...db.getDecileTargets()]);
  };

  const filteredTargets = targets.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.coverage_status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.physician_name.toLowerCase().includes(q) ||
      t.institution.toLowerCase().includes(q) ||
      t.specialty.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalCallsTarget = targets.reduce((acc, t) => acc + t.monthly_call_target, 0);
  const totalCallsActual = targets.reduce((acc, t) => acc + t.actual_calls_mtd, 0);
  const coverageRate = Math.round((totalCallsActual / (totalCallsTarget || 1)) * 100);
  const underCalledCount = targets.filter((t) => t.coverage_status === 'UNDER_CALLED').length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
            <Crosshair className="w-3.5 h-3.5" /> Sales Operations &amp; Territory Call Optimization
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Prescriber Decile Matrix &amp; R&amp;F Reach
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ensure high-decile prescribers (Decile 8–10) receive target detailing frequency and flag under-called clinical champions.
          </p>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Decile Coverage Rate</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{coverageRate}%</div>
          <span className="text-[11px] text-slate-400">
            {totalCallsActual} of {totalCallsTarget} Monthly Calls
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Under-Called Prescribers</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{underCalledCount}</div>
          <span className="text-[11px] text-rose-600 font-semibold">Decile 8-10 gap alerts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">High Decile Tier 1</span>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {targets.filter((t) => t.decile >= 9).length}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">Decile 9 &amp; 10 Specialists</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">On-Track Prescribers</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {targets.filter((t) => t.coverage_status === 'ON_TRACK').length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Meeting planned cadence</span>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'UNDER_CALLED', 'ON_TRACK'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-rose-600 text-white shadow'
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
            placeholder="Search physician, specialty, clinic..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          />
        </div>
      </div>

      {/* TARGETS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Prescriber &amp; Institution</th>
                <th className="p-3.5">Specialty</th>
                <th className="p-3.5">Prescribing Decile</th>
                <th className="p-3.5">Monthly Target</th>
                <th className="p-3.5">Actual Calls MTD</th>
                <th className="p-3.5">Reach Status</th>
                <th className="p-3.5">Last Visited</th>
                <th className="p-3.5 text-right">Quick Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredTargets.map((t) => {
                const isUnder = t.coverage_status === 'UNDER_CALLED';
                const progressPct = Math.min(100, Math.round((t.actual_calls_mtd / t.monthly_call_target) * 100));

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      <div>{t.physician_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{t.institution}</div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{t.specialty}</td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-black text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Decile {t.decile}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {t.monthly_call_target} Calls / Mo
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isUnder ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                          {t.actual_calls_mtd} / {t.monthly_call_target}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isUnder
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                        }`}
                      >
                        {t.coverage_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-500">{t.last_visited_date || 'No recent visit'}</td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleLogCall(t.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950 rounded-lg border border-rose-200 dark:border-rose-800/40 transition-all flex items-center gap-1 ml-auto"
                      >
                        <PhoneCall className="w-3 h-3" /> Log Visit (+1)
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
