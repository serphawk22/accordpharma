'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { CheckSquare, Calendar, User, Clock, Building, Plus } from 'lucide-react';

export default function TaskSheetPage() {
  const [tasks, setTasks] = useState(() => db.getTasks());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <CheckSquare className="w-3.5 h-3.5" /> Field Execution Log
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Representative Task Sheet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daily itinerary, sample drop deliverables, and critical hospital compliance action items.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Task Description</th>
              <th className="p-3.5">Target Account</th>
              <th className="p-3.5">Assigned Rep</th>
              <th className="p-3.5">Due Date</th>
              <th className="p-3.5">Priority</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{task.title}</td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300">{task.account_name}</td>
                <td className="p-3.5">{task.assigned_to}</td>
                <td className="p-3.5 text-slate-500">{task.due_at.slice(0, 10)}</td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className="font-bold capitalize text-slate-600 dark:text-slate-300">{task.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
