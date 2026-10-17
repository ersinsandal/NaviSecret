import { useState, useEffect } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import type { NearbyUser, BumpEvent } from '@navisecret/sdk'
import { formatRelativeTime, formatDistance } from '@/utils/format'
import { NaviIcon } from '@/components/common/NaviIcons'
import { useI18n } from '@/i18n'

interface BumpPanelProps {
  currentLocation: { lat: number; lon: number } | null
}

export default function BumpPanel({ currentLocation }: BumpPanelProps) {
  const sdk = useSdk()
  const { t } = useI18n()
  const [radius, setRadius] = useState(500)
  const [nearby, setNearby] = useState<(NearbyUser & { name?: string })[]>([])
  const [history, setHistory] = useState<(BumpEvent & { name?: string })[]>([])
  const [searching, setSearching] = useState(false)
  const [bumping, setBumping] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    sdk.getBumpHistory({ limit: 20 }).then(async (events: BumpEvent[]) => {
      const enriched = await Promise.all(
        events.map(async (e) => {
          let name: string | undefined
          try {
            const p = await sdk.getProfile(e.nearby_user_id)
            name = p?.display_name || undefined
          } catch {}
          return { ...e, name }
        }),
      )
      if (!cancelled) setHistory(enriched)
    }).catch((e: any) => {
      if (!cancelled) setError(e.message)
    }).finally(() => {
      if (!cancelled) setLoadingHistory(false)
    })
    return () => { cancelled = true }
  }, [sdk])

  const search = async () => {
    if (!currentLocation) return
    setSearching(true)
    setError('')
    try {
      const result: NearbyUser[] = await sdk.findNearbyFriends(currentLocation.lat, currentLocation.lon, radius)
      const enriched = await Promise.all(
        result.map(async (u) => {
          let name: string | undefined
          try {
            const p = await sdk.getProfile(u.user_id)
            name = p?.display_name || undefined
          } catch {}
          return { ...u, name }
        }),
      )
      setNearby(enriched)
    } catch (e: any) {
      setError(e.message ?? 'Proximity scan failed')
    } finally {
      setSearching(false)
    }
  }

  const bump = async (user: NearbyUser & { name?: string }) => {
    if (!currentLocation) return
    setBumping(user.user_id)
    setError('')
    try {
      const event = await sdk.recordBump(user.user_id, user.distance_meters, currentLocation.lat, currentLocation.lon)
      setHistory((prev) => [{ ...event, name: user.name }, ...prev])
    } catch (e: any) {
      setError(e.message ?? 'Pulse transmission failed')
    } finally {
      setBumping(null)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {!currentLocation && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
          <NaviIcon.Radar size={16} className="text-amber-500 shrink-0 animate-pulse" />
          <span>{t('pulse.locationRequired')}</span>
        </div>
      )}

      {/* Radar Scan Controls */}
      <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <NaviIcon.Radar size={14} className="text-[#00B894]" />
            <span>{t('pulse.detectionRange')}</span>
          </label>
          <span className="text-xs font-bold text-[#00B894] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            {formatDistance(radius)}
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-[#00B894] bg-slate-200 h-2 rounded-lg cursor-pointer"
        />

        <button
          onClick={search}
          disabled={!currentLocation || searching}
          className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 bg-[#00B894] text-white hover:bg-[#00a382] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 cursor-pointer"
        >
          <NaviIcon.Pulse size={16} className={searching ? 'animate-spin' : ''} />
          <span>{searching ? t('pulse.scanning') : t('pulse.scanRadar')}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Discovered Friends */}
      {nearby.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B894] animate-ping" />
            <span>{t('pulse.friendsInRange')} ({nearby.length})</span>
          </h3>
          <ul className="space-y-2">
            {nearby.map((u) => (
              <li
                key={u.user_id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/90 border border-slate-200 hover:border-[#00B894] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#00B894] shrink-0">
                    {(u.name || u.user_id)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {u.name || u.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs font-medium text-[#00B894]">
                      {formatDistance(u.distance_meters)} {t('pulse.away')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => bump(u)}
                  disabled={bumping === u.user_id}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 bg-[#6366F1] text-white hover:bg-[#4f46e5] active:scale-95 disabled:opacity-40 shadow-xs cursor-pointer"
                >
                  <NaviIcon.Pulse size={13} />
                  <span>{bumping === u.user_id ? t('pulse.pinging') : t('pulse.sendPulse')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nearby.length === 0 && !searching && !error && currentLocation && (
        <div className="p-6 text-center rounded-2xl bg-white/60 border border-slate-200 space-y-1">
          <p className="text-xs font-medium text-slate-600">{t('pulse.noBumpsFound')}</p>
          <p className="text-[11px] text-slate-400">{t('pulse.rangeHint')}</p>
        </div>
      )}

      {/* Pulse History Log */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Pulse size={14} className="text-[#6366F1]" />
          <span>{t('pulse.recentPulses')}</span>
        </h3>
        {loadingHistory && (
          <p className="text-xs text-slate-400 text-center py-4">{t('common.loading')}</p>
        )}
        {!loadingHistory && history.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">{t('pulse.noRecentPulses')}</p>
        )}
        <ul className="space-y-1.5">
          {history.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-slate-100 text-xs hover:border-slate-200 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#6366F1] shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {b.name || b.nearby_user_id.slice(0, 8)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatDistance(b.distance_meters)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {formatRelativeTime(b.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
