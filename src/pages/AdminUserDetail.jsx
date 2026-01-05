import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail } from '../services/adminService'
import { ArrowLeft, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">User not found</p>
          <button
            onClick={() => navigate('/admin')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Back to Admin
          </button>
        </div>
      </div>
    )
  }

  const { profile, pilotReadiness, healthVision, habits, reflections } = data

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Admin
          </button>
          <h1 className="text-3xl font-bold text-stone-900">{profile.name}</h1>
          <p className="text-stone-600 mt-1">{profile.email}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* User Snapshot */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">User Snapshot</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-stone-600">Phone:</span>
              <span className="ml-2 font-medium text-stone-900">{profile.phone}</span>
            </div>
            <div>
              <span className="text-stone-600">SMS Opt-in:</span>
              <span className="ml-2 font-medium text-stone-900">
                {profile.smsOptIn ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-stone-600">Account Created:</span>
              <span className="ml-2 font-medium text-stone-900">{formatDate(profile.createdAt)}</span>
            </div>
            <div>
              <span className="text-stone-600">Last Login:</span>
              <span className="ml-2 font-medium text-stone-900">{formatDate(profile.lastLogin)}</span>
            </div>
            <div>
              <span className="text-stone-600">Timezone:</span>
              <span className="ml-2 font-medium text-stone-900">{profile.timezone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Pilot Readiness Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Pilot Readiness</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {pilotReadiness.hasLoggedIn ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasLoggedIn ? 'text-stone-900' : 'text-stone-500'}>
                Logged in at least once
              </span>
            </div>
            <div className="flex items-center gap-3">
              {pilotReadiness.hasHealthVision ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasHealthVision ? 'text-stone-900' : 'text-stone-500'}>
                Health vision set
              </span>
            </div>
            <div className="flex items-center gap-3">
              {pilotReadiness.hasActiveHabits ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-stone-400" />
              )}
              <span className={pilotReadiness.hasActiveHabits ? 'text-stone-900' : 'text-stone-500'}>
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
                <XCircle className="w-5 h-5" />
                Not Pilot Ready
              </div>
            )}
          </div>
        </div>

        {/* Health Vision */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Health Vision</h2>
          {healthVision?.visionStatement ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Vision Statement</h3>
                <p className="text-stone-900 whitespace-pre-wrap">{healthVision.visionStatement}</p>
              </div>
              {healthVision.whyMatters && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Why It Matters</h3>
                  <p className="text-stone-900 whitespace-pre-wrap">{healthVision.whyMatters}</p>
                </div>
              )}
              {healthVision.feelingState && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Feeling State</h3>
                  <p className="text-stone-900 whitespace-pre-wrap">{healthVision.feelingState}</p>
                </div>
              )}
              {healthVision.futureAbilities && (
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Future Abilities</h3>
                  <p className="text-stone-900 whitespace-pre-wrap">{healthVision.futureAbilities}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-stone-500 italic">No health vision set</p>
          )}
        </div>

        {/* Current Habits */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Current Habits</h2>
          {habits.length > 0 ? (
            <div className="space-y-4">
              {habits.map((habit, index) => (
                <div key={index} className="border border-stone-200 rounded-lg p-4">
                  <h3 className="font-medium text-stone-900 mb-2">{habit.name}</h3>
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
          <h2 className="text-xl font-bold text-stone-900 mb-4">Weekly Reflections</h2>
          {reflections.length > 0 ? (
            <div className="space-y-4">
              {reflections.map((reflection) => (
                <div key={reflection.id} className="border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-stone-600" />
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
                        <p className="text-stone-900 whitespace-pre-wrap">{reflection.went_well}</p>
                      </div>
                    )}
                    {reflection.friction && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">Friction points:</h4>
                        <p className="text-stone-900 whitespace-pre-wrap">{reflection.friction}</p>
                      </div>
                    )}
                    {reflection.adjustment && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">Adjustments:</h4>
                        <p className="text-stone-900 whitespace-pre-wrap">{reflection.adjustment}</p>
                      </div>
                    )}
                    {reflection.app_feedback && (
                      <div>
                        <h4 className="font-medium text-stone-700 mb-1">App feedback:</h4>
                        <p className="text-stone-900 whitespace-pre-wrap">{reflection.app_feedback}</p>
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
      </main>
    </div>
  )
}
