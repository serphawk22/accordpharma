'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { SpeakerBureauEvent } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Mic2,
  Calendar,
  Building2,
  Users,
  Award,
  CheckCircle2,
  Clock,
  Plus,
  DollarSign,
  ShieldCheck,
  MapPin,
  Utensils,
  Search,
} from 'lucide-react';

export default function SpeakerBureauPage() {
  const [events, setEvents] = useState<SpeakerBureauEvent[]>(() => db.getSpeakerEvents());
  const [showEventModal, setShowEventModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    event_title: '',
    event_type: 'Dinner Symposium' as SpeakerBureauEvent['event_type'],
    speaker_hcp_name: 'Dr. Christopher Palmer, MD',
    therapeutic_area: 'Precision Oncology',
    venue_name: 'Ruth&apos;s Chris Steak House - Houston',
    event_date: '2026-11-20',
    target_attendance: 20,
    honorarium_fee: 2500,
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_title.trim()) return;

    db.addSpeakerEvent({
      event_title: formData.event_title.trim(),
      event_type: formData.event_type,
      speaker_hcp_name: formData.speaker_hcp_name,
      therapeutic_area: formData.therapeutic_area,
      venue_name: formData.venue_name,
      event_date: formData.event_date,
      target_attendance: Number(formData.target_attendance),
      confirmed_rsvps: 0,
      honorarium_fee: Number(formData.honorarium_fee),
      compliance_approval: 'APPROVED',
      event_status: 'UPCOMING',
    });

    setEvents([...db.getSpeakerEvents()]);
    setShowEventModal(false);
  };

  const totalAttendees = events.reduce((acc, e) => acc + e.confirmed_rsvps, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Mic2 className="w-3.5 h-3.5" /> Medical Education &amp; Peer Influence Programs
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Speaker Bureau &amp; Medical Symposia
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordinate Key Opinion Leader peer-to-peer dinner programs, hospital grand rounds, and Sunshine Act compliant honorarium tracking.
          </p>
        </div>
        <button
          onClick={() => setShowEventModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 text-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Book Medical Symposium Event</span>
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Upcoming Programs</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{events.length}</div>
          <span className="text-[11px] text-slate-400">Q4 Regional calendar</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Confirmed Physician RSVPs</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalAttendees}</div>
          <span className="text-[11px] text-indigo-600 font-semibold">Attending prescribers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Compliance Rate</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">100%</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Legal &amp; Fair Market Value vetted</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Avg. Program Reach</span>
          <div className="text-2xl font-black text-amber-500 mt-1">24 Doctors</div>
          <span className="text-[11px] text-slate-400">Per symposium event</span>
        </div>
      </div>

      {/* EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((evt) => {
          const rsvpPercent = Math.min(100, Math.round((evt.confirmed_rsvps / evt.target_attendance) * 100));

          return (
            <div
              key={evt.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-indigo-400/60 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {evt.event_type}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 leading-snug">
                    {evt.event_title}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                    {evt.therapeutic_area}
                  </p>
                </div>

                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
                  <ShieldCheck className="w-4 h-4" /> Legal Approved
                </span>
              </div>

              {/* SPEAKER & VENUE */}
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 dark:border-slate-800 py-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Featured KOL Speaker:</span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {evt.speaker_hcp_name}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Honorarium: ${evt.honorarium_fee.toLocaleString()} (FMV)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Date &amp; Venue:</span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {evt.event_date}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block">{evt.venue_name}</span>
                </div>
              </div>

              {/* RSVP PROGRESS */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Attendee RSVPs</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {evt.confirmed_rsvps} Confirmed / {evt.target_attendance} Capacity
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${rsvpPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => alert(`RSVP dispatch sent for "${evt.event_title}"`)}
                  className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 rounded-xl hover:bg-indigo-100"
                >
                  Manage Attendee List
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Book Medical Symposium Program</h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Symposium Title</label>
                <input
                  type="text"
                  required
                  value={formData.event_title}
                  onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                  placeholder="e.g. Clinical Management of Refractory Exon-20 NSCLC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Format</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="Dinner Symposium">Dinner Symposium</option>
                    <option value="Grand Rounds Lecture">Grand Rounds Lecture</option>
                    <option value="Advisory Panel">Advisory Panel</option>
                    <option value="Virtual Webinar">Virtual Webinar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Speaker (KOL)</label>
                  <input
                    type="text"
                    required
                    value={formData.speaker_hcp_name}
                    onChange={(e) => setFormData({ ...formData, speaker_hcp_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Venue Location</label>
                  <input
                    type="text"
                    required
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Attendees</label>
                  <input
                    type="number"
                    required
                    value={formData.target_attendance}
                    onChange={(e) => setFormData({ ...formData, target_attendance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Honorarium ($ FMV)</label>
                  <input
                    type="number"
                    required
                    value={formData.honorarium_fee}
                    onChange={(e) => setFormData({ ...formData, honorarium_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
                >
                  Submit for Compliance Vetting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
