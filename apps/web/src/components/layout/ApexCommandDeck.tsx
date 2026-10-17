import React from 'react';
import { NaviIcon } from '@/components/common/NaviIcons';
import DynamicIsland from '@/components/layout/DynamicIsland';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useI18n } from '@/i18n';

interface ApexCommandDeckProps {
  isCasper: boolean;
  casperUntil: string | null;
  gpsAccuracy: number | null;
  rttMs?: number;
  activePanel?: string | null;
  onOpenCasper: () => void;
  onOpenPulse: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
  pulseAlert?: { name: string; distance: number } | null;
}

export const ApexCommandDeck: React.FC<ApexCommandDeckProps> = ({
  isCasper,
  casperUntil,
  gpsAccuracy,
  rttMs,
  activePanel,
  onOpenCasper,
  onOpenPulse,
  onOpenProfile,
  onOpenNotifications,
  unreadCount = 0,
  pulseAlert,
}) => {
  const { t } = useI18n();
  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-3 md:px-6 pointer-events-none flex items-center justify-between gap-3">
      {/* --- Left Wing: Brand Logo --- */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl cyber-glass-heavy border border-slate-200/80 shadow-sm">
          <img src="/logo-icon.svg" alt="NaviSecret" className="w-6 h-6 rounded-lg shadow-xs" />
          <div className="flex flex-col">
            <span className="font-black tracking-tight text-sm leading-none text-[#0F172A]">
              Navi<span className="text-[#00B894]">Secret</span>
            </span>
            <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
              Secure Drop
            </span>
          </div>
        </div>
      </div>

      {/* --- Center: Dynamic Telemetry Island --- */}
      <DynamicIsland
        isCasper={isCasper}
        casperUntil={casperUntil}
        gpsAccuracy={gpsAccuracy}
        rttMs={rttMs}
        onOpenCasper={onOpenCasper}
        onOpenPulse={onOpenPulse}
        pulseAlert={pulseAlert}
      />

      {/* --- Right Wing: Essential Action Controls --- */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Language Selector */}
        <LanguageSelector />

        {/* Notification Bell */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotifications();
          }}
          className={`relative flex items-center justify-center w-10 h-10 rounded-2xl cyber-glass-heavy border transition-all shadow-sm cursor-pointer ${
            activePanel === 'reactions'
              ? 'border-[#00B894] bg-teal-50 text-[#00B894] ring-2 ring-[#00B894]/20'
              : 'border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
          title={t('settings.notifReactions')}
        >
          <NaviIcon.Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00B894] text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile();
          }}
          className={`flex items-center justify-center w-10 h-10 rounded-2xl cyber-glass-heavy border transition-all shadow-sm cursor-pointer ${
            activePanel === 'profile'
              ? 'border-[#00B894] bg-teal-50 text-[#00B894] ring-2 ring-[#00B894]/20'
              : isCasper
              ? 'border-indigo-300 bg-indigo-50 text-[#6366F1]'
              : 'border-slate-200/80 text-slate-700 hover:text-slate-900 hover:border-slate-300'
          }`}
          title={t('profile.profileTitle')}
        >
          <NaviIcon.Profile size={18} />
        </button>
      </div>
    </header>
  );
};

export default ApexCommandDeck;
