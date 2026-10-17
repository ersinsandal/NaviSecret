import React, { useState, useEffect } from 'react';
import { NaviIcon } from '@/components/common/NaviIcons';
import { useI18n } from '@/i18n';

interface DynamicIslandProps {
  isCasper: boolean;
  casperUntil: string | null;
  gpsAccuracy: number | null;
  rttMs?: number;
  onOpenCasper: () => void;
  onOpenPulse: () => void;
  pulseAlert?: { name: string; distance: number } | null;
  onDismissPulseAlert?: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isCasper,
  casperUntil,
  gpsAccuracy,
  rttMs = 28,
  onOpenCasper,
  onOpenPulse,
  pulseAlert,
  onDismissPulseAlert,
}) => {
  const { t } = useI18n();
  const [remainingTime, setRemainingTime] = useState<string>('');

  // Countdown timer for Casper Mode
  useEffect(() => {
    if (!isCasper || !casperUntil) {
      setRemainingTime('');
      return;
    }

    const updateTimer = () => {
      const diff = new Date(casperUntil).getTime() - Date.now();
      if (diff <= 0) {
        setRemainingTime('Expiring');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCasper, casperUntil]);

  // GPS Accuracy badge color
  const getGpsStatus = () => {
    if (gpsAccuracy === null) return { color: '#64748B', label: t('map.gpsAcquiring') };
    if (gpsAccuracy <= 6) return { color: '#00B894', label: `±${Math.round(gpsAccuracy)}m` };
    if (gpsAccuracy <= 15) return { color: '#D97706', label: `±${Math.round(gpsAccuracy)}m` };
    return { color: '#E11D48', label: `±${Math.round(gpsAccuracy)}m` };
  };

  const gps = getGpsStatus();

  return (
    <div className="relative flex flex-col items-center pointer-events-auto">
      {/* Main Morphing Island Capsule */}
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full cyber-glass-heavy border border-slate-200/80 shadow-md transition-all duration-300 hover:border-slate-300">
        {/* Casper Cloak Indicator */}
        <button
          onClick={onOpenCasper}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
            isCasper
              ? 'bg-indigo-100 text-[#6366F1] border border-indigo-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={isCasper ? t('profile.ghostModeActive') : t('profile.ghostMode')}
        >
          <NaviIcon.Casper
            size={14}
            color={isCasper ? '#6366F1' : '#64748B'}
            className={isCasper ? 'animate-pulse' : ''}
          />
          <span>{isCasper ? remainingTime || t('nav.ghostMode') : t('nav.ghostMode')}</span>
        </button>

        {/* Separator */}
        <div className="h-3 w-[1px] bg-slate-200" />

        {/* GPS Satellite Telemetry */}
        <div className="flex items-center gap-1.5 text-xs font-sans text-slate-700" title={`GPS Accuracy: ${gps.label}`}>
          <div className="relative flex items-center justify-center">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: gps.color }}
            />
            {gpsAccuracy !== null && gpsAccuracy <= 10 && (
              <span
                className="absolute w-3.5 h-3.5 rounded-full animate-ping opacity-60"
                style={{ backgroundColor: gps.color }}
              />
            )}
          </div>
          <span>{gps.label}</span>
        </div>

        {/* Separator */}
        <div className="h-3 w-[1px] bg-slate-200" />

        {/* WebSocket Latency (RTT) */}
        <div className="flex items-center gap-1 text-[11px] font-sans text-slate-500" title={`Server Latency: ${rttMs}ms`}>
          <span className="text-[10px] text-emerald-500">●</span>
          <span>{rttMs}ms</span>
        </div>
      </div>

      {/* Dynamic Pulse Encounter Dropdown Banner */}
      {pulseAlert && (
        <div className="absolute top-11 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl cyber-glass-heavy border border-teal-200 shadow-xl animate-bounce text-xs">
          <NaviIcon.Pulse size={16} color="#00B894" className="animate-pulse" />
          <div className="flex flex-col">
            <span className="font-bold text-[#0F172A]">⚡ Nearby Encounter!</span>
            <span className="text-slate-600">
              <strong className="text-[#00B894]">{pulseAlert.name}</strong> is nearby ({pulseAlert.distance}m)
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={onOpenPulse}
              className="px-2.5 py-1 rounded-xl bg-[#00B894] text-white font-bold text-[11px] hover:bg-[#009874] transition-colors shadow-sm cursor-pointer"
            >
              Wave Back
            </button>
            {onDismissPulseAlert && (
              <button
                onClick={onDismissPulseAlert}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicIsland;
