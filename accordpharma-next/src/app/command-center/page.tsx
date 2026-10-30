'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import {
  Compass,
  TrendingUp,
  Target,
  Award,
  Users,
  Building,
  CheckCircle2,
  Calendar,
  BarChart3,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function CommandCenterPage() {
  const accounts = db.getAccounts();
  const hcps = db.getHCPs();
  const activities = db.activities;
  const opportunities = db.getOpportunities();

  const reps = [
    {
      name: 'Marcus Vance',
      role: 'Senior Executive Hospital Specialist',
      territory: 'Territory West - Northern CA & Bay Area',
      target: 850000,
      actual: 765000,
      accountsCount: 6,
      detailingCount: 18,
      attainment: 90,
      badge: 'Territory Leader',
    },
    {
      name: 'Elena Rostova',
      role: 'Cardiovascular Medical Representative',
      territory: 'Territory Midwest - Illinois & Chicago',
      target: 600000,
      actual: 462000,
      accountsCount: 4,
      detailingCount: 14,
      attainment: 77,
      badge: 'High Velocity',
    },
    {
      name: 'David Chen',
      role: 'Oncology Key Account Specialist',
      territory: 'Territory East - New York Metro',
      target: 700000,
      actual: 518000,
      accountsCount: 5,
      detailingCount: 12,
      attainment: 74,
      badge: 'Formulary Master',
    },
  ];

  const totalTarget = reps.reduce((acc, r) => acc + r.target, 0);
  const totalActual = reps.reduce((acc, r) => acc + r.actual, 0);
  const overallAttainment = Math.round((totalActual / totalTarget) * 100);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Compass className="w-3.5 h-3.5" /> Regional Commercial Governance
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sales Command Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Executive visibility into quota attainment, medical representative activity cadence, and institutional market share.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Full Reports &amp; Analytics
          </Link>
          <Link
            href="/edetailing"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            Launch e-Detailing Studio
          </Link>
        </div>
      </div>

      {/* REGIONAL QUOTA AGGREGATE STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-200">
            <span>Quota Attainment (Q4)</span>
            <Target className="w-4 h-4 text-sky-200" />
          </div>
          <div className="text-3xl font-black mt-2">{overallAttainment}%</div>
          <div className="text-xs text-sky-100 mt-1">
            ${totalActual.toLocaleString()} of ${totalTarget.toLocaleString()} Target
          </div>
          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-white h-full rounded-full" style={{ width: `${overallAttainment}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Accounts In Scope</span>
            <Building className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{accounts.length} Systems</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">100% active territory coverage</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Prescriber Touchpoints</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{activities.length * 3 + 15} Calls</div>
          <div className="text-xs text-purple-600 font-bold mt-1">3.8 visits / prescriber monthly</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Open Pipeline</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ${opportunities.reduce((acc, o) => (o.stage !== 'LOST' ? acc + o.estimated_value : acc), 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">{opportunities.length} Commercial deals</div>
        </div>
      </div>

      {/* MEDICAL REPRESENTATIVE QUOTA BREAKDOWN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Field Representative Performance Roster
        </h2>

        <div className="space-y-4">
          {reps.map((rep) => (
            <div
              key={rep.name}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-sm">
                  {rep.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{rep.name}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {rep.badge}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {rep.territory}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold">Attainment</div>
                  <div className="text-base font-black text-slate-900 dark:text-white">{rep.attainment}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold">Revenue Realized</div>
                  <div className="text-base font-black text-emerald-600">${rep.actual.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold">Quarter Quota</div>
                  <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                    ${rep.target.toLocaleString()}
                  </div>
                </div>
                <div className="w-32 hidden lg:block">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rep.attainment >= 85 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(rep.attainment, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
