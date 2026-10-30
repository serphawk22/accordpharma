'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Trophy, Award, TrendingUp, Star, MapPin } from 'lucide-react';

export default function LeaderboardPage() {
  const rankings = [
    {
      rank: 1,
      rep: 'Marcus Vance',
      territory: 'Territory West - California',
      attainment: 90,
      revenue: '$765,000',
      deals: 12,
      tier: 'Diamond Vanguard',
    },
    {
      rank: 2,
      rep: 'Elena Rostova',
      territory: 'Territory Midwest - Illinois',
      attainment: 77,
      revenue: '$462,000',
      deals: 9,
      tier: 'Gold Achiever',
    },
    {
      rank: 3,
      rep: 'David Chen',
      territory: 'Territory East - New York',
      attainment: 74,
      revenue: '$518,000',
      deals: 8,
      tier: 'Silver Performer',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" /> Commercial Excellence
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Territory Leaderboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quarterly revenue attainment rankings, formulary adoption velocity, and club standings.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Rank</th>
              <th className="p-3.5">Representative</th>
              <th className="p-3.5">Territory</th>
              <th className="p-3.5">Quota Attainment</th>
              <th className="p-3.5">Revenue Realized</th>
              <th className="p-3.5">Formulary Wins</th>
              <th className="p-3.5">Honor Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {rankings.map((r) => (
              <tr key={r.rank} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                      r.rank === 1
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : r.rank === 2
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    #{r.rank}
                  </div>
                </td>
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{r.rep}</td>
                <td className="p-3.5 text-slate-500">{r.territory}</td>
                <td className="p-3.5 font-black text-sky-600 dark:text-sky-400">{r.attainment}%</td>
                <td className="p-3.5 font-black text-slate-900 dark:text-white">{r.revenue}</td>
                <td className="p-3.5 font-bold text-emerald-600">{r.deals} Systems</td>
                <td className="p-3.5">
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {r.tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
