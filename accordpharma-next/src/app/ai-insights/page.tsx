'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Mic, Activity, BrainCircuit, AlertCircle, TrendingDown, CheckCircle2 } from 'lucide-react';

export default function AiInsightsPage() {
  const insights = [
    {
      title: 'Prescriber Hesitation: CardioVas-XR Prior Authorization Friction',
      severity: 'Medium Risk',
      frequency: '6 Detailing Sessions',
      impact: 'Delaying outpatient conversion in Territory West',
      recommendation:
        'Equip medical reps with the 1-click digital Prior Authorization portal link and digital pharmacy benefit manager routing sheet.',
    },
    {
      title: 'High Receptivity: OncoTarget-700 Exon 20 Median PFS Reprints',
      severity: 'High Opportunity',
      frequency: '9 Detailing Sessions',
      impact: '82% of thoracic oncologists agreed to submit P&T inclusion requests',
      recommendation:
        'Expedite hospital formulary dossier delivery to Cedars-Sinai and Memorial Sloan P&T boards.',
    },
    {
      title: 'Competitor Switch Threat: Generic SGLT2 Combination Pricing',
      severity: 'Low Risk',
      frequency: '3 Detailing Sessions',
      impact: 'Commercial payer tier disparity in Midwest regional health systems',
      recommendation:
        'Present the health-economics hospital admission cost-avoidance model (saving $4,200 per patient annualized).',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <BrainCircuit className="w-3.5 h-3.5" /> Clinical Intelligence Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            AI Voice Caller &amp; Territory Insights
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated sentiment clustering from physician interactions, objection frequency analysis, and automated call transcription summaries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((item) => (
          <div
            key={item.title}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    item.severity === 'High Opportunity'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.severity === 'Medium Risk'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {item.severity}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">{item.frequency}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs mt-3">{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{item.impact}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">AI Recommendation:</span>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{item.recommendation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
