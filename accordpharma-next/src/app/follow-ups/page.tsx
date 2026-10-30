'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Calendar, Clock, CheckCircle2, User, Building, Plus } from 'lucide-react';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([
    {
      id: 'flw-1',
      physician: 'Dr. Sarah Chen, MD',
      institution: 'St. Jude Metropolitan Medical Center',
      scheduled_date: '2026-10-31',
      topic: 'Deliver 10 CardioVas-XR Titration Starter Packs & evaluate initial 5 patient tolerability',
      status: 'pending',
      priority: 'high',
    },
    {
      id: 'flw-2',
      physician: 'Dr. Aris Thorne, MD',
      institution: 'Cedars-Sinai Comprehensive Cancer Pavilion',
      scheduled_date: '2026-11-04',
      topic: 'Present Kaplan-Meier subpopulation OS data to Thoracic Oncology tumor board',
      status: 'confirmed',
      priority: 'urgent',
    },
    {
      id: 'flw-3',
      physician: 'Dr. Michael Chang, MD',
      institution: 'Northwestern Heart & Vascular Institute',
      scheduled_date: '2026-11-09',
      topic: 'Follow up on P&T committee agenda placement and electronic ordering set setup',
      status: 'pending',
      priority: 'normal',
    },
  ]);

  const handleToggleComplete = (id: string) => {
    setFollowUps(
      followUps.map((f) => (f.id === id ? { ...f, status: f.status === 'completed' ? 'pending' : 'completed' } : f))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" /> Prescriber Touchpoint Cadence
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Follow-ups &amp; Scheduled Cadence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ensure high medical relationship continuity by tracking scheduled clinical callbacks and post-detailing sample reviews.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
        {followUps.map((item) => (
          <div
            key={item.id}
            className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
              item.status === 'completed' ? 'bg-slate-50/50 dark:bg-slate-800/20 opacity-60' : 'hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleToggleComplete(item.id)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 transition-colors ${
                  item.status === 'completed'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-sky-500'
                }`}
              >
                {item.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{item.physician}</span>
                  <span className="text-[10px] text-slate-400">· {item.institution}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">{item.topic}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-sky-600" /> {item.scheduled_date}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  item.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {item.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
