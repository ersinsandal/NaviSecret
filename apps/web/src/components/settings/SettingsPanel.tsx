import { useState, useEffect } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import type { UserSettings, NotificationPreferences, Profile } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'
import { useI18n } from '@/i18n'
import LanguageSelector from '@/components/common/LanguageSelector'

export default function SettingsPanel() {
  const core = useSdk()
  const { user, signOut } = useAuth()
  const { t } = useI18n()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, Profile | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [ghostDuration, setGhostDuration] = useState(60)
  const [updateInterval, setUpdateInterval] = useState(30)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core])

  async function loadAll() {
    try {
      setLoading(true)
      setError('')
      const [s, n, b] = await Promise.all([
        core.getSettings(),
        core.getNotificationPreferences(),
        core.getBlockedUsers(),
      ])
      setSettings(s)
      setNotifPrefs(n)
      setBlockedUsers(b)
      if (s) setUpdateInterval(s.location_update_interval)

      const profiles: Record<string, Profile | null> = {}
      for (const uid of b) {
        profiles[uid] = await core.getProfile(uid)
      }
      setBlockedProfiles(profiles)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnableGhost() {
    try {
      setError('')
      await core.enableGhostMode(ghostDuration || undefined)
      const s = await core.getSettings()
      setSettings(s)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDisableGhost() {
    try {
      setError('')
      await core.disableGhostMode()
      const s = await core.getSettings()
      setSettings(s)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleUpdateInterval() {
    try {
      setError('')
      const s = await core.updateSettings({ location_update_interval: updateInterval })
      setSettings(s)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleNotifToggle(
    key: keyof Omit<NotificationPreferences, 'user_id' | 'updated_at'>,
    value: boolean
  ) {
    try {
      setError('')
      const updated = await core.updateNotificationPreferences({ [key]: value })
      setNotifPrefs(updated)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleUnblock(userId: string) {
    try {
      setError('')
      await core.unblockUser(userId)
      setBlockedUsers((prev) => prev.filter((id) => id !== userId))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

      {/* Language Selector in Settings */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50 text-[#00B894]">
              <NaviIcon.WorldUnveil size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t('settings.language')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('common.appName')}
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Ghost Mode Privacy */}
      <div
        className={`p-4 rounded-2xl bg-white/90 border transition-all shadow-xs space-y-3 ${
          settings?.ghost_mode
            ? 'border-indigo-300 bg-indigo-50/50'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              settings?.ghost_mode ? 'bg-indigo-100 text-[#6366F1]' : 'bg-slate-100 text-slate-500'
            }`}>
              <NaviIcon.Casper size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t('settings.ghostMode')}
              </h3>
              <p className="text-[11px] text-slate-500">{t('settings.hideLiveLocation')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                settings?.ghost_mode
                  ? 'bg-indigo-100 text-[#6366F1] border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {settings?.ghost_mode ? 'HIDDEN' : 'VISIBLE'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.ghost_mode ? 'bg-[#6366F1] animate-ping' : 'bg-slate-300'
              }`}
            />
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {settings?.ghost_mode
            ? t('settings.ghostActiveDesc')
            : t('settings.ghostInactiveDesc')}
        </p>

        {settings?.ghost_mode && settings.ghost_until && (
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-[#6366F1] flex items-center justify-between">
            <span>{t('settings.hiddenUntil')}</span>
            <span className="font-semibold">
              {new Date(settings.ghost_until).toLocaleTimeString()}
            </span>
          </div>
        )}

        {settings?.ghost_mode ? (
          <button
            onClick={handleDisableGhost}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#6366F1] text-white hover:bg-[#4f46e5] transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {t('settings.turnOffGhost')}
          </button>
        ) : (
          <div className="flex gap-2">
            <select
              value={ghostDuration}
              onChange={(e) => setGhostDuration(Number(e.target.value))}
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 outline-none"
            >
              <option value={60}>1h</option>
              <option value={240}>4h</option>
              <option value={480}>8h</option>
              <option value={0}>∞</option>
            </select>
            <button
              onClick={handleEnableGhost}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#6366F1] text-white hover:bg-[#4f46e5] transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            >
              {t('settings.activateGhost')}
            </button>
          </div>
        )}
      </div>

      {/* Location Transmission Frequency */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Map size={14} className="text-[#00B894]" />
          <span>{t('settings.syncFrequency')}</span>
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">{t('settings.intervalSeconds')}:</label>
          <input
            type="number"
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
            min={5}
            max={600}
            className="w-20 px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#00B894]"
          />
          <button
            onClick={handleUpdateInterval}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-colors cursor-pointer shadow-xs"
          >
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Bell size={14} className="text-[#00B894]" />
          <span>{t('settings.notifPreferences')}</span>
        </h3>
        {notifPrefs ? (
          <div className="space-y-2">
            {[
              { key: 'friend_requests' as const, label: t('settings.notifFriendRequests') },
              { key: 'reactions' as const, label: t('settings.notifReactions') },
              { key: 'chat_messages' as const, label: t('settings.notifDirectMessages') },
              { key: 'bumps' as const, label: t('settings.notifNearbyPulses') },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer"
              >
                <span className="text-xs text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={(e) => handleNotifToggle(key, e.target.checked)}
                  className="w-4 h-4 accent-[#00B894] cursor-pointer"
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">{t('common.loading')}</p>
        )}
      </div>

      {/* Blocked Users */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.ZeroProof size={14} className="text-rose-500" />
          <span>{t('settings.blockedUsers')} ({blockedUsers.length})</span>
        </h3>
        {blockedUsers.length === 0 ? (
          <p className="text-xs text-slate-400">{t('settings.noBlockedUsers')}</p>
        ) : (
          <div className="space-y-1.5">
            {blockedUsers.map((uid) => {
              const p = blockedProfiles[uid]
              return (
                <div
                  key={uid}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="text-slate-700 font-medium">
                    {p?.display_name ?? uid.slice(0, 10)}
                  </span>
                  <button
                    onClick={() => handleUnblock(uid)}
                    className="text-xs font-semibold text-[#00B894] hover:underline cursor-pointer"
                  >
                    {t('settings.unblock')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Security & Authentication */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('settings.account')}
        </h3>
        <p className="text-xs text-slate-600 truncate">
          {t('settings.signedInAs')} <span className="font-semibold">{user?.email ?? 'anonymous_user'}</span>
        </p>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-all active:scale-95 cursor-pointer"
        >
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  )
}
