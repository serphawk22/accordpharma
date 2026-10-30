'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import {
  Pill,
  Search,
  ShieldCheck,
  DollarSign,
  Layers,
  ArrowRight,
  ExternalLink,
  Presentation,
  Package,
  Activity,
  HeartPulse,
  Dna,
  BrainCircuit,
  Filter,
  CheckCircle2,
  FileText,
  AlertCircle,
  Thermometer,
  Sparkles,
} from 'lucide-react';

interface DrugMonograph {
  id: string;
  name: string;
  brand_name: string;
  molecule: string;
  cas_number: string;
  ndc_code: string;
  category: 'ONCOLOGY' | 'CARDIOVASCULAR' | 'NEUROLOGY';
  therapeutic_class: string;
  indications: string;
  mechanism_of_action: string;
  clinical_evidence: {
    trial: string;
    endpoint: string;
    hazard_ratio: string;
    p_value: string;
    key_finding: string;
  };
  dosage_form: string;
  pack_size: string;
  wac_price: number;
  formulary_tier: string;
  status: string;
  storage_condition: string;
  gradient: string;
  accent_border: string;
  icon: 'dna' | 'heart' | 'brain';
}

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalDrug, setActiveModalDrug] = useState<DrugMonograph | null>(null);

  const products: DrugMonograph[] = [
    {
      id: 'prod-onco-700',
      name: 'OncoTarget-700',
      brand_name: 'Zenocamtinib',
      molecule: 'Zenocamtinib Dihydrochloride',
      cas_number: '210984-77-2',
      ndc_code: '82410-0700-60',
      category: 'ONCOLOGY',
      therapeutic_class: 'Targeted Oncology · Oral Tyrosine Kinase Inhibitor (TKI)',
      indications:
        'Adult patients with locally advanced or metastatic non-small cell lung cancer (NSCLC) harboring confirmed EGFR Exon-20 insertion mutations whose disease progressed on platinum chemotherapy.',
      mechanism_of_action:
        'Selectively binds to and inhibits the mutated kinase domain of EGFR Exon-20 insertions with 14-fold higher affinity over wild-type EGFR, minimizing wild-type cutaneous and gastrointestinal adverse events.',
      clinical_evidence: {
        trial: 'Phase III ACCORD-Lung Global Randomized Trial (N=428)',
        endpoint: 'Median Progression-Free Survival (mPFS)',
        hazard_ratio: 'HR = 0.38 (95% CI 0.29–0.51)',
        p_value: 'p < 0.001',
        key_finding: '21.8 months median PFS vs 8.4 months standard chemotherapy; 68.4% confirmed ORR.',
      },
      dosage_form: 'Oral Capsule 140 mg',
      pack_size: '60 capsules bottle (1-Month Blister Pack)',
      wac_price: 850.0,
      formulary_tier: 'Tier 1 Preferred (Specialty Oncology)',
      status: 'FDA Approved (Breakthrough Therapy)',
      storage_condition: '20°C to 25°C (Excursions 15°C–30°C permitted)',
      gradient: 'from-indigo-600 via-indigo-700 to-purple-800',
      accent_border: 'border-indigo-500/40 hover:border-indigo-400',
      icon: 'dna',
    },
    {
      id: 'prod-cardio-xr-50',
      name: 'CardioVas-XR 50mg',
      brand_name: 'Vasocordin XR',
      molecule: 'Vasocordin Mesylate Prolonged-Release',
      cas_number: '184920-11-9',
      ndc_code: '82410-0050-30',
      category: 'CARDIOVASCULAR',
      therapeutic_class: 'Cardiovascular · First-in-Class Dual ETA & Neprilysin Modulator',
      indications:
        'Reduction of cardiovascular death, urgent hospitalization, and worsening functional class in patients with heart failure with preserved ejection fraction (HFpEF, LVEF ≥ 45%) and refractory hypertension.',
      mechanism_of_action:
        'Concurrently blocks endothelin type A (ETA) receptors to attenuate myocardial fibrosis and arterial stiffness, while inhibiting neprilysin to augment endogenous natriuretic peptide signaling.',
      clinical_evidence: {
        trial: 'Phase III ACCORD-HFpEF Multinational Trial (N=3,812)',
        endpoint: 'Composite CV Death or Urgent HF Hospitalization',
        hazard_ratio: 'HR = 0.58 (95% CI 0.47–0.72)',
        p_value: 'p < 0.001',
        key_finding: '42% relative risk reduction; demonstrated consistent renal preservation across eGFR > 30.',
      },
      dosage_form: 'Film-coated Extended-Release Tablet 50 mg',
      pack_size: '30 tablets blister calendar pack',
      wac_price: 45.0,
      formulary_tier: 'Tier 1 Preferred Access',
      status: 'FDA Priority Review Approved',
      storage_condition: '20°C to 25°C Dry Store (Protected from moisture)',
      gradient: 'from-teal-600 via-teal-700 to-emerald-800',
      accent_border: 'border-teal-500/40 hover:border-teal-400',
      icon: 'heart',
    },
    {
      id: 'prod-cardio-xr-100',
      name: 'CardioVas-XR 100mg',
      brand_name: 'Vasocordin XR Titration',
      molecule: 'Vasocordin Mesylate Prolonged-Release',
      cas_number: '184920-11-9',
      ndc_code: '82410-0100-10',
      category: 'CARDIOVASCULAR',
      therapeutic_class: 'Cardiovascular · Target Maintenance Dosage',
      indications:
        'Target maintenance dosage for severe resistant Stage 2 hypertension non-responsive to triple-agent antihypertensive regimens, and high-risk HFpEF post-discharge stabilization.',
      mechanism_of_action:
        'Sustained 24-hour hemodynamic decongestion with minimal reflexive sympathetic surge; provides continuous central aortic pressure control.',
      clinical_evidence: {
        trial: 'Phase III ACCORD-Titration Extension Study (N=1,420)',
        endpoint: '24-hour Ambulatory Mean SBP Reduction',
        hazard_ratio: '-16.4 mmHg (p < 0.001)',
        p_value: 'p < 0.001',
        key_finding: 'Zero rebound hypertension upon missed dose; 88% achieved target BP < 130/80 mmHg.',
      },
      dosage_form: 'Film-coated Extended-Release Tablet 100 mg',
      pack_size: '100 tablets institutional unit-dose hospital packaging',
      wac_price: 65.0,
      formulary_tier: 'Tier 1 Preferred (Inpatient Core Order Set)',
      status: 'FDA Approved',
      storage_condition: '20°C to 25°C Controlled Room Temp',
      gradient: 'from-cyan-600 via-teal-700 to-sky-800',
      accent_border: 'border-cyan-500/40 hover:border-cyan-400',
      icon: 'heart',
    },
    {
      id: 'prod-neuro-iv',
      name: 'NeuroGuard-IV',
      brand_name: 'Cerebrolysin Fraction-Active',
      molecule: 'Purified Neurotrophic Oligopeptide Complex',
      cas_number: '8063-26-1',
      ndc_code: '82410-0920-10',
      category: 'NEUROLOGY',
      therapeutic_class: 'Acute Neurology · Endogenous Neuroprotection & Synaptogenesis',
      indications:
        'Acute ischemic stroke within 12 hours of symptom onset in conjunction with or following endovascular thrombectomy (EVT), promoting ischemic penumbra salvage.',
      mechanism_of_action:
        'Crosses the blood-brain barrier to mimic the multimodal pharmacodynamics of natural neurotrophic factors (BDNF, NGF), reducing post-ischemic apoptosis and stimulating dendritic sprouting.',
      clinical_evidence: {
        trial: 'Phase III STROKE-ACCORD Double-Blind Clinical Evaluation (N=980)',
        endpoint: 'Modified Rankin Scale (mRS 0–1 at Day 90)',
        hazard_ratio: 'OR = 1.64 (95% CI 1.25–2.15)',
        p_value: 'p = 0.002',
        key_finding: '54.2% achieved functional independence (mRS 0–1) vs 37.1% placebo; zero symptomatic ICH.',
      },
      dosage_form: 'Intravenous Infusion Solution 50 ml sterile vial',
      pack_size: '10 single-dose glass vials carton',
      wac_price: 210.0,
      formulary_tier: 'Tier 2 Non-Preferred (Emergency Critical Care)',
      status: 'Phase III Complete / BLA Priority Review',
      storage_condition: '2°C to 8°C Cold Chain (Do Not Freeze)',
      gradient: 'from-purple-600 via-violet-700 to-indigo-900',
      accent_border: 'border-purple-500/40 hover:border-purple-400',
      icon: 'brain',
    },
  ];

  const categories = [
    { id: 'ALL', label: 'All Therapeutics', count: products.length },
    { id: 'ONCOLOGY', label: 'Targeted Oncology', count: products.filter((p) => p.category === 'ONCOLOGY').length },
    { id: 'CARDIOVASCULAR', label: 'Cardiovascular', count: products.filter((p) => p.category === 'CARDIOVASCULAR').length },
    { id: 'NEUROLOGY', label: 'Acute Neurology', count: products.filter((p) => p.category === 'NEUROLOGY').length },
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.molecule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.indications.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.therapeutic_class.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Proprietary Biopharmaceutical Pipeline
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Pharmaceutical Product Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Complete therapeutic monograph dossiers, molecular mechanisms of action, published Phase III trial endpoints, and hospital acquisition price schedules.
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
            href="/formulary"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span>Formulary Access Tracker</span>
          </Link>
        </div>
      </div>

      {/* SEARCH AND THERAPEUTIC CATEGORY FILTERS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search monograph, molecule, indication..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* PRODUCT MONOGRAPH CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProducts.map((p) => {
          const isTier1 = p.formulary_tier.includes('Tier 1');

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border ${p.accent_border} shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
            >
              {/* Top ambient glow */}
              <div
                className={`absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br ${p.gradient} opacity-15 blur-3xl pointer-events-none group-hover:opacity-25 transition-opacity`}
              ></div>

              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shadow-md`}
                    >
                      {p.icon === 'dna' ? (
                        <Dna className="w-6 h-6" />
                      ) : p.icon === 'heart' ? (
                        <HeartPulse className="w-6 h-6" />
                      ) : (
                        <BrainCircuit className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          {p.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          NDC: {p.ndc_code}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                        {p.name}
                      </h3>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {p.brand_name} · <span className="italic">{p.molecule}</span>
                      </div>
                    </div>
                  </div>

                  {/* Regulatory Status Pill */}
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {p.status}
                  </span>
                </div>

                {/* Therapeutic Class Tagline */}
                <div className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-3 py-1.5 rounded-xl border border-sky-100 dark:border-sky-900/50">
                  {p.therapeutic_class}
                </div>

                {/* Clinical Indication */}
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white block text-[11px] font-black uppercase tracking-wider mb-1">
                    Approved Clinical Indication:
                  </strong>
                  {p.indications}
                </div>

                {/* Clinical Trial Highlight Strip */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-sky-300">{p.clinical_evidence.trial}</span>
                    <span className="font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                      {p.clinical_evidence.hazard_ratio}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-medium leading-snug">
                    {p.clinical_evidence.key_finding}
                  </div>
                </div>

                {/* Formulary & Storage Specs */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Formulary Status</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isTier1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      {p.formulary_tier}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">GxP Storage</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      {p.storage_condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Packaging & Pricing Bar */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Packaging &amp; Form</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {p.dosage_form}
                  </div>
                  <div className="text-[11px] text-slate-500">{p.pack_size}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">WAC Price</div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      ${p.wac_price.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveModalDrug(p)}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow hover:scale-[1.02]"
                  >
                    <span>Monograph</span> <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL PHARMACOLOGY MONOGRAPH MODAL */}
      {activeModalDrug && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeModalDrug.gradient} flex items-center justify-center text-white shadow-md`}
                >
                  {activeModalDrug.icon === 'dna' ? (
                    <Dna className="w-6 h-6" />
                  ) : activeModalDrug.icon === 'heart' ? (
                    <HeartPulse className="w-6 h-6" />
                  ) : (
                    <BrainCircuit className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400">
                    Clinical Monograph Dossier
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeModalDrug.name} ({activeModalDrug.brand_name})
                  </h2>
                  <div className="text-xs text-slate-500 font-mono">
                    CAS: {activeModalDrug.cas_number} · NDC: {activeModalDrug.ndc_code}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveModalDrug(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Monograph Body */}
            <div className="space-y-4 text-xs leading-relaxed">
              {/* MOA */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-600" /> Mechanism of Action (MOA)
                </h4>
                <p className="text-slate-700 dark:text-slate-300">{activeModalDrug.mechanism_of_action}</p>
              </div>

              {/* Evidence */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-2">
                <h4 className="font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Pivotal Registration Trial Evidence
                </h4>
                <div className="text-slate-800 dark:text-slate-200 font-semibold">
                  {activeModalDrug.clinical_evidence.trial}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <strong>Primary Endpoint:</strong> {activeModalDrug.clinical_evidence.endpoint}
                  </div>
                  <div>
                    <strong>Hazard Ratio:</strong> {activeModalDrug.clinical_evidence.hazard_ratio} (
                    {activeModalDrug.clinical_evidence.p_value})
                  </div>
                </div>
                <p className="text-indigo-950 dark:text-indigo-200 text-xs italic bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  {activeModalDrug.clinical_evidence.key_finding}
                </p>
              </div>

              {/* Dosing and Supply */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">Dosage &amp; Delivery</strong>
                  <div className="text-slate-600 dark:text-slate-300">{activeModalDrug.dosage_form}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{activeModalDrug.pack_size}</div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <strong className="block text-slate-900 dark:text-white font-bold mb-1">Commercial Wholesale</strong>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ${activeModalDrug.wac_price.toFixed(2)} WAC
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{activeModalDrug.formulary_tier}</div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/edetailing"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow"
              >
                <Presentation className="w-4 h-4" /> Present This Drug in Studio
              </Link>

              <button
                onClick={() => setActiveModalDrug(null)}
                className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                Close Monograph
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
