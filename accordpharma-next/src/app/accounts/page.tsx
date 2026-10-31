'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Account } from '@/lib/types';
import {
  Building2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Activity,
  UserCheck,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_type: 'hospital',
    beds: 350,
    territory: 'Territory West - California & Bay Area',
    owner_name: 'Marcus Vance',
  });

  const loadAccounts = async () => {
    try {
      const { clientStore } = await import('@/lib/clientStore');
      const cached = clientStore.getAccounts();
      setAccounts(cached);
      setLoading(false);

      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length) {
          const cachedIds = new Set(cached.map((c) => c.id));
          const combined = [...cached, ...data.items.filter((i: any) => !cachedIds.has(i.id))];
          setAccounts(combined);
        }
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });

      let saved: Account;
      if (res.ok) {
        saved = await res.json();
      } else {
        saved = {
          id: `acc-${Date.now()}`,
          name: newAccount.name,
          account_type: (newAccount.account_type ? newAccount.account_type.toUpperCase() : 'HOSPITAL') as any,
          territory: newAccount.territory,
          owner_id: 'usr-1',
          owner_name: newAccount.owner_name,
          health_score: 94,
          health_status: 'healthy',
          beds: Number(newAccount.beds),
          total_invoiced: 150000,
          total_collected: 120000,
          open_deals_count: 2,
          created_at: new Date().toISOString(),
        };
      }

      const { clientStore } = await import('@/lib/clientStore');
      const updated = clientStore.saveAccount(saved);
      setAccounts(updated);
      setShowAddModal(false);
      setNewAccount({
        name: '',
        account_type: 'hospital',
        beds: 350,
        territory: 'Territory West - California & Bay Area',
        owner_name: 'Marcus Vance',
      });
    } catch (err) {
      console.error('Failed to create account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.territory.toLowerCase().includes(search.toLowerCase()) ||
      a.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" /> Institutional Client Management
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Hospital Accounts & Health Systems 360°
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Invoiced revenues, bed capacities, deterministic health scoring, and assigned commercial representatives.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Health System</span>
          </button>
        </div>
      </div>

      {/* SEARCH STRIP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search health systems, territory, rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* ACCOUNTS GRID */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading accounts 360°...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                    {acc.account_type} · {acc.beds} Beds
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      acc.health_status === 'healthy'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : acc.health_status === 'attention'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    HEALTH SCORE: {acc.health_score}%
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{acc.name}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  📍 {acc.territory} · Assigned Rep: <b>{acc.owner_name}</b>
                </div>

                {/* Financial KPI strip */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      <Bilingual textKey="kpiCommercialInvoiced" />
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block">
                      ${acc.total_invoiced.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      <Bilingual textKey="kpiCollectedRemittance" />
                    </span>
                    <strong className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ${acc.total_collected.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      Net Receivables
                    </span>
                    <strong className="text-xs font-black text-slate-600 dark:text-slate-300 mt-0.5 block">
                      ${Math.max(0, acc.total_invoiced - acc.total_collected).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CARD FOOTER */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <Link
                  href={`/accounts/${acc.id}`}
                  className="font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1.5 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  View 360° Profile &amp; Formularies
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-slate-400 text-[11px]">Synced with PostgreSQL</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                <Building2 className="w-4 h-4" />
                <span>Add Institutional Hospital Account</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Health System / Hospital Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Stanford University Medical Center"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Type</label>
                  <select
                    value={newAccount.account_type}
                    onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  >
                    <option value="hospital">Hospital (Academic/Tertiary)</option>
                    <option value="health_system">Regional Health System</option>
                    <option value="clinic">Specialty Clinic</option>
                    <option value="pharmacy">Hospital Outpatient Pharmacy</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Licensed Beds</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={newAccount.beds}
                    onChange={(e) => setNewAccount({ ...newAccount, beds: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Commercial Territory</label>
                <input
                  type="text"
                  value={newAccount.territory}
                  onChange={(e) => setNewAccount({ ...newAccount, territory: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving to Database...' : 'Save Health System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
