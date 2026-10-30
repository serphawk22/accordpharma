'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { TranslationKey } from '@/lib/i18n';

interface BilingualProps {
  textKey: TranslationKey;
  fallback?: string;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'label' | 'th' | 'h1' | 'h2' | 'h3' | 'h4' | 'b' | 'strong';
  htmlFor?: string;
  showTooltip?: boolean;
}

export function Bilingual({
  textKey,
  fallback,
  className = '',
  as: Component = 'span',
  htmlFor,
  showTooltip = true,
}: BilingualProps) {
  const { t, tSec, secondaryOption, hoverTranslationsEnabled, dualSubtitlesEnabled } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const primaryText = t(textKey, fallback);
  const secondaryText = tSec(textKey, fallback);

  // If both languages are identical or hover translation disabled, show just primary
  const hasDistinctTranslation = primaryText !== secondaryText;

  return (
    <Component
      htmlFor={htmlFor}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={Component === 'th' || Component === 'label' ? 0 : undefined}
      className={`relative inline-flex items-center gap-1 group/bilingual outline-none ${className}`}
      title={hasDistinctTranslation ? `${secondaryOption.flag} ${secondaryOption.name}: ${secondaryText}` : undefined}
    >
      <span className="transition-colors group-hover/bilingual:text-sky-600 dark:group-hover/bilingual:text-sky-400">
        {primaryText}
      </span>

      {/* Dual Subtitle Inline Mode */}
      {dualSubtitlesEnabled && hasDistinctTranslation && (
        <span className="text-[10px] font-normal opacity-60 ml-1 italic tracking-normal">
          ({secondaryText})
        </span>
      )}

      {/* Interactive Hover Micro-Tooltip */}
      {showTooltip && hoverTranslationsEnabled && hasDistinctTranslation && isHovered && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-xl border border-slate-700 dark:border-slate-300 pointer-events-none whitespace-nowrap animate-slide-in-right flex items-center gap-1.5 backdrop-blur-md"
        >
          <span className="text-xs">{secondaryOption.flag}</span>
          <span>{secondaryText}</span>
          <span className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2"></span>
        </span>
      )}
    </Component>
  );
}

/** Specialized Bilingual Table Header Cell */
export function BilingualTh({
  textKey,
  fallback,
  className = '',
}: {
  textKey: TranslationKey;
  fallback?: string;
  className?: string;
}) {
  const { t, tSec, secondaryOption, hoverTranslationsEnabled } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const primaryText = t(textKey, fallback);
  const secondaryText = tSec(textKey, fallback);
  const hasDistinct = primaryText !== secondaryText;

  return (
    <th
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      className={`py-3.5 px-4 relative cursor-help outline-none group/th select-none ${className}`}
      title={hasDistinct ? `${secondaryOption.flag} ${secondaryOption.name}: ${secondaryText}` : undefined}
    >
      <div className="flex items-center gap-1">
        <span className="transition-colors group-hover/th:text-sky-600 dark:group-hover/th:text-sky-400">
          {primaryText}
        </span>
        {hasDistinct && (
          <span className="text-[9px] opacity-40 font-mono group-hover/th:opacity-100 group-hover/th:text-sky-500 transition-opacity">
            ⇄
          </span>
        )}
      </div>

      {hoverTranslationsEnabled && hasDistinct && isHovered && (
        <div
          role="tooltip"
          className="absolute left-4 bottom-full mb-1 z-50 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-xl border border-slate-700 dark:border-slate-300 pointer-events-none whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md"
        >
          <span>{secondaryOption.flag}</span>
          <span>{secondaryText}</span>
        </div>
      )}
    </th>
  );
}

/** Specialized Bilingual Form Label */
export function BilingualLabel({
  textKey,
  fallback,
  htmlFor,
  required,
  className = '',
}: {
  textKey: TranslationKey;
  fallback?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  const { t, tSec, secondaryOption, hoverTranslationsEnabled } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const primaryText = t(textKey, fallback);
  const secondaryText = tSec(textKey, fallback);
  const hasDistinct = primaryText !== secondaryText;

  return (
    <label
      htmlFor={htmlFor}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      className={`text-xs font-bold text-slate-700 dark:text-slate-300 relative inline-flex items-center gap-1 cursor-help select-none outline-none ${className}`}
      title={hasDistinct ? `${secondaryOption.flag} ${secondaryOption.name}: ${secondaryText}` : undefined}
    >
      <span>{primaryText}</span>
      {required && <span className="text-rose-500">*</span>}
      {hasDistinct && (
        <span className="text-[9px] text-slate-400 opacity-60 font-normal ml-0.5 group-hover:opacity-100">
          ({secondaryOption.code.toUpperCase()})
        </span>
      )}

      {hoverTranslationsEnabled && hasDistinct && isHovered && (
        <span
          role="tooltip"
          className="absolute left-0 bottom-full mb-1 z-50 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-xl border border-slate-700 dark:border-slate-300 pointer-events-none whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md"
        >
          <span>{secondaryOption.flag}</span>
          <span>{secondaryText}</span>
        </span>
      )}
    </label>
  );
}
