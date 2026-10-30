'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Store, ShieldCheck, MapPin, Truck, CheckCircle2 } from 'lucide-react';

export default function MarketplacePage() {
  const distributors = [
    {
      name: 'AmerisourceBergen / Cencora Health System Logistics',
      territory: 'National Primary Wholesaler',
      coverage: 'Over 850 health systems & outpatient pharmacies',
      cold_chain: 'GxP Certified -20°C to +25°C validated fleet',
      status: 'Primary Partner',
      lead_time: 'Next Day by 10:30 AM',
    },
    {
      name: 'Cardinal Health Specialty Pharmaceutical Distribution',
      territory: 'Oncology & High-Value Biologics',
      coverage: '320 Comprehensive Cancer Centers & Academic Medical Centers',
      cold_chain: 'Continuous real-time RFID temperature track & trace',
      status: 'Specialty Partner',
      lead_time: 'Same-day urgent courier available',
    },
    {
      name: 'McKesson Plasma & Oncology Specialty Solutions',
      territory: 'Hospital Inpatient & 340B Covered Entities',
      coverage: '600+ regional and rural critical access hospitals',
      cold_chain: 'Dual-redundant thermal packaging certified',
      status: 'Authorized Wholesaler',
      lead_time: '24-48 Hours',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Store className="w-3.5 h-3.5" /> Distribution &amp; Wholesaler Network
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Distributor Network &amp; Marketplace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authorized pharmaceutical full-line wholesalers, specialty distributors, and hospital supply chain hubs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {distributors.map((d) => (
          <div
            key={d.name}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {d.status}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-3">{d.name}</h3>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {d.territory}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                <strong>Hospital Reach:</strong> {d.coverage}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center gap-1 text-slate-500">
                <Truck className="w-3.5 h-3.5 text-sky-500" /> <strong>Transit:</strong> {d.lead_time}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {d.cold_chain}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
