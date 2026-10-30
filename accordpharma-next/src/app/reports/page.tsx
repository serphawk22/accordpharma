'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  PieChart,
  DollarSign,
  Activity,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export default function ReportsPage() {
  const accounts = db.getAccounts();
  const opportunities = db.getOpportunities();

  const therapeuticSplit = [
    { name: 'Cardiovascular (CardioVas-XR)', revenue: 845000, share: 56, growth: '+22.4%' },
    { name: 'Targeted Oncology (OncoTarget-700)', revenue: 510000, share: 34, growth: '+31.8%' },
    { name: 'Neurology (NeuroGuard-IV)', revenue: 140000, share: 10, growth: '+14.1%' },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" /> Intelligence &amp; Forecasting
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sales Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Institutional revenue trends, therapeutic product mix, e-detailing engagement velocity, and quota pacing.
          </p>
        </div>
        <button
          onClick={() => alert('Exporting quarterly GxP commercial compliance and revenue report (PDF/XLSX)...')}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
        >
          <Download className="w-4 h-4" /> Export Report (XLSX)
        </button>
      </div>

      {/* REVENUE BY THERAPEUTIC CLASS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <PieChart className="w-4 h-4 text-sky-600" /> Commercial Revenue by Therapeutic Line
        </h2>

        <div className="space-y-4 pt-2">
          {therapeuticSplit.map((item) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-600">{item.growth}</span>
                  <span className="font-black text-slate-900 dark:text-white">${item.revenue.toLocaleString()}</span>
                  <span className="text-slate-400 font-semibold w-10 text-right">({item.share}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-600 h-full rounded-full"
                  style={{ width: `${item.share}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUARTERLY PACING & HOSPITAL FUNNEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Quarterly Territory Velocity
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">Q1 2026</span>
              <span className="font-black text-slate-900 dark:text-white">$1,120,000</span>
              <span className="text-emerald-600 font-bold">+12% vs prior</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">Q2 2026</span>
              <span className="font-black text-slate-900 dark:text-white">$1,280,000</span>
              <span className="text-emerald-600 font-bold">+14% vs prior</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">Q3 2026</span>
              <span className="font-black text-slate-900 dark:text-white">$1,390,000</span>
              <span className="text-emerald-600 font-bold">+8% vs prior</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900">
              <span className="font-bold text-sky-800 dark:text-sky-300">Q4 2026 (Paced)</span>
              <span className="font-black text-sky-900 dark:text-sky-100">$1,495,000</span>
              <span className="text-emerald-600 font-bold">+18.4% vs prior</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" /> e-Detailing Clinical Conversion
          </h3>
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Physicians Detailed</span>
                <span className="font-bold text-slate-900 dark:text-white">48 Prescribers</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Requested Titration Samples</span>
                <span className="font-bold text-slate-900 dark:text-white">38 Prescribers (79%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: '79%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Active Patient Initiations</span>
                <span className="font-bold text-slate-900 dark:text-white">31 Prescribers (65%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
