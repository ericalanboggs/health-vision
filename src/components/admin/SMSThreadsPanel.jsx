import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Close, Autorenew } from '@mui/icons-material'
import { getRecentThreads } from '../../services/adminService'
import supabase from '../../lib/supabase'

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0][0]?.toUpperCase() || '?'
}

export default function SMSThreadsPanel({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadThreads()
    }
  }, [isOpen])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isOpen) return

    const channel = supabase
      .channel('sms-threads-panel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
        },
        (payload) => {
          const msg = payload.new
          setThreads((prev) => {
            // Remove existing thread for this user if present
            const filtered = prev.filter(t => t.userId !== msg.user_id)
            // Add new thread at the top
            return [
              {
                userId: msg.user_id,
                userName: msg.user_name || msg.phone || 'Unknown',
                phone: msg.phone,
                lastMessage: {
                  body: msg.body,
                  direction: msg.direction,
                  created_at: msg.created_at,
                },
              },
              ...filtered,
            ]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen])

  const loadThreads = async () => {
    setLoading(true)
    const { success, data } = await getRecentThreads()
    if (success) {
      setThreads(data || [])
    }
    setLoading(false)
  }

  const handleThreadClick = (userId) => {
    onClose()
    navigate(`/admin/users/${userId}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="text-xl font-bold text-summit-forest">Messages</h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition"
          >
            <Close className="w-6 h-6" />
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-stone-500 text-sm">
              No conversations yet
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.userId}
                onClick={() => handleThreadClick(thread.userId)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 text-left"
              >
                {/* Initials circle */}
                <div className="w-10 h-10 rounded-full bg-summit-emerald flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {getInitials(thread.userName)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-summit-forest text-sm truncate">
                      {thread.userName}
                    </span>
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      {formatRelativeTime(thread.lastMessage.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 truncate mt-0.5">
                    {thread.lastMessage.direction === 'outbound' && (
                      <span className="text-stone-400">You: </span>
                    )}
                    {thread.lastMessage.body?.slice(0, 60) || ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
