import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail, getCoachingSessions, logCoachingSession, adminAddResource, adminDeleteResource, adminTogglePinResource, adminDeleteHabit, adminUpdateHabit, adminAddHabit, adminUpdateTrackingConfig } from '../services/adminService'
import { COACHING_CONFIG, getBillingPeriod } from '../services/subscriptionService'
import { ArrowBack, CheckCircle, Cancel, Autorenew, CalendarMonth, TipsAndUpdates, TrackChanges, Warning, Bolt, Forum, Edit as EditIcon, Close, Add, PushPin, PushPinOutlined, DeleteOutline, Chat } from '@mui/icons-material'
import { Tag } from '@summit/design-system'
import ConversationView from '../components/admin/ConversationView'
import SMSThreadsPanel from '../components/admin/SMSThreadsPanel'

/**
 * Derive coaching archetype from form data
 */
function getCoachingArchetype(formData) {
  if (!formData) return null

  const readiness = formData.readiness || 0
  const hasSpecificBarrier = formData.barriersNotes && formData.barriersNotes.length > 20
  const motivationDrivers = formData.motivationDrivers || []
  const feelingState = (formData.feelingState || '').toLowerCase()

  // Determine archetype
  if (readiness >= 4 && hasSpecificBarrier) {
    return {
      type: 'Optimizer',
      description: 'High readiness, specific barriers identified. Needs tactical precision, not motivation.',
      tone: 'Be specific and tactical. They know what they want—help them dial it in.'
    }
  }
  if (feelingState.includes('plateau') || feelingState.includes('stuck') || feelingState.includes('maintain')) {
    return {
      type: 'Restarter',
      description: 'Feeling stuck or plateaued. Has likely succeeded before.',
      tone: 'Acknowledge their frustration. Focus on breakthrough, not basics.'
    }
  }
  if (motivationDrivers.includes('Appearance') || motivationDrivers.includes('Energy')) {
    return {
      type: 'Performer',
      description: 'Motivated by visible results and energy.',
      tone: 'Goal-focused, measurable wins. Show them progress.'
    }
  }
  if (motivationDrivers.includes('Health') || motivationDrivers.includes('Longevity')) {
    return {
      type: 'Protector',
      description: 'Motivated by long-term health and sustainability.',
      tone: 'Reassuring, sustainable. Small steps compound.'
    }
  }
  if (readiness <= 2) {
    return {
      type: 'Seeker',
      description: 'Still exploring what works. Lower readiness.',
      tone: 'Exploratory, validating. Help them discover their path.'
    }
  }

  return {
    type: 'Explorer',
    description: 'Open to finding what works.',
    tone: 'Curious, supportive. Help them experiment.'
  }
}

export default function AdminUserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coachingSessions, setCoachingSessions] = useState([])
  const [sessionNotes, setSessionNotes] = useState('')
  const [loggingSession, setLoggingSession] = useState(false)
  const [editingResources, setEditingResources] = useState(false)
  const [showAddResourceForm, setShowAddResourceForm] = useState(false)
  const [addResourceForm, setAddResourceForm] = useState({ title: '', url: '', resource_type: 'link', duration_minutes: '', admin_note: '' })
  const [savingResource, setSavingResource] = useState(false)
  const [showThreadsPanel, setShowThreadsPanel] = useState(false)
  const [editingHabits, setEditingHabits] = useState(false)
  const [editingHabitName, setEditingHabitName] = useState(null)
  const [editHabitForm, setEditHabitForm] = useState({ name: '', days: [], reminderTime: '', trackingEnabled: false, trackingType: 'boolean', metricUnit: '', metricTarget: '' })
  const [showAddHabitForm, setShowAddHabitForm] = useState(false)
  const [addHabitForm, setAddHabitForm] = useState({ name: '', days: [], reminderTime: '' })
  const [savingHabit, setSavingHabit] = useState(false)

  useEffect(() => {
    loadUserDetail()
  }, [userId])

  const loadUserDetail = async () => {
    setLoading(true)
    const { success, data: userData } = await getUserDetail(userId)
    if (success) {
      setData(userData)
      // Fetch coaching sessions if user has a coaching-eligible tier
      const tier = userData.profile.subscriptionTier
      if (tier && COACHING_CONFIG[tier]?.sessionsPerMonth > 0) {
        const period = getBillingPeriod(userData.profile.subscriptionCurrentPeriodEnd)
        const sessionsResult = await getCoachingSessions(userId, period.start, period.end)
        if (sessionsResult.success) {
          setCoachingSessions(sessionsResult.data)
        }
      }
    }
    setLoading(false)
  }

  const handleLogSession = async () => {
    const tier = data.profile.subscriptionTier
    const config = COACHING_CONFIG[tier]
    if (!config) return

    setLoggingSession(true)
    const period = getBillingPeriod(data.profile.subscriptionCurrentPeriodEnd)
    const result = await logCoachingSession(userId, {
      durationMinutes: config.sessionDuration,
      notes: sessionNotes.trim() || null,
      billingPeriodStart: period.start,
      billingPeriodEnd: period.end,
    })

    if (result.success) {
      setSessionNotes('')
      // Refresh sessions
      const sessionsResult = await getCoachingSessions(userId, period.start, period.end)
      if (sessionsResult.success) {
        setCoachingSessions(sessionsResult.data)
      }
    }
    setLoggingSession(false)
  }

  const handleDeleteResource = async (resourceId) => {
    const result = await adminDeleteResource(resourceId)
    if (result.success) {
      setData(prev => ({
        ...prev,
        resources: prev.resources.filter(r => r.id !== resourceId)
      }))
    }
  }

  const handleTogglePin = async (resourceId, currentPinned) => {
    const result = await adminTogglePinResource(resourceId, currentPinned)
    if (result.success) {
      setData(prev => ({
        ...prev,
        resources: prev.resources.map(r =>
          r.id === resourceId ? { ...r, pinned: !currentPinned } : r
        )
      }))
    }
  }

  const handleAddResource = async () => {
    if (!addResourceForm.title.trim() || !addResourceForm.url.trim()) return
    setSavingResource(true)
    const result = await adminAddResource(userId, {
      title: addResourceForm.title.trim(),
      url: addResourceForm.url.trim(),
      resource_type: addResourceForm.resource_type,
      duration_minutes: addResourceForm.duration_minutes ? parseInt(addResourceForm.duration_minutes) : null,
      admin_note: addResourceForm.admin_note.trim() || null,
    })
    if (result.success) {
      setData(prev => ({
        ...prev,
        resources: [result.data, ...(prev.resources || [])]
      }))
      setAddResourceForm({ title: '', url: '', resource_type: 'link', duration_minutes: '', admin_note: '' })
      setShowAddResourceForm(false)
    }
    setSavingResource(false)
  }

  const handleDeleteHabit = async (habitName) => {
    const result = await adminDeleteHabit(userId, habitName)
    if (result.success) {
      setData(prev => ({
        ...prev,
        habits: prev.habits.filter(h => h.name !== habitName)
      }))
    }
  }

  const handleStartEditHabit = (habit) => {
    setEditingHabitName(habit.name)
    setEditHabitForm({
      name: habit.name,
      days: [...habit.days],
      reminderTime: habit.times[0] || '',
      trackingEnabled: habit.tracking?.enabled || false,
      trackingType: habit.tracking?.type || 'boolean',
      metricUnit: habit.tracking?.unit || '',
      metricTarget: habit.tracking?.target || '',
    })
  }

  const handleSaveEditHabit = async (originalName, habit) => {
    if (!editHabitForm.name.trim() || editHabitForm.days.length === 0) return
    setSavingHabit(true)
    const result = await adminUpdateHabit(userId, originalName, {
      name: editHabitForm.name.trim(),
      days: editHabitForm.days,
      reminderTime: editHabitForm.reminderTime || null,
      timezone: habit.timezone,
      challengeSlug: habit.challengeSlug,
    })
    // Save tracking config
    const habitNameForTracking = editHabitForm.name.trim()
    await adminUpdateTrackingConfig(userId, habitNameForTracking, {
      trackingEnabled: editHabitForm.trackingEnabled,
      trackingType: editHabitForm.trackingType,
      metricUnit: editHabitForm.metricUnit || null,
      metricTarget: editHabitForm.metricTarget ? Number(editHabitForm.metricTarget) : null,
    })
    if (result.success) {
      setData(prev => ({
        ...prev,
        habits: prev.habits.map(h =>
          h.name === originalName
            ? {
                ...h,
                name: habitNameForTracking,
                days: editHabitForm.days,
                times: editHabitForm.reminderTime ? [editHabitForm.reminderTime] : [],
                frequency: editHabitForm.days.length,
                tracking: {
                  enabled: editHabitForm.trackingEnabled,
                  type: editHabitForm.trackingType,
                  unit: editHabitForm.trackingType === 'metric' ? editHabitForm.metricUnit : null,
                  target: editHabitForm.trackingType === 'metric' ? editHabitForm.metricTarget : null,
                },
              }
            : h
        )
      }))
      setEditingHabitName(null)
    }
    setSavingHabit(false)
  }

  const handleAddHabit = async () => {
    if (!addHabitForm.name.trim() || addHabitForm.days.length === 0) return
    setSavingHabit(true)
    const result = await adminAddHabit(userId, {
      name: addHabitForm.name.trim(),
      days: addHabitForm.days,
      reminderTime: addHabitForm.reminderTime || null,
      timezone: profile?.timezone || null,
    })
    if (result.success) {
      setData(prev => ({
        ...prev,
        habits: [
          ...prev.habits,
          {
            name: addHabitForm.name.trim(),
            days: addHabitForm.days,
            times: addHabitForm.reminderTime ? [addHabitForm.reminderTime] : [],
            frequency: addHabitForm.days.length,
            createdAt: new Date().toISOString(),
            challengeSlug: null,
            timezone: profile?.timezone || null,
          }
        ]
      }))
      setAddHabitForm({ name: '', days: [], reminderTime: '' })
      setShowAddHabitForm(false)
    }
    setSavingHabit(false)
  }

  const toggleDay = (daysArray, setDays, day) => {
    if (daysArray.includes(day)) {
      setDays(daysArray.filter(d => d !== day))
    } else {
      setDays([...daysArray, day].sort())
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDayName = (dayNum) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[dayNum]
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes}${ampm}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">User not found</p>
          <button
            onClick={() => navigate('/admin')}
            className="text-summit-emerald hover:text-green-700 font-medium"
          >
            Back to Admin
          </button>
        </div>
      </div>
    )
  }

  const { profile, pilotReadiness, healthVision, habits, reflections, resources } = data

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="px-6 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-stone-600 hover:text-summit-forest font-medium transition-colors mb-2"
          >
            <ArrowBack className="w-5 h-5" />
            Back to Admin
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-summit-forest">{profile.name}</h1>
            <button
              onClick={() => setShowThreadsPanel(true)}
              className="p-2 text-stone-500 hover:text-summit-emerald hover:bg-stone-100 rounded-lg transition"
              title="Messages"
            >
              <Chat className="w-5 h-5" />
            </button>
          </div>
          <p className="text-stone-600 mt-1">{profile.email}</p>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - User details */}
          <div className="lg:col-span-2 space-y-6">
        {/* Coach Summary Card */}
        {healthVision && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TipsAndUpdates className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-bold text-summit-forest">Coach Summary</h2>
            </div>

            {/* Archetype */}
            {(() => {
              const archetype = getCoachingArchetype(healthVision)
              return archetype ? (
                <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-stone-600">Archetype:</span>
                    <span className="font-bold text-amber-700">{archetype.type}</span>
                    {healthVision.readiness && (
                      <span className="ml-auto text-sm text-stone-500">
                        Readiness: {healthVision.readiness}/5
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600 mb-2">{archetype.description}</p>
                  <p className="text-sm text-amber-800 font-medium">{archetype.tone}</p>
                </div>
              ) : null
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Driver */}
              {healthVision.whyMatters && (
                <div className="flex items-start gap-2">
                  <TrackChanges className="w-4 h-4 text-summit-emerald mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">Primary Driver:</span>
                    <p className="text-sm text-summit-forest">{healthVision.whyMatters}</p>
                  </div>
                </div>
              )}

              {/* Focus Area / Barrier */}
              {healthVision.barriersNotes && (
                <div className="flex items-start gap-2">
                  <Warning className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">Main Blocker:</span>
                    <p className="text-sm text-summit-forest">{healthVision.barriersNotes}</p>
                  </div>
                </div>
              )}

              {/* Non-negotiables */}
              {healthVision.nonNegotiables && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">Don't Touch:</span>
                    <p className="text-sm text-summit-forest">{healthVision.nonNegotiables}</p>
                  </div>
                </div>
              )}

              {/* Energizers */}
              {healthVision.energizers && (
                <div className="flex items-start gap-2">
                  <Bolt className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">What Energizes Them:</span>
                    <p className="text-sm text-summit-forest">{healthVision.energizers}</p>
                  </div>
                </div>
              )}

              {/* Strengths */}
              {healthVision.strengths && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-summit-emerald mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">What's Working:</span>
                    <p className="text-sm text-summit-forest">{healthVision.strengths}</p>
                  </div>
                </div>
              )}

              {/* Motivation Drivers */}
              {healthVision.motivationDrivers && healthVision.motivationDrivers.length > 0 && (
                <div className="flex items-start gap-2">
                  <TrackChanges className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-700">Motivated By:</span>
                    <p className="text-sm text-summit-forest">{healthVision.motivationDrivers.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Key Quote */}
            {(healthVision.feelingState || healthVision.gapsWants) && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-sm text-stone-600 italic">
                  "{healthVision.feelingState || healthVision.gapsWants}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* User Snapshot */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-summit-forest mb-4">User Snapshot</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-stone-600">Phone:</span>
              <span className="ml-2 font-medium text-summit-forest">{profile.phone}</span>
            </div>
            <div>
              <span className="text-stone-600">SMS Opt-in:</span>
              <span className="ml-2 font-medium text-summit-forest">
                {profile.smsOptIn ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-stone-600">Account Created:</span>
              <span className="ml-2 font-medium text-summit-forest">{formatDate(profile.createdAt)}</span>
            </div>
            <div>
              <span className="text-stone-600">Last Login:</span>
              <span className="ml-2 font-medium text-summit-forest">{formatDate(profile.lastLogin)}</span>
            </div>
            <div>
              <span className="text-stone-600">Timezone:</span>
              <span className="ml-2 font-medium text-summit-forest">{profile.timezone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Coaching Sessions — only for plus/premium */}
        {(() => {
          const tier = profile.subscriptionTier
          const config = tier ? COACHING_CONFIG[tier] : null
          if (!config || config.sessionsPerMonth === 0) return null

          const period = getBillingPeriod(profile.subscriptionCurrentPeriodEnd)
          const sessionsUsed = coachingSessions.length

          return (
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Forum className="w-5 h-5 text-summit-emerald" />
                <h2 className="text-xl font-bold text-summit-forest">Coaching Sessions</h2>
              </div>

              <div className="text-sm text-stone-600 space-y-1 mb-4">
                <div>
                  <span className="font-medium">Tier:</span>{' '}
                  <span className="capitalize">{tier}</span> — {config.sessionDuration} min, {config.sessionsPerMonth}/month
                </div>
                <div>
                  <span className="font-medium">This period:</span>{' '}
                  {sessionsUsed} of {config.sessionsPerMonth} used ({period.start} to {period.end})
                </div>
              </div>

              {/* Session history */}
              {coachingSessions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {coachingSessions.map((session) => (
                    <div key={session.id} className="border border-stone-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-summit-forest">
                          {new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-stone-500">{session.duration_minutes} min</span>
                      </div>
                      {session.notes && (
                        <p className="text-stone-600 mt-1">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Log session form */}
              <div className="border-t border-stone-200 pt-4">
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Session notes (optional)"
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent mb-3 resize-none"
                />
                <button
                  onClick={handleLogSession}
                  disabled={loggingSession}
                  className="px-4 py-2 bg-summit-emerald text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loggingSession ? 'Logging...' : 'Log Session'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* Pilot Readiness Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-summit-forest mb-4">Pilot Readiness</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {pilotReadiness.hasLoggedIn ? (
                <CheckCircle className="w-5 h-5 text-summit-emerald" />
              ) : (
                <Cancel className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasLoggedIn ? 'text-summit-forest' : 'text-stone-500'}>
                Logged in at least once
              </span>
            </div>
            <div className="flex items-center gap-3">
              {pilotReadiness.hasHealthVision ? (
                <CheckCircle className="w-5 h-5 text-summit-emerald" />
              ) : (
                <Cancel className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasHealthVision ? 'text-summit-forest' : 'text-stone-500'}>
                Health vision set
              </span>
            </div>
            <div className="flex items-center gap-3">
              {pilotReadiness.hasActiveHabits ? (
                <CheckCircle className="w-5 h-5 text-summit-emerald" />
              ) : (
                <Cancel className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasActiveHabits ? 'text-summit-forest' : 'text-stone-500'}>
                At least 1 active weekly habit
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200">
            {pilotReadiness.ready ? (
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle className="w-5 h-5" />
                Pilot Ready
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Cancel className="w-5 h-5" />
                Not Pilot Ready
              </div>
            )}
          </div>
        </div>

        {/* Health Vision */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-summit-forest mb-4">Health Vision</h2>
          {healthVision?.visionStatement ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Vision Statement</h3>
                <p className="text-summit-forest whitespace-pre-wrap">{healthVision.visionStatement}</p>
              </div>
              {healthVision.whyMatters && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Why It Matters</h3>
                  <p className="text-summit-forest whitespace-pre-wrap">{healthVision.whyMatters}</p>
                </div>
              )}
              {healthVision.feelingState && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Feeling State</h3>
                  <p className="text-summit-forest whitespace-pre-wrap">{healthVision.feelingState}</p>
                </div>
              )}
              {healthVision.futureAbilities && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Future Abilities</h3>
                  <p className="text-summit-forest whitespace-pre-wrap">{healthVision.futureAbilities}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-stone-500 italic">No health vision set</p>
          )}
        </div>

        {/* Current Habits */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-summit-forest">Current Habits</h2>
            <button
              onClick={() => { setEditingHabits(!editingHabits); setEditingHabitName(null); setShowAddHabitForm(false) }}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-summit-forest transition-colors"
              title={editingHabits ? 'Exit edit mode' : 'Edit habits'}
            >
              {editingHabits ? <Close className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
            </button>
          </div>
          {habits.length > 0 ? (
            <div className="space-y-4">
              {habits.map((habit, index) => (
                <div key={index} className="border border-stone-200 rounded-lg p-4">
                  {editingHabitName === habit.name ? (
                    /* Inline edit form */
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editHabitForm.name}
                        onChange={(e) => setEditHabitForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Habit name"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                      />
                      <div>
                        <span className="text-sm font-medium text-stone-600 mb-1 block">Days</span>
                        <div className="flex gap-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                            <button
                              key={i}
                              onClick={() => toggleDay(editHabitForm.days, (d) => setEditHabitForm(f => ({ ...f, days: d })), i)}
                              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                                editHabitForm.days.includes(i)
                                  ? 'bg-summit-emerald text-white'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="time"
                        value={editHabitForm.reminderTime}
                        onChange={(e) => setEditHabitForm(f => ({ ...f, reminderTime: e.target.value }))}
                        className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                      />
                      {/* Tracking config */}
                      <div className="border-t border-stone-200 pt-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-stone-600">Tracking</span>
                          <button
                            type="button"
                            onClick={() => setEditHabitForm(f => ({ ...f, trackingEnabled: !f.trackingEnabled }))}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              editHabitForm.trackingEnabled ? 'bg-summit-emerald' : 'bg-stone-300'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              editHabitForm.trackingEnabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                          <span className="text-xs text-stone-500">{editHabitForm.trackingEnabled ? 'On' : 'Off'}</span>
                        </div>
                        {editHabitForm.trackingEnabled && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={editHabitForm.trackingType}
                              onChange={(e) => setEditHabitForm(f => ({ ...f, trackingType: e.target.value }))}
                              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald"
                            >
                              <option value="boolean">Yes / No</option>
                              <option value="metric">Metric</option>
                            </select>
                            {editHabitForm.trackingType === 'metric' && (
                              <>
                                <input
                                  type="text"
                                  value={editHabitForm.metricUnit}
                                  onChange={(e) => setEditHabitForm(f => ({ ...f, metricUnit: e.target.value }))}
                                  placeholder="Unit (e.g. minutes)"
                                  className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-summit-emerald"
                                />
                                <input
                                  type="number"
                                  value={editHabitForm.metricTarget}
                                  onChange={(e) => setEditHabitForm(f => ({ ...f, metricTarget: e.target.value }))}
                                  placeholder="Target"
                                  className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-summit-emerald"
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEditHabit(habit.name, habit)}
                          disabled={savingHabit || !editHabitForm.name.trim() || editHabitForm.days.length === 0}
                          className="px-4 py-2 bg-summit-emerald text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {savingHabit ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingHabitName(null)}
                          className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only view */
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-summit-forest">{habit.name}</h3>
                          {habit.challengeSlug && (
                            <Tag variant="info" size="sm">{habit.challengeSlug}</Tag>
                          )}
                        </div>
                        {editingHabits && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEditHabit(habit)}
                              className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-summit-emerald transition-colors"
                              title="Edit habit"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteHabit(habit.name)}
                              className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                              title="Delete habit"
                            >
                              <DeleteOutline className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-stone-600 space-y-1">
                        <div>
                          <span className="font-medium">Frequency:</span> {habit.frequency} day{habit.frequency !== 1 ? 's' : ''}/week
                        </div>
                        <div>
                          <span className="font-medium">Days:</span> {habit.days.map(d => getDayName(d)).join(', ')}
                        </div>
                        {habit.times.length > 0 && (
                          <div>
                            <span className="font-medium">Time:</span> {habit.times.map(t => formatTime(t)).join(', ')}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Week:</span> {habit.weekNumber}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(habit.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Tracking:</span>{' '}
                          {habit.tracking?.enabled
                            ? habit.tracking.type === 'boolean'
                              ? 'Yes/No'
                              : `${habit.tracking.unit || 'metric'}${habit.tracking.target ? ` (target: ${habit.tracking.target})` : ''}`
                            : 'Off'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 italic">No active habits</p>
          )}

          {/* Add Habit button */}
          {editingHabits && !showAddHabitForm && (
            <button
              onClick={() => setShowAddHabitForm(true)}
              className="mt-4 flex items-center gap-2 text-sm text-summit-emerald hover:text-green-700 font-medium transition-colors"
            >
              <Add className="w-4 h-4" />
              Add Habit
            </button>
          )}

          {/* Add Habit form */}
          {editingHabits && showAddHabitForm && (
            <div className="mt-4 border border-stone-200 rounded-lg p-4 space-y-3">
              <input
                type="text"
                value={addHabitForm.name}
                onChange={(e) => setAddHabitForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Habit name *"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
              />
              <div>
                <span className="text-sm font-medium text-stone-600 mb-1 block">Days *</span>
                <div className="flex gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(addHabitForm.days, (d) => setAddHabitForm(f => ({ ...f, days: d })), i)}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                        addHabitForm.days.includes(i)
                          ? 'bg-summit-emerald text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="time"
                value={addHabitForm.reminderTime}
                onChange={(e) => setAddHabitForm(f => ({ ...f, reminderTime: e.target.value }))}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddHabit}
                  disabled={savingHabit || !addHabitForm.name.trim() || addHabitForm.days.length === 0}
                  className="px-4 py-2 bg-summit-emerald text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {savingHabit ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowAddHabitForm(false)
                    setAddHabitForm({ name: '', days: [], reminderTime: '' })
                  }}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Reflections */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-summit-forest mb-4">Weekly Reflections</h2>
          {reflections.length > 0 ? (
            <div className="space-y-4">
              {reflections.map((reflection) => (
                <div key={reflection.id} className="border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarMonth className="w-4 h-4 text-stone-600" />
                    <span className="text-sm font-medium text-stone-700">
                      Week {reflection.week_number}
                    </span>
                    <span className="text-sm text-stone-500">
                      • {formatDate(reflection.created_at)}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    {reflection.went_well && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">What went well:</h4>
                        <p className="text-summit-forest whitespace-pre-wrap">{reflection.went_well}</p>
                      </div>
                    )}
                    {reflection.friction && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">Friction points:</h4>
                        <p className="text-summit-forest whitespace-pre-wrap">{reflection.friction}</p>
                      </div>
                    )}
                    {reflection.adjustment && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">Adjustments:</h4>
                        <p className="text-summit-forest whitespace-pre-wrap">{reflection.adjustment}</p>
                      </div>
                    )}
                    {reflection.app_feedback && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">App feedback:</h4>
                        <p className="text-summit-forest whitespace-pre-wrap">{reflection.app_feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 italic">No reflections submitted yet</p>
          )}
        </div>

        {/* Current Resources */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-summit-forest">Current Resources</h2>
            <button
              onClick={() => { setEditingResources(!editingResources); setShowAddResourceForm(false) }}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-summit-forest transition-colors"
              title={editingResources ? 'Exit edit mode' : 'Edit resources'}
            >
              {editingResources ? <Close className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
            </button>
          </div>
          {resources && resources.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(
                resources.reduce((groups, r) => {
                  const week = r.week_number ?? 'Admin'
                  if (!groups[week]) groups[week] = []
                  groups[week].push(r)
                  return groups
                }, {})
              ).map(([week, items]) => (
                <div key={week}>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">
                    {week === 'Admin' ? 'Admin-assigned' : `Week ${week}`}
                  </h3>
                  <div className="space-y-2">
                    {items.map((resource) => (
                      <div
                        key={resource.id}
                        className={`flex items-center gap-2 text-sm rounded-lg p-2 -mx-2 ${
                          resource.pinned ? 'border-l-2 border-summit-emerald/40 bg-summit-mint/20 pl-3' : ''
                        }`}
                      >
                        <span className="flex-shrink-0">
                          {resource.pinned && <PushPin className="w-4 h-4 text-summit-emerald" />}
                          {!resource.pinned && resource.resource_type === 'youtube' && '\uD83C\uDFA5'}
                          {!resource.pinned && resource.resource_type === 'podcast' && '\uD83C\uDF99\uFE0F'}
                          {!resource.pinned && resource.resource_type === 'article' && '\uD83D\uDCD6'}
                          {!resource.pinned && !['youtube', 'podcast', 'article'].includes(resource.resource_type) && '\uD83D\uDD17'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-summit-emerald hover:text-green-700 font-medium hover:underline"
                          >
                            {resource.title}
                          </a>
                          {resource.admin_note && (
                            <div className="mt-1">
                              <Tag variant="info" size="sm">{resource.admin_note}</Tag>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-stone-500">
                            {resource.source && <span>{resource.source}</span>}
                            {resource.duration_minutes && (
                              <span>{resource.duration_minutes} min</span>
                            )}
                            {resource.origin === 'admin' && (
                              <span className="text-xs text-amber-600">admin</span>
                            )}
                          </div>
                        </div>
                        {editingResources && (
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => handleTogglePin(resource.id, resource.pinned)}
                              className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-summit-emerald transition-colors"
                              title={resource.pinned ? 'Unpin' : 'Pin'}
                            >
                              {resource.pinned
                                ? <PushPin className="w-4 h-4 text-summit-emerald" />
                                : <PushPinOutlined className="w-4 h-4" />
                              }
                            </button>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                              title="Delete resource"
                            >
                              <DeleteOutline className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 italic">No resources yet</p>
          )}

          {/* Add Resource Form */}
          {editingResources && !showAddResourceForm && (
            <button
              onClick={() => setShowAddResourceForm(true)}
              className="mt-4 flex items-center gap-2 text-sm text-summit-emerald hover:text-green-700 font-medium transition-colors"
            >
              <Add className="w-4 h-4" />
              Add Resource
            </button>
          )}

          {editingResources && showAddResourceForm && (
            <div className="mt-4 border border-stone-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={addResourceForm.title}
                  onChange={(e) => setAddResourceForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Title *"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                />
                <input
                  type="url"
                  value={addResourceForm.url}
                  onChange={(e) => setAddResourceForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="URL *"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                />
                <select
                  value={addResourceForm.resource_type}
                  onChange={(e) => setAddResourceForm(f => ({ ...f, resource_type: e.target.value }))}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent bg-white"
                >
                  <option value="link">Link</option>
                  <option value="youtube">YouTube</option>
                  <option value="podcast">Podcast</option>
                  <option value="article">Article</option>
                </select>
                <input
                  type="number"
                  value={addResourceForm.duration_minutes}
                  onChange={(e) => setAddResourceForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="Duration (min)"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                />
              </div>
              <input
                type="text"
                value={addResourceForm.admin_note}
                onChange={(e) => setAddResourceForm(f => ({ ...f, admin_note: e.target.value }))}
                placeholder="Coach's note (optional)"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddResource}
                  disabled={savingResource || !addResourceForm.title.trim() || !addResourceForm.url.trim()}
                  className="px-4 py-2 bg-summit-emerald text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {savingResource ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowAddResourceForm(false)
                    setAddResourceForm({ title: '', url: '', resource_type: 'link', duration_minutes: '', admin_note: '' })
                  }}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
          </div>

          {/* Right column - SMS Conversation (sticky, full viewport height) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)] flex flex-col">
              <ConversationView
                userId={profile.id}
                userName={profile.name}
                phone={profile.phone}
                smsOptIn={profile.smsOptIn}
              />
            </div>
          </div>
        </div>
      </main>

      <SMSThreadsPanel
        isOpen={showThreadsPanel}
        onClose={() => setShowThreadsPanel(false)}
      />
    </div>
  )
}
