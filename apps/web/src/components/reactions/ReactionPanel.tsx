import { useState, useEffect, useRef } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile, LocationReaction } from '@navisecret/sdk'
import { formatRelativeTime } from '@/utils/format'
import { NaviIcon } from '@/components/common/NaviIcons'

const REACTION_GLYPHS = ['⚡', '🛰️', '🔥', '🛡️', '💎', '🚀', '🎯', '👾']

type Tab = 'send' | 'received'

export default function ReactionPanel() {
  const sdk = useSdk()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('send')
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ch = sdk.subscribeReactions((r: LocationReaction) => {
      if (r.to_user_id === user?.id) {
        setToast(`${r.emoji} from operative ${r.from_user_id.slice(0, 6)}`)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(''), 3000)
      }
    })
    return () => {
      ch.unsubscribe()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [sdk, user])

  return (
    <div className="flex flex-col h-full">
      {toast && (
        <div className="mx-3 mt-2 px-3.5 py-2 rounded-xl text-xs text-center font-bold bg-teal-50 border border-teal-200 text-[#00B894] shadow-xs">
          {toast}
        </div>
      )}

      {/* Segmented Selector */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-sans">
          {(['send', 'received'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                tab === t
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t === 'send' ? 'Send Reaction' : 'Recent Activity'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'send' ? (
          <SendTab sdk={sdk} />
        ) : (
          <ReceivedTab sdk={sdk} userId={user?.id ?? ''} />
        )}
      </div>
    </div>
  )
}

function SendTab({ sdk }: { sdk: any }) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    sdk
      .getFriends()
      .then(async (ids: string[]) => {
        const profiles = await Promise.all(
          ids.map(async (id: string) => {
            const p = await sdk.getProfile(id)
            return (
              p ??
              ({
                user_id: id,
                username: null,
                display_name: null,
                avatar_url: null,
                status_emoji: null,
                status_text: null,
                status_expires_at: null,
                created_at: '',
                updated_at: '',
              } as Profile)
            )
          })
        )
        setFriends(profiles)
        setLoading(false)
      })
      .catch((e: any) => {
        setError(e.message)
        setLoading(false)
      })
  }, [sdk])

  const send = async () => {
    if (!selectedFriend || !selectedEmoji) return
    setSending(true)
    setError('')
    setSuccess('')
    try {
      await sdk.sendReaction(selectedFriend, selectedEmoji, message || undefined)
      setSuccess('Reaction sent successfully!')
      setSelectedEmoji(null)
      setMessage('')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Failed to send reaction')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
        <p>Loading friends...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
      {success && (
        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#00B894] text-xs text-center font-bold">
          {success}
        </div>
      )}

      {/* Select Friend */}
      <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Pin size={13} className="text-[#00B894]" />
          <span>Select Friend</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {friends.map((f) => {
            const name = f.display_name || f.username || f.user_id.slice(0, 8)
            const isSelected = selectedFriend === f.user_id
            return (
              <button
                key={f.user_id}
                onClick={() => setSelectedFriend(f.user_id)}
                className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00B894] text-white font-bold shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {name}
              </button>
            )
          })}
          {!friends.length && (
            <p className="text-xs text-slate-400 py-1">No friends added yet</p>
          )}
        </div>
      </div>

      {/* Select Reaction Emoji */}
      <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Radar size={13} className="text-[#FFB800]" />
          <span>Select Reaction</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {REACTION_GLYPHS.map((e) => (
            <button
              key={e}
              onClick={() => setSelectedEmoji(e)}
              className={`text-2xl p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                selectedEmoji === e
                  ? 'bg-amber-50 border-2 border-[#FFB800] scale-105 shadow-xs'
                  : 'bg-slate-50 border border-slate-200 hover:bg-white'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Note */}
      <div className="space-y-1.5">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message..."
          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] font-sans"
        />
      </div>

      <button
        onClick={send}
        disabled={!selectedFriend || !selectedEmoji || sending}
        className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#00B894] text-white hover:bg-[#00a382] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
      >
        {sending ? 'Sending...' : 'Send Reaction'}
      </button>
    </div>
  )
}

function ReceivedTab({ sdk, userId }: { sdk: any; userId: string }) {
  const [received, setReceived] = useState<LocationReaction[]>([])
  const [sent, setSent] = useState<LocationReaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      sdk.getReceivedReactions({ limit: 20 }),
      sdk.getSentReactions({ limit: 20 }),
    ])
      .then(([r, s]) => {
        if (!cancelled) {
          setReceived(r)
          setSent(s)
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sdk])

  if (loading) {
    return <p className="text-xs text-center text-slate-400 py-6">Loading activity...</p>
  }
  if (error) {
    return <p className="text-xs text-center text-rose-500 py-2">{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Received */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />
          <span>Received Reactions ({received.length})</span>
        </h3>
        {received.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">No received reactions yet</p>
        )}
        <div className="space-y-1.5">
          {received.map((r) => (
            <ReactionRow
              key={r.id}
              emoji={r.emoji}
              userId={r.from_user_id}
              message={r.message}
              time={r.created_at}
              direction="in"
            />
          ))}
        </div>
      </div>

      {/* Sent */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <NaviIcon.Send size={12} className="text-[#6366F1]" />
          <span>Sent Reactions ({sent.length})</span>
        </h3>
        {sent.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">No sent reactions yet</p>
        )}
        <div className="space-y-1.5">
          {sent.map((r) => (
            <ReactionRow
              key={r.id}
              emoji={r.emoji}
              userId={r.to_user_id}
              message={r.message}
              time={r.created_at}
              direction="out"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ReactionRow({
  emoji,
  userId,
  message,
  time,
  direction,
}: {
  emoji: string
  userId: string
  message: string | null
  time: string
  direction: 'in' | 'out'
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/90 border border-slate-200 text-xs shadow-xs">
      <span className="text-xl p-1.5 rounded-xl bg-slate-50 border border-slate-200">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">
          {direction === 'in' ? 'From' : 'To'} User {userId.slice(0, 8)}
        </p>
        {message && <p className="text-slate-500 truncate font-sans">{message}</p>}
      </div>
      <span className="text-[10px] text-slate-400 shrink-0">
        {formatRelativeTime(time)}
      </span>
    </div>
  )
}
