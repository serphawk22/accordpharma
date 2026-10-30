'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/store';
import { SlideEngagementMetric } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Flame,
  Presentation,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart2,
  Sparkles,
  ArrowRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function ClmAnalyticsPage() {
  const [metrics] = useState<SlideEngagementMetric[]>(() => db.getSlideEngagementMetrics());
  const [selectedProduct, setSelectedProduct] = useState<'All' | 'OncoTarget-700' | 'CardioVas-XR'>('All');

  const filteredMetrics = metrics.filter(
    (m) => selectedProduct === 'All' || m.product_name.includes(selectedProduct)
  );

  const totalPresentations = metrics.reduce((acc, m) => acc + m.total_presentations, 0);
  const avgDwell = Math.round(metrics.reduce((acc, m) => acc + m.avg_dwell_time_seconds, 0) / metrics.length);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
            <Flame className="w-3.5 h-3.5" /> Closed-Loop Marketing (CLM) Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            e-Detailing Slide Heatmaps &amp; Engagement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze physician slide dwell times, objection hotspots, and auto-recommend next-best clinical publications based on real-time IVA interactions.
          </p>
        </div>
        <Link
          href="/edetailing"
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Presentation className="w-4 h-4" />
          <span>Launch Detailing Studio (IVA)</span>
        </Link>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Encounters</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalPresentations}</div>
          <span className="text-[11px] text-slate-400">Interactive Visual Aid sessions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Avg. Slide Dwell Time</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{avgDwell}s</div>
          <span className="text-[11px] text-rose-600 font-semibold">High clinical attention</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Peak Reaction Slide</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">96%</div>
          <span className="text-[11px] text-emerald-600 font-semibold">PFS Survival Curve (NEJM)</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Objection Hotspot</span>
          <div className="text-2xl font-black text-amber-500 mt-1">126s</div>
          <span className="text-[11px] text-amber-600 font-semibold">Adverse Event Management</span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2">
        {(['All', 'OncoTarget-700', 'CardioVas-XR'] as const).map((prod) => (
          <button
            key={prod}
            onClick={() => setSelectedProduct(prod)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedProduct === prod
                ? 'bg-rose-600 text-white shadow'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {prod}
          </button>
        ))}
      </div>

      {/* SLIDE HEATMAP & METRICS TABLE */}
      <div className="space-y-4">
        {filteredMetrics.map((slide) => {
          // Heatmap color intensity based on dwell time
          const heatPercent = Math.min(100, Math.round((slide.avg_dwell_time_seconds / 140) * 100));

          return (
            <div
              key={slide.slide_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-rose-400/50 transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow">
                    {slide.slide_id.replace('slide-', 'S-')}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {slide.slide_title}
                      {slide.frequently_questioned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                          <AlertTriangle className="w-3 h-3" /> Question Hotspot
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">{slide.product_name} • {slide.total_presentations} Recorded Detailing Runs</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Avg. Dwell Time</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {slide.avg_dwell_time_seconds}s
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Reaction Inclination</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {slide.physician_reaction_score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* DWELL TIME BAR GAUGE */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>Audience Retention &amp; Dwell Intensity</span>
                  <span>{heatPercent}% Relative Interest</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-rose-600 h-full rounded-full transition-all"
                    style={{ width: `${heatPercent}%` }}
                  />
                </div>
              </div>

              {/* RECOMMENDED FOLLOW-UP CONTENT */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Automated Content Recommendation:
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 ml-1">
                      {slide.recommended_reprint}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Enqueued "${slide.recommended_reprint}" for physician follow-up email.`)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-[11px] shadow-xs flex items-center gap-1.5 shrink-0 self-end md:self-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Send Reprint to Doctor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
