'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { Bilingual } from '@/components/Bilingual';
import { Mail, Search, Send, Clock, User, CheckCircle2 } from 'lucide-react';

export default function InboxPage() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'Dr. Sarah Chen, MD',
      role: 'Chief of Interventional Cardiology, St. Jude',
      subject: 'Clarification regarding CardioVas-XR titration schedule in stage 3 CKD',
      preview:
        'Thank you for detailing the Phase III ACCORD trial results on Thursday. Could your Medical Science Liaison provide the sub-analysis packet for eGFR 30-45 mL/min?',
      time: '10:45 AM',
      unread: true,
    },
    {
      id: 'msg-2',
      sender: 'Cedars-Sinai P&T Secretariat',
      role: 'Pharmacy & Therapeutics Committee',
      subject: 'Formal Dossier Received - Zenocamtinib (OncoTarget-700)',
      preview:
        'This confirms receipt of your institutional dossier submission. Your docket number is PT-2026-1049. Review will be conducted during the November cycle.',
      time: 'Yesterday',
      unread: false,
    },
    {
      id: 'msg-3',
      sender: 'Dr. Aris Thorne, MD',
      role: 'Thoracic Oncology Director, Cedars-Sinai',
      subject: 'Patient enrollment inquiry for ACCORD-Extended access',
      preview:
        'We have an EGFR Exon 20 insertion patient progressing on standard platinum doublet chemotherapy. What is the turnaround for compassionate access titration?',
      time: 'Oct 26',
      unread: false,
    },
  ]);

  const [selectedMessage, setSelectedMessage] = useState(messages[0]);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    alert(`Reply transmitted securely via GxP-compliant physician channel to ${selectedMessage.sender}`);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Mail className="w-3.5 h-3.5" /> Clinical Inquiries &amp; Correspondence
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Prescriber Inbox
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Secure two-way communication channel between field medical teams, hospital pharmacy committees, and Key Opinion Leaders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[500px]">
        {/* Message List */}
        <div className="border-r border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSelectedMessage(m);
                m.unread = false;
              }}
              className={`p-4 cursor-pointer transition-colors ${
                selectedMessage.id === m.id
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-l-4 border-sky-600'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs ${m.unread ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                  {m.sender}
                </span>
                <span className="text-[10px] text-slate-400">{m.time}</span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">{m.subject}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{m.preview}</p>
            </div>
          ))}
        </div>

        {/* Message Detail */}
        <div className="md:col-span-2 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="text-[10px] font-bold uppercase text-sky-600">{selectedMessage.role}</span>
              <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">{selectedMessage.subject}</h2>
              <div className="text-xs text-slate-500 mt-1">From: <strong className="text-slate-800 dark:text-slate-200">{selectedMessage.sender}</strong></div>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {selectedMessage.preview}
            </p>
          </div>

          <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Draft Medical Response
            </label>
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Provide medical guidance or attach scientific clinical dossier..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
              >
                <Send className="w-3.5 h-3.5" /> Transmit Reply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
