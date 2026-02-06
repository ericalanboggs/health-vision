import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail } from '../services/adminService'
import { ArrowBack, CheckCircle, Cancel, Autorenew, CalendarMonth, TipsAndUpdates, TrackChanges, Warning, Bolt } from '@mui/icons-material'
import ConversationView from '../components/admin/ConversationView'

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

  useEffect(() => {
    loadUserDetail()
  }, [userId])

  const loadUserDetail = async () => {
    setLoading(true)
    const { success, data: userData } = await getUserDetail(userId)
    if (success) {
      setData(userData)
    }
    setLoading(false)
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

  const { profile, pilotReadiness, healthVision, habits, reflections } = data

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
          <h1 className="text-3xl font-bold text-summit-forest">{profile.name}</h1>
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
          <h2 className="text-xl font-bold text-summit-forest mb-4">Current Habits</h2>
          {habits.length > 0 ? (
            <div className="space-y-4">
              {habits.map((habit, index) => (
                <div key={index} className="border border-stone-200 rounded-lg p-4">
                  <h3 className="font-medium text-summit-forest mb-2">{habit.name}</h3>
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 italic">No active habits</p>
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
          </div>

          {/* Right column - SMS Conversation (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
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
    </div>
  )
}
