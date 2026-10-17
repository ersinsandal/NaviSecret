import React, { useState } from 'react';
import { NaviIcon } from '@/components/common/NaviIcons';
import { useI18n } from '@/i18n';

export type DockTabId = 'map' | 'pulse' | 'friends' | 'chat' | 'settings' | 'capsules';

interface QuantumDockProps {
  activeTab: DockTabId | null;
  onSelectTab: (tab: DockTabId | null) => void;
  onDeployCapsule: () => void;
  onTriggerPulsePing: () => void;
  onToggleCasper: () => void;
  onSharePin: () => void;
  unreadChatCount?: number;
  nearbyCapsuleCount?: number;
  pulseActive?: boolean;
}

export const QuantumDock: React.FC<QuantumDockProps> = ({
  activeTab,
  onSelectTab,
  onDeployCapsule,
  onTriggerPulsePing,
  onToggleCasper,
  onSharePin,
  unreadChatCount = 0,
  nearbyCapsuleCount = 0,
  pulseActive = false,
}) => {
  const { t } = useI18n();
  const [nexusOpen, setNexusOpen] = useState(false);

  const handleNexusAction = (action: () => void) => {
    action();
    setNexusOpen(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center">
      {/* --- Radial Nexus Quick-Action Orb Menu --- */}
      {nexusOpen && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-2xl cyber-glass-heavy border border-slate-200/90 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Action 1: Deploy Capsule */}
          <button
            onClick={() => handleNexusAction(onDeployCapsule)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-[#D97706] transition-colors group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 group-hover:scale-110 transition-transform">
              <NaviIcon.Capsule size={18} color="#D97706" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('nav.capsule')}</span>
          </button>

          {/* Action 2: Trigger Pulse Ping */}
          <button
            onClick={() => handleNexusAction(onTriggerPulsePing)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-teal-50 text-slate-700 hover:text-[#00B894] transition-colors group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-teal-100 border border-teal-300 group-hover:scale-110 transition-transform">
              <NaviIcon.Pulse size={18} color="#00B894" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('nav.pulsePing')}</span>
          </button>

          {/* Action 3: Quick Casper Toggle */}
          <button
            onClick={() => handleNexusAction(onToggleCasper)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-[#6366F1] transition-colors group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-indigo-100 border border-indigo-300 group-hover:scale-110 transition-transform">
              <NaviIcon.Casper size={18} color="#6366F1" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('nav.ghostMode')}</span>
          </button>

          {/* Action 4: Saved Places / Pins */}
          <button
            onClick={() => handleNexusAction(onSharePin)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-[#0284C7] transition-colors group cursor-pointer"
            title={t('nav.savedPlaces')}
          >
            <div className="p-2 rounded-lg bg-sky-100 border border-sky-300 group-hover:scale-110 transition-transform">
              <NaviIcon.Pin size={18} color="#0284C7" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('nav.savedPlaces')}</span>
          </button>
        </div>
      )}

      {/* --- Main Quantum Orbit Dock --- */}
      <nav className="flex items-center gap-1 md:gap-2 px-3 py-2 rounded-2xl cyber-glass-heavy border border-slate-200/90 shadow-xl backdrop-blur-2xl">
        {/* Slot 1: Spatial Map */}
        <button
          onClick={() => {
            onSelectTab('map');
            setNexusOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all cursor-pointer ${
            activeTab === 'map' || activeTab === null
              ? 'text-[#00B894] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          title={t('nav.map')}
        >
          <NaviIcon.Map size={19} />
          <span className="text-[9px] font-semibold mt-0.5">{t('nav.map')}</span>
          {(activeTab === 'map' || activeTab === null) && (
            <span className="absolute bottom-1 w-3 h-0.5 rounded-full bg-[#00B894]" />
          )}
        </button>

        {/* Slot 2: Pulse ⚡ Encounter Hub */}
        <button
          onClick={() => {
            onSelectTab('pulse');
            setNexusOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all cursor-pointer ${
            activeTab === 'pulse'
              ? 'text-[#00B894] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          title={t('nav.pulse')}
        >
          <NaviIcon.Pulse size={19} className={pulseActive ? 'animate-pulse' : ''} />
          <span className="text-[9px] font-semibold mt-0.5">{t('nav.pulse')}</span>
          {activeTab === 'pulse' && (
            <span className="absolute bottom-1 w-3 h-0.5 rounded-full bg-[#00B894]" />
          )}
        </button>

        {/* Slot 3: THE NEXUS CORE (Center Action Button) */}
        <div className="px-1">
          <button
            onClick={() => setNexusOpen(!nexusOpen)}
            className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 transform shadow-md cursor-pointer ${
              nexusOpen
                ? 'bg-[#00B894] text-white rotate-45 scale-105 shadow-teal-500/30'
                : 'bg-[#0F172A] hover:bg-[#1E293B] text-white hover:scale-105 shadow-slate-900/20'
            }`}
            title={t('nav.quickActions')}
          >
            <NaviIcon.Nexus
              size={22}
              color="#FFFFFF"
              className="animate-nexus"
            />
          </button>
        </div>

        {/* Slot 4: Social Network (Friends & Encounters) */}
        <button
          onClick={() => {
            onSelectTab('friends');
            setNexusOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all cursor-pointer ${
            activeTab === 'friends'
              ? 'text-[#00B894] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          title={t('nav.friends')}
        >
          <NaviIcon.Friends size={19} />
          <span className="text-[9px] font-semibold mt-0.5">{t('nav.friends')}</span>
          {activeTab === 'friends' && (
            <span className="absolute bottom-1 w-3 h-0.5 rounded-full bg-[#00B894]" />
          )}
        </button>

        {/* Slot 5: Secure Chat (with unread badge) */}
        <button
          onClick={() => {
            onSelectTab('chat');
            setNexusOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center w-12 h-11 rounded-xl transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'text-[#00B894] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          title={t('nav.chat')}
        >
          <NaviIcon.Chat size={19} />
          <span className="text-[9px] font-semibold mt-0.5">{t('nav.chat')}</span>
          {unreadChatCount > 0 && (
            <span className="absolute top-1 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00B894] text-[8px] font-bold text-white shadow-sm">
              {unreadChatCount}
            </span>
          )}
          {activeTab === 'chat' && (
            <span className="absolute bottom-1 w-3 h-0.5 rounded-full bg-[#00B894]" />
          )}
        </button>
      </nav>
    </div>
  );
};

export default QuantumDock;
