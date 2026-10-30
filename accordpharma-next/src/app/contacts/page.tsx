'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HealthcareProfessional } from '@/lib/types';
import {
  Users,
  Search,
  Filter,
  Stethoscope,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Plus,
  X,
  Presentation,
  CheckCircle,
  FileBadge2,
} from 'lucide-react';
import { Bilingual, BilingualLabel } from '@/components/Bilingual';

export default function ContactsPage() {
  const [hcps, setHcps] = useState<HealthcareProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  // Slide-over drawer state
  const [activeDossierHcp, setActiveDossierHcp] = useState<HealthcareProfessional | null>(null);

  // New HCP modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newHcpForm, setNewHcpForm] = useState({
    full_name: '',
    title: 'Attending Physician',
    specialty: 'Cardiology',
    license_number: '',
    prescribing_tier: 'Tier 1 (High Decile)',
    kol_status: false,
    email: '',
    phone: '',
    account_id: 'acc-1',
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setHcps(data.items || []);
    } catch {
      console.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateHcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHcpForm.full_name) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHcpForm),
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewHcpForm({
          full_name: '',
          title: 'Attending Physician',
          specialty: 'Cardiology',
          license_number: '',
          prescribing_tier: 'Tier 1 (High Decile)',
          kol_status: false,
          email: '',
          phone: '',
          account_id: 'acc-1',
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHcps = hcps.filter((h) => {
    const matchesSearch =
      h.full_name.toLowerCase().includes(search.toLowerCase()) ||
      h.specialty.toLowerCase().includes(search.toLowerCase()) ||
      h.account_name.toLowerCase().includes(search.toLowerCase()) ||
      h.license_number.toLowerCase().includes(search.toLowerCase());

    const matchesTier =
      selectedTier === 'ALL'
        ? true
        : selectedTier === 'KOL'
        ? h.kol_status
        : h.prescribing_tier === selectedTier;

    const matchesSpecialty = selectedSpecialty === 'ALL' ? true : h.specialty === selectedSpecialty;

    return matchesSearch && matchesTier && matchesSpecialty;
  });

  const kolCount = hcps.filter((h) => h.kol_status).length;
  const tier1Count = hcps.filter((h) => h.prescribing_tier === 'Tier 1 (High Decile)').length;

  return (
    <div className="space-y-6">
      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Stethoscope className="w-3.5 h-3.5" /> Medical Prescriber CRM
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Physicians & Key Opinion Leaders (KOL)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Decile prescribing tiers, NPI state medical licenses, hospital affiliations, and detailing dossiers.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/20 text-xs transition-all hover:scale-[1.02] shrink-0"
        >
          <Plus className="w-4 h-4" /> <Bilingual textKey="btnRegisterPrescriber" />
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
            <Bilingual textKey="kpiTotalPrescribers" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{hcps.length}</b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> <Bilingual textKey="kpiKolPrescribers" />
          </span>
          <b className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1 block">{kolCount}</b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> <Bilingual textKey="kpiTier1Access" />
          </span>
          <b className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">{tier1Count}</b>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
            <Bilingual textKey="kpiActiveTerritories" />
          </span>
          <b className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">3 Territories</b>
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by physician name, specialty, NPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Tier filter tabs */}
        <div className="flex flex-wrap gap-1.5 items-center w-full md:w-auto">
          {[
            { id: 'ALL', key: 'tabAllPrescribers' as const },
            { id: 'KOL', key: 'tabKolLeaders' as const },
            { id: 'Tier 1 (High Decile)', key: 'tabTier1HighDecile' as const },
            { id: 'Tier 2 (Medium Decile)', key: 'tabTier2MediumDecile' as const },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTier(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTier === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Bilingual textKey={tab.key} />
            </button>
          ))}
        </div>
      </div>

      {/* PHYSICIANS GRID */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading physician registry...</div>
      ) : filteredHcps.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
          No healthcare practitioners found matching your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHcps.map((hcp) => (
            <div
              key={hcp.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Badges strip */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      hcp.kol_status
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : hcp.prescribing_tier.includes('Tier 1')
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {hcp.kol_status ? '★ KEY OPINION LEADER' : hcp.prescribing_tier}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{hcp.license_number}</span>
                </div>

                {/* Name & Title */}
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  {hcp.full_name}
                </h3>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">{hcp.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{hcp.account_name}</span>
                </div>

                {/* Metadata Pill Matrix */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]"><Bilingual textKey="thSpecialty" /></span>
                    <strong className="text-slate-800 dark:text-slate-200">{hcp.specialty}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]"><Bilingual textKey="thDetailingEncounters" /></span>
                    <strong className="text-slate-800 dark:text-slate-200">{hcp.interactions_count} sessions</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]"><Bilingual textKey="thLastVisited" /></span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {hcp.last_interaction_at ? hcp.last_interaction_at.slice(0, 10) : 'Never'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]"><Bilingual textKey="thNextTouchpoint" /></span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {hcp.next_scheduled_visit ? hcp.next_scheduled_visit.slice(0, 10) : 'Not scheduled'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveDossierHcp(hcp)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Bilingual textKey="btnDossier" /> <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  href={`/edetailing?contact_id=${hcp.id}`}
                  className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Presentation className="w-3 h-3" /> <Bilingual textKey="btnDetail" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SLIDE-OVER DOSSIER DRAWER */}
      {activeDossierHcp && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveDossierHcp(null)}
          ></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl z-10 p-6 flex flex-col h-full overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Physician 360° Dossier
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                  {activeDossierHcp.full_name}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {activeDossierHcp.title} · {activeDossierHcp.specialty}
                </div>
              </div>
              <button
                onClick={() => setActiveDossierHcp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* Prescribing Status Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">Prescribing Classification</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tier Category</span>
                    <strong className="text-slate-800 dark:text-slate-200">{activeDossierHcp.prescribing_tier}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">NPI Medical License</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {activeDossierHcp.license_number}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Primary Health System</span>
                    <strong className="text-slate-800 dark:text-slate-200">{activeDossierHcp.account_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sales Rep Territory</span>
                    <strong className="text-slate-800 dark:text-slate-200">{activeDossierHcp.territory}</strong>
                  </div>
                </div>
              </div>

              {/* Direct e-Detailing Trigger */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
                <div>
                  <h4 className="font-extrabold text-sm">Launch e-Detailing Presentation</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Start a recorded clinical IVA session with {activeDossierHcp.full_name}
                  </p>
                </div>
                <Link
                  href={`/edetailing?contact_id=${activeDossierHcp.id}`}
                  className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs px-3.5 py-2 rounded-lg shrink-0 transition-colors"
                >
                  Launch Now →
                </Link>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Direct Contact Information
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                    <a href={`mailto:${activeDossierHcp.email}`} className="font-semibold text-sky-600 hover:underline">
                      {activeDossierHcp.email}
                    </a>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-slate-400 block text-[10px]">Office Telephone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeDossierHcp.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW HCP REGISTRATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Register Prescribing Physician</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHcp} className="mt-4 space-y-4">
              <div>
                <BilingualLabel textKey="lblPhysicianFullName" required />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jennifer Adams, MD"
                  value={newHcpForm.full_name}
                  onChange={(e) => setNewHcpForm({ ...newHcpForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BilingualLabel textKey="lblSpecialty" required />
                  <select
                    value={newHcpForm.specialty}
                    onChange={(e) => setNewHcpForm({ ...newHcpForm, specialty: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                  </select>
                </div>

                <div>
                  <BilingualLabel textKey="lblPrescribingTier" />
                  <select
                    value={newHcpForm.prescribing_tier}
                    onChange={(e) => setNewHcpForm({ ...newHcpForm, prescribing_tier: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Tier 1 (High Decile)">Tier 1 (High Decile)</option>
                    <option value="Tier 2 (Medium Decile)">Tier 2 (Medium Decile)</option>
                    <option value="Tier 3 (Emerging)">Tier 3 (Emerging)</option>
                    <option value="Key Opinion Leader (KOL)">Key Opinion Leader (KOL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BilingualLabel textKey="lblLicenseNumber" />
                  <input
                    type="text"
                    placeholder="NPI-1948201948"
                    value={newHcpForm.license_number}
                    onChange={(e) => setNewHcpForm({ ...newHcpForm, license_number: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <BilingualLabel textKey="lblHospitalFacility" />
                  <select
                    value={newHcpForm.account_id}
                    onChange={(e) => setNewHcpForm({ ...newHcpForm, account_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="acc-1">St. Jude Metropolitan Medical Center</option>
                    <option value="acc-2">Cedars-Sinai Comprehensive Cancer Pavilion</option>
                    <option value="acc-3">Northwestern Heart & Vascular Institute</option>
                    <option value="acc-4">Memorial Sloan Regional Health System</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="kol_checkbox"
                  checked={newHcpForm.kol_status}
                  onChange={(e) => setNewHcpForm({ ...newHcpForm, kol_status: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="kol_checkbox" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Bilingual textKey="lblTagAsKol" />
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Bilingual textKey="btnCancel" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20"
                >
                  <Bilingual textKey="btnSavePrescriber" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
