'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Tender } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Landmark,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Calculator,
  Percent,
  TrendingDown,
  Building2,
  FileBadge,
} from 'lucide-react';

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>(() => db.getTenders());
  const [activeTab, setActiveTab] = useState<'bids' | 'gtn'>('bids');

  // GTN Calculator State
  const [wacPrice, setWacPrice] = useState(4200); // List price per unit
  const [tenderVolume, setTenderVolume] = useState(5000); // Units
  const [statutoryRebate, setStatutoryRebate] = useState(23.1); // Medicaid / statutory %
  const [volumeRebate, setVolumeRebate] = useState(12.0); // Hospital network volume tier %
  const [promptPayDiscount, setPromptPayDiscount] = useState(2.0); // 2% 30-day prompt pay
  const [distributionFee, setDistributionFee] = useState(3.5); // Wholesaler fee %

  // Computations
  const grossValue = wacPrice * tenderVolume;
  const statutoryDeduction = grossValue * (statutoryRebate / 100);
  const volumeDeduction = grossValue * (volumeRebate / 100);
  const promptPayDeduction = grossValue * (promptPayDiscount / 100);
  const distributionDeduction = grossValue * (distributionFee / 100);

  const totalDeductions = statutoryDeduction + volumeDeduction + promptPayDeduction + distributionDeduction;
  const netRevenue = grossValue - totalDeductions;
  const netPricePerUnit = tenderVolume > 0 ? netRevenue / tenderVolume : 0;
  const gtnPercentage = grossValue > 0 ? Math.round((netRevenue / grossValue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Landmark className="w-3.5 h-3.5" /> Institutional &amp; Government Procurement
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Tenders &amp; Gross-to-Net (GTN)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Competitive hospital procurement tenders, regional health authority bids, and volume supply contract commitments with real-time Gross-to-Net price simulation.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('bids')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'bids'
              ? 'bg-indigo-600 text-white shadow'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <FileBadge className="w-3.5 h-3.5" />
          <span>Active Procurement Tenders ({tenders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gtn')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'gtn'
              ? 'bg-indigo-600 text-white shadow'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Gross-to-Net (GTN) Margin Simulator</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE BIDS TABLE */}
      {activeTab === 'bids' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Tender / RFP Title</th>
                <th className="p-3.5">Procurement Authority</th>
                <th className="p-3.5">Estimated Bid Value</th>
                <th className="p-3.5">Submission Deadline</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {tenders.map((t) => {
                const statusBadge =
                  t.status === 'AWARDED' || (t.status as string) === 'WON'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : t.status === 'SUBMITTED'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{t.title}</td>
                    <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-300">
                      {t.authority || t.account_name}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      ${(t.estimated_value ?? t.value).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-slate-500">{t.submission_deadline || t.due_at}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GTN REBATE CALCULATOR */}
      {activeTab === 'gtn' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SLIDERS & PARAMETERS */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
              <Calculator className="w-4 h-4 text-indigo-500" />
              Tender Pricing &amp; Mandatory Rebate Modeler
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  List Price (WAC per Unit)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={wacPrice}
                    onChange={(e) => setWacPrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tender Committed Volume</label>
                <input
                  type="number"
                  value={tenderVolume}
                  onChange={(e) => setTenderVolume(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Medicaid / Statutory Rebate:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{statutoryRebate}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={0.1}
                  value={statutoryRebate}
                  onChange={(e) => setStatutoryRebate(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Hospital Network Volume Tier Rebate:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{volumeRebate}%</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={25}
                  step={0.5}
                  value={volumeRebate}
                  onChange={(e) => setVolumeRebate(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Prompt-Pay Discount (30 Days):</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{promptPayDiscount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={promptPayDiscount}
                  onChange={(e) => setPromptPayDiscount(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* GTN REALIZED SUMMARY */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5 border border-indigo-800/40">
            <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Net Realized Price</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-black border border-indigo-400/30">
                GTN Retention: {gtnPercentage}%
              </span>
            </div>

            <div>
              <span className="text-xs text-indigo-200 block">Realized Net Price per Unit:</span>
              <div className="text-4xl font-black text-white mt-1">
                ${netPricePerUnit.toFixed(2)}
                <span className="text-xs text-indigo-300 font-normal ml-2">vs ${wacPrice} WAC</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Gross Invoice Value:</span>
                <strong>${grossValue.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Total Rebates &amp; Deductions:</span>
                <strong>-${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-black text-emerald-400">
                <span>Net Commercial Revenue:</span>
                <span>${netRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
