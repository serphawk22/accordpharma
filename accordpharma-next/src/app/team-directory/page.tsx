'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Users, Mail, Phone, MapPin, Award } from 'lucide-react';

export default function TeamDirectoryPage() {
  const members = [
    {
      name: 'Marcus Vance',
      role: 'Senior Executive Hospital Specialist',
      specialty: 'Cardiovascular & Interventional Medicine',
      territory: 'Territory West - California & Nevada',
      email: 'm.vance@accordpharma.com',
      phone: '+1 (415) 890-2134',
      quota: '$850,000',
      attainment: '90%',
    },
    {
      name: 'Elena Rostova',
      role: 'Cardiovascular Medical Representative',
      specialty: 'Heart Failure & Resistant Hypertension',
      territory: 'Territory Midwest - Illinois & Chicago',
      email: 'e.rostova@accordpharma.com',
      phone: '+1 (312) 640-9821',
      quota: '$600,000',
      attainment: '77%',
    },
    {
      name: 'David Chen',
      role: 'Oncology Key Account Specialist',
      specialty: 'Thoracic Oncology & Targeted NSCLC',
      territory: 'Territory East - New York Metro',
      email: 'd.chen@accordpharma.com',
      phone: '+1 (212) 990-4102',
      quota: '$700,000',
      attainment: '74%',
    },
    {
      name: 'Dr. Sarah Lin, PharmD',
      role: 'Medical Science Liaison (MSL)',
      specialty: 'Clinical Medical Affairs & Dossier Review',
      territory: 'National MSL Support',
      email: 's.lin@accordpharma.com',
      phone: '+1 (415) 890-4411',
      quota: 'Medical Affairs',
      attainment: 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" /> Commercial &amp; Medical Affairs Roster
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Team Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Medical representatives, hospital key account directors, and Medical Science Liaisons (MSL).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => (
          <div
            key={m.name}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-700 dark:text-sky-300 font-black text-base">
                {m.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">{m.name}</h3>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold">{m.role}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{m.specialty}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.email}
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.phone}
              </div>
              <div className="col-span-2 flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.territory}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
