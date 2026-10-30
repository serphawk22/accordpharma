'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HospitalFormularyItem } from '@/lib/types';
import {
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  Presentation,
  DollarSign,
  Edit2,
  X,
  Plus,
} from 'lucide-react';
import { Bilingual, BilingualTh, BilingualLabel } from '@/components/Bilingual';

export default function FormularyPage() {
  const [items, setItems] = useState<HospitalFormularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<HospitalFormularyItem | null>(null);
  const [editForm, setEditForm] = useState({
    formulary_tier: 'Tier 1 Preferred',
    pt_status: 'Approved',
    pt_meeting_date: '',
    protocol_requirements: '',
    competitor_displaced: '',
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/sales/formulary');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      console.error('Failed to load formulary items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (item: HospitalFormularyItem) => {
    setEditingItem(item);
    setEditForm({
      formulary_tier: item.formulary_tier,
      pt_status: item.pt_status,
      pt_meeting_date: item.pt_meeting_date || '',
      protocol_requirements: item.protocol_requirements || '',
      competitor_displaced: item.competitor_displaced || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch('/api/sales/formulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...editForm,
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.account_name.toLowerCase().includes(search.toLowerCase()) ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.physician_champion && item.physician_champion.toLowerCase().includes(search.toLowerCase()));

    const matchesTier = selectedTier === 'ALL' ? true : item.formulary_tier === selectedTier;

    return matchesSearch && matchesTier;
  });

  const tier1Count = items.filter((i) => i.formulary_tier === 'Tier 1 Preferred').length;
  const underEvalCount = items.filter((i) => i.pt_status === 'Under Evaluation' || i.pt_status === 'Pending Review').length;
  const totalValue = items.reduce((acc, curr) => acc + curr.annual_potential_value, 0);

  return (
    <div className="space-y-6">
      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Institutional Market Access
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Hospital Formulary & P&T Committee Access
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drug coverage tiers, committee review cycles, physician champions, and competitor displacement.
          </p>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> <Bilingual textKey="kpiTier1Access" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{tier1Count} Health Systems</b>
          <span className="text-[11px] text-slate-400 mt-1 block">Unrestricted hospital order sets</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> <Bilingual textKey="kpiActivePtPipeline" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{underEvalCount} In Evaluation</b>
          <span className="text-[11px] text-slate-400 mt-1 block">Dossiers pending committee voting</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-sky-600 dark:text-sky-400 font-bold block flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> <Bilingual textKey="kpiAnnualPotentialValue" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ${totalValue.toLocaleString()}
          </b>
          <span className="text-[11px] text-slate-400 mt-1 block">Across monitored regional accounts</span>
        </div>
      </div>

      {/* FILTER STRIP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search hospital, drug name, champion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center w-full md:w-auto">
          {[
            { id: 'ALL', labelKey: 'tabAllListings' as const, fallback: 'All Listings' },
            { id: 'Tier 1 Preferred', fallback: 'Tier 1 Preferred' },
            { id: 'Tier 2 Prior Auth', fallback: 'Tier 2 Prior Auth' },
            { id: 'Non-Formulary', fallback: 'Non-Formulary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTier(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTier === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.labelKey ? <Bilingual textKey={tab.labelKey} /> : tab.fallback}
            </button>
          ))}
        </div>
      </div>

      {/* FORMULARY MATRIX TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <BilingualTh textKey="thHospitalFacility" />
                <BilingualTh textKey="thProductCategory" />
                <BilingualTh textKey="thFormularyTier" />
                <BilingualTh textKey="thPtStatus" />
                <BilingualTh textKey="thPhysicianChampion" />
                <BilingualTh textKey="thCompetitorDisplaced" />
                <BilingualTh textKey="thActions" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Hospital */}
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 dark:text-white font-bold block">{item.account_name}</strong>
                    <span className="text-[11px] text-slate-400">{item.territory}</span>
                  </td>

                  {/* Product */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.product_name}</span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">{item.category}</span>
                  </td>

                  {/* Tier Badge */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        item.formulary_tier === 'Tier 1 Preferred'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : item.formulary_tier === 'Tier 2 Prior Auth'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {item.formulary_tier}
                    </span>
                  </td>

                  {/* P&T Status */}
                  <td className="py-3.5 px-4">
                    <strong
                      className={`block font-bold ${
                        item.pt_status === 'Approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                      }`}
                    >
                      {item.pt_status}
                    </strong>
                    {item.pt_meeting_date && (
                      <span className="text-[10px] text-slate-400">Meeting: {item.pt_meeting_date}</span>
                    )}
                  </td>

                  {/* Physician Champion */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {item.physician_champion || '—'}
                    </span>
                  </td>

                  {/* Competitor Displaced */}
                  <td className="py-3.5 px-4">
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {item.competitor_displaced || 'None'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit formulary status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href="/edetailing"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Presentation className="w-3 h-3" /> <Bilingual textKey="btnDetail" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Update Hospital Formulary Status</h2>
                <div className="text-xs text-slate-400">
                  {editingItem.account_name} · {editingItem.product_name}
                </div>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BilingualLabel textKey="lblFormularyTierInput" />
                  <select
                    value={editForm.formulary_tier}
                    onChange={(e) => setEditForm({ ...editForm, formulary_tier: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Tier 1 Preferred">Tier 1 Preferred</option>
                    <option value="Tier 2 Prior Auth">Tier 2 Prior Auth</option>
                    <option value="Non-Formulary">Non-Formulary</option>
                  </select>
                </div>

                <div>
                  <BilingualLabel textKey="lblPtStatusInput" />
                  <select
                    value={editForm.pt_status}
                    onChange={(e) => setEditForm({ ...editForm, pt_status: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Under Evaluation">Under Evaluation</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <BilingualLabel textKey="lblNextPtMeetingDate" />
                <input
                  type="date"
                  value={editForm.pt_meeting_date}
                  onChange={(e) => setEditForm({ ...editForm, pt_meeting_date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <BilingualLabel textKey="lblCompetitorDisplacedInput" />
                <input
                  type="text"
                  placeholder="e.g. Novartis Entresto or Pfizer Standard of Care"
                  value={editForm.competitor_displaced}
                  onChange={(e) => setEditForm({ ...editForm, competitor_displaced: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <BilingualLabel textKey="lblProtocolRequirementsInput" />
                <textarea
                  rows={2}
                  value={editForm.protocol_requirements}
                  onChange={(e) => setEditForm({ ...editForm, protocol_requirements: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Bilingual textKey="btnCancel" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20"
                >
                  <Bilingual textKey="btnSaveFormulary" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
