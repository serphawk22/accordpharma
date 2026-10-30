'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Bot, Sparkles, Send, Copy, Check, FileText, Stethoscope } from 'lucide-react';

export default function AiAssistantPage() {
  const [recipient, setRecipient] = useState('Dr. Sarah Chen, MD (Cardiology)');
  const [product, setProduct] = useState('CardioVas-XR (Vasocordin XR)');
  const [objective, setObjective] = useState('Invite to P&T Committee Review & Provide Phase III eGFR sub-analysis');
  const [tone, setTone] = useState<'scientific' | 'concise' | 'executive'>('scientific');
  const [copied, setCopied] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(
    `Dear Dr. Chen,\n\nFollowing our clinical discussion regarding CardioVas-XR (Vasocordin XR) and its dual ETA & Neprilysin modulation profile in resistant hypertension with comorbid HFpEF, I wanted to share the published Phase III sub-analysis.\n\nKey highlights for your institutional review:\n• 42% reduction in CV death and urgent HF hospitalization (HR 0.58, 95% CI 0.47-0.72, p < 0.001)\n• Consistent therapeutic preservation across eGFR cohorts (30–60 mL/min/1.73m²)\n• Minimal hyperkalemia incidence (<2.1%) with standardized titration\n\nI have attached the complete peer-reviewed reprint and our institutional formulary dossier. Would you be available for a brief 10-minute briefing this Thursday at 14:00 to review the starter titration protocols?\n\nSincerely,\nMarcus Vance\nSenior Hospital Executive Specialist\nAccord Pharma Commercial & Medical Affairs`
  );

  const handleGenerate = () => {
    let draft = '';
    if (product.includes('OncoTarget')) {
      draft = `Dear Colleague,\n\nI am pleased to provide the Phase III ACCORD clinical study data for OncoTarget-700 (Zenocamtinib) in EGFR Exon 20 insertion metastatic NSCLC.\n\nClinical Highlights:\n• Median Progression-Free Survival (mPFS): 21.8 months vs 8.4 months platinum doublet (HR = 0.38, p < 0.001)\n• Confirmed Objective Response Rate (ORR): 68.4%\n• Manageable safety profile with zero Grade 4 interstitial lung disease\n\nOur medical science team is prepared to support your upcoming multidisciplinary tumor board review.\n\nBest regards,\nAccord Pharma Medical Affairs`;
    } else {
      draft = `Dear Dr. Chen,\n\nFollowing our clinical discussion regarding CardioVas-XR (Vasocordin XR) and its dual ETA & Neprilysin modulation profile in resistant hypertension with comorbid HFpEF, I wanted to share the published Phase III sub-analysis.\n\nKey highlights for your institutional review:\n• 42% reduction in CV death and urgent HF hospitalization (HR 0.58, 95% CI 0.47-0.72, p < 0.001)\n• Consistent therapeutic preservation across eGFR cohorts (30–60 mL/min/1.73m²)\n• Minimal hyperkalemia incidence (<2.1%) with standardized titration\n\nI have attached the complete peer-reviewed reprint and our institutional formulary dossier. Would you be available for a brief 10-minute briefing this Thursday at 14:00 to review the starter titration protocols?\n\nSincerely,\nMarcus Vance\nSenior Hospital Executive Specialist\nAccord Pharma Commercial & Medical Affairs`;
    }
    setGeneratedDraft(draft);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Bot className="w-3.5 h-3.5" /> Generative Clinical Assistant
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            AI Email Agent &amp; Medical Copilot
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate FDA-compliant, GxP-adherent scientific correspondence, formulary dossier summaries, and prescriber follow-up memos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" /> Clinical Prompt Parameters
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recipient Prescriber</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {db.getHCPs().map((h) => (
                  <option key={h.id} value={`${h.full_name} (${h.specialty})`}>
                    {h.full_name} ({h.specialty} - {h.account_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Therapeutic Focus</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="CardioVas-XR (Vasocordin XR)">CardioVas-XR (Vasocordin XR)</option>
                <option value="OncoTarget-700 (Zenocamtinib)">OncoTarget-700 (Zenocamtinib)</option>
                <option value="NeuroGuard-IV (Cerebrolysin)">NeuroGuard-IV (Cerebrolysin)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Engagement Objective</label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Communication Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(['scientific', 'concise', 'executive'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-1.5 px-2 rounded-lg font-bold capitalize text-[11px] border transition-colors ${
                      tone === t
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl shadow-md text-xs transition-transform hover:scale-[1.01]"
            >
              <Sparkles className="w-3.5 h-3.5" /> Re-Generate Clinical Memo
            </button>
          </div>
        </div>

        {/* Generated Output */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">Generated Email Draft</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy Text'}
              </button>
            </div>

            <textarea
              rows={16}
              value={generatedDraft}
              onChange={(e) => setGeneratedDraft(e.target.value)}
              className="w-full mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            ℹ <strong>GxP Compliance Note:</strong> All communications generated with Accord Copilot include required FDA fair balance indications and boxed warnings automatically when sent through authenticated channels.
          </div>
        </div>
      </div>
    </div>
  );
}
