'use client';

import React from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { ShieldCheck, Scale, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CompliancePage() {
  const auditLogs = [
    {
      id: 'aud-1',
      action: 'Sunshine Act Spend Logged: Dr. Sarah Chen Advisory Board Honorarium',
      category: 'CMS Open Payments',
      amount: '$1,500.00',
      timestamp: '2026-10-24 18:00',
      officer: 'GxP Auto-Compliance Ledger',
      status: 'VERIFIED',
    },
    {
      id: 'aud-2',
      action: 'Sample Accountability Balance Verified: Cedars-Sinai Titration Packs (Lot CVX-26-881)',
      category: 'PDMA Sample Compliance',
      amount: '10 Units',
      timestamp: '2026-10-22 14:15',
      officer: 'Marcus Vance / Inpatient Pharmacy',
      status: 'AUDITED',
    },
    {
      id: 'aud-3',
      action: 'Commercial e-Detailing Clinical Content Annual Re-Certification (OncoTarget-700 v3.2)',
      category: 'FDA Fair Balance & OPDP Review',
      amount: 'N/A',
      timestamp: '2026-10-15 09:30',
      officer: 'Regulatory Affairs Committee',
      status: 'APPROVED',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5" /> Corporate Governance &amp; Ethics
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Compliance &amp; GxP Audits
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sunshine Act Open Payments tracking, Prescription Drug Marketing Act (PDMA) sample accountability, and regulatory inspection logs.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Compliance Event / Audit Log</th>
              <th className="p-3.5">Regulatory Scope</th>
              <th className="p-3.5">Disclosed Value</th>
              <th className="p-3.5">Sign-off Officer</th>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{log.action}</td>
                <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-300">{log.category}</td>
                <td className="p-3.5 font-black text-slate-900 dark:text-white">{log.amount}</td>
                <td className="p-3.5 text-slate-500">{log.officer}</td>
                <td className="p-3.5 text-slate-500">{log.timestamp}</td>
                <td className="p-3.5">
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {log.status}
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
