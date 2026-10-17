import { useState, useEffect, useRef } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime, safeAvatarUrl } from '@/utils/format'
import type { Profile, AreaRanking, FriendStreak, VisitedCellStats } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'
import { useI18n } from '@/i18n'

const EMOJI_GRID = ['⚡', '🛰️', '🛡️', '🛸', '🎯', '🔥', '💎', '🧭', '🌟', '👾', '🚀', '🏃', '☕', '🎧', '🌙', '💻']
const DURATION_OPTIONS = [
  { label: '30m', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '4 hours', value: 240 },
  { label: '24 hours', value: 1440 },
]

export default function ProfilePanel() {
  const core = useSdk()
  const { user } = useAuth()
  const { t } = useI18n()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')

  const [statusEmoji, setStatusEmoji] = useState('')
  const [statusText, setStatusText] = useState('')
  const [statusDuration, setStatusDuration] = useState(60)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [stats, setStats] = useState<VisitedCellStats | null>(null)
  const [ranking, setRanking] = useState<AreaRanking[]>([])
  const [streaks, setStreaks] = useState<FriendStreak[]>([])
  const [streakProfiles, setStreakProfiles] = useState<Record<string, Profile | null>>({})

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
    loadStats()
    loadStreaks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core])

  const [copied, setCopied] = useState(false)

  const userUniqueCode = 
    (profile as any)?.user_code || 
    (user as any)?.user_code || 
    (profile?.user_id ? `NS-${profile.user_id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '') ||
    (user?.id ? `NS-${user.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : 'NS-USER')

  const handleCopyId = () => {
    navigator.clipboard.writeText(userUniqueCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function loadProfile() {
    try {
      setLoading(true)
      const p = await core.getProfile()
      if (p) {
        setProfile(p)
        setUsername(p.username ?? '')
        setDisplayName(p.display_name ?? '')
      } else if (user) {
        const fb: any = {
          user_id: user.id,
          username: user.username || user.email.split('@')[0],
          display_name: user.display_name || user.email.split('@')[0],
          avatar_url: user.avatar_url || null,
          status_emoji: user.status_emoji || null,
          status_text: user.status_text || null,
          status_expires_at: null,
          user_code: (user as any).user_code || `NS-${user.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setProfile(fb)
        setUsername(fb.username)
        setDisplayName(fb.display_name)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const [s, r] = await Promise.all([
        core.getMyExplorationStats(),
        core.getFriendRanking(),
      ])
      setStats(s)
      setRanking(r)
    } catch {}
  }

  async function loadStreaks() {
    try {
      const s = await core.getStreaks()
      setStreaks(s)
      const entries = await Promise.all(
        s.map(async (streak) => {
          const p = await core.getProfile(streak.friend_id).catch(() => null)
          return [streak.friend_id, p] as const
        })
      )
      setStreakProfiles(Object.fromEntries(entries))
    } catch {}
  }

  async function saveProfile() {
    try {
      const updated = await core.updateProfile({ username, display_name: displayName })
      setProfile(updated)
      setEditing(false)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await core.uploadAvatar(file)
      await loadProfile()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteAvatar() {
    if (!confirm('Remove profile avatar?')) return
    try {
      await core.deleteAvatar()
      await loadProfile()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleSetStatus() {
    try {
      await core.setStatus(statusEmoji || '⚡', statusText || undefined, statusDuration)
      await loadProfile()
      setShowEmojiPicker(false)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleClearStatus() {
    try {
      await core.clearStatus()
      await loadProfile()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500 font-mono text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00F5B8] animate-ping" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }
  if (error) {
    return <div className="p-4 text-xs font-mono text-rose-400 text-center">{error}</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Profile Header Card */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs flex flex-col items-center gap-3 relative overflow-hidden">
        <button
          type="button"
          onClick={handleCopyId}
          className="absolute top-2.5 right-2.5 text-[11px] font-mono font-bold text-[#00B894] bg-teal-50 hover:bg-teal-100 active:scale-95 px-3 py-1 rounded-full border border-teal-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
          title="Benzersiz Kimlik Kodu (Kopyalamak için tıklayın)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B894] animate-pulse" />
          <span>ID: #{userUniqueCode}</span>
          <span className="text-[10px] text-teal-600 font-sans font-medium">
            {copied ? '✓ Kopyalandı' : '📋'}
          </span>
        </button>

        {/* Avatar */}
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          {safeAvatarUrl(profile?.avatar_url) ? (
            <img
              src={safeAvatarUrl(profile?.avatar_url)!}
              alt="avatar"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#00B894] shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-teal-50 border-2 border-[#00B894] flex items-center justify-center text-2xl font-bold text-[#00B894] shadow-xs">
              {(profile?.display_name || user?.display_name || user?.email)?.[0]?.toUpperCase() ?? 'N'}
            </div>
          )}
          <div className="absolute inset-0 rounded-2xl bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white">
            {t('profile.changePhoto')}
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        <div className="flex items-center gap-2">
          {profile?.avatar_url && (
            <button
              onClick={handleDeleteAvatar}
              className="text-xs font-medium text-rose-500 hover:text-rose-600 underline cursor-pointer"
            >
              {t('profile.removePhoto')}
            </button>
          )}
        </div>

        {/* Profile Info & Edit */}
        {editing ? (
          <div className="w-full flex flex-col gap-2.5 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase">{t('profile.username')}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-[#00B894] focus:bg-white font-sans mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase">{t('profile.displayName')}</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-[#00B894] focus:bg-white font-sans mt-0.5"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={saveProfile}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] shadow-sm cursor-pointer"
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {profile?.display_name || user?.display_name || user?.email?.split('@')[0] || 'NaviSecret Explorer'}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              @{profile?.username || user?.username || user?.email?.split('@')[0] || 'operative'}
            </p>
            <button
              onClick={() => setEditing(true)}
              className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              {t('profile.editProfile')}
            </button>
          </div>
        )}
      </div>

      {/* Real-time Status */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <NaviIcon.Pulse size={14} className="text-[#00B894]" />
            <span>{t('profile.customStatus')}</span>
          </h3>
          {profile?.status_emoji && (
            <button
              onClick={handleClearStatus}
              className="text-xs font-medium text-rose-500 hover:text-rose-600 cursor-pointer"
            >
              {t('profile.clearStatus')}
            </button>
          )}
        </div>

        {profile?.status_emoji && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-xl bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">{profile.status_emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 truncate">{profile.status_text || 'Active'}</p>
              {profile.status_expires_at && (
                <p className="text-[10px] text-slate-400">
                  Expires {formatRelativeTime(profile.status_expires_at)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-lg flex items-center justify-center hover:border-[#00B894] transition-colors shrink-0 cursor-pointer"
              title="Select Status Emoji"
            >
              {statusEmoji || '⚡'}
            </button>
            <input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder={t('profile.statusPlaceholder')}
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-[#00B894] focus:bg-white font-sans"
            />
          </div>

          {showEmojiPicker && (
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
              {EMOJI_GRID.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setStatusEmoji(e)
                    setShowEmojiPicker(false)
                  }}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <select
              value={statusDuration}
              onChange={(e) => setStatusDuration(Number(e.target.value))}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 outline-none font-sans"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSetStatus}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-colors shadow-xs cursor-pointer"
            >
              {t('profile.saveStatus')}
            </button>
          </div>
        </div>
      </div>

      {/* Exploration Metrics */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.WorldUnveil size={14} className="text-[#00B894]" />
          <span>{t('profile.explorationStats')}</span>
        </h3>
        {stats ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-600">{t('profile.territoriesExplored')}:</span>
              <span className="text-lg font-black text-[#00B894]">
                {stats.total_cells} {t('profile.cells')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Active since {formatRelativeTime(stats.exploring_since)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">
            No exploration data recorded yet
          </p>
        )}

        {ranking.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase">
              {t('profile.leaderboard')}
            </h4>
            <div className="space-y-1">
              {ranking.map((r) => (
                <div
                  key={r.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100"
                >
                  <span className="text-[#00B894] font-bold">#{r.rank}</span>
                  <span className="text-slate-700 truncate flex-1 mx-2">
                    {r.user_id.slice(0, 10)}...
                  </span>
                  <span className="text-slate-500 font-medium">{r.cell_count} {t('profile.cells')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Streaks */}
      <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Pulse size={14} className="text-[#FFB800]" />
          <span>{t('profile.friendStreaks')}</span>
        </h3>
        {streaks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            No daily streaks established yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {streaks.map((s) => {
              const p = streakProfiles[s.friend_id]
              return (
                <div
                  key={s.friend_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-semibold text-slate-800">
                    {p?.display_name ?? s.friend_id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#D97706]">
                      ⚡ {s.current_streak} {t('profile.days')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (best: {s.longest_streak})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
