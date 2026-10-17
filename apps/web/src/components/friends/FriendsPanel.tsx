import { useState, useEffect, useCallback } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import { safeAvatarUrl } from '@/utils/format'
import type { Profile, FriendRequest, FriendOfFriend } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'
import { useI18n } from '@/i18n'

type Tab = 'friends' | 'requests' | 'search'

interface FriendsPanelProps {
  onOpenChat?: (userId: string) => void
}

export default function FriendsPanel({ onOpenChat }: FriendsPanelProps) {
  const sdk = useSdk()
  const { user } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('friends')

  return (
    <div className="flex flex-col h-full">
      {/* Segmented Selector */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-sans">
          {(['friends', 'requests', 'search'] as Tab[]).map((itemTab) => (
            <button
              key={itemTab}
              onClick={() => setTab(itemTab)}
              className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                tab === itemTab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {itemTab === 'friends' ? t('friends.friendsTitle') : itemTab === 'requests' ? t('friends.pendingRequests') : t('friends.addFriend')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'friends' && <FriendsTab sdk={sdk} onOpenChat={onOpenChat} />}
        {tab === 'requests' && <RequestsTab sdk={sdk} userId={user?.id} />}
        {tab === 'search' && <SearchTab sdk={sdk} userId={user?.id} />}
      </div>
    </div>
  )
}

function FriendsTab({ sdk, onOpenChat }: { sdk: any; onOpenChat?: (id: string) => void }) {
  const { t } = useI18n()
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ids: string[] = await sdk.getFriends()
      const profiles = await Promise.all(
        ids.map(async (id: string) => {
          try {
            const p = await sdk.getProfile(id)
            return (
              p ?? {
                user_id: id,
                username: null,
                display_name: null,
                avatar_url: null,
                status_emoji: null,
                status_text: null,
                status_expires_at: null,
                created_at: '',
                updated_at: '',
              } as Profile
            )
          } catch {
            return {
              user_id: id,
              username: null,
              display_name: null,
              avatar_url: null,
              status_emoji: null,
              status_text: null,
              status_expires_at: null,
              created_at: '',
              updated_at: '',
            } as Profile
          }
        }),
      )
      setFriends(profiles)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load friends')
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    load()
  }, [load])

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from friends?`)) return
    try {
      await sdk.removeFriend(id)
      setFriends((prev) => prev.filter((f) => f.user_id !== id))
    } catch (e: any) {
      setError(e.message ?? 'Failed to remove friend')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }
  if (error) {
    return <p className="text-xs text-center text-rose-500 py-4">{error}</p>
  }
  if (!friends.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 text-xs text-center">
        <NaviIcon.Friends size={28} className="text-slate-400 mb-1" />
        <p className="font-semibold text-slate-700">{t('friends.noFriendsFound')}</p>
        <p className="text-[11px] text-slate-400">{t('friends.findFriendsHint')}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {friends.map((f) => {
        const name = f.display_name || f.username || f.user_id.slice(0, 8)
        return (
          <li
            key={f.user_id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/90 border border-slate-200 hover:border-[#00B894] transition-all shadow-xs"
          >
            {safeAvatarUrl(f.avatar_url) ? (
              <img
                src={safeAvatarUrl(f.avatar_url)!}
                alt=""
                className="w-10 h-10 rounded-xl object-cover border border-[#00B894] shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-sm font-bold text-[#00B894]">
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                {f.status_emoji && (
                  <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                    {f.status_emoji}
                  </span>
                )}
              </div>
              {f.username && (
                <p className="text-[11px] text-slate-400">@{f.username}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenChat && (
                <button
                  onClick={() => onOpenChat(f.user_id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#00B894] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <NaviIcon.Chat size={13} />
                  <span>{t('friends.message')}</span>
                </button>
              )}
              <button
                onClick={() => handleRemove(f.user_id, name)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                title={t('friends.removeFriend')}
              >
                <NaviIcon.Close size={14} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RequestsTab({ sdk, userId }: { sdk: any; userId?: string }) {
  const { t } = useI18n()
  const [received, setReceived] = useState<FriendRequest[]>([])
  const [sent, setSent] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [r, s] = await Promise.all([sdk.getPendingRequests(), sdk.getSentRequests()])
      setReceived(r)
      setSent(s)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const ch = sdk.subscribeFriendRequests(() => load())
    return () => {
      ch.unsubscribe()
    }
  }, [sdk, load])

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn()
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return <p className="text-xs text-center text-slate-400 py-6">{t('common.loading')}</p>
  }
  if (error) {
    return <p className="text-xs text-center text-rose-500 py-3">{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Received */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />
          <span>{t('friends.receivedRequests')} ({received.length})</span>
        </h3>
        {received.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">{t('friends.noReceivedRequests')}</p>
        )}
        {received.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-xs"
          >
            <span className="text-xs font-medium text-slate-700">
              User: {r.from_user_id.slice(0, 10)}...
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => act(() => sdk.acceptFriendRequest(r.id))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#00B894] text-white hover:bg-[#00a382] transition-colors cursor-pointer shadow-xs"
              >
                {t('friends.accept')}
              </button>
              <button
                onClick={() => act(() => sdk.rejectFriendRequest(r.id))}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t('friends.decline')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sent */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Send size={12} className="text-[#6366F1]" />
          <span>{t('friends.sentRequests')} ({sent.length})</span>
        </h3>
        {sent.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">{t('friends.noSentRequests')}</p>
        )}
        {sent.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-slate-100"
          >
            <span className="text-xs text-slate-600">
              Sent to: {r.to_user_id.slice(0, 10)}...
            </span>
            <button
              onClick={() => act(() => sdk.cancelFriendRequest(r.id))}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchTab({ sdk, userId }: { sdk: any; userId?: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [suggestions, setSuggestions] = useState<FriendOfFriend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    sdk.getFriendsOfFriends().then(setSuggestions).catch(() => {})
  }, [sdk])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      setResults(await sdk.searchProfiles(query.trim()))
    } catch (e: any) {
      setError(e.message ?? 'Search query failed')
    } finally {
      setLoading(false)
    }
  }

  const addFriend = async (id: string) => {
    try {
      await sdk.sendFriendRequest(id)
      setResults((prev) => prev.filter((p) => p.user_id !== id))
    } catch (e: any) {
      setError(e.message ?? 'Failed to send friend request')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder={t('friends.searchPlaceholder')}
            className="w-full px-3.5 py-2 pl-9 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] font-sans"
          />
          <NaviIcon.Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs cursor-pointer"
        >
          {loading ? t('common.loading') : t('common.search')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('friends.peopleFound')}
          </h4>
          {results.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-xs"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {p.display_name || p.username || p.user_id.slice(0, 8)}
                </p>
                {p.username && <p className="text-[11px] text-slate-400">@{p.username}</p>}
              </div>
              <button
                onClick={() => addFriend(p.user_id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>{t('friends.addFriend')}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Friends */}
      {suggestions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <NaviIcon.Friends size={13} className="text-[#6366F1]" />
            <span>{t('friends.peopleYouMayKnow')}</span>
          </h4>
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <div
                key={s.user_id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-slate-200 text-xs shadow-xs"
              >
                <div>
                  <span className="font-medium text-slate-800">
                    User {s.user_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-[#6366F1] font-semibold ml-2">
                    ({s.mutual_friend_ids.length} mutual friends)
                  </span>
                </div>
                <button
                  onClick={() => addFriend(s.user_id)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-[#6366F1] hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  {t('friends.addFriend')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
