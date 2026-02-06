import { useState, useEffect, useRef } from 'react'
import { Send, EmojiEmotions, Autorenew, SmsOutlined, Add, Chat, Close, Image, AttachFile } from '@mui/icons-material'
import { getConversation, sendAdminSMS } from '../../services/adminService'

// Summit-themed emoji palette
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

// Quick reply templates - use {{name}} for personalization
const MESSAGE_TEMPLATES = [
  {
    category: 'Check-ins',
    templates: [
      { label: 'Quick check-in', text: 'Hey {{name}}! 🏔️ Quick check-in - how are things going with your habits this week?' },
      { label: 'Energy check', text: 'Hi {{name}}! How\'s your energy been lately? Any wins to celebrate? 💪' },
      { label: 'Weekly pulse', text: '{{name}} - checking in! How did this week feel overall? 1-10?' },
    ]
  },
  {
    category: 'Encouragement',
    templates: [
      { label: 'Keep going', text: 'Hey {{name}}! Just wanted to say - keep going! Every small step counts. 🔥' },
      { label: 'Proud of you', text: '{{name}} - I see you putting in the work. Really proud of your progress! ⭐' },
      { label: 'You got this', text: 'Thinking of you {{name}}! Remember why you started. You\'ve got this! 🏔️' },
    ]
  },
  {
    category: 'Nudges',
    templates: [
      { label: 'Gentle reminder', text: 'Hey {{name}}! Friendly nudge - don\'t forget about your habits today. Small wins! ✅' },
      { label: 'Miss you', text: 'Hi {{name}}! Haven\'t seen you in a bit. Everything okay? Here if you need anything.' },
      { label: 'Get back on track', text: '{{name}} - no judgment, just checking in. Ready to get back on track? I\'m here to help! 💪' },
    ]
  },
  {
    category: 'Celebrations',
    templates: [
      { label: 'Milestone', text: '🎉 {{name}}! You hit a milestone! So proud of your consistency. Keep crushing it!' },
      { label: 'Streak', text: '{{name}} - look at that streak! 🔥 You\'re building real momentum. Amazing work!' },
      { label: 'Progress', text: 'Wow {{name}}! Your progress this week has been incredible. You should be proud! 🏔️' },
    ]
  },
]

/**
 * 2-way SMS conversation view for a single user
 */
export default function ConversationView({ userId, userName, phone, smsOptIn }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const templatesRef = useRef(null)
  const addMenuRef = useRef(null)

  // Extract first name for templates
  const firstName = userName?.split(' ')[0] || 'there'

  // Load conversation on mount
  useEffect(() => {
    loadConversation()
  }, [userId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
      if (templatesRef.current && !templatesRef.current.contains(e.target)) {
        setShowTemplates(false)
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false)
      }
    }

    if (showEmojiPicker || showTemplates || showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker, showTemplates, showAddMenu])

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

  const selectTemplate = (template) => {
    // Replace {{name}} with actual first name
    const personalizedMessage = template.text.replace(/\{\{name\}\}/g, firstName)
    setMessage(personalizedMessage)
    setShowTemplates(false)
    textareaRef.current?.focus()
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
      await loadConversation()
    } else {
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
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-2">
          <SmsOutlined className="w-5 h-5 text-summit-emerald" />
          <h2 className="text-lg font-bold text-summit-forest">SMS Conversation</h2>
        </div>
        {!canSend && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            {!phone || phone === 'N/A' ? 'No phone' : 'Opted out'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 h-72 overflow-y-auto p-4 space-y-3 bg-stone-50">
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
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  msg.direction === 'outbound'
                    ? 'bg-summit-emerald text-white rounded-br-sm'
                    : 'bg-white border border-stone-200 text-summit-forest rounded-bl-sm'
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

      {/* Compose Area */}
      <div className="border-t border-stone-200 bg-white">
        {/* Text Input */}
        <div className="p-3 pb-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canSend ? "Write a message..." : "Cannot send SMS"}
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none disabled:bg-stone-100 disabled:cursor-not-allowed text-sm"
              disabled={!canSend || sending}
            />

            {/* Emoji picker button - inside textarea */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker)
                setShowTemplates(false)
                setShowAddMenu(false)
              }}
              className="absolute right-2 top-2 p-1 text-stone-400 hover:text-summit-emerald rounded transition"
              disabled={!canSend || sending}
              title="Add emoji"
            >
              <EmojiEmotions className="w-5 h-5" />
            </button>

            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 w-64"
              >
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_OPTIONS.map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 text-lg hover:bg-summit-mint rounded-lg transition"
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* Add Button */}
            <div className="relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAddMenu(!showAddMenu)
                  setShowTemplates(false)
                  setShowEmojiPicker(false)
                }}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
                disabled={!canSend || sending}
                title="Add attachment"
              >
                <Add className="w-5 h-5" />
              </button>

              {/* Add Menu Dropdown */}
              {showAddMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 w-48">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-400 cursor-not-allowed"
                    disabled
                  >
                    <Image className="w-5 h-5" />
                    <span>Photo</span>
                    <span className="ml-auto text-xs bg-stone-100 px-1.5 py-0.5 rounded">Soon</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-400 cursor-not-allowed"
                    disabled
                  >
                    <AttachFile className="w-5 h-5" />
                    <span>File</span>
                    <span className="ml-auto text-xs bg-stone-100 px-1.5 py-0.5 rounded">Soon</span>
                  </button>
                </div>
              )}
            </div>

            {/* Templates Button */}
            <div className="relative" ref={templatesRef}>
              <button
                type="button"
                onClick={() => {
                  setShowTemplates(!showTemplates)
                  setShowAddMenu(false)
                  setShowEmojiPicker(false)
                }}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
                disabled={!canSend || sending}
                title="Quick replies"
              >
                <Chat className="w-5 h-5" />
              </button>

              {/* Templates Dropdown */}
              {showTemplates && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 w-72 max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Quick Replies</span>
                  </div>
                  {MESSAGE_TEMPLATES.map((category) => (
                    <div key={category.category}>
                      <div className="px-3 py-1.5 bg-stone-50">
                        <span className="text-xs font-medium text-stone-600">{category.category}</span>
                      </div>
                      {category.templates.map((template) => (
                        <button
                          key={template.label}
                          onClick={() => selectTemplate(template)}
                          className="w-full text-left px-3 py-2 hover:bg-summit-mint transition"
                        >
                          <span className="text-sm text-summit-forest">{template.label}</span>
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                            {template.text.replace(/\{\{name\}\}/g, firstName)}
                          </p>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: character count + send */}
          <div className="flex items-center gap-2">
            {message.length > 0 && (
              <span className={`text-xs ${message.length > 320 ? 'text-red-600' : 'text-stone-400'}`}>
                {message.length}/320
              </span>
            )}
            <button
              onClick={handleSend}
              disabled={!canSend || sending || !message.trim()}
              className="p-2 bg-summit-emerald hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-stone-400 text-white rounded-full transition"
            >
              {sending ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
