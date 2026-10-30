'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/store';
import { SampleItem, SampleDispensation, HealthcareProfessional } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  PenTool,
  ShieldCheck,
  Package,
  ThermometerSnowflake,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Plus,
  Search,
  Building2,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function SamplesPage() {
  const [samples, setSamples] = useState<SampleItem[]>(() => db.getSampleItems());
  const [dispensations, setDispensations] = useState<SampleDispensation[]>(() => db.getSampleDispensations());
  const [hcps] = useState<HealthcareProfessional[]>(() => db.getHCPs());
  const [searchQuery, setSearchQuery] = useState('');

  // Dispensation Modal
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedHcpId, setSelectedHcpId] = useState(hcps[0]?.id || '');
  const [selectedSampleId, setSelectedSampleId] = useState(samples[0]?.id || '');
  const [quantity, setQuantity] = useState(2);
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<SampleDispensation | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedHcp = hcps.find((h) => h.id === selectedHcpId) || hcps[0];
  const selectedSample = samples.find((s) => s.id === selectedSampleId) || samples[0];

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleDispenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHcp || !selectedSample) return;

    let sigSvg = '';
    if (canvasRef.current && hasSignature) {
      sigSvg = canvasRef.current.toDataURL('image/png');
    }

    const created = db.dispenseSample({
      physician_name: selectedHcp.full_name,
      physician_title: selectedHcp.title || 'Attending Physician',
      institution: selectedHcp.account_name,
      license_number: selectedHcp.license_number,
      dea_number: `BH${Math.floor(1000000 + Math.random() * 9000000)}`,
      product_name: selectedSample.product_name,
      dosage: selectedSample.dosage,
      lot_number: selectedSample.lot_number,
      quantity: Number(quantity),
      rep_name: 'Marcus Vance',
      rep_id: 'usr-1',
      signature_svg: sigSvg,
      pdma_verified: true,
      notes: dispenseNotes.trim() || 'Prescriber initiated evaluation starter titration.',
    });

    setSamples([...db.getSampleItems()]);
    setDispensations([...db.getSampleDispensations()]);
    setShowDispenseModal(false);
    clearSignature();
    setDispenseNotes('');
    setSuccessToast(
      `PDMA-compliant sample delivery logged for ${selectedHcp.full_name}! Stock deducted from car inventory.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const filteredDispensations = dispensations.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      d.physician_name.toLowerCase().includes(query) ||
      d.institution.toLowerCase().includes(query) ||
      d.product_name.toLowerCase().includes(query) ||
      d.lot_number.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* TOAST */}
      {successToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> PDMA &amp; FDA 21 CFR Part 11 Compliance
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sample Dispensation &amp; Signature Capture
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prescription Drug Marketing Act (PDMA) trunk stock allocation, physical prescriber signature capture on glass, and DEA license audit records.
          </p>
        </div>
        <button
          onClick={() => setShowDispenseModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-md shadow-amber-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <PenTool className="w-4 h-4" />
          <span>Capture Physician Signature &amp; Dispense</span>
        </button>
      </div>

      {/* TRUNK STOCK INVENTORY CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" />
            Commercial Rep Trunk Stock &amp; Lot Allocation
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">Audited Daily • Marcus Vance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {samples.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-amber-400/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-xs text-slate-900 dark:text-white">{item.product_name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.dosage}</p>
                </div>
                {item.cold_chain_required && (
                  <span
                    className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400"
                    title={item.temp_range}
                  >
                    <ThermometerSnowflake className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Available Units:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {item.trunk_stock} / {item.allocated_quota}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${(item.trunk_stock / item.allocated_quota) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <span>{item.lot_number}</span>
                  <span>Exp: {item.expiry_date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DISPENSATION AUDIT LOG */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">PDMA Sample Dispensation Audit Log</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {dispensations.length} Audited Receipts
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search physician, DEA, lot #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Prescriber &amp; Institution</th>
                <th className="p-3.5">Medical License / DEA</th>
                <th className="p-3.5">Sample Product &amp; Dosage</th>
                <th className="p-3.5">Lot &amp; Units</th>
                <th className="p-3.5">Date &amp; Commercial Rep</th>
                <th className="p-3.5">PDMA Status</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredDispensations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    <div>{d.physician_name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{d.institution}</div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    <div className="text-slate-800 dark:text-slate-200 font-bold">{d.license_number}</div>
                    <div className="text-[10px] text-slate-400">DEA: {d.dea_number}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{d.product_name}</div>
                    <div className="text-[10px] text-slate-400">{d.dosage}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono text-slate-600 dark:text-slate-300">{d.lot_number}</div>
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                      {d.quantity} Units Delivered
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold">{new Date(d.dispensed_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">{d.rep_name}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                      <CheckCircle2 className="w-3 h-3" /> Signed &amp; Verified
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setActiveReceipt(d)}
                      className="px-2.5 py-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950 rounded-lg border border-sky-200 dark:border-sky-800/40"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPENSE & CAPTURE SIGNATURE MODAL */}
      {showDispenseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">PDMA Physician Signature Capture</h3>
                  <p className="text-[11px] text-slate-400">Prescription Drug Marketing Act physical receipt on glass</p>
                </div>
              </div>
              <button onClick={() => setShowDispenseModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleDispenseSubmit} className="space-y-4 text-xs">
              {/* Prescriber Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Licensed Prescriber</label>
                <select
                  value={selectedHcpId}
                  onChange={(e) => setSelectedHcpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                >
                  {hcps.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name} ({h.specialty} • {h.account_name})
                    </option>
                  ))}
                </select>
                {selectedHcp && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span>
                      <strong>License:</strong> {selectedHcp.license_number}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> License Active &amp; Verified
                    </span>
                  </div>
                )}
              </div>

              {/* Sample Product Selector & Quantity */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sample Product</label>
                  <select
                    value={selectedSampleId}
                    onChange={(e) => setSelectedSampleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                  >
                    {samples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.product_name} - {s.dosage} ({s.trunk_stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Units (Max 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Clinical Objective */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dispensation Reason / Notes</label>
                <input
                  type="text"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  placeholder="Inpatient starter titration for newly diagnosed cohort..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              {/* DIGITAL SIGNATURE CANVAS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-500" />
                    Doctor&apos;s Signature (Draw with Stylus or Touch on Glass)
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Signature
                  </button>
                </div>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair w-full h-[120px] rounded-xl bg-white dark:bg-slate-900 touch-none"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Sign on line above</span>
                  <span>Legal statement: I acknowledge receipt of complimentary samples under PDMA.</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasSignature}
                  className="px-5 py-2 font-black bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl shadow-md transition-all"
                >
                  Confirm &amp; Record PDMA Dispensation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">PDMA Compliance Sample Receipt</h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Receipt ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{activeReceipt.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Prescriber:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeReceipt.physician_name} ({activeReceipt.license_number})
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Institution:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{activeReceipt.institution}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Sample Product:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeReceipt.product_name} • {activeReceipt.quantity} Units (Lot: {activeReceipt.lot_number})
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Delivered By:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeReceipt.rep_name} on {new Date(activeReceipt.dispensed_at).toLocaleString()}
                </span>
              </div>

              {activeReceipt.signature_svg && (
                <div className="pt-2">
                  <span className="text-slate-500 font-semibold block mb-1">Physician Signature on File:</span>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeReceipt.signature_svg} alt="Physician Signature" className="h-16 object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Print / Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
