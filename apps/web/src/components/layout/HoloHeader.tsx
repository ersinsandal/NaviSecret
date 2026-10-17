import React from 'react';
import { NaviIcon } from '@/components/common/NaviIcons';

interface HoloHeaderProps {
  title: string;
  category?: string;
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  rightAction?: React.ReactNode;
}

export const HoloHeader: React.FC<HoloHeaderProps> = ({
  title,
  category = 'SYSTEM',
  onClose,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Filter records...',
  rightAction,
}) => {
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-3 border-b border-slate-200/80 shrink-0">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center -mt-1 pb-1">
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>

      {/* Top telemetry and title row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          {/* Category Pill */}
          <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-[#00B894] uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />
            <span>{category}</span>
          </div>

          {/* Main Title */}
          <h2 className="text-base font-bold tracking-tight text-[#0F172A] m-0 truncate">
            {title}
          </h2>
        </div>

        {/* Actions & Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rightAction}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all active:scale-95 cursor-pointer"
            title="Close (Esc)"
          >
            <NaviIcon.Close size={15} />
          </button>
        </div>
      </div>

      {/* Optional Search Omnibar */}
      {onSearchChange !== undefined && (
        <div className="relative flex items-center mt-0.5">
          <NaviIcon.Search
            size={14}
            className="absolute left-3 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00B894] focus:ring-1 focus:ring-[#00B894]/20 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HoloHeader;
