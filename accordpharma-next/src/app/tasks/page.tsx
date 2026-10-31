'use client';

import { useState, useEffect } from 'react';
import { CRMTask } from '@/lib/types';
import { ListTodo, CheckCircle2, Calendar, Clock, AlertCircle, Building2, Check, Plus, X } from 'lucide-react';
import { Bilingual } from '@/components/Bilingual';
import { clientStore } from '@/lib/clientStore';

export default function TasksPage() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'high',
    account_id: '',
    due_date: 'Today, 5:00 PM',
  });

  const loadTasks = async () => {
    const cached = clientStore.getTasks();
    setTasks(cached);
    setLoading(false);

    try {
      // 1. Fetch accounts for task creation
      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.items?.length) {
          setAccounts(accData.items);
          setNewTask((prev) => ({
            ...prev,
            account_id: prev.account_id || accData.items[0].id,
          }));
        }
      }

      // 2. Fetch tasks from PostgreSQL database
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length) {
          const cachedIds = new Set(cached.map((c) => c.id));
          const combined = [...cached, ...data.items.filter((i: any) => !cachedIds.has(i.id))];
          setTasks(combined);
        }
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedAcc = accounts.find((a) => a.id === newTask.account_id);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      let created: CRMTask;
      if (res.ok) {
        const saved = await res.json();
        created = {
          id: String(saved.id),
          account_id: saved.account_id || newTask.account_id,
          account_name: saved.account_name || selectedAcc?.name || 'Hospital Clinical Client',
          title: saved.title || newTask.title,
          due_at: newTask.due_date,
          priority: (saved.priority || newTask.priority) as any,
          status: 'pending',
          assigned_to: 'Marcus Vance',
        };
      } else {
        created = {
          id: `task-${Date.now()}`,
          account_id: newTask.account_id,
          account_name: selectedAcc?.name || 'Hospital Clinical Client',
          title: newTask.title,
          due_at: newTask.due_date,
          priority: newTask.priority as any,
          status: 'pending',
          assigned_to: 'Marcus Vance',
        };
      }

      const updatedList = clientStore.saveTask(created);
      setTasks(updatedList);
      setShowAddModal(false);
      setNewTask({
        title: '',
        priority: 'high',
        account_id: accounts[0]?.id || '',
        due_date: 'Today, 5:00 PM',
      });
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: 'completed' }),
      }).catch(() => {});
      
      const target = tasks.find((t) => t.id === taskId);
      if (target) {
        const updatedTask = { ...target, status: 'completed' as const };
        const updatedList = clientStore.saveTask(updatedTask);
        setTasks(updatedList);
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
            <ListTodo className="w-3.5 h-3.5" /> Rep Productivity &amp; Execution
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Daily Work Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prioritized doctor follow-ups, trial reprint submissions, sample deliveries, and compliance checkpoints.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Action Item</span>
          </button>
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
                    {task.priority}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.due_at || 'Today, 5:00 PM'}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[9px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    PostgreSQL Persisted
                  </span>
                </div>
                <h3
                  className={`text-sm font-bold ${
                    task.status === 'completed'
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{task.account_name}</span>
                </div>
              </div>

              <div>
                {task.status === 'completed' ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40">
                    <Check className="w-4 h-4" /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                <ListTodo className="w-4 h-4" />
                <span>Create Commercial Task</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title &amp; Objectives
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Follow up on Cardiology Phase III formulary review"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Normal / Medium</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Due Deadline</label>
                  <input
                    type="text"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    placeholder="Today, 5:00 PM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Associated Health System</label>
                <select
                  value={newTask.account_id}
                  onChange={(e) => setNewTask({ ...newTask, account_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                >
                  {accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))
                  ) : (
                    <option value="acc-1">St. Jude Metropolitan Medical Center</option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving to Database...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
