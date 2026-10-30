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
} from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Deals</span>
                    <strong className="text-xs font-black text-sky-600 dark:text-sky-400 mt-0.5 block">
                      {acc.open_deals_count} Active
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action link */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/orders"
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  + <Bilingual textKey="btnPlaceOrder" />
                </Link>
                <Link
                  href={`/accounts/${acc.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-500/20 transition-all hover:scale-[1.02]"
                >
                  <Bilingual textKey="btnAccountDossier" /> <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
