import { useState, useEffect, useCallback, useRef } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import type { ChatRoom, Message, Profile } from '@navisecret/sdk'
import { formatRelativeTime } from '@/utils/format'
import { NaviIcon } from '@/components/common/NaviIcons'
import { useI18n } from '@/i18n'

interface ChatPanelProps {
  initialFriendId?: string
}

export default function ChatPanel({ initialFriendId }: ChatPanelProps) {
  const sdk = useSdk()
  const { user } = useAuth()
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [initDone, setInitDone] = useState(!initialFriendId)

  useEffect(() => {
    if (!initialFriendId) return
    let cancelled = false
    sdk.getOrCreateDirectChat(initialFriendId).then((room) => {
      if (!cancelled) { setActiveRoom(room.id); setInitDone(true) }
    }).catch(() => setInitDone(true))
    return () => { cancelled = true }
  }, [sdk, initialFriendId])

  if (!initDone) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-slate-400">
        <NaviIcon.Chat size={28} className="text-[#00B894] animate-pulse" />
        <p className="text-xs">Loading chat...</p>
      </div>
    )
  }

  if (activeRoom) {
    return <ThreadView sdk={sdk} userId={user?.id ?? ''} roomId={activeRoom} onBack={() => setActiveRoom(null)} />
  }
  return <RoomList sdk={sdk} userId={user?.id ?? ''} onSelectRoom={setActiveRoom} />
}

function RoomList({ sdk, userId, onSelectRoom }: { sdk: any; userId: string; onSelectRoom: (id: string) => void }) {
  const { t } = useI18n()
  const [rooms, setRooms] = useState<(ChatRoom & { preview?: string; otherName?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const raw: ChatRoom[] = await sdk.getChatRooms()
        const enriched = await Promise.all(
          raw.map(async (room) => {
            let otherName = 'Direct Message'
            let preview = ''
            try {
              const members: string[] = await sdk.getChatRoomMembers(room.id)
              const otherId = members.find((m: string) => m !== userId)
              if (otherId) {
                const p: Profile | null = await sdk.getProfile(otherId)
                otherName = p?.display_name || otherId.slice(0, 8)
              }
            } catch {}
            try {
              const msgs: Message[] = await sdk.getMessages(room.id, { limit: 1 })
              if (msgs.length) preview = msgs[0].content ?? ''
            } catch {}
            return { ...room, otherName, preview }
          }),
        )
        if (!cancelled) setRooms(enriched)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load conversations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sdk, userId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }
  if (error) {
    return <div className="p-4 text-xs text-rose-500 text-center">{error}</div>
  }
  if (!rooms.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-slate-500">
        <NaviIcon.Chat size={32} className="text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">{t('chat.noMessages')}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2 p-3">
      {rooms.map((room) => (
        <li key={room.id}>
          <button
            onClick={() => onSelectRoom(room.id)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/90 border border-slate-200 hover:border-[#00B894] hover:bg-slate-50 transition-all text-left shadow-xs cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-sm font-bold text-[#00B894] group-hover:scale-105 transition-transform">
              {(room.otherName ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#00B894] transition-colors">
                  {room.otherName}
                </p>
                <span className="text-[10px] text-slate-400">
                  {room.created_at ? formatRelativeTime(room.created_at) : ''}
                </span>
              </div>
              {room.preview ? (
                <p className="text-xs text-slate-500 truncate">
                  {room.preview}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No messages yet
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ThreadView({ sdk, userId, roomId, onBack }: { sdk: any; userId: string; roomId: string; onBack: () => void }) {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const msgs: Message[] = await sdk.getMessages(roomId, { limit: 50 })
        if (!cancelled) {
          setMessages(msgs.reverse())
          sdk.markAsRead(roomId).catch(() => {})
        }
        const senderIds = [...new Set(msgs.map((m) => m.sender_id))]
        const profs: Record<string, Profile> = {}
        await Promise.all(
          senderIds.map(async (id) => {
            try {
              const p = await sdk.getProfile(id)
              if (p) profs[id] = p
            } catch {}
          }),
        )
        if (!cancelled) setProfiles(profs)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load messages')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sdk, roomId])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    const ch = sdk.subscribeMessages(roomId, (msg: Message) => {
      setMessages((prev) => [...prev, msg])
      sdk.markAsRead(roomId).catch(() => {})
    })
    return () => { ch.unsubscribe() }
  }, [sdk, roomId])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setError('')
    try {
      await sdk.sendMessage(roomId, text)
      setInput('')
    } catch (e: any) {
      setError(e.message ?? 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#00B894] transition-colors cursor-pointer"
        >
          <span className="text-base leading-none">&larr;</span>
          <span>Conversations</span>
        </button>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#00B894] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B894] animate-ping" />
          <span>Encrypted Direct Message</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <p className="text-xs text-center text-slate-400 py-6">Loading messages...</p>
        )}
        {error && (
          <p className="text-xs text-center text-rose-500 py-2">{error}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId
          const name = profiles[m.sender_id]?.display_name || m.sender_id.slice(0, 6)
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <span className="text-[10px] text-slate-400 mb-1 ml-1 font-medium">
                  {name}
                </span>
              )}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  mine
                    ? 'bg-[#00B894] text-white font-medium rounded-tr-sm shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                    mine ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  <span>{formatRelativeTime(m.created_at)}</span>
                  {mine && <NaviIcon.DoubleCheck size={11} className="inline text-white" />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Deck */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={t('chat.typeMessagePlaceholder')}
            maxLength={10000}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] font-sans"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-xl font-bold bg-[#00B894] text-white hover:bg-[#00a382] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title={t('chat.send')}
          >
            <NaviIcon.Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
