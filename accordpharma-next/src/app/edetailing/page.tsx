'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { DetailingProduct, HealthcareProfessional } from '@/lib/types';
import {
  Presentation,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Activity,
  Layers,
  FileText,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Bilingual, BilingualLabel } from '@/components/Bilingual';

function EdetailingContent() {
  const searchParams = useSearchParams();
  const initialContactId = searchParams.get('contact_id') || 'hcp-1';

  const [products, setProducts] = useState<DetailingProduct[]>([]);
  const [hcps, setHcps] = useState<HealthcareProfessional[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedContactId, setSelectedContactId] = useState(initialContactId);

  // Live Stopwatch
  const [timerRunning, setTimerRunning] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(45);

  // Engagement & Feedback State
  const [sentiment, setSentiment] = useState<'very_receptive' | 'neutral' | 'skeptical'>('very_receptive');
  const [objections, setObjections] = useState<string[]>([]);
  const [sampleUnits, setSampleUnits] = useState(10);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionSavedSuccess, setSessionSavedSuccess] = useState(false);

  useEffect(() => {
    // Fetch products and prescribers
    Promise.all([fetch('/api/sales/edetailing/products'), fetch('/api/contacts')])
      .then(async ([prodRes, hcpRes]) => {
        const prodData = await prodRes.json();
        const hcpData = await hcpRes.json();
        setProducts(prodData.portfolio || []);
        setHcps(hcpData.items || []);
      })
      .catch((err) => console.error(err));
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const currentProduct = products[selectedProductIndex];
  const currentSlide = currentProduct?.slides?.[selectedSlideIndex];
  const selectedHcp = hcps.find((h) => h.id === selectedContactId) || hcps[0];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const toggleObjection = (obj: string) => {
    setObjections((prev) => (prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]));
  };

  const handleCommitSession = async () => {
    if (!selectedHcp || !currentProduct) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sales/edetailing/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: selectedHcp.id,
          account_id: selectedHcp.account_id,
          product_name: currentProduct.product_name,
          duration_seconds: elapsedSeconds,
          sentiment,
          objections,
          sample_units_requested: sampleUnits,
          notes,
        }),
      });

      if (res.ok) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        setSessionSavedSuccess(true);
        setTimeout(() => setSessionSavedSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP STUDIO TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">Clinical e-Detailing Studio</h1>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                ACTIVE SESSION
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Interactive Visual Aid (IVA) · FDA 21 CFR Part 11 Compliance Audited
            </div>
          </div>
        </div>

        {/* Target Prescriber & Live Timer */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Prescriber Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Prescriber:</span>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              {hcps.map((h) => (
                <option key={h.id} value={h.id} className="dark:bg-slate-900">
                  {h.full_name} ({h.specialty}) · {h.kol_status ? '★ KOL' : h.prescribing_tier}
                </option>
              ))}
            </select>
          </div>

          {/* Session Timer Widget */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-1.5 text-emerald-800 dark:text-emerald-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs font-bold">{formatTime(elapsedSeconds)}</span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="hover:opacity-75 transition-opacity"
              title={timerRunning ? 'Pause Session' : 'Resume Session'}
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setElapsedSeconds(0)}
              className="hover:opacity-75 transition-opacity"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3 text-emerald-600" />
            </button>
          </div>
        </div>
      </div>

      {/* THERAPEUTIC PRODUCT SELECTOR TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {products.map((prod, idx) => (
          <button
            key={prod.id}
            onClick={() => {
              setSelectedProductIndex(idx);
              setSelectedSlideIndex(0);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedProductIndex === idx
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{prod.product_name}</span>
            <span className="text-[10px] opacity-75 font-normal">({prod.category})</span>
          </button>
        ))}
      </div>

      {/* MAIN DETAILING THEATER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Active Presentation Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {currentProduct && currentSlide && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-lg min-h-[520px] flex flex-col justify-between relative overflow-hidden">
              {/* Slide Background Gradient Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div>
                {/* Slide Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      {currentProduct.category} · Regulatory Approved
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                      {currentSlide.title}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentSlide.subtitle}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                    Slide {selectedSlideIndex + 1} of {currentProduct.slides.length}
                  </span>
                </div>

                {/* Slide Main Content */}
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-5 leading-relaxed">
                  {currentSlide.content}
                </p>

                {/* CLINICAL VISUALIZATION WIDGET */}
                <div className="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {currentSlide.chart_type === 'survival_curve' ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            Kaplan-Meier Progression-Free Survival (PFS) Endpoint
                          </span>
                        </div>
                        {currentSlide.hazard_ratio && (
                          <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                            {currentSlide.hazard_ratio}
                          </span>
                        )}
                      </div>

                      {/* Interactive SVG Curve Visual */}
                      <div className="h-44 w-full relative border-b border-l border-slate-300 dark:border-slate-600 pt-4 pr-4">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                          {/* Grid guidelines */}
                          <line x1="0" y1="30" x2="400" y2="30" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.4" />
                          <line x1="0" y1="60" x2="400" y2="60" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.4" />
                          <line x1="0" y1="90" x2="400" y2="90" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.4" />

                          {/* Control Chemotherapy Arm (Grey dashed) */}
                          <path
                            d="M 0 10 Q 120 70 400 115"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            strokeDasharray="4 4"
                          />

                          {/* Accord Pharma Investigational Arm (Emerald Solid Glow) */}
                          <path d="M 0 10 Q 200 25 400 45" fill="none" stroke="#059669" strokeWidth="3.5" />
                        </svg>

                        {/* Labels */}
                        <div className="absolute right-4 top-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300">
                          ● {currentProduct.product_name} Arm (Median 21.8 mo)
                        </div>
                        <div className="absolute right-4 bottom-2 text-[10px] font-bold text-slate-500">
                          - - Standard of Care Chemotherapy (Median 8.4 mo)
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
                        <span>Baseline (0 Mo)</span>
                        <span>6 Months</span>
                        <span>12 Months</span>
                        <span>18 Months</span>
                        <span>24 Months</span>
                      </div>
                    </div>
                  ) : currentSlide.chart_type === 'biochemical_cascade' ? (
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-600" /> Mechanism of Action (MOA) Biochemical Cascade
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-sky-600 block">STEP 1</span>
                          <strong className="text-slate-900 dark:text-white block mt-0.5">Selective Entry</strong>
                          <p className="text-[11px] text-slate-500 mt-1">Crosses membrane into targeted receptor pocket.</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-sky-600 block">STEP 2</span>
                          <strong className="text-slate-900 dark:text-white block mt-0.5">Covalent Bond</strong>
                          <p className="text-[11px] text-slate-500 mt-1">Locks mutated kinase with 32x greater affinity.</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-emerald-600 block">STEP 3</span>
                          <strong className="text-slate-900 dark:text-white block mt-0.5">Pathway Arrest</strong>
                          <p className="text-[11px] text-slate-500 mt-1">Halts downstream proliferation & oncogenesis.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">
                        Clinical Evidence Summary
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{currentSlide.clinical_evidence}</p>
                    </div>
                  )}

                  {/* Metric Callout Pill */}
                  {currentSlide.key_metric && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Key Pivotal Efficacy Metric:</span>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-lg">
                        {currentSlide.key_metric}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Slide Navigation Footnote */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  disabled={selectedSlideIndex === 0}
                  onClick={() => setSelectedSlideIndex((i) => i - 1)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> <Bilingual textKey="btnPreviousSlide" />
                </button>

                {/* Slide indicator dots */}
                <div className="flex gap-1.5">
                  {currentProduct.slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        selectedSlideIndex === idx
                          ? 'w-6 bg-sky-600 dark:bg-sky-400'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <button
                  disabled={selectedSlideIndex === currentProduct.slides.length - 1}
                  onClick={() => setSelectedSlideIndex((i) => i + 1)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 flex items-center gap-1 transition-all"
                >
                  <Bilingual textKey="btnNextSlide" /> <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Rep Feedback, Sentiment & CRM Commit Drawer */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Detailing Capture</h3>
              <span className="text-[10px] font-bold text-slate-400">Live Sync</span>
            </div>

            {/* Prescriber Sentiment */}
            <div>
              <BilingualLabel textKey="lblPrescriberSentiment" className="mb-2" />
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  { id: 'very_receptive', label: 'Receptive', color: 'emerald' },
                  { id: 'neutral', label: 'Neutral', color: 'amber' },
                  { id: 'skeptical', label: 'Skeptical', color: 'rose' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSentiment(s.id as any)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                      sentiment === s.id
                        ? s.color === 'emerald'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : s.color === 'amber'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Objections */}
            <div>
              <BilingualLabel textKey="lblClinicalObjections" className="mb-2" />
              <div className="space-y-1.5 text-xs">
                {[
                  'Hospital Formulary Tier Restriction',
                  'Safety / Tolerability in Elderly',
                  'Existing Competitor Loyalty',
                  'Prior Auth Documentation Burden',
                ].map((obj) => (
                  <label
                    key={obj}
                    onClick={() => toggleObjection(obj)}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                      objections.includes(obj)
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={objections.includes(obj)}
                      onChange={() => {}}
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] leading-tight">{obj}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clinical Starter Sample Drops */}
            <div>
              <BilingualLabel textKey="lblStarterSamples" className="mb-1.5" />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSampleUnits((u) => Math.max(0, u - 5))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-base text-slate-900 dark:text-white">
                  {sampleUnits} Units
                </div>
                <button
                  onClick={() => setSampleUnits((u) => u + 5)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Session Notes */}
            <div>
              <BilingualLabel textKey="lblClinicalCommitments" className="mb-1" />
              <textarea
                rows={2}
                placeholder="Prescriber agreed to review 3 target patients for switch..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Success notification */}
            {sessionSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Session logged! Follow-up CRM task auto-generated.</span>
              </div>
            )}

            {/* Commit Button */}
            <button
              disabled={isSubmitting}
              onClick={handleCommitSession}
              className="w-full py-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Syncing with CRM...' : <Bilingual textKey="btnCommitSession" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EdetailingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading e-Detailing studio...</div>}>
      <EdetailingContent />
    </Suspense>
  );
}
