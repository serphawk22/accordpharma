'use client';

import { useState, useEffect } from 'react';
import { CRMTask } from '@/lib/types';
import { ListTodo, CheckCircle2, Calendar, Clock, AlertCircle, Building2, Check } from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';

export default function TasksPage() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.items || []);
    } catch {
      console.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <ListTodo className="w-3.5 h-3.5" /> Rep Productivity & Execution
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Daily Work Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prioritized doctor follow-ups, trial reprint submissions, sample deliveries, and compliance checkpoints.
          </p>
        </div>
      </div>

      {/* TASKS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading work queue...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            All tasks completed! Great work.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                task.status === 'completed'
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span
                    className={`px-2 py-0.5 rounded uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                        : task.priority === 'high'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {task.priority} Priority
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due: {task.due_at.slice(0, 10)}
                  </span>
                </div>
                <h3
                  className={`text-sm font-bold ${
                    task.status === 'completed'
                      ? 'line-through text-slate-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {task.account_name} · Rep: {task.assigned_to}
                </div>
              </div>

              {task.status !== 'completed' ? (
                <button
                  onClick={() => handleComplete(task.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <Check className="w-4 h-4" /> <Bilingual textKey="btnMarkComplete" />
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 self-start sm:self-center">
                  <CheckCircle2 className="w-4 h-4" /> <Bilingual textKey="btnDone" />
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
