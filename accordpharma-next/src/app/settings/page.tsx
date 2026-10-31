'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { useLanguage } from '@/lib/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/i18n';
import {
  Settings,
  Globe,
  User,
  Shield,
  Bell,
  Save,
  Check,
  Server,
  Activity,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Database,
} from 'lucide-react';
import {
  getBackendUrl,
  checkBackendHealth,
  checkDatabaseHealth,
  BackendHealthResponse,
} from '@/lib/api';

export default function SettingsPage() {
  const { primaryLang, secondaryLang, setPrimaryLang, setSecondaryLang } = useLanguage();
  const [name, setName] = useState('Marcus Vance');
  const [email, setEmail] = useState('m.vance@accordpharma.com');
  const [territory, setTerritory] = useState('Territory West - California & Bay Area');
  const [saved, setSaved] = useState(false);

  const [backendUrl, setBackendUrl] = useState(getBackendUrl());
  const [apiHealth, setApiHealth] = useState<BackendHealthResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<BackendHealthResponse | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const [apiRes, dbRes] = await Promise.all([
        checkBackendHealth(),
        checkDatabaseHealth(),
      ]);
      setApiHealth(apiRes);
      setDbHealth(dbRes);
    } catch (e) {
      console.error(e);
    } finally {
      setTestingConnection(false);
    }
  };

  React.useEffect(() => {
    setBackendUrl(getBackendUrl());
    testConnection();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" /> Workspace Configuration
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Settings &amp; Preferences
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your representative credentials, territory scope, and bilingual real-time hover translation engines.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" /> Representative Profile
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Commercial Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Territory</label>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Bilingual Engine Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" /> Bilingual Engine Configuration
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Display Language</label>
              <select
                value={primaryLang}
                onChange={(e) => setPrimaryLang(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {SUPPORTED_LANGUAGES.map((l: LanguageOption) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Controls the active visible text across all buttons, tables, and headers.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Secondary Hover Language</label>
              <select
                value={secondaryLang}
                onChange={(e) => setSecondaryLang(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                {SUPPORTED_LANGUAGES.map((l: LanguageOption) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Shown dynamically in floating badges whenever hovering or focusing UI elements.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                {saved ? 'Preferences Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Railway Backend & CORS Connectivity Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              Railway Backend &amp; CORS Connectivity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live status of the FastAPI server on Railway and CORS bridge to this Vercel deployment.
            </p>
          </div>

          <button
            type="button"
            onClick={testConnection}
            disabled={testingConnection}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Railway API Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-600" /> Railway API Health
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  apiHealth?.status === 'online'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : apiHealth?.status === 'error'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}
              >
                {apiHealth?.status === 'online' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Online ({apiHealth.latencyMs}ms)
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" /> {apiHealth?.status || 'Connecting...'}
                  </>
                )}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all">
              {backendUrl}/health
            </div>
          </div>

          {/* PostgreSQL Database Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" /> Database Link (Neon PostgreSQL)
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  dbHealth?.status === 'online'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}
              >
                {dbHealth?.status === 'online' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </>
                ) : (
                  <>
                    <Activity className="w-3 h-3" /> Standby
                  </>
                )}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all">
              {backendUrl}/api/v1/health
            </div>
          </div>
        </div>

        {/* Endpoints & Links Strip */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-500 font-semibold">Backend Links:</span>
          <a
            href={`${backendUrl}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-bold"
          >
            Interactive Swagger Docs <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <a
            href={`${backendUrl}/redoc`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-bold"
          >
            ReDoc Specification <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <a
            href={`${backendUrl}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-bold"
          >
            API Root &amp; Version <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
