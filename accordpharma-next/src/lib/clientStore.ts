'use client';

import {
  Account,
  CRMTask,
  CommercialOrder,
  HealthcareProfessional,
  Lead,
  HospitalFormularyItem,
  Opportunity,
  LeadConversation,
  LeadMeeting,
  LeadNote,
} from './types';
import {
  initialAccounts,
  initialTasks,
  initialOrders,
  initialHCPs,
  initialLeads,
  initialFormularies,
  initialOpportunities,
} from './store';

const ACCOUNTS_KEY = 'accord_persisted_accounts';
const TASKS_KEY = 'accord_persisted_tasks';
const ORDERS_KEY = 'accord_persisted_orders';
const HCPS_KEY = 'accord_persisted_hcps';
const LEADS_KEY = 'accord_persisted_leads';
const FORMULARIES_KEY = 'accord_persisted_formularies';
const OPPORTUNITIES_KEY = 'accord_persisted_opportunities';

function safeGet<T>(key: string, defaults: T[]): T[] {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return defaults;
    const itemIds = new Set(items.map((c: any) => c.id));
    const dedupedDefaults = defaults.filter((d: any) => !itemIds.has(d.id));
    return [...items, ...dedupedDefaults];
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
    return defaults;
  }
}

function safeSave<T>(key: string, item: T, existingDefaults: T[]): T[] {
  if (typeof window === 'undefined') return [item, ...existingDefaults];
  try {
    const current = safeGet<T>(key, existingDefaults);
    const updated = [item, ...current.filter((i: any) => (i as any).id !== (item as any).id)];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn(`Error saving ${key} to storage:`, e);
    return [item, ...existingDefaults];
  }
}

export const clientStore = {
  // Accounts
  getAccounts(): Account[] {
    return safeGet<Account>(ACCOUNTS_KEY, initialAccounts);
  },
  saveAccount(account: Account): Account[] {
    return safeSave<Account>(ACCOUNTS_KEY, account, initialAccounts);
  },

  // Tasks
  getTasks(): CRMTask[] {
    return safeGet<CRMTask>(TASKS_KEY, initialTasks);
  },
  saveTask(task: CRMTask): CRMTask[] {
    return safeSave<CRMTask>(TASKS_KEY, task, initialTasks);
  },

  // Orders
  getOrders(): CommercialOrder[] {
    return safeGet<CommercialOrder>(ORDERS_KEY, initialOrders);
  },
  saveOrder(order: CommercialOrder): CommercialOrder[] {
    return safeSave<CommercialOrder>(ORDERS_KEY, order, initialOrders);
  },

  // Contacts
  getContacts(): HealthcareProfessional[] {
    return safeGet<HealthcareProfessional>(HCPS_KEY, initialHCPs);
  },
  saveContact(contact: HealthcareProfessional): HealthcareProfessional[] {
    return safeSave<HealthcareProfessional>(HCPS_KEY, contact, initialHCPs);
  },

  // Leads
  getLeads(): Lead[] {
    return safeGet<Lead>(LEADS_KEY, initialLeads);
  },
  saveLead(lead: Lead): Lead[] {
    return safeSave<Lead>(LEADS_KEY, lead, initialLeads);
  },
  updateLead(id: string, patch: Partial<Lead>): Lead[] {
    const list = safeGet<Lead>(LEADS_KEY, initialLeads);
    const updated = list.map((l) => (l.id === id ? { ...l, ...patch } : l));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },
  addLeadConversation(leadId: string, convo: Omit<LeadConversation, 'id' | 'occurred_at'>): Lead[] {
    const list = safeGet<Lead>(LEADS_KEY, initialLeads);
    const updated = list.map((l) => {
      if (l.id === leadId) {
        const conversations = l.conversations || [];
        const newConvo: LeadConversation = {
          ...convo,
          id: `conv-${Date.now()}`,
          occurred_at: new Date().toISOString(),
        };
        return { ...l, status: l.status === 'new' ? ('contacted' as const) : l.status, conversations: [newConvo, ...conversations] };
      }
      return l;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },
  addLeadMeeting(leadId: string, meeting: Omit<LeadMeeting, 'id'>): Lead[] {
    const list = safeGet<Lead>(LEADS_KEY, initialLeads);
    const updated = list.map((l) => {
      if (l.id === leadId) {
        const meetings = l.meetings || [];
        const newMeeting: LeadMeeting = { ...meeting, id: `meet-${Date.now()}` };
        return { ...l, meetings: [newMeeting, ...meetings] };
      }
      return l;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },
  addLeadNote(leadId: string, text: string, author: string): Lead[] {
    const list = safeGet<Lead>(LEADS_KEY, initialLeads);
    const updated = list.map((l) => {
      if (l.id === leadId) {
        const notes = l.notes || [];
        const newNote: LeadNote = {
          id: `note-${Date.now()}`,
          text,
          author,
          created_at: new Date().toISOString(),
        };
        return { ...l, notes: [newNote, ...notes] };
      }
      return l;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },
  qualifyLead(leadId: string, details: NonNullable<Lead['qualification_details']>): Lead[] {
    const list = safeGet<Lead>(LEADS_KEY, initialLeads);
    const checks = Object.values(details).filter(Boolean).length;
    const score = checks === 4 ? 100 : checks === 3 ? 80 : checks === 2 ? 60 : 30;
    const nextStatus = checks >= 3 ? ('qualified' as const) : ('contacted' as const);

    const updated = list.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          qualification_details: details,
          qualification_score: score,
          status: nextStatus,
        };
      }
      return l;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },

  // Opportunities
  getOpportunities(): Opportunity[] {
    return safeGet<Opportunity>(OPPORTUNITIES_KEY, initialOpportunities);
  },
  saveOpportunity(opp: Opportunity): Opportunity[] {
    return safeSave<Opportunity>(OPPORTUNITIES_KEY, opp, initialOpportunities);
  },
  updateOpportunityStage(id: string, stage: Opportunity['stage']): Opportunity[] {
    const list = safeGet<Opportunity>(OPPORTUNITIES_KEY, initialOpportunities);
    const updated = list.map((o) => (o.id === id ? { ...o, stage } : o));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
      } catch {}
    }
    return updated;
  },

  // Formularies
  getFormularies(): HospitalFormularyItem[] {
    return safeGet<HospitalFormularyItem>(FORMULARIES_KEY, initialFormularies);
  },
  saveFormulary(item: HospitalFormularyItem): HospitalFormularyItem[] {
    return safeSave<HospitalFormularyItem>(FORMULARIES_KEY, item, initialFormularies);
  },
};
