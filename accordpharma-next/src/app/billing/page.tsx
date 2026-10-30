'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { DollarSign, Receipt, CheckCircle2, Clock, Building, Download } from 'lucide-react';

export default function BillingPage() {
  const [invoices] = useState([
    {
      id: 'inv-101',
      invoice_number: 'INV-2026-08101',
      account: 'St. Jude Metropolitan Medical Center',
      amount: 450000,
      collected: 420000,
      issue_date: '2026-10-01',
      due_date: '2026-10-31',
      status: 'PAID',
    },
    {
      id: 'inv-102',
      invoice_number: 'INV-2026-08102',
      account: 'Cedars-Sinai Comprehensive Cancer Pavilion',
      amount: 620000,
      collected: 510000,
      issue_date: '2026-10-10',
      due_date: '2026-11-10',
      status: 'PARTIAL',
    },
    {
      id: 'inv-103',
      invoice_number: 'INV-2026-08103',
      account: 'Northwestern Heart & Vascular Institute',
      amount: 145000,
      collected: 145000,
      issue_date: '2026-09-15',
      due_date: '2026-10-15',
      status: 'PAID',
    },
    {
      id: 'inv-104',
      invoice_number: 'INV-2026-08104',
      account: 'Memorial Sloan Regional Health System',
      amount: 280000,
      collected: 152000,
      issue_date: '2026-10-18',
      due_date: '2026-11-18',
      status: 'PENDING',
    },
  ]);

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.amount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.collected, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Receipt className="w-3.5 h-3.5" /> Accounts Receivable &amp; Remittances
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Commercial Billing &amp; Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track hospital volume supply disbursements, 340B institutional discounts, and net remittance realization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${totalInvoiced.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Q4 Commercial Invoicing</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Collected Remittance</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {Math.round((totalCollected / totalInvoiced) * 100)}% realization rate
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Outstanding Receivables</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ${(totalInvoiced - totalCollected).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Net 30 payment cycle</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Invoice #</th>
              <th className="p-3.5">Hospital Account</th>
              <th className="p-3.5">Invoiced Amount</th>
              <th className="p-3.5">Collected Remittance</th>
              <th className="p-3.5">Issue Date</th>
              <th className="p-3.5">Due Date</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-mono font-bold text-sky-600">{inv.invoice_number}</td>
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{inv.account}</td>
                <td className="p-3.5 font-black text-slate-900 dark:text-white">${inv.amount.toLocaleString()}</td>
                <td className="p-3.5 font-black text-emerald-600">${inv.collected.toLocaleString()}</td>
                <td className="p-3.5 text-slate-500">{inv.issue_date}</td>
                <td className="p-3.5 text-slate-500">{inv.due_date}</td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : inv.status === 'PARTIAL'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {inv.status}
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
