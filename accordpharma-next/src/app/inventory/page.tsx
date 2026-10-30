'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { InventoryItem } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Warehouse,
  Search,
  Plus,
  ArrowUpDown,
  Calendar,
  Layers,
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => db.getInventory());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentUnits, setAdjustmentUnits] = useState<number>(50);

  const totalStockUnits = inventory.reduce((acc, item) => acc + (item.stock_level ?? item.quantity), 0);
  const totalValue = inventory.reduce((acc, item) => acc + (item.stock_level ?? item.quantity) * (item.unit_price ?? 75), 0);
  const lowStockCount = inventory.filter((item) => (item.stock_level ?? item.quantity) <= (item.reorder_level ?? 1000)).length;

  const filteredInventory = inventory.filter((item) => {
    const warehouseStr = item.warehouse_location || item.warehouse || '';
    const tempStr = item.storage_temp || item.storage_condition || '';
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouseStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterCondition === 'all' ||
      (filterCondition === 'low_stock' && (item.stock_level ?? item.quantity) <= (item.reorder_level ?? 1000)) ||
      (filterCondition === 'cold_chain' && tempStr.includes('2°C'));
    return matchesSearch && matchesFilter;
  });

  const handleAdjustStock = (item: InventoryItem, delta: number) => {
    item.stock_level = Math.max(0, (item.stock_level ?? item.quantity) + delta);
    setInventory([...inventory]);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Boxes className="w-3.5 h-3.5" /> Supply Chain &amp; Batch Traceability
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Inventory &amp; Stock Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time warehouse stock balances, cGMP cold-chain tracking, lot release dates, and clinical supply allocations.
          </p>
        </div>
      </div>

      {/* METRIC KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Stock On-Hand</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalStockUnits.toLocaleString()} Units
          </div>
          <span className="text-[11px] text-slate-400">Across 3 regional logistics hubs</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Stock Valuation</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalValue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">At institutional wholesale acquisition cost</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Low Stock Reorders</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {lowStockCount} Batches
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">Below reorder safety threshold</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Cold-Chain Compliance</span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">100% GxP</div>
          <span className="text-[11px] text-slate-400">2°C – 8°C continuous data logger verified</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'low_stock', 'cold_chain'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterCondition(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterCondition === f
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lot, SKU, or product..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">
                  <Bilingual textKey="colProduct" fallback="Product & Description" />
                </th>
                <th className="p-3.5">SKU / Code</th>
                <th className="p-3.5">Lot / Batch #</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Storage Temp</th>
                <th className="p-3.5">Warehouse Hub</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredInventory.map((item) => {
                const isLow = (item.stock_level ?? item.quantity) <= (item.reorder_level ?? 1000);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.product_name}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{item.sku}</td>
                    <td className="p-3.5 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      {item.lot_number}
                    </td>
                    <td className="p-3.5 text-slate-500">{item.expiration_date || item.expiry_date}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <Thermometer className="w-3.5 h-3.5 text-sky-500" /> {item.storage_temp || item.storage_condition}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-slate-400" /> {item.warehouse_location || item.warehouse}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                          {item.stock_level ?? item.quantity}
                        </span>
                        {isLow && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-lg"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Adjust Stock Level</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedItem.product_name}</div>
              <div>Lot: <span className="font-mono text-sky-600">{selectedItem.lot_number}</span></div>
              <div>Current On-Hand: <strong className="text-slate-900 dark:text-white">{selectedItem.stock_level ?? selectedItem.quantity} units</strong></div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Units to Adjust
              </label>
              <input
                type="number"
                value={adjustmentUnits}
                onChange={(e) => setAdjustmentUnits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleAdjustStock(selectedItem, -adjustmentUnits)}
                className="px-4 py-2 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl"
              >
                - Issue / Dispense
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(selectedItem, adjustmentUnits)}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow"
              >
                + Receive Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
