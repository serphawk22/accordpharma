'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Globe, ArrowLeftRight, Check, X, Settings2 } from 'lucide-react';

export default function LanguageSelector() {
  const {
    primaryOption,
    secondaryOption,
    setPrimaryLang,
    setSecondaryLang,
    swapLanguages,
    hoverTranslationsEnabled,
    setHoverTranslationsEnabled,
    dualSubtitlesEnabled,
    setDualSubtitlesEnabled,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* TRIGGER BAR */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700/80 text-xs shadow-sm">
        {/* Primary Language Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-extrabold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 transition-colors"
          title={`Active display language: ${primaryOption.name}`}
        >
          <span className="text-sm">{primaryOption.flag}</span>
          <span className="text-[11px] uppercase tracking-wide">{primaryOption.code}</span>
        </button>

        {/* Instant Swap Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            swapLanguages();
          }}
          className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-transform active:rotate-180"
          title={`Swap ${primaryOption.name} and ${secondaryOption.name}`}
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>

        {/* Secondary / Hover Language Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          title={`Hover / Focus translation language: ${secondaryOption.name}`}
        >
          <span className="text-xs opacity-75">Hover:</span>
          <span className="text-sm">{secondaryOption.flag}</span>
          <span className="text-[11px] font-bold uppercase">{secondaryOption.code}</span>
        </button>
      </div>

      {/* DROPDOWN CONFIGURATION MODAL */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-slide-in-right">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Bilingual Language Engine
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-4">
            {/* Primary Language Selection */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>1. Primary Display Language</span>
                <span className="text-sky-600 font-extrabold">{primaryOption.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={`p-${lang.code}`}
                    onClick={() => setPrimaryLang(lang.code)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      primaryOption.code === lang.code
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </span>
                    {primaryOption.code === lang.code && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Language Selection */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>2. Hover / Focus Translation Language</span>
                <span className="text-emerald-600 font-extrabold">{secondaryOption.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={`s-${lang.code}`}
                    onClick={() => setSecondaryLang(lang.code)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      secondaryOption.code === lang.code
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </span>
                    {secondaryOption.code === lang.code && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Features & Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {/* Hover Tooltips Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Hover / Focus Tooltips</span>
                  <span className="text-[10px] text-slate-400">Show translation when cursor hovers on buttons/headers</span>
                </div>
                <input
                  type="checkbox"
                  checked={hoverTranslationsEnabled}
                  onChange={(e) => setHoverTranslationsEnabled(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Dual Subtitles Inline Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Dual-Language Subtitles</span>
                  <span className="text-[10px] text-slate-400">Display secondary translation alongside primary text</span>
                </div>
                <input
                  type="checkbox"
                  checked={dualSubtitlesEnabled}
                  onChange={(e) => setDualSubtitlesEnabled(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
