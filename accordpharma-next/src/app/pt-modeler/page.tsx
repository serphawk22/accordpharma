'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { BudgetImpactScenario } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Calculator,
  Building2,
  TrendingUp,
  DollarSign,
  Download,
  FileText,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  PieChart,
} from 'lucide-react';

export default function PtModelerPage() {
  const [scenarios, setScenarios] = useState<BudgetImpactScenario[]>(() => db.getBudgetScenarios());
  const [selectedHospital, setSelectedHospital] = useState('St. Jude Metropolitan Medical Center');
  const [productName, setProductName] = useState('CardioVas-XR (Vasocordin Extended-Release)');
  const [therapeuticArea, setTherapeuticArea] = useState('Cardiovascular Care (HFpEF)');

  // Dynamic Modeler Inputs
  const [eligiblePatients, setEligiblePatients] = useState(450);
  const [adoptionRate, setAdoptionRate] = useState(40);
  const [annualDrugCost, setAnnualDrugCost] = useState(3200);
  const [readmissionReduction, setReadmissionReduction] = useState(38);
  const [avgReadmissionCost, setAvgReadmissionCost] = useState(15400);
  const [losReductionDays, setLosReductionDays] = useState(1.8);
  const [dailyBedCost, setDailyBedCost] = useState(2200);

  // Dossier Preview Modal
  const [showDossierModal, setShowDossierModal] = useState(false);

  // Computations
  const treatedPatients = Math.round((eligiblePatients * adoptionRate) / 100);
  const grossDrugSpend = treatedPatients * annualDrugCost;

  // Readmission Savings (assuming 25% baseline readmission rate without intervention)
  const baselineReadmissions = Math.round(treatedPatients * 0.25);
  const preventedReadmissions = Math.round((baselineReadmissions * readmissionReduction) / 100);
  const readmissionSavings = preventedReadmissions * avgReadmissionCost;

  // Length of stay savings
  const bedDaySavings = Math.round(treatedPatients * losReductionDays * dailyBedCost);

  const totalOffsetSavings = readmissionSavings + bedDaySavings;
  const netBudgetImpact = grossDrugSpend - totalOffsetSavings;
  const isNetSavings = netBudgetImpact < 0;
  const roiPercentage = grossDrugSpend > 0 ? Math.round((totalOffsetSavings / grossDrugSpend) * 100) : 0;

  const handleSaveScenario = () => {
    const saved = db.addBudgetScenario({
      hospital_name: selectedHospital,
      therapeutic_area: therapeuticArea,
      product_name: productName,
      eligible_patients: eligiblePatients,
      adoption_rate_pct: adoptionRate,
      annual_drug_cost_per_patient: annualDrugCost,
      readmission_reduction_pct: readmissionReduction,
      avg_readmission_cost: avgReadmissionCost,
      length_of_stay_reduction_days: losReductionDays,
      daily_bed_cost: dailyBedCost,
      gross_drug_spend: grossDrugSpend,
      total_offset_savings: totalOffsetSavings,
      net_budget_impact: netBudgetImpact,
      roi_percentage: roiPercentage,
    });
    setScenarios([...db.getBudgetScenarios()]);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Calculator className="w-3.5 h-3.5" /> Pharmacy &amp; Therapeutics (P&amp;T) Decision Support
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Hospital Budget Impact Modeler &amp; Formulary Dossier
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Interactive health economic modeler demonstrating institutional cost offsets, reduced 30-day hospital readmissions, and net budget savings for P&amp;T committees.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDossierModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all hover:scale-[1.02]"
          >
            <FileText className="w-4 h-4" />
            <span>Generate P&amp;T Dossier Packet</span>
          </button>
        </div>
      </div>

      {/* TOP KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Treated Cohort</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {treatedPatients} <span className="text-xs font-normal text-slate-400">/ {eligiblePatients} pts</span>
          </div>
          <span className="text-[11px] text-sky-600 font-semibold">{adoptionRate}% Target formulary share</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Gross Drug Acquisition</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${grossDrugSpend.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">${annualDrugCost}/pt/year</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Hospital Cost Offset</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalOffsetSavings.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{preventedReadmissions} Readmissions avoided</span>
        </div>

        <div
          className={`border rounded-2xl p-4 shadow-sm ${
            isNetSavings
              ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Net Budget Impact (Annual)</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {isNetSavings ? `-$${Math.abs(netBudgetImpact).toLocaleString()}` : `$${netBudgetImpact.toLocaleString()}`}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
            {isNetSavings ? `Net Hospital Savings (${roiPercentage}% ROI)` : 'Positive Budget Impact'}
          </span>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS & DUAL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: INTERACTIVE SLIDERS */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Institutional Clinical &amp; Financial Parameters
            </h3>
            <button
              onClick={handleSaveScenario}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              + Save Scenario
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Health System</label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="St. Jude Metropolitan Medical Center">St. Jude Metropolitan Medical Center</option>
                <option value="Scripps Memorial Hospital La Jolla">Scripps Memorial Hospital La Jolla</option>
                <option value="Houston Methodist Neurological Institute">Houston Methodist Neurological Institute</option>
                <option value="Baylor Scott & White Medical Center">Baylor Scott & White Medical Center</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product in Scope</label>
              <select
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="CardioVas-XR (Vasocordin Extended-Release)">CardioVas-XR (Vasocordin ER)</option>
                <option value="OncoTarget-700 (Zenocamtinib)">OncoTarget-700 (Zenocamtinib)</option>
                <option value="NeuroShield-IV (Cerebrolysin-X)">NeuroShield-IV (Cerebrolysin-X)</option>
              </select>
            </div>
          </div>

          {/* SLIDERS */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Annual Eligible Patient Cohort:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{eligiblePatients} Patients</span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={25}
                value={eligiblePatients}
                onChange={(e) => setEligiblePatients(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Hospital Formulary Adoption Rate:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{adoptionRate}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                step={5}
                value={adoptionRate}
                onChange={(e) => setAdoptionRate(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">30-Day Hospital Readmission Reduction:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{readmissionReduction}% Reduction</span>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                step={2}
                value={readmissionReduction}
                onChange={(e) => setReadmissionReduction(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Length of Stay (LOS) Reduction:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{losReductionDays} Days</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={losReductionDays}
                onChange={(e) => setLosReductionDays(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ECONOMIC SAVINGS BREAKDOWN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Executive Summary</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black">AMCP Standard</span>
            </div>
            <div>
              <h4 className="text-lg font-black leading-tight">Institutional Net Economic Advantage</h4>
              <p className="text-xs text-emerald-100 mt-1">
                For every $1.00 spent on {productName.split(' ')[0]}, the hospital system realizes:
              </p>
            </div>
            <div className="text-4xl font-black tracking-tight text-white">
              ${(totalOffsetSavings / (grossDrugSpend || 1)).toFixed(2)}
              <span className="text-sm font-semibold text-emerald-200 ml-2">in Direct Cost Offsets</span>
            </div>
            <div className="pt-2 border-t border-white/20 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Avoided Readmissions:</span>
                <strong>${readmissionSavings.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Inpatient Bed-Day Savings:</span>
                <strong>${bedDaySavings.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* HISTORICAL SAVED SCENARIOS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">Saved Committee Scenarios</h4>
            <div className="space-y-2">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{s.hospital_name}</div>
                    <div className="text-[10px] text-slate-400">{s.product_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      -${Math.abs(s.net_budget_impact).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">{s.roi_percentage}% ROI</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DOSSIER PACKET MODAL */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    P&amp;T Formulary Submission Dossier Pack
                  </h3>
                  <p className="text-[11px] text-slate-400">Formatted per AMCP Dossier Framework Version 4.1</p>
                </div>
              </div>
              <button onClick={() => setShowDossierModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
              <div className="border-b pb-3 border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Institution:</span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{selectedHospital}</h4>
                <p className="text-slate-500">Submitted to: Pharmacy &amp; Therapeutics (P&amp;T) Executive Committee</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-semibold">Therapeutic Product:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{productName}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Target Cohort Volume:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{treatedPatients} Annual Inpatients</div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-200">Economic Value Proposition</div>
                <p className="text-emerald-700 dark:text-emerald-300 text-[11px] leading-relaxed">
                  Adoption of {productName.split(' ')[0]} yields an estimated net annual hospital cost avoidance of{' '}
                  <strong>${Math.abs(netBudgetImpact).toLocaleString()}</strong> by preventing {preventedReadmissions} urgent
                  readmissions and trimming {losReductionDays} bed-days per patient.
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Key Clinical Trials Cited:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <li>PRESERVE-HF Multicenter Trial (N=1,420, HR = 0.58, p &lt; 0.0001)</li>
                  <li>ACCORD Health Economic Registry (Cost-utility assessed across 12 US health networks)</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF Dossier Packet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
