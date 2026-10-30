import Link from 'next/link';
import { db } from '@/lib/store';
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
} from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

export default function DashboardPage() {
  const accounts = db.getAccounts();
  const hcps = db.getHCPs();
  const formularies = db.getFormularies();
  const tasks = db.getTasks();
  const activities = db.activities.slice(0, 4);
  const opportunities = db.getOpportunities();
  const proposals = db.getProposals();
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
      {/* EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Commercial Executive Suite
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Accord Pharma Operations Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Territory West &amp; Regional Hospital Accounts · Real-time Clinical Performance
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

      {/* OPPORTUNITY PIPELINE DISTRIBUTION & WORKSPACE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Stage Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" /> Commercial Opportunity Pipeline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Open hospital commercial agreements distributed by current contracting phase
              </p>
            </div>
            <Link
              href="/pipeline"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              Open Pipeline Board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
            {pipelineStages.map((ps) => {
              const heightPct = Math.max(18, Math.round((ps.value / maxStageValue) * 100));

              const stageGradient =
                ps.stage === 'WON'
                  ? 'from-emerald-500 to-teal-400'
                  : ps.stage === 'LOST'
                  ? 'from-rose-500 to-pink-500'
                  : ps.stage === 'NEGOTIATION'
                  ? 'from-amber-500 to-orange-400'
                  : ps.stage === 'PROPOSAL'
                  ? 'from-indigo-500 to-purple-500'
                  : ps.stage === 'QUALIFICATION'
                  ? 'from-blue-500 to-cyan-400'
                  : 'from-sky-500 to-blue-400';

              const pillStyle =
                ps.stage === 'WON'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : ps.stage === 'LOST'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : ps.stage === 'NEGOTIATION'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-sky-500/15 text-sky-400 border-sky-500/30';

              return (
                <div
                  key={ps.stage}
                  className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between text-center hover:border-sky-500/50 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${pillStyle}`}>
                    {ps.stage}
                  </span>

                  <div className="my-3 flex flex-col items-center justify-end h-24 relative">
                    <div className="w-full max-w-[40px] bg-slate-200/50 dark:bg-slate-700/40 rounded-xl h-full flex items-end p-1">
                      <div
                        className={`w-full rounded-lg bg-gradient-to-t ${stageGradient} shadow-md transition-all duration-500`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      ${Math.round(ps.value / 1000)}k
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{ps.count} opportunities</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Open Pipeline: <strong className="text-slate-900 dark:text-white">${openPipelineValue.toLocaleString()}</strong>
            </span>
            <span className="text-emerald-600 font-bold">
              Weighted Forecast: ${Math.round(weightedPipeline).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right 1 Col: Workspace Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-600" /> Workspace Summary
          </h2>

          <div className="space-y-3 text-xs">
            <Link
              href="/accounts"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Health Systems</span>
              </div>
              <span className="font-black text-slate-900 dark:text-white text-sm">{accounts.length}</span>
            </Link>

            <Link
              href="/pipeline"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Active Deals</span>
              </div>
              <span className="font-black text-slate-900 dark:text-white text-sm">{opportunities.length}</span>
            </Link>

            <Link
              href="/contacts"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Prescribing Physicians</span>
              </div>
              <span className="font-black text-slate-900 dark:text-white text-sm">{hcps.length}</span>
            </Link>

            <Link
              href="/proposals"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Pending Proposals</span>
              </div>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                {proposals.filter((p) => p.status === 'UNDER_REVIEW' || (p.status as string) === 'IN_REVIEW').length}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* CLINICAL DETAILERS & WORK QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Therapeutic Portfolio Decks & Recent Touchpoints */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Presentation className="w-4 h-4 text-emerald-600" /> Active Clinical Detailers
            </h2>
            <Link
              href="/edetailing"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <Bilingual textKey="btnOpenPresenter" fallback="Open Presenter Studio" /> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OncoTarget-700 Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Targeted Oncology
                </span>
                <h3 className="text-lg font-extrabold mt-3">OncoTarget-700 (Zenocamtinib)</h3>
                <p className="text-xs text-indigo-200 mt-1 line-clamp-2">
                  EGFR Exon-20 insertion NSCLC · Phase III ACCORD trial demonstrates median PFS of 21.8 months vs 8.4
                  months chemotherapy (HR = 0.38, p &lt; 0.001).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-indigo-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">4 Clinical Slides</span>
                <Link
                  href="/edetailing"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  <Bilingual textKey="btnDetailNow" fallback="Detail Now →" />
                </Link>
              </div>
            </div>

            {/* CardioVas-XR Card */}
            <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500/30 text-teal-300 border border-teal-500/40">
                  Cardiovascular
                </span>
                <h3 className="text-lg font-extrabold mt-3">CardioVas-XR (Vasocordin XR)</h3>
                <p className="text-xs text-teal-200 mt-1 line-clamp-2">
                  HFpEF &amp; Resistant Hypertension · Dual ETA &amp; Neprilysin modulation reducing CV mortality and urgent
                  admissions by 42%.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300">2 Clinical Slides</span>
                <Link
                  href="/edetailing"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  Detail Now →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Touchpoints Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" /> Recent Field Touchpoints &amp; Detailing Encounters
            </h3>
            <div className="space-y-4">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 uppercase">
                        {act.activity_type}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{act.purpose}</span>
                    </div>
                    {act.outcome && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {act.outcome}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">Rep: {act.rep_name}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                    {act.occurred_at.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Priority Work Queue & Items to Review */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500" /> Work Queue
            </h2>
            <Link href="/tasks" className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
              View All Tasks →
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                        : task.priority === 'high'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {task.due_at.slice(0, 10)}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{task.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{task.account_name}</div>
              </div>
            ))}
          </div>

          {/* Items to Review / Critical Alerts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Items To Review
            </h3>

            {lowStockItems.length > 0 && (
              <Link
                href="/inventory"
                className="block p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 hover:bg-amber-100/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Low Stock: {lowStockItems[0].product_name}
                  </span>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                    Reorder
                  </span>
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                  On-hand: {lowStockItems[0].stock_level ?? lowStockItems[0].quantity} units (Safety floor: {lowStockItems[0].reorder_level ?? 500})
                </div>
              </Link>
            )}

            {tenders.length > 0 && (
              <Link
                href="/tenders"
                className="block p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 hover:bg-sky-100/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    Tender RFP Submission
                  </span>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-200 text-sky-900">
                    Deadline
                  </span>
                </div>
                <div className="text-[11px] text-sky-700 dark:text-sky-300 mt-1">
                  {tenders[0].title} · Due {tenders[0].submission_deadline ?? tenders[0].due_at}
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
