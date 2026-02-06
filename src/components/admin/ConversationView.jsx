import { useState, useEffect, useRef } from 'react'
import { Send, EmojiEmotions, Autorenew, SmsOutlined } from '@mui/icons-material'
import { getConversation, sendAdminSMS } from '../../services/adminService'

// Summit-themed emoji palette (same as SendSMSModal)
const EMOJI_OPTIONS = [
  { emoji: '🏔️', label: 'Summit' },
  { emoji: '⛰️', label: 'Mountain' },
  { emoji: '💪', label: 'Flex' },
  { emoji: '🤜🤛', label: 'Fist bump' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '✅', label: 'Check' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🙌', label: 'Celebrate' },
  { emoji: '💧', label: 'Water' },
  { emoji: '🏃', label: 'Run' },
  { emoji: '🧘', label: 'Meditate' },
  { emoji: '😊', label: 'Smile' },
  { emoji: '🌟', label: 'Sparkle' },
]

/**
 * 2-way SMS conversation view for a single user
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.userName - The user's name for display
 * @param {string} props.phone - The user's phone number
 * @param {boolean} props.smsOptIn - Whether the user has opted in to SMS
 */
export default function ConversationView({ userId, userName, phone, smsOptIn }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const emojiPickerRef = useRef(null)

  // Load conversation on mount
  useEffect(() => {
    loadConversation()
  }, [userId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const loadConversation = async () => {
    setLoading(true)
    const { success, data } = await getConversation(userId)
    if (success) {
      setMessages(data || [])
    }
    setLoading(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (diffDays === 0) {
      return `Today ${timeStr}`
    } else if (diffDays === 1) {
      return `Yesterday ${timeStr}`
    } else if (diffDays < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      return `${dayName} ${timeStr}`
    } else {
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
      return `${dateStr} ${timeStr}`
    }
  }

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.slice(0, start) + emoji + message.slice(end)
      setMessage(newMessage)

      setTimeout(() => {
        textarea.focus()
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      }, 0)
    } else {
      setMessage(message + emoji)
    }
    setShowEmojiPicker(false)
  }

  const handleSend = async () => {
    if (sending || !message.trim() || !smsOptIn || !phone) return

    setSending(true)
    const messageText = message.trim()
    setMessage('')

    const { success } = await sendAdminSMS(
      [{ userId, phone, name: userName }],
      messageText
    )

    if (success) {
      // Refresh conversation to show the sent message
      await loadConversation()
    } else {
      // Restore message on failure
      setMessage(messageText)
    }

    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = smsOptIn && phone && phone !== 'N/A'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-2">
          <SmsOutlined className="w-5 h-5 text-summit-emerald" />
          <h2 className="text-xl font-bold text-summit-forest">SMS Conversation</h2>
        </div>
        {!canSend && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            {!phone || phone === 'N/A' ? 'No phone number' : 'SMS opted out'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-stone-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.direction === 'outbound'
                    ? 'bg-summit-emerald text-white rounded-br-md'
                    : 'bg-white border border-stone-200 text-summit-forest rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.direction === 'outbound' ? 'text-white/70' : 'text-stone-400'
                  }`}
                >
                  {formatTimestamp(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Input */}
      <div className="border-t border-stone-200 p-4 bg-white">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canSend ? "Type a message..." : "Cannot send SMS to this user"}
              rows={1}
              className="w-full px-4 py-2 pr-10 border border-stone-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none disabled:bg-stone-100 disabled:cursor-not-allowed"
              disabled={!canSend || sending}
            />

            {/* Emoji picker button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-summit-emerald rounded transition"
              disabled={!canSend || sending}
              title="Add emoji"
            >
              <EmojiEmotions className="w-5 h-5" />
            </button>

            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 w-64"
              >
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_OPTIONS.map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 text-xl hover:bg-summit-mint rounded-lg transition"
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend || sending || !message.trim()}
            className="flex items-center justify-center w-10 h-10 bg-summit-emerald hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {message.length > 0 && (
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${message.length > 320 ? 'text-red-600' : 'text-stone-500'}`}>
              {message.length}/320
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
