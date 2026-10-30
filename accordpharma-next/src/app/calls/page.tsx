'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Phone, PhoneCall, Clock, User, Building } from 'lucide-react';

export default function CallsPage() {
  const calls = [
    {
      id: 'cl-1',
      physician: 'Dr. Sarah Chen, MD',
      institution: 'St. Jude Metropolitan Medical Center',
      date: '2026-10-24 16:15',
      duration: '14 min',
      summary: 'Reviewed HFpEF titration protocol and addressed renal dosage adjustments for eGFR < 45.',
      rep: 'Marcus Vance',
      sentiment: 'Very Receptive',
    },
    {
      id: 'cl-2',
      physician: 'Dr. Raymond Zhao, MD',
      institution: 'Houston Methodist Neurological Institute',
      date: '2026-10-22 10:30',
      duration: '9 min',
      summary: 'Informed physician of Phase III NeuroGuard-IV publication in NEJM. Sent clinical reprint PDF.',
      rep: 'David Chen',
      sentiment: 'Receptive',
    },
    {
      id: 'cl-3',
      physician: 'Dr. Michael Chang, MD',
      institution: 'Northwestern Heart & Vascular Institute',
      date: '2026-10-19 14:00',
      duration: '11 min',
      summary: 'Discussed P&T Committee agenda cutoff dates and confirmed submission dossier receipt.',
      rep: 'Elena Rostova',
      sentiment: 'Neutral',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <PhoneCall className="w-3.5 h-3.5" /> Direct Prescriber Touchpoints
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Physician Call Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tele-detailing records, medical inquiry calls, and sample fulfillment follow-ups.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Prescriber</th>
              <th className="p-3.5">Institution</th>
              <th className="p-3.5">Call Date &amp; Time</th>
              <th className="p-3.5">Duration</th>
              <th className="p-3.5">Key Clinical Outcome</th>
              <th className="p-3.5">Sentiment</th>
              <th className="p-3.5">Medical Rep</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {calls.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{c.physician}</td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300">{c.institution}</td>
                <td className="p-3.5 text-slate-500">{c.date}</td>
                <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{c.duration}</td>
                <td className="p-3.5 max-w-xs">{c.summary}</td>
                <td className="p-3.5">
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {c.sentiment}
                  </span>
                </td>
                <td className="p-3.5 text-slate-500">{c.rep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
