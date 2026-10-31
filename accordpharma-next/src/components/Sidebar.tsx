'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Bell,
  Inbox,
  CalendarCheck2,
  Target,
  Stethoscope,
  ShieldCheck,
  Building2,
  BarChart3,
  Presentation,
  Layers,
  FileSpreadsheet,
  LineChart,
  Calendar,
  PhoneCall,
  Users,
  Trophy,
  Bot,
  Mic,
  Boxes,
  BookOpen,
  ShoppingBag,
  Receipt,
  FileSignature,
  Store,
  FileBadge,
  AlertTriangle,
  ShieldAlert,
  Settings,
  Moon,
  Sun,
  Search,
  ChevronDown,
  Activity,
  Calculator,
  Navigation,
  Flame,
  PenTool,
  HelpCircle,
  Award,
  HeartHandshake,
  Crosshair,
  Zap,
  Mic2,
  Cpu,
  Swords,
  LogOut,
  LogIn,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { Bilingual } from './Bilingual';
import { checkBackendHealth, getBackendUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendUrl, setBackendUrl] = useState('');
  const [taskCount, setTaskCount] = useState(3);
  const [contactCount, setContactCount] = useState(5);

  // Group collapse toggles
  const [crmOpen, setCrmOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [governanceOpen, setGovernanceOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('accord_theme');
      const isDark = saved ? saved === 'dark' : true;
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Read persistent counts
      const { clientStore } = require('@/lib/clientStore');
      const tasks = clientStore.getTasks();
      const contacts = clientStore.getContacts();
      const pending = tasks.filter((t: any) => t.status === 'pending');
      setTaskCount(pending.length);
      setContactCount(contacts.length);
    } catch {}

    const url = getBackendUrl();
    setBackendUrl(url);
    checkBackendHealth()
      .then((res) => {
        setBackendStatus(res.status === 'online' ? 'online' : 'offline');
      })
      .catch(() => setBackendStatus('offline'));
  }, [pathname]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem('accord_theme', next ? 'dark' : 'light');
    } catch {}
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItemClass = (path: string) => {
    const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
    return `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-sm border border-sky-100 dark:border-sky-900/60 font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
    }`;
  };

  // Hide sidebar on public pages (login, etc.)
  const isPublicPage = ['/login', '/reset-password', '/forgot-password'].some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );
  if (isPublicPage) return null;

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none">
      {/* BRAND HEADER */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Accord Pharma
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                PRO
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Commercial CRM & IVA</div>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* BILINGUAL LANGUAGE ENGINE CONTROLLER */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
        <LanguageSelector />
      </div>

      {/* QUICK SEARCH BAR */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search prescribers, hospitals..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-10 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <kbd className="absolute right-2 top-2 text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* SCROLLABLE NAVIGATION ITEMS */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-6">
        {/* TOP GENERAL ITEMS (UNGROUPED) */}
        <div className="space-y-1">
          <Link href="/" className={navItemClass('/')}>
            <LayoutDashboard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="flex-1">
              <Bilingual textKey="menuDashboard" fallback="Dashboard" />
            </span>
          </Link>

          <Link href="/tasks" className={navItemClass('/tasks')}>
            <ListTodo className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="flex-1">
              <Bilingual textKey="menuWorkQueue" fallback="My Work Queue" />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              {taskCount}
            </span>
          </Link>

          <Link href="/notifications" className={navItemClass('/notifications')}>
            <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="flex-1">
              <Bilingual textKey="menuNotifications" fallback="Notifications" />
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
              4
            </span>
          </Link>

          <Link href="/inbox" className={navItemClass('/inbox')}>
            <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="flex-1">
              <Bilingual textKey="menuInbox" fallback="Inbox" />
            </span>
          </Link>

          <Link href="/follow-ups" className={navItemClass('/follow-ups')}>
            <CalendarCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="flex-1">
              <Bilingual textKey="menuFollowUps" fallback="Follow-ups" />
            </span>
          </Link>
        </div>

        {/* GROUP: CRM */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setCrmOpen(!crmOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuCrmHeader" fallback="CRM" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${crmOpen ? '' : '-rotate-90'}`} />
          </button>
          {crmOpen && (
            <div className="space-y-1">
              <Link href="/leads" className={navItemClass('/leads')}>
                <Target className="w-4 h-4 text-teal-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuLeads" fallback="Leads" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 uppercase">
                  NEW
                </span>
              </Link>

              <Link href="/contacts" className={navItemClass('/contacts')}>
                <Stethoscope className="w-4 h-4 text-sky-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuPrescribers" fallback="Physicians & KOLs" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {contactCount}
                </span>
              </Link>

              <Link href="/targeting-matrix" className={navItemClass('/targeting-matrix')}>
                <Crosshair className="w-4 h-4 text-rose-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuTargetingMatrix" fallback="Prescriber Decile Matrix" />
                </span>
              </Link>

              <Link href="/kol-network" className={navItemClass('/kol-network')}>
                <Award className="w-4 h-4 text-amber-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuKolNetwork" fallback="KOL Network & Sunshine" />
                </span>
              </Link>

              <Link href="/formulary" className={navItemClass('/formulary')}>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuFormulary" fallback="Hospital Formulary" />
                </span>
              </Link>

              <Link href="/pt-modeler" className={navItemClass('/pt-modeler')}>
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuPtModeler" fallback="P&T Budget Modeler" />
                </span>
              </Link>

              <Link href="/hub-services" className={navItemClass('/hub-services')}>
                <HeartHandshake className="w-4 h-4 text-pink-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuHubServices" fallback="Patient Access & Hub Services" />
                </span>
              </Link>

              <Link href="/accounts" className={navItemClass('/accounts')}>
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuAccounts" fallback="Clients (Accounts 360°)" />
                </span>
              </Link>

              <Link href="/pipeline" className={navItemClass('/pipeline')}>
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuDeals" fallback="Deals (Sales Pipeline)" />
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* GROUP: PROJECTS & ACTIVITIES */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuProjectsHeader" fallback="PROJECTS & ACTIVITIES" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${projectsOpen ? '' : '-rotate-90'}`} />
          </button>
          {projectsOpen && (
            <div className="space-y-1">
              <Link href="/next-best-action" className={navItemClass('/next-best-action')}>
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuNextBestAction" fallback="Next-Best-Action (NBA)" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase">
                  AI
                </span>
              </Link>

              <Link href="/call-planner" className={navItemClass('/call-planner')}>
                <Navigation className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="flex-1">
                  <Bilingual textKey="menuCallPlanner" fallback="Daily Call Planner" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 uppercase">
                  GPS
                </span>
              </Link>

              <Link href="/edetailing" className={navItemClass('/edetailing')}>
                <Presentation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="flex-1">
                  <Bilingual textKey="menuEdetailing" fallback="Clinical e-Detailing" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  IVA
                </span>
              </Link>

              <Link href="/clm-analytics" className={navItemClass('/clm-analytics')}>
                <Flame className="w-4 h-4 text-rose-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuClmAnalytics" fallback="CLM & Slide Analytics" />
                </span>
              </Link>

              <Link href="/speaker-bureau" className={navItemClass('/speaker-bureau')}>
                <Mic2 className="w-4 h-4 text-indigo-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuSpeakerBureau" fallback="Speaker Bureau & Symposia" />
                </span>
              </Link>

              <Link href="/command-center" className={navItemClass('/command-center')}>
                <Layers className="w-4 h-4 text-sky-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuCommandCenter" fallback="Sales Command Center" />
                </span>
              </Link>

              <Link href="/task-sheet" className={navItemClass('/task-sheet')}>
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuTaskSheet" fallback="Task Sheet" />
                </span>
              </Link>

              <Link href="/reports" className={navItemClass('/reports')}>
                <LineChart className="w-4 h-4 text-indigo-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuReports" fallback="Sales Reports" />
                </span>
              </Link>

              <Link href="/meetings" className={navItemClass('/meetings')}>
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuMeetings" fallback="Meetings" />
                </span>
              </Link>

              <Link href="/calls" className={navItemClass('/calls')}>
                <PhoneCall className="w-4 h-4 text-rose-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuCalls" fallback="Calls" />
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* GROUP: TEAMS */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setTeamsOpen(!teamsOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuTeamsHeader" fallback="TEAMS" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${teamsOpen ? '' : '-rotate-90'}`} />
          </button>
          {teamsOpen && (
            <div className="space-y-1">
              <Link href="/team-directory" className={navItemClass('/team-directory')}>
                <Users className="w-4 h-4 text-sky-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuTeamDirectory" fallback="Team Directory" />
                </span>
              </Link>

              <Link href="/leaderboard" className={navItemClass('/leaderboard')}>
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuLeaderboard" fallback="Leaderboard" />
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* GROUP: AI AGENTS */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuAiHeader" fallback="AI AGENTS" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aiOpen ? '' : '-rotate-90'}`} />
          </button>
          {aiOpen && (
            <div className="space-y-1">
              <Link href="/ai-assistant" className={navItemClass('/ai-assistant')}>
                <Bot className="w-4 h-4 text-indigo-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuAiAssistant" fallback="Email Agent" />
                </span>
              </Link>

              <Link href="/ai-insights" className={navItemClass('/ai-insights')}>
                <Mic className="w-4 h-4 text-violet-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuAiInsights" fallback="AI Voice Caller" />
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* GROUP: INVENTORY & COMMERCE */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuInventoryHeader" fallback="INVENTORY & COMMERCE" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${inventoryOpen ? '' : '-rotate-90'}`} />
          </button>
          {inventoryOpen && (
            <div className="space-y-1">
              <Link href="/samples" className={navItemClass('/samples')}>
                <PenTool className="w-4 h-4 text-amber-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuSamples" fallback="Sample Dispensation (PDMA)" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase">
                  SIG
                </span>
              </Link>

              <Link href="/cold-chain-iot" className={navItemClass('/cold-chain-iot')}>
                <Cpu className="w-4 h-4 text-cyan-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuColdChainIot" fallback="Cold-Chain IoT Fleet" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 uppercase">
                  2-8°C
                </span>
              </Link>

              <Link href="/inventory" className={navItemClass('/inventory')}>
                <Boxes className="w-4 h-4 text-amber-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuInventory" fallback="Inventory & Stock" />
                </span>
              </Link>

              <Link href="/catalog" className={navItemClass('/catalog')}>
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuCatalog" fallback="Catalog" />
                </span>
              </Link>

              <Link href="/orders" className={navItemClass('/orders')}>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuOrders" fallback="Commercial Orders" />
                </span>
              </Link>

              <Link href="/billing" className={navItemClass('/billing')}>
                <Receipt className="w-4 h-4 text-blue-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuBilling" fallback="Billing & Invoices" />
                </span>
              </Link>

              <Link href="/proposals" className={navItemClass('/proposals')}>
                <FileSignature className="w-4 h-4 text-purple-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuProposals" fallback="Proposals" />
                </span>
              </Link>

              <Link href="/marketplace" className={navItemClass('/marketplace')}>
                <Store className="w-4 h-4 text-teal-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuMarketplace" fallback="Marketplace" />
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* GROUP: COMPLIANCE & GOVERNANCE */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setGovernanceOpen(!governanceOpen)}
            className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span><Bilingual textKey="menuGovernanceHeader" fallback="COMPLIANCE & GOVERNANCE" /></span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${governanceOpen ? '' : '-rotate-90'}`} />
          </button>
          {governanceOpen && (
            <div className="space-y-1">
              <Link href="/competitive-intel" className={navItemClass('/competitive-intel')}>
                <Swords className="w-4 h-4 text-orange-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuCompetitiveIntel" fallback="Competitive Battlecards" />
                </span>
              </Link>

              <Link href="/mir" className={navItemClass('/mir')}>
                <HelpCircle className="w-4 h-4 text-cyan-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuMir" fallback="Medical Info Requests (MSL)" />
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 uppercase">
                  MSL
                </span>
              </Link>

              <Link href="/tenders" className={navItemClass('/tenders')}>
                <FileBadge className="w-4 h-4 text-indigo-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuTenders" fallback="Institutional Tenders" />
                </span>
              </Link>

              <Link href="/pharmacovigilance" className={navItemClass('/pharmacovigilance')}>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuPharmacovigilance" fallback="Pharmacovigilance" />
                </span>
              </Link>

              <Link href="/compliance" className={navItemClass('/compliance')}>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="flex-1">
                  <Bilingual textKey="menuCompliance" fallback="Compliance & Audits" />
                </span>
              </Link>

              <Link href="/settings" className={navItemClass('/settings')}>
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="flex-1">
                  <Bilingual textKey="menuSettings" fallback="Settings & Profile" />
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* BACKEND CONNECTIVITY STATUS */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendStatus === 'online'
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : backendStatus === 'offline'
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-slate-600 dark:text-slate-400 truncate text-[10px]">
              {backendStatus === 'online'
                ? 'Railway API Connected'
                : backendStatus === 'offline'
                ? 'API Disconnected'
                : 'Connecting API...'}
            </span>
          </div>
          <a
            href={backendUrl ? `${backendUrl}/docs` : 'https://accordpharma-production.up.railway.app/docs'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline uppercase font-bold shrink-0 ml-1"
            title={`Connected to Railway backend at ${backendUrl || 'https://accordpharma-production.up.railway.app'}`}
          >
            API Docs ↗
          </a>
        </div>
      </div>

      {/* USER FOOTER STRIP */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow shrink-0">
              {user.full_name
                ? user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'AP'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user.full_name || user.email}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user.roles?.includes('SUPER_ADMIN')
                  ? 'System Administrator'
                  : 'Senior Commercial Rep'}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Log Out of Accord Pharma"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Session Inactive
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

