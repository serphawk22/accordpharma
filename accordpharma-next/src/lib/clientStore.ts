'use client';

import {
  Account,
  CRMTask,
  CommercialOrder,
  HealthcareProfessional,
  Lead,
  HospitalFormularyItem,
} from './types';
import {
  initialAccounts,
  initialTasks,
  initialOrders,
  initialHCPs,
  initialLeads,
  initialFormularies,
} from './store';

const ACCOUNTS_KEY = 'accord_persisted_accounts';
const TASKS_KEY = 'accord_persisted_tasks';
const ORDERS_KEY = 'accord_persisted_orders';
const HCPS_KEY = 'accord_persisted_hcps';
const LEADS_KEY = 'accord_persisted_leads';
const FORMULARIES_KEY = 'accord_persisted_formularies';

function safeGet<T>(key: string, defaults: T[]): T[] {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const custom = JSON.parse(raw);
    if (!Array.isArray(custom)) return defaults;
    // Prepend custom items before default items to prioritize recently added
    const customIds = new Set(custom.map((c: any) => c.id));
    const dedupedDefaults = defaults.filter((d: any) => !customIds.has(d.id));
    return [...custom, ...dedupedDefaults];
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

  // Formularies
  getFormularies(): HospitalFormularyItem[] {
    return safeGet<HospitalFormularyItem>(FORMULARIES_KEY, initialFormularies);
  },
  saveFormulary(item: HospitalFormularyItem): HospitalFormularyItem[] {
    return safeSave<HospitalFormularyItem>(FORMULARIES_KEY, item, initialFormularies);
  },
};
