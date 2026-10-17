import { useState, useEffect } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Group, GroupMember, Profile } from '@navisecret/sdk'
import { NaviIcon } from '@/components/common/NaviIcons'

export default function GroupsPanel() {
  const core = useSdk()
  const { user } = useAuth()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Record<string, Profile | null>>({})
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core])

  async function loadGroups() {
    try {
      setLoading(true)
      setError('')
      const g = await core.getGroups()
      setGroups(g)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      setError('')
      await core.createGroup(newName.trim(), newDesc.trim() || undefined)
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      await loadGroups()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    try {
      setError('')
      await core.joinGroup(joinCode.trim())
      setJoinCode('')
      await loadGroups()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function selectGroup(group: Group) {
    setSelectedGroup(group)
    setLoadingMembers(true)
    try {
      const m = await core.getGroupMembers(group.id)
      setMembers(m)
      const profiles: Record<string, Profile | null> = {}
      for (const member of m) {
        profiles[member.user_id] = await core.getProfile(member.user_id)
      }
      setMemberProfiles(profiles)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingMembers(false)
    }
  }

  async function handleLeave(groupId: string) {
    if (!confirm('Leave this group?')) return
    try {
      await core.leaveGroup(groupId)
      setSelectedGroup(null)
      await loadGroups()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm('Delete this group? This action cannot be reversed.')) return
    try {
      await core.deleteGroup(groupId)
      setSelectedGroup(null)
      await loadGroups()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleOpenChat(groupId: string) {
    try {
      await core.getOrCreateGroupChat(groupId)
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
        <p>Loading groups...</p>
      </div>
    )
  }

  // Group Detail View
  if (selectedGroup) {
    const isOwner = selectedGroup.owner_id === user?.id
    return (
      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        <button
          onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#00B894] transition-colors self-start cursor-pointer"
        >
          <span>&larr;</span>
          <span>All Groups</span>
        </button>

        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-bold text-slate-900">{selectedGroup.name}</h3>
            <span className="text-[10px] font-semibold text-[#00B894] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              GROUP
            </span>
          </div>
          {selectedGroup.description && (
            <p className="text-xs text-slate-600 font-sans">{selectedGroup.description}</p>
          )}
          {selectedGroup.invite_code && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Invite Code:</span>
              <span className="font-bold text-[#00B894] tracking-widest font-mono text-sm">{selectedGroup.invite_code}</span>
            </div>
          )}
        </div>

        {/* Member Manifest */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <NaviIcon.Friends size={14} className="text-[#00B894]" />
            <span>Members ({members.length})</span>
          </h4>
          {loadingMembers ? (
            <p className="text-xs text-slate-400 text-center py-2">Loading members...</p>
          ) : (
            <div className="space-y-1.5">
              {members.map((m) => {
                const p = memberProfiles[m.user_id]
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xs text-[#00B894]">
                        {(p?.display_name || m.user_id)[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">
                        {p?.display_name ?? m.user_id.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {m.role}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => handleOpenChat(selectedGroup.id)}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <NaviIcon.Chat size={14} />
            <span>Group Chat</span>
          </button>
          <button
            onClick={() => handleLeave(selectedGroup.id)}
            className="w-full py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Leave Group
          </button>
          {isOwner && (
            <button
              onClick={() => handleDelete(selectedGroup.id)}
              className="w-full py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>
    )
  }

  // Groups Overview List
  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

      {/* Join by Code Bar */}
      <div className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter invite code..."
          className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] font-sans"
        />
        <button
          onClick={handleJoin}
          disabled={!joinCode.trim()}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] disabled:opacity-40 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          Join
        </button>
      </div>

      {/* Create New Group Card */}
      {showCreate ? (
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Create New Group
          </h4>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-[#00B894] font-sans"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-[#00B894] font-sans"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-colors cursor-pointer shadow-xs"
            >
              Create Group
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-2.5 rounded-2xl text-xs font-bold bg-white/90 hover:bg-white border border-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>+ Create New Group</span>
        </button>
      )}

      {/* Groups Catalog */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Your Groups ({groups.length})
        </h4>
        {groups.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No groups joined yet
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => selectGroup(g)}
                className="w-full text-left p-3.5 rounded-2xl bg-white/90 border border-slate-200 hover:border-[#00B894] hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-[#00B894] transition-colors">
                    {g.name}
                  </span>
                  <span className="text-xs text-[#00B894] font-bold">&rarr;</span>
                </div>
                {g.description && (
                  <p className="text-xs text-slate-500 mt-1 truncate font-sans">
                    {g.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
