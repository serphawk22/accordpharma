'use client';

import { useState, useEffect } from 'react';
import { CommercialOrder } from '@/lib/types';
import confetti from 'canvas-confetti';
import { ShoppingBag, Plus, Search, DollarSign, CheckCircle2, Package, X, ArrowRight } from 'lucide-react';
import { Bilingual, BilingualTh, BilingualLabel } from '@/components/Bilingual';

export default function OrdersPage() {
  const [orders, setOrders] = useState<CommercialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [orderForm, setOrderForm] = useState({
    account_id: 'acc-1',
    product_name: 'CardioVas-XR 50mg Tablets',
    sku: 'CVX-50MG-100',
    quantity: 100,
    unit_price: 45.0,
  });

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data.items || []);
    } catch {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleProductChange = (prodName: string) => {
    if (prodName.includes('CardioVas-XR 50mg')) {
      setOrderForm({ ...orderForm, product_name: prodName, sku: 'CVX-50MG-100', unit_price: 45.0 });
    } else if (prodName.includes('CardioVas-XR 100mg')) {
      setOrderForm({ ...orderForm, product_name: prodName, sku: 'CVX-100MG-100', unit_price: 65.0 });
    } else if (prodName.includes('OncoTarget-700')) {
      setOrderForm({ ...orderForm, product_name: prodName, sku: 'OCT-140MG-60', unit_price: 850.0 });
    } else {
      setOrderForm({ ...orderForm, product_name: prodName, sku: 'NGD-50ML-10', unit_price: 320.0 });
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });
      if (res.ok) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
        setShowOrderModal(false);
        loadOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.account_name.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Commerce & Supply Orders
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Commercial Orders & Procurement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hospital purchase orders, automated catalog pricing, batch reservations, and invoice generation.
          </p>
        </div>
        <button
          onClick={() => setShowOrderModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02] shrink-0"
        >
          <Plus className="w-4 h-4" /> <Bilingual textKey="btnPlaceOrder" />
        </button>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase">
            <Bilingual textKey="kpiTotalExecutedVolume" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ${totalRevenue.toLocaleString()}
          </b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase">
            <Bilingual textKey="kpiTotalOrders" />
          </span>
          <b className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">{orders.length} Orders</b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-emerald-600 font-semibold block uppercase">
            <Bilingual textKey="kpiFulfillmentStatus" />
          </span>
          <b className="text-2xl font-black text-emerald-600 mt-1 block">100% In-Stock</b>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search order ref, facility, medication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <BilingualTh textKey="thOrderRef" />
                <BilingualTh textKey="thCustomerAccount" />
                <BilingualTh textKey="thTherapeuticProduct" />
                <BilingualTh textKey="thQuantity" />
                <BilingualTh textKey="thUnitPrice" />
                <BilingualTh textKey="thTotalAmount" />
                <BilingualTh textKey="thStatus" />
                <BilingualTh textKey="thDate" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{o.order_number}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{o.account_name}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 dark:text-white block">{o.product_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">SKU: {o.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{o.quantity} Units</td>
                  <td className="py-3.5 px-4">${o.unit_price.toFixed(2)}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                    ${o.total_price.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{o.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLACE ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowOrderModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Place Commercial Supply Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <BilingualLabel textKey="lblHospitalFacility" />
                <select
                  value={orderForm.account_id}
                  onChange={(e) => setOrderForm({ ...orderForm, account_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="acc-1">St. Jude Metropolitan Medical Center</option>
                  <option value="acc-2">Cedars-Sinai Comprehensive Cancer Pavilion</option>
                  <option value="acc-3">Northwestern Heart & Vascular Institute</option>
                  <option value="acc-4">Memorial Sloan Regional Health System</option>
                </select>
              </div>

              <div>
                <BilingualLabel textKey="lblSelectProduct" />
                <select
                  value={orderForm.product_name}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="CardioVas-XR 50mg Tablets">CardioVas-XR 50mg Tablets ($45.00/unit)</option>
                  <option value="CardioVas-XR 100mg Tablets">CardioVas-XR 100mg Tablets ($65.00/unit)</option>
                  <option value="OncoTarget-700 140mg (60 caps)">OncoTarget-700 140mg (60 caps) ($850.00/unit)</option>
                  <option value="NeuroGuard-IV Infusion 50ml">NeuroGuard-IV Infusion 50ml ($320.00/unit)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BilingualLabel textKey="lblOrderQuantity" />
                  <input
                    type="number"
                    min={1}
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <BilingualLabel textKey="lblCatalogUnitPrice" />
                  <input
                    type="text"
                    disabled
                    value={`$${orderForm.unit_price.toFixed(2)}`}
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-500 font-bold"
                  />
                </div>
              </div>

              {/* Calculated Total Banner */}
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                  <Bilingual textKey="lblCalculatedTotal" />
                </span>
                <b className="text-lg font-black text-sky-600 dark:text-sky-400">
                  ${(orderForm.quantity * orderForm.unit_price).toLocaleString()}
                </b>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Bilingual textKey="btnCancel" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20"
                >
                  <Bilingual textKey="btnPlaceOrder" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
