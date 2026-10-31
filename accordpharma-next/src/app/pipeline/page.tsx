'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/store';
import { Opportunity, Account } from '@/lib/types';
import { clientStore } from '@/lib/clientStore';
import { Bilingual } from '@/components/Bilingual';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const STAGES: Opportunity['stage'][] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    account_id: '',
    stage: 'PROSPECTING' as Opportunity['stage'],
    estimated_value: 150000,
    probability: 30,
    expected_close_date: '2026-12-15',
    product_name: 'CardioVas-XR 100mg Tablets',
    rep_name: 'Marcus Vance',
  });

  // Load from clientStore and backend
  useEffect(() => {
    const cachedOpps = clientStore.getOpportunities();
    setOpportunities(cachedOpps);

    const cachedAccounts = clientStore.getAccounts();
    setAccounts(cachedAccounts);
    if (cachedAccounts.length > 0 && !formData.account_id) {
      setFormData((prev) => ({ ...prev, account_id: cachedAccounts[0].id }));
    }

    // Fetch live opportunities from Railway PostgreSQL
    fetch('/api/pipeline')
      .then((res) => res.json())
      .then((data) => {
        if (data.items?.length) {
          const local = clientStore.getOpportunities();
          const localIds = new Set(local.map((o) => o.id));
          const merged = [...local, ...data.items.filter((i: any) => !localIds.has(i.id))];
          setOpportunities(merged);
        }
      })
      .catch((err) => console.warn('Could not fetch pipeline from backend:', err));

    // Fetch live accounts from Railway PostgreSQL
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.items?.length) {
          const local = clientStore.getAccounts();
          const localIds = new Set(local.map((a) => a.id));
          const merged = [...local, ...data.items.filter((i: any) => !localIds.has(i.id))];
          setAccounts(merged);
          if (!formData.account_id && merged.length > 0) {
            setFormData((prev) => ({ ...prev, account_id: merged[0].id }));
          }
        }
      })
      .catch((err) => console.warn('Could not fetch accounts:', err));
  }, []);

  const totalValue = opportunities.reduce((acc, o) => (o.stage !== 'LOST' ? acc + o.estimated_value : acc), 0);
  const weightedValue = opportunities.reduce(
    (acc, o) => (o.stage !== 'LOST' ? acc + (o.estimated_value * o.probability) / 100 : acc),
    0
  );
  const openCount = opportunities.filter((o) => o.stage !== 'WON' && o.stage !== 'LOST').length;

  const handleStageChange = (id: string, newStage: Opportunity['stage']) => {
    const updated = clientStore.updateOpportunityStage(id, newStage);
    setOpportunities(updated);
    if (selectedOpp && selectedOpp.id === id) {
      setSelectedOpp({ ...selectedOpp, stage: newStage });
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    const selectedAccount = accounts.find((a) => a.id === formData.account_id);
    const accountName = selectedAccount?.name || 'Hospital Clinical Center';

    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      name: formData.name,
      account_id: formData.account_id || (accounts[0]?.id ?? 'acc-1'),
      account_name: accountName,
      stage: formData.stage,
      estimated_value: Number(formData.estimated_value),
      probability: Number(formData.probability),
      expected_close_date: formData.expected_close_date,
      product_name: formData.product_name,
      rep_name: formData.rep_name,
      created_at: new Date().toISOString(),
    };

    try {
      // Send to Railway PostgreSQL backend via Next.js proxy
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOpp,
          account_name: accountName,
        }),
      });

      if (res.ok) {
        const savedFromDb = await res.json();
        if (savedFromDb?.id) {
          newOpp.id = String(savedFromDb.id);
        }
      }
    } catch (err) {
      console.warn('Backend pipeline sync error:', err);
    }

    // Persist immediately to clientStore so page refresh maintains it
    const updatedList = clientStore.saveOpportunity(newOpp);
    setOpportunities(updatedList);
    setShowCreateModal(false);
    setIsSubmitting(false);

    setFormData({
      name: '',
      account_id: accounts[0]?.id || '',
      stage: 'PROSPECTING',
      estimated_value: 150000,
      probability: 30,
      expected_close_date: '2026-12-15',
      product_name: 'CardioVas-XR 100mg Tablets',
      rep_name: 'Marcus Vance',
    });
  };

  const filteredOpps =
    selectedStage === 'ALL' ? opportunities : opportunities.filter((o) => o.stage === selectedStage);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" /> Commercial Pipeline &amp; Deals
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sales Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual progression of pharmaceutical commercial opportunities across contract stages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors"
          >
            {viewMode === 'kanban' ? <TableIcon className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            {viewMode === 'kanban' ? 'Switch to Table View' : 'Switch to Kanban'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <Bilingual textKey="btnNewDeal" fallback="New Opportunity" />
          </button>
        </div>
      </div>

      {/* KPI METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <Bilingual textKey="kpiActivePipeline" fallback="Active Pipeline Value" />
            <DollarSign className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${totalValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all open contract stages</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <Bilingual textKey="kpiWeightedPipeline" fallback="Weighted Pipeline" />
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${Math.round(weightedValue).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Probability adjusted forecast</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <Bilingual textKey="kpiOpenDeals" fallback="Open Deals Count" />
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {openCount} Opportunities
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active negotiation &amp; review</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <Bilingual textKey="kpiConversionRate" fallback="Pipeline Conversion" />
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {Math.round((opportunities.filter((o) => o.stage === 'WON').length / opportunities.length) * 100)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Institutional win rate</div>
        </div>
      </div>

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageOpps = opportunities.filter((o) => o.stage === stage);
            const stageSum = stageOpps.reduce((acc, o) => acc + o.estimated_value, 0);

            const badgeColor =
              stage === 'WON'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                : stage === 'LOST'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                : stage === 'NEGOTIATION'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300';

            return (
              <div
                key={stage}
                className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 min-w-[220px] flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div>
                    <span className="text-[10px] font-black tracking-wide text-slate-500 dark:text-slate-400">
                      {stage}
                    </span>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      ${stageSum.toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {stageOpps.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] p-0.5">
                  {stageOpps.map((opp) => {
                    const isCardio = opp.product_name.includes('Cardio');
                    const isOnco = opp.product_name.includes('Onco');

                    return (
                      <div
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-400 cursor-pointer shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                              isOnco
                                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : isCardio
                                ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            }`}
                          >
                            {opp.product_name.split(' ')[0]}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {opp.expected_close_date}
                          </span>
                        </div>

                        <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 truncate">
                          {opp.account_name}
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5 line-clamp-2 leading-tight">
                          {opp.name}
                        </div>

                        {/* Value and Weighted */}
                        <div className="flex items-baseline justify-between mt-2.5">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            ${opp.estimated_value.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ${Math.round((opp.estimated_value * opp.probability) / 100).toLocaleString()} wt.
                          </span>
                        </div>

                        {/* Win Probability Bar */}
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>Win Probability</span>
                            <span className="text-slate-700 dark:text-slate-300">{opp.probability}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full"
                              style={{ width: `${opp.probability}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Footer rep tag */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-4 h-4 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-[8px]">
                              {opp.rep_name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <span className="font-semibold truncate text-slate-600 dark:text-slate-300">{opp.rep_name}</span>
                          </div>
                          <span className="font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Manage →
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {stageOpps.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW: TABLE */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stage Filter:</span>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5"
              >
                <option value="ALL">All Stages ({opportunities.length})</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s} ({opportunities.filter((o) => o.stage === s).length})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredOpps.length} Opportunities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">
                    <Bilingual textKey="colOpportunity" fallback="Deal / Opportunity Name" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colAccount" fallback="Health System Account" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colStage" fallback="Stage" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colValue" fallback="Estimated Value" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colProbability" fallback="Win Probability" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colCloseDate" fallback="Close Date" />
                  </th>
                  <th className="p-3.5">
                    <Bilingual textKey="colRep" fallback="Medical Rep" />
                  </th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredOpps.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => setSelectedOpp(opp)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{opp.name}</td>
                    <td className="p-3.5">{opp.account_name}</td>
                    <td className="p-3.5">
                      <span className="font-extrabold px-2 py-0.5 rounded text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                        {opp.stage}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      ${opp.estimated_value.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-600">{opp.probability}%</td>
                    <td className="p-3.5">{opp.expected_close_date}</td>
                    <td className="p-3.5">{opp.rep_name}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpp(opp);
                        }}
                        className="text-xs font-bold text-sky-600 hover:underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-sky-600">{selectedOpp.stage}</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">{selectedOpp.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5">{selectedOpp.account_name}</div>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Deal Value</span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  ${selectedOpp.estimated_value.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Weighted Est.</span>
                <div className="text-base font-black text-emerald-600">
                  ${Math.round((selectedOpp.estimated_value * selectedOpp.probability) / 100).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Product In Scope</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{selectedOpp.product_name}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Expected Close</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{selectedOpp.expected_close_date}</div>
              </div>
            </div>

            {/* Quick Stage Transition */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Move Opportunity Stage
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(selectedOpp.id, s)}
                    className={`text-[11px] font-bold py-2 px-2 rounded-lg border transition-all ${
                      selectedOpp.stage === s
                        ? 'bg-sky-600 text-white border-sky-600 shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedOpp(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE OPPORTUNITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">New Commercial Opportunity</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deal Title</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Memorial Sloan Inpatient Formularly Inclusion"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Health System Account</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.territory})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as Opportunity['stage'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Therapeutic Product</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
