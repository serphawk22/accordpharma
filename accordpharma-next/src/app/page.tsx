'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/store';
import { clientStore } from '@/lib/clientStore';
import {
  DollarSign,
  Users,
  ShieldCheck,
  Presentation,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  Building,
  AlertTriangle,
  Briefcase,
  Activity,
  FileText,
  Lock,
  Server,
  Database,
  ExternalLink,
  ChevronRight,
  Pill,
  Award,
  Globe,
  Radio,
  Check,
  LogIn,
} from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuth();
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

  // Quick one-click demo login from landing page
  const handleQuickDemo = async (email: string) => {
    setDemoLoggingIn(true);
    await login(email, 'AccordPharma2026!');
    setDemoLoggingIn(false);
  };

  // ----------------------------------------------------------------------
  // PUBLIC LANDING PAGE (When unauthenticated)
  // ----------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="space-y-16 py-4">
        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border border-slate-800 p-8 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl space-y-6">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Accord Pharma Enterprise · Commercial CRM &amp; Clinical Studio</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Accelerate Clinical Commercialization &amp; Formulary Adoption.
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Unified enterprise platform connecting oncology, cardiology, and acute neurology therapeutics with real-time hospital P&amp;T committee tracking, Key Opinion Leader relationship management, and commercial supply chain intelligence.
            </p>

            {/* CTA Strip */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.02]"
              >
                <LogIn className="w-4 h-4" /> Sign In to Commercial CRM
              </Link>

              <button
                type="button"
                onClick={() => handleQuickDemo('marcus.vance@accordpharma.com')}
                disabled={demoLoggingIn}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-bold text-sm shadow transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {demoLoggingIn ? 'Launching Demo...' : 'Instant Rep Demo (Marcus Vance)'}
              </button>

              <a
                href="https://accordpharma-production.up.railway.app/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                FastAPI Swagger Docs <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Live Stack Architecture Status Banner */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
                <div>
                  <div className="font-bold text-white">Next.js 16 Frontend</div>
                  <div className="text-[11px] text-slate-400 font-mono">accordpharma.vercel.app</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
                <div>
                  <div className="font-bold text-white">FastAPI Python Backend</div>
                  <div className="text-[11px] text-slate-400 font-mono">Railway Public Domain</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <div>
                  <div className="font-bold text-white">Neon PostgreSQL DB</div>
                  <div className="text-[11px] text-slate-400 font-mono">AWS East Serverless Pool</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CORE PLATFORM MODULES */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Comprehensive Life Sciences Architecture
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Enterprise Commercial Workflow Modules
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Purpose-built for pharmaceutical medical representatives, key account managers, and executive leadership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module 1: e-Detailing */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-sky-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
                <Presentation className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Clinical e-Detailing &amp; MOA Studio
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Interactive digital detailing decks with Cryo-EM receptor binding models, Kaplan-Meier PFS curves, and automated physician follow-up task generation.
              </p>
              <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 pt-1">
                OncoTarget-700 &amp; CardioVas-XR Ready →
              </div>
            </div>

            {/* Module 2: Formulary & P&T */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-emerald-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Hospital Formulary &amp; P&amp;T Cycles
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Institutional Pharmacy &amp; Therapeutics review monitoring across major health systems, tracking Tier 1 Preferred vs Prior Auth statuses.
              </p>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1">
                Cedars-Sinai &amp; St. Jude Mapped →
              </div>
            </div>

            {/* Module 3: KOL & Prescriber 360 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                KOL Prescribers 360° &amp; Sunshine Act
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Decile reach-and-frequency optimizer, Medical Science Liaison (MSL) inquiry handoffs, and Open Payments statutory spend compliance.
              </p>
              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 pt-1">
                Deciles 8–10 Precision Targeted →
              </div>
            </div>
          </div>
        </div>

        {/* FLAGSHIP THERAPEUTICS PORTFOLIO */}
        <div className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                FDA Approved Products
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Commercial Therapeutic Portfolio
              </h3>
            </div>
            <Link
              href="/login"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              Sign In to View Clinical Monograph Reprints →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                Targeted Oncology
              </span>
              <h5 className="font-black text-slate-900 dark:text-white text-sm">
                OncoTarget-700 (Zenocamtinib)
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                EGFR Exon-20 Insertion Non-Small Cell Lung Carcinoma. Median PFS: 21.8 months vs 8.4 months chemo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Cardiovascular
              </span>
              <h5 className="font-black text-slate-900 dark:text-white text-sm">
                CardioVas-XR (Vasocordin)
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resistant HTN with Concomitant Heart Failure with Preserved Ejection Fraction (HFpEF). -24.6 mmHg systolic reduction.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Neurovascular ICU
              </span>
              <h5 className="font-black text-slate-900 dark:text-white text-sm">
                NeuroGuard-IV (Cerebrolin)
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acute Ischemic Stroke Neuroprotection within 8h window. 68% modified Rankin Scale (mRS 0-1) at 90 days.
              </p>
            </div>
          </div>
        </div>

        {/* ONE-CLICK DEMO ACCESS BANNER */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-xl font-black">Experience the Enterprise Commercial Workspace</h4>
            <p className="text-xs text-sky-100 max-w-xl">
              Log in with one click to explore simulated hospital accounts, commercial supply orders, live daily call planner, and e-detailing slide analytics.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleQuickDemo('marcus.vance@accordpharma.com')}
              className="px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow transition-all hover:scale-[1.03]"
            >
              Sign In as Marcus Vance
            </button>
            <Link
              href="/login"
              className="px-5 py-3 rounded-xl bg-sky-900/60 hover:bg-sky-900 text-white font-bold text-xs border border-sky-400/30 transition-all"
            >
              Custom Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // AUTHENTICATED COMMERCIAL EXECUTIVE DASHBOARD
  // ----------------------------------------------------------------------
  const accounts = clientStore.getAccounts();
  const hcps = clientStore.getContacts();
  const formularies = clientStore.getFormularies();
  const tasks = clientStore.getTasks();
  const activities = db.activities.slice(0, 4);
  const opportunities = clientStore.getOpportunities();
  const leads = clientStore.getLeads();
  const inventory = db.getInventory();
  const tenders = db.getTenders();

  const totalInvoiced = accounts.reduce((acc, a) => acc + a.total_invoiced, 0);
  const totalCollected = accounts.reduce((acc, a) => acc + a.total_collected, 0);
  const kolCount = hcps.filter((h) => h.kol_status).length;
  const tier1Count = formularies.filter((f) => f.formulary_tier === 'Tier 1 Preferred').length;

  const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
  const pipelineStages = STAGES.map((stage) => {
    const oppsInStage = opportunities.filter((o) => o.stage === stage);
    const sum = oppsInStage.reduce((acc, o) => acc + o.estimated_value, 0);
    return {
      stage,
      count: oppsInStage.length,
      value: sum,
    };
  });

  const maxStageValue = Math.max(...pipelineStages.map((s) => s.value), 1);
  const openPipelineValue = opportunities
    .filter((o) => o.stage !== 'WON' && o.stage !== 'LOST')
    .reduce((acc, o) => acc + o.estimated_value, 0);
  const weightedPipeline = opportunities
    .filter((o) => o.stage !== 'LOST')
    .reduce((acc, o) => acc + (o.estimated_value * o.probability) / 100, 0);

  const lowStockItems = inventory.filter(
    (item) => (item.stock_level ?? item.quantity) <= (item.reorder_level ?? 1000)
  );

  return (
    <div className="space-y-8">
      {/* EXECUTIVE HEADER WITH REAL USER PROFILE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back, {user?.full_name || 'Commercial Rep'}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Accord Pharma Operations Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user?.territory || 'Territory West & Regional Hospital Accounts'} · Real-time Commercial &amp; Clinical Pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/edetailing"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Presentation className="w-4 h-4" />
            <Bilingual textKey="btnLaunchEdetailing" fallback="Launch e-Detailing Studio" />
          </Link>
          <Link
            href="/contacts"
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <Users className="w-4 h-4" />
            <Bilingual textKey="btnPrescribersDirectory" fallback="Prescribers Directory" />
          </Link>
        </div>
      </div>

      {/* METRICS KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Bilingual textKey="kpiCommercialInvoiced" fallback="Commercial Invoiced" />
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ${totalInvoiced.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs last quarter
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Bilingual textKey="kpiCollectedRemittance" fallback="Collected Remittance" />
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ${totalCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Collection rate: {Math.round((totalCollected / totalInvoiced) * 100)}%
          </div>
        </div>

        {/* Tier 1 Formularies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Bilingual textKey="kpiFormularyTier1" fallback="Formulary Tier 1 Preferred" />
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{tier1Count} Systems</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">2 under active P&amp;T review</div>
        </div>

        {/* KOL Prescribers Covered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Bilingual textKey="kpiKolPrescribers" fallback="KOL Prescribers Covered" />
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{kolCount} Leaders</div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-2">
            100% target coverage cadence
          </div>
        </div>
      </div>

      {/* PIPELINE & ACTION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-600" /> Opportunity Pipeline &amp; Tender Stages
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weighted pipeline value: <span className="font-bold text-sky-600">${weightedPipeline.toLocaleString()}</span> (Open: ${openPipelineValue.toLocaleString()})
              </p>
            </div>
            <Link href="/pipeline" className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
              Full Pipeline →
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {pipelineStages.map((s) => {
              const pct = Math.round((s.value / maxStageValue) * 100);
              return (
                <div key={s.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {s.stage} ({s.count} deals)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ${s.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Tasks Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Priority Work Queue
            </h3>
            <Link href="/tasks" className="text-xs font-bold text-sky-600 hover:underline">
              View All ({tasks.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {task.title}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {task.account_name} · Due {task.due_at?.split('T')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
