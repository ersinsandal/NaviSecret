import React, { useState } from 'react';
import { useSdk } from '@/contexts/SdkContext';
import { NaviIcon } from '@/components/common/NaviIcons';
import { encryptCapsuleMessage } from '@/utils/capsuleCrypto';
import { useI18n } from '@/i18n';

interface CapsuleDropPanelProps {
  currentLocation: { lat: number; lon: number; accuracy: number } | null;
  onSuccess: () => void;
}

type LockType = 'proximity_only' | 'proximity_and_passcode';

export default function CapsuleDropPanel({ currentLocation, onSuccess }: CapsuleDropPanelProps) {
  const sdk = useSdk();
  const { t } = useI18n();
  const [lockType, setLockType] = useState<LockType>('proximity_only');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeHint, setPasscodeHint] = useState('');
  const [unlockRadius, setUnlockRadius] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentLocation) {
      setError(t('capsule.gpsRequiredError'));
      return;
    }

    if (!title.trim()) {
      setError(t('capsule.titleRequiredError'));
      return;
    }

    if (!message.trim()) {
      setError(t('capsule.contentRequiredError'));
      return;
    }

    if (lockType === 'proximity_and_passcode' && !passcode.trim()) {
      setError(t('capsule.passcodeRequiredError'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Client-Side AES-256-GCM Encryption with mode-aware derivation
      const secretKey = lockType === 'proximity_and_passcode' ? passcode.trim() : null;
      const encrypted = await encryptCapsuleMessage(message.trim(), secretKey);

      // 2. Deploy to NaviSecret Core
      await (sdk as any).createCapsule({
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        title: title.trim(),
        encryptedPayload: encrypted.encryptedPayload,
        saltEntropy: encrypted.saltEntropy,
        unlockRadiusM: unlockRadius,
        requiresPasscode: lockType === 'proximity_and_passcode',
        passcodeHint: lockType === 'proximity_and_passcode' ? (passcodeHint.trim() || null) : null,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to deploy capsule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className={`w-16 h-16 rounded-3xl border-2 flex items-center justify-center shadow-lg animate-bounce ${
          lockType === 'proximity_and_passcode'
            ? 'bg-amber-50 border-[#D97706] text-[#D97706]'
            : 'bg-teal-50 border-[#00B894] text-[#00B894]'
        }`}>
          {lockType === 'proximity_and_passcode' ? (
            <NaviIcon.Capsule size={32} />
          ) : (
            <span className="text-2xl">📍</span>
          )}
        </div>
        <h3 className="text-lg font-bold text-[#0F172A]">
          {lockType === 'proximity_and_passcode' ? t('capsule.vaultAnchoredSuccess') : t('capsule.messageDroppedSuccess')}
        </h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          {lockType === 'proximity_and_passcode'
            ? t('capsule.vaultSuccessDesc', { radius: unlockRadius })
            : t('capsule.messageSuccessDesc', { radius: unlockRadius })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs font-sans">
      {/* Location Badge */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-300 flex items-center justify-center text-[#00B894] shrink-0">
            <NaviIcon.Pin size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              {t('capsule.targetCoordinates')}
            </div>
            {currentLocation ? (
              <div className="text-[11px] font-mono text-slate-800 truncate">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lon.toFixed(5)}{' '}
                <span className="text-slate-400 font-sans text-[10px]">(±{Math.round(currentLocation.accuracy)}m)</span>
              </div>
            ) : (
              <div className="text-[11px] text-rose-500 font-semibold">
                {t('capsule.acquiringGps')}
              </div>
            )}
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold shrink-0">
          AES-256
        </span>
      </div>

      {/* ── Dual Lock Mode Selector ── */}
      <div>
        <label className="text-[11px] font-bold text-slate-800 mb-1.5 block">
          {t('capsule.selectLockType')}
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Option 1: Proximity Only (Anyone in range) */}
          <button
            type="button"
            onClick={() => setLockType('proximity_only')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
              lockType === 'proximity_only'
                ? 'border-[#00B894] bg-teal-50/80 text-slate-900 shadow-sm ring-1.5 ring-[#00B894]'
                : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">📍</span>
              {lockType === 'proximity_only' && (
                <span className="w-2 h-2 rounded-full bg-[#00B894]" />
              )}
            </div>
            <div className="font-bold text-xs text-[#0F172A] mt-0.5">
              {t('capsule.proximityOpenTitle')}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              {t('capsule.proximityOpenDesc')}
            </div>
          </button>

          {/* Option 2: Proximity + Passcode (Geofence + Secret Passcode) */}
          <button
            type="button"
            onClick={() => setLockType('proximity_and_passcode')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
              lockType === 'proximity_and_passcode'
                ? 'border-[#D97706] bg-amber-50/80 text-slate-900 shadow-sm ring-1.5 ring-[#D97706]'
                : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🔒</span>
              {lockType === 'proximity_and_passcode' && (
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              )}
            </div>
            <div className="font-bold text-xs text-[#0F172A] mt-0.5">
              {t('capsule.secretPasscodeTitle')}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              {t('capsule.secretPasscodeDesc')}
            </div>
          </button>
        </div>
      </div>

      {/* Capsule Title */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 mb-1 block">
          {t('capsule.capsuleTitleLabel')}
        </label>
        <input
          type="text"
          placeholder={
            lockType === 'proximity_and_passcode'
              ? t('capsule.capsuleTitlePlaceholderPasscode')
              : t('capsule.capsuleTitlePlaceholderOpen')
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10 transition-all outline-none font-sans text-xs"
        />
      </div>

      {/* Secret Message to Encrypt */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-700">
            {lockType === 'proximity_and_passcode'
              ? t('capsule.secretContentLabel')
              : t('capsule.messageContentLabel')}
          </label>
          <span className="text-[10px] text-slate-400 font-mono">AES-GCM</span>
        </div>
        <textarea
          rows={3}
          placeholder={
            lockType === 'proximity_and_passcode'
              ? t('capsule.secretContentPlaceholder')
              : t('capsule.messageContentPlaceholder')
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10 transition-all outline-none font-sans text-xs resize-none"
        />
      </div>

      {/* Option 2 Additional Fields: Passcode and Hint */}
      {lockType === 'proximity_and_passcode' && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-in fade-in zoom-in-98 duration-150">
          <div className="flex items-center gap-2 text-[#D97706] font-bold text-xs pb-1 border-b border-amber-200/60">
            <NaviIcon.Capsule size={16} />
            <span>{t('capsule.passcodeSectionTitle')}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-amber-950 mb-1 block">
              {t('capsule.passcodeLabel')}
            </label>
            <input
              type="text"
              placeholder={t('capsule.passcodePlaceholder')}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-slate-900 placeholder-slate-400 focus:border-[#D97706] focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-mono text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-amber-950 mb-1 block">
              {t('capsule.hintLabel')}
            </label>
            <input
              type="text"
              placeholder={t('capsule.hintPlaceholder')}
              value={passcodeHint}
              onChange={(e) => setPasscodeHint(e.target.value)}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300/80 text-slate-900 placeholder-slate-400 focus:border-[#D97706] focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-sans text-xs"
            />
          </div>
        </div>
      )}

      {/* Unlock Proximity Radius */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 mb-1.5 block">
          {t('capsule.radiusLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { meters: 25, label: '25m', desc: t('capsule.radiusSpot') },
            { meters: 50, label: '50m', desc: t('capsule.radiusStandard') },
            { meters: 100, label: '100m', desc: t('capsule.radiusWide') },
          ].map((r) => (
            <button
              key={r.meters}
              type="button"
              onClick={() => setUnlockRadius(r.meters)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                unlockRadius === r.meters
                  ? 'border-[#0F172A] bg-slate-900 text-white shadow-sm font-bold'
                  : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-bold">{r.label}</div>
              <div className={`text-[9px] font-medium ${unlockRadius === r.meters ? 'text-slate-300' : 'text-slate-500'}`}>
                {r.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isSubmitting || !currentLocation}
        className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 ${
          lockType === 'proximity_and_passcode'
            ? 'bg-[#D97706] hover:bg-[#B45309]'
            : 'bg-[#0F172A] hover:bg-[#1E293B]'
        }`}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t('capsule.encryptingBtn')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {lockType === 'proximity_and_passcode' ? (
              <>
                <NaviIcon.Capsule size={16} color="#FFFFFF" />
                <span>{t('capsule.anchorVaultBtn')}</span>
              </>
            ) : (
              <>
                <NaviIcon.Pin size={16} color="#FFFFFF" />
                <span>{t('capsule.dropMessageBtn')}</span>
              </>
            )}
          </span>
        )}
      </button>
    </form>
  );
}
