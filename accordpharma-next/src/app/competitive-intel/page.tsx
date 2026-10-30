'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { CompetitiveBattlecard } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Swords,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  Building2,
  PieChart,
  CheckCircle2,
} from 'lucide-react';

export default function CompetitiveIntelPage() {
  const [battlecards] = useState<CompetitiveBattlecard[]>(() => db.getCompetitiveBattlecards());
  const [selectedCardId, setSelectedCardId] = useState<string>(battlecards[0]?.id || '');

  const selectedCard = battlecards.find((b) => b.id === selectedCardId) || battlecards[0];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <Swords className="w-3.5 h-3.5" /> Market Access &amp; Brand Switch Radar
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Competitive Battlecards &amp; Account Displacement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Head-to-head clinical efficacy curves, objection-handling counters, and hospital formulary displacement metrics.
          </p>
        </div>
      </div>

      {/* DUAL WORKSPACE: CARDS LIST & BATTLECARD DOSSIER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CARDS */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Therapeutic Matchups</h3>
          <div className="space-y-3">
            {battlecards.map((b) => {
              const isSelected = b.id === selectedCardId;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedCardId(b.id)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/60 dark:bg-orange-950/40 border-orange-400 dark:border-orange-700 shadow-md ring-2 ring-orange-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      Displaced {b.displaced_accounts_count} Hospital Accounts
                    </span>
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                      {b.hospital_market_share_pct}% Share
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xs font-bold text-slate-400">Accord Portfolio:</div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{b.accord_counterpart}</h4>
                  </div>

                  <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                    <span>vs. {b.competitor_product}</span>
                    <span className="text-slate-400">({b.competitor_maker})</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                    Indication: {b.indication}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED CLINICAL BATTLECARD */}
        {selectedCard && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Head-to-Head Battlecard
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {selectedCard.accord_counterpart}
                </h2>
                <p className="text-xs text-rose-500 font-bold mt-0.5">
                  Competing against: {selectedCard.competitor_product} ({selectedCard.competitor_maker})
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Formulary Displacement</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {selectedCard.displaced_accounts_count} Systems
                </span>
              </div>
            </div>

            {/* CLINICAL DIFFERENTIATION */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Accord Clinical Advantage &amp; Efficacy Edge
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                {selectedCard.accord_clinical_advantage}
              </p>
            </div>

            {/* PRESCRIBER OBJECTION & COUNTER */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Objection-Handling Framework
              </h4>

              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Doctor Objection Heard in Field:
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  &quot;{selectedCard.primary_objection}&quot;
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Recommended Rep Clinical Counter:
                </span>
                <p className="text-slate-900 dark:text-white font-bold leading-relaxed">
                  {selectedCard.recommended_counter}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
