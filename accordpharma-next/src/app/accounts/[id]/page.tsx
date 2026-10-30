'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import {
  Account,
  HospitalFormularyItem,
  HealthcareProfessional,
  CommercialOrder,
  SalesActivity,
  CRMTask,
} from '@/lib/types';
import {
  Building2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Stethoscope,
  ShoppingBag,
  Clock,
  ArrowLeft,
  Presentation,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

function AccountDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [data, setData] = useState<{
    account: Account;
    formularies: HospitalFormularyItem[];
    contacts: HealthcareProfessional[];
    orders: CommercialOrder[];
    activities: SalesActivity[];
    tasks: CRMTask[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'formulary' | 'contacts' | 'orders' | 'timeline'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Account 360° Profile...</div>;
  }

  if (!data?.account) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">Account not found.</p>
        <Link href="/accounts" className="text-sky-600 font-bold text-xs mt-2 inline-block">
          ← Return to Accounts
        </Link>
      </div>
    );
  }

  const { account, formularies, contacts, orders, activities, tasks } = data;

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts Directory
      </Link>

      {/* ACCOUNT HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              {account.account_type} · {account.beds} BEDS
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              HEALTH SCORE {account.health_score}% (ON TRACK)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {account.name}
          </h1>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
            <span>📍 {account.territory}</span>
            <span>·</span>
            <span>
              Assigned Representative: <b>{account.owner_name}</b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/edetailing"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Presentation className="w-4 h-4" /> <Bilingual textKey="btnLaunchEdetailing" />
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
          >
            <ShoppingBag className="w-4 h-4" /> <Bilingual textKey="btnPlaceOrder" />
          </Link>
        </div>
      </div>

      {/* FINANCIAL KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            <Bilingual textKey="kpiCommercialInvoiced" />
          </span>
          <b className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
            ${account.total_invoiced.toLocaleString()}
          </b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            <Bilingual textKey="kpiCollectedRemittance" />
          </span>
          <b className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ${account.total_collected.toLocaleString()}
          </b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            <Bilingual textKey="kpiFormularyTier1" />
          </span>
          <b className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5 block">
            {formularies.filter((f) => f.formulary_tier === 'Tier 1 Preferred').length} Drugs
          </b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            <Bilingual textKey="kpiKolPrescribers" />
          </span>
          <b className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
            {contacts.length} Doctors
          </b>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: 'overview', key: 'tabOverview' as const, count: null },
          { id: 'formulary', key: 'tabFormularyStatus' as const, count: formularies.length },
          { id: 'contacts', key: 'tabKeyPrescribers' as const, count: contacts.length },
          { id: 'orders', key: 'tabCommercialOrders' as const, count: orders.length },
          { id: 'timeline', key: 'tabTouchpointTimeline' as const, count: activities.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bilingual textKey={tab.key} />
            {tab.count !== null && <span className="ml-1 opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: FORMULARY & P&T STATUS */}
      {activeTab === 'formulary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Hospital Drug Formulary Listings
            </h3>
            <Link href="/formulary" className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
              Global Formulary Matrix →
            </Link>
          </div>

          {formularies.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
              No formulary listings documented for this facility yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Therapeutic Drug</th>
                    <th className="py-3 px-4">Formulary Tier</th>
                    <th className="py-3 px-4">P&T Status</th>
                    <th className="py-3 px-4">Physician Champion</th>
                    <th className="py-3 px-4">Protocol Requirements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formularies.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{f.product_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            f.formulary_tier === 'Tier 1 Preferred'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {f.formulary_tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{f.pt_status}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {f.physician_champion || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs">{f.protocol_requirements || 'Standard'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    c.kol_status
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.kol_status ? '★ KOL' : c.prescribing_tier}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{c.full_name}</h4>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {c.title} · {c.specialty}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">License: {c.license_number}</div>
              </div>
              <Link
                href={`/edetailing?contact_id=${c.id}`}
                className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Presentation className="w-3.5 h-3.5" /> Detail
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Medication</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{o.order_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{o.product_name}</td>
                  <td className="py-3 px-4">{o.quantity} Units</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    ${o.total_price.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{o.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {activities.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {a.activity_type}
                </span>
                <span className="text-xs text-slate-400">{a.occurred_at.slice(0, 16)}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{a.purpose}</h4>
              {a.outcome && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{a.outcome}</p>}
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW (DEFAULT) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Facility Health & Risk Scoring</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Deterministic scoring indicates healthy account cadence. Active commercial volume and preferred
              formulary access contribute to an overall health rating of <b>{account.health_score}%</b>.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No critical supply chain or compliance risk flags detected.</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Commercial Representative</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center">
                MV
              </div>
              <div>
                <strong className="text-sm text-slate-900 dark:text-white block">{account.owner_name}</strong>
                <span className="text-xs text-slate-400">Territory Commercial Lead</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Account 360° Profile...</div>}>
      <AccountDetailContent params={params} />
    </Suspense>
  );
}
