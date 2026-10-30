'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { NotificationItem } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Clock,
  Trash2,
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => db.getNotifications());

  const handleMarkRead = (id: string) => {
    db.markNotificationRead(id);
    setNotifications([...db.getNotifications()]);
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => db.markNotificationRead(n.id));
    setNotifications([...db.getNotifications()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Bell className="w-3.5 h-3.5" /> Workspace Dispatch
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Notifications &amp; Clinical Alerts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time formulary status updates, adverse event disclosures, and task reminders.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Mark All as Read
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`p-4 flex items-start justify-between gap-4 transition-colors ${
              !item.read ? 'bg-sky-50/50 dark:bg-sky-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  item.type === 'warning'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : item.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400'
                }`}
              >
                {item.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : item.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</span>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.message || item.body}</p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {!item.read && (
              <button
                onClick={() => handleMarkRead(item.id)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-lg shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
