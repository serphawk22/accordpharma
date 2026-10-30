'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Proposal } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  FileText,
  DollarSign,
  Percent,
  Plus,
  CheckCircle2,
  Clock,
  Building,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>(() => db.getProposals());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    account_id: db.getAccounts()[0]?.id || '',
    total_value: 350000,
    discount_pct: 12,
    valid_until: '2026-12-31',
  });

  const totalValue = proposals.reduce((acc, p) => acc + (p.total_value ?? p.value), 0);

  const handleStatusChange = (id: string, status: Proposal['status']) => {
    const prop = proposals.find((p) => p.id === id);
    if (prop) {
      prop.status = status;
      setProposals([...proposals]);
    }
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const account = db.getAccount(formData.account_id);
    const newProp: Proposal = {
      id: `prop-${Date.now()}`,
      title: formData.title,
      account_id: formData.account_id,
      account_name: account?.name || 'Institutional Account',
      value: Number(formData.total_value),
      total_value: Number(formData.total_value),
      discount_percent: Number(formData.discount_pct),
      discount_pct: Number(formData.discount_pct),
      status: 'UNDER_REVIEW',
      valid_until: formData.valid_until,
      created_at: new Date().toISOString(),
    };
    proposals.unshift(newProp);
    setProposals([...proposals]);
    setShowCreateModal(false);
    setFormData({
      title: '',
      account_id: db.getAccounts()[0]?.id || '',
      total_value: 350000,
      discount_pct: 12,
      valid_until: '2026-12-31',
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" /> Institutional Contracting &amp; Pricing
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Proposals &amp; Deal Negotiations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Commercial master service contracts, hospital rebate schedules, and formulary access price agreements.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <Bilingual textKey="btnDraftProposal" fallback="Draft New Proposal" />
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Contract Value</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${totalValue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Across {proposals.length} active negotiation dossiers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Under P&amp;T Review</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {proposals.filter((p) => p.status === 'UNDER_REVIEW' || (p.status as string) === 'IN_REVIEW').length} Contracts
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">Active pricing deliberations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Accepted &amp; Signed</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {proposals.filter((p) => p.status === 'ACCEPTED').length} Executed
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Active supply agreements</span>
        </div>
      </div>

      {/* PROPOSALS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Contract Proposal Title</th>
                <th className="p-3.5">Health System / Account</th>
                <th className="p-3.5">Contract Value</th>
                <th className="p-3.5">Rebate / Discount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Valid Until</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {proposals.map((prop) => {
                const statusBadge =
                  prop.status === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : prop.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

                return (
                  <tr key={prop.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{prop.title}</td>
                    <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-300">{prop.account_name}</td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      ${(prop.total_value ?? prop.value).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600">{prop.discount_pct ?? prop.discount_percent}% Volume Tier</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{prop.valid_until}</td>
                    <td className="p-3.5 text-right">
                      {(prop.status === 'UNDER_REVIEW' || (prop.status as string) === 'IN_REVIEW') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatusChange(prop.id, 'ACCEPTED')}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(prop.id, 'REJECTED')}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950 px-2 py-1 rounded-lg"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Draft Commercial Proposal</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Proposal Title</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 2027 Inpatient Volume Supply Commitment"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital Account</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {db.getAccounts().map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.territory})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contract Total ($)</label>
                  <input
                    type="number"
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rebate Tier (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.discount_pct}
                    onChange={(e) => setFormData({ ...formData, discount_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expiration / Validity</label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
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
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
