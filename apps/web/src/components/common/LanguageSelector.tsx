import React, { useState, useRef, useEffect } from 'react';
import { useI18n, SUPPORTED_LANGUAGES } from '@/i18n';
import type { LanguageCode } from '@/i18n';

interface LanguageSelectorProps {
  className?: string;
  align?: 'left' | 'right';
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  align = 'right',
  compact = false,
}) => {
  const { language, setLanguage, currentLanguageInfo } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 h-10 px-3 rounded-2xl cyber-glass-heavy border transition-all duration-200 cursor-pointer shadow-sm select-none ${
          isOpen
            ? 'border-[#00B894] ring-2 ring-[#00B894]/20 bg-teal-50/50 text-[#0F172A]'
            : 'border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white'
        }`}
      >
        <span className="text-base leading-none select-none">{currentLanguageInfo.flag}</span>
        {!compact && (
          <span className="text-xs font-bold tracking-wider text-slate-800 uppercase">
            {currentLanguageInfo.code}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00B894]' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          className={`absolute mt-2 w-48 rounded-2xl cyber-glass-heavy border border-slate-200/90 shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2.5 py-1 text-[9px] font-bold tracking-widest text-slate-400 uppercase select-none border-b border-slate-100 mb-1">
            Choose Language
          </div>

          <div className="flex flex-col gap-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  role="menuitem"
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer group select-none ${
                    isSelected
                      ? 'bg-teal-50 text-[#0F172A] font-bold'
                      : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs leading-tight font-medium truncate">
                        {lang.nativeName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans leading-tight">
                        {lang.name}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#00B894] text-white flex items-center justify-center text-[10px] shadow-xs">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
