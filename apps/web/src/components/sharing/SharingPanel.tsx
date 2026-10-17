import { useState, useEffect } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import type { Profile, ShareLevel } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'

interface FriendShareState {
  friendId: string
  profile: Profile | null
  level: ShareLevel
  expiresAt: string | null
}

const SHARE_LEVELS: { value: ShareLevel; label: string; desc: string }[] = [
  { value: 'none', label: 'Hidden', desc: 'Do not share location with this friend' },
  { value: 'current', label: 'Live Location', desc: 'Share real-time location' },
  { value: 'history', label: 'Full History', desc: 'Share live location and recent movement' },
]

export default function SharingPanel() {
  const core = useSdk()

  const [friends, setFriends] = useState<FriendShareState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadFriends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core])

  async function loadFriends() {
    try {
      setLoading(true)
      setError('')
      const friendIds = await core.getFriends()

      let rules: any[] = []
      try {
        rules = await (core as any).getShareRules?.() || []
      } catch {
        rules = []
      }

      const ruleMap = new Map<string, { level: ShareLevel; expiresAt: string | null }>()
      for (const r of rules) {
        ruleMap.set(r.viewer_id, { level: r.level as ShareLevel, expiresAt: r.expires_at })
      }

      const states: FriendShareState[] = await Promise.all(
        friendIds.map(async (fid) => {
          const profile = await core.getProfile(fid)
          const rule = ruleMap.get(fid)
          return {
            friendId: fid,
            profile,
            level: rule?.level ?? 'none',
            expiresAt: rule?.expiresAt ?? null,
          }
        })
      )
      setFriends(states)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLevelChange(friendId: string, level: ShareLevel) {
    setUpdatingId(friendId)
    try {
      setError('')
      if (level === 'none') {
        await core.revoke(friendId)
      } else {
        await core.allow(friendId, level)
      }
      setFriends((prev) =>
        prev.map((f) => (f.friendId === friendId ? { ...f, level } : f))
      )
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSetExpiry(friendId: string, dateStr: string) {
    if (!dateStr) return
    setUpdatingId(friendId)
    try {
      setError('')
      const date = new Date(dateStr)
      await core.setShareExpiry(friendId, date)
      setFriends((prev) =>
        prev.map((f) => (f.friendId === friendId ? { ...f, expiresAt: date.toISOString() } : f))
      )
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
        <p>Loading privacy settings...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-[#6366F1] flex items-center gap-2.5 shadow-xs">
        <NaviIcon.ZeroProof size={16} className="shrink-0" />
        <span>Customize what each friend can see about your location.</span>
      </div>

      {friends.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">
          No friends added yet. Add friends to manage location sharing permissions.
        </p>
      ) : (
        <div className="space-y-3">
          {friends.map((f) => (
            <div
              key={f.friendId}
              className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#00B894]">
                  {(f.profile?.display_name || f.friendId)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {f.profile?.display_name ?? f.friendId.slice(0, 8)}
                  </p>
                  {f.profile?.username && (
                    <p className="text-[11px] text-slate-400">@{f.profile.username}</p>
                  )}
                </div>
                {updatingId === f.friendId && (
                  <span className="text-[10px] text-[#00B894] font-medium animate-pulse">Saving...</span>
                )}
              </div>

              {/* Segmented Permission Level Buttons */}
              <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
                {SHARE_LEVELS.map((sl) => (
                  <button
                    key={sl.value}
                    onClick={() => handleLevelChange(f.friendId, sl.value)}
                    disabled={updatingId === f.friendId}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      f.level === sl.value
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500">
                {SHARE_LEVELS.find((sl) => sl.value === f.level)?.desc}
              </p>

              {/* Expiry Timestamp Selector */}
              {f.level !== 'none' && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px] font-medium">Auto-expire:</span>
                  <input
                    type="datetime-local"
                    value={f.expiresAt ? f.expiresAt.slice(0, 16) : ''}
                    onChange={(e) => handleSetExpiry(f.friendId, e.target.value)}
                    className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
