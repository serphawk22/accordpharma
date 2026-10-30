'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Users, Calendar, Clock, MapPin, Building, Plus } from 'lucide-react';

export default function MeetingsPage() {
  const meetings = [
    {
      id: 'mtg-1',
      title: 'P&T Formulary Committee Formal Presentation: OncoTarget-700',
      account: 'Memorial Sloan Regional Health System',
      date: '2026-11-05',
      time: '02:00 PM - 03:30 PM',
      attendees: 'Dr. David Chen (Rep), Dr. Marcus Thorne, P&T Pharmacy Director',
      location: 'Executive Boardroom 4A & Hybrid Teams',
    },
    {
      id: 'mtg-2',
      title: 'Cardiology Department Head Round-Table on Dual ETA Modulation',
      account: 'St. Jude Metropolitan Medical Center',
      date: '2026-11-08',
      time: '07:30 AM - 08:45 AM',
      attendees: 'Marcus Vance (Rep), Dr. Sarah Chen, 6 Attending Cardiologists',
      location: 'Clinical Auditorium A',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" /> Institutional Assemblies
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Meetings &amp; P&amp;T Sessions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Institutional committee presentations, advisory boards, and clinical department rounds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600">
              <Building className="w-3.5 h-3.5" /> {m.account}
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{m.title}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-sky-600" /> {m.date}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {m.time}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div><strong>Attendees:</strong> {m.attendees}</div>
              <div className="text-slate-400 mt-0.5"><strong>Venue:</strong> {m.location}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
