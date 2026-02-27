import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowBack, AutoAwesome, Refresh, Autorenew, CheckCircle } from '@mui/icons-material'
import { Button, Card, Input } from '@summit/design-system'
import { getChallengeBySlug, getFocusAreaForWeek } from '../data/challengeConfig'
import { getActiveEnrollment, logChallengeHabit, getEffectiveWeek } from '../services/challengeService'
import { saveHabits } from '../services/habitService'
import { saveTrackingConfig, getAiSuggestion } from '../services/trackingService'
import { getCurrentUser, getProfile } from '../services/authService'
import { loadJourney } from '../services/journeyService'
import { generateChallengeHabitSuggestions } from '../utils/aiService'

export default function ChallengeAddHabit() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const challenge = getChallengeBySlug(slug)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [focusArea, setFocusArea] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [customHabit, setCustomHabit] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [phase, setPhase] = useState('select') // 'select' or 'schedule'
  const [userTimezone, setUserTimezone] = useState('America/Chicago')
  const [dayCommitments, setDayCommitments] = useState([])
  const [timePreference, setTimePreference] = useState('mid-morning')

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayMap = {
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4,
    'Fri': 5, 'Sat': 6, 'Sun': 0
  }
  const timeOfDayOptions = [
    { label: 'Early Morning (6-8am)', value: 'early-morning', hour: 6 },
    { label: 'Mid-Morning (8-10am)', value: 'mid-morning', hour: 8 },
    { label: 'Lunch Time (12-1pm)', value: 'lunch', hour: 12 },
    { label: 'Early Afternoon (1-3pm)', value: 'early-afternoon', hour: 13 },
    { label: 'Afternoon (3-5pm)', value: 'afternoon', hour: 15 },
    { label: 'After Work (5-7pm)', value: 'after-work', hour: 17 },
    { label: 'Before Bedtime (9-10pm)', value: 'bedtime', hour: 21 }
  ]

  useEffect(() => {
    if (!challenge) return
    const load = async () => {
      const { success, user } = await getCurrentUser()
      if (!success || !user) {
        navigate('/challenges')
        return
      }
      setUserId(user.id)

      // Load enrollment, profile, and vision data in parallel
      const [enrollResult, profileResult, journeyResult] = await Promise.all([
        getActiveEnrollment(user.id),
        getProfile(user.id),
        loadJourney(),
      ])

      if (!enrollResult.success || !enrollResult.data || enrollResult.data.challenge_slug !== slug) {
        navigate(`/challenges/${slug}`)
        return
      }

      const enroll = enrollResult.data
      setEnrollment(enroll)

      if (profileResult.success && profileResult.data?.timezone) {
        setUserTimezone(profileResult.data.timezone)
      }

      // Determine focus area for current week
      // Use saved order if available
      const savedOrder = enroll.survey_scores?.focusAreaOrder
      const weekForHabit = getEffectiveWeek(enroll) || 1
      let fa
      if (savedOrder) {
        const faSlug = savedOrder[weekForHabit - 1]
        fa = challenge.focusAreas.find(f => f.slug === faSlug)
      }
      if (!fa) {
        fa = getFocusAreaForWeek(challenge, weekForHabit)
      }
      setFocusArea(fa)

      // Generate AI suggestions
      setGenerating(true)
      const visionData = journeyResult.success ? journeyResult.data?.form_data : null
      try {
        const aiSuggestions = await generateChallengeHabitSuggestions(
          fa,
          visionData,
          enroll.survey_scores
        )
        if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
          setSuggestions(aiSuggestions.slice(0, 5))
        } else {
          setDefaultSuggestions(fa)
        }
      } catch {
        setDefaultSuggestions(fa)
      }
      setGenerating(false)
      setLoading(false)
    }
    load()
  }, [slug])

  const setDefaultSuggestions = (fa) => {
    setSuggestions(
      fa.defaultHabits.map(h => ({
        action: h,
        why: 'Research-backed habit for this focus area',
        tip: 'Start small and build consistency',
      }))
    )
  }

  const handleRefresh = async () => {
    if (!focusArea) return
    setGenerating(true)
    try {
      const journeyResult = await loadJourney()
      const visionData = journeyResult.success ? journeyResult.data?.form_data : null
      const aiSuggestions = await generateChallengeHabitSuggestions(
        focusArea,
        visionData,
        enrollment.survey_scores
      )
      if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
        setSuggestions(aiSuggestions.slice(0, 5))
        setSelectedIndex(null)
      } else {
        setDefaultSuggestions(focusArea)
      }
    } catch {
      setDefaultSuggestions(focusArea)
    }
    setGenerating(false)
  }

  const handleAddCustom = () => {
    const trimmed = customHabit.trim()
    if (!trimmed) return
    if (trimmed.length > 200) {
      alert('Habit name must be 200 characters or less.')
      return
    }
    const newIndex = suggestions.length
    setSuggestions(prev => [...prev, {
      action: trimmed,
      why: 'Your personal habit goal',
      tip: 'Set specific days and times to make this a routine',
    }])
    setSelectedIndex(newIndex)
    setCustomHabit('')
    setShowCustomInput(false)
    setPhase('schedule')
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setPhase('schedule')
  }

  const handleSave = async () => {
    if (saving || dayCommitments.length === 0 || selectedIndex === null) return
    setSaving(true)

    try {
      const habit = suggestions[selectedIndex]
      const timeOption = timeOfDayOptions.find(opt => opt.value === timePreference)
      const reminderTime = `${String(timeOption.hour).padStart(2, '0')}:00:00`

      // Build habit rows for each selected day
      const habitRows = dayCommitments.map(day => ({
        habit_name: habit.action,
        day_of_week: dayMap[day],
        reminder_time: reminderTime,
        time_of_day: reminderTime,
        timezone: userTimezone,
        challenge_slug: slug,
      }))

      // Save to weekly_habits with challenge_slug
      const { success: habitSaved } = await saveHabits(habitRows)

      if (!habitSaved) {
        alert('Failed to save habit. Please try again.')
        setSaving(false)
        return
      }

      // Save tracking config with challenge_slug
      await saveTrackingConfig(habit.action, {
        tracking_enabled: false,
        tracking_type: 'boolean',
        challenge_slug: slug,
      })

      // Log in challenge_habit_log
      const faSlug = focusArea.slug
      await logChallengeHabit(enrollment.id, getEffectiveWeek(enrollment) || 1, faSlug, habit.action)

      navigate('/habits')
    } catch (error) {
      console.error('Error saving challenge habit:', error)
      alert('Failed to save habit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!challenge) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-text-secondary">Challenge not found.</p>
      </main>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
        <p className="ml-3 text-text-secondary">
          {enrollment
            ? `Preparing Week ${getEffectiveWeek(enrollment) || 1} habit challenge options...`
            : 'Preparing your challenge habit options...'}
        </p>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => phase === 'schedule' ? setPhase('select') : navigate(`/challenges/${slug}`)}
        className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors mb-6"
      >
        <ArrowBack className="w-5 h-5" />
        {phase === 'schedule' ? 'Back' : 'Back to Challenge'}
      </button>

      {/* Focus area context */}
      {focusArea && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{challenge.icon}</span>
            <span className="text-xs font-semibold text-summit-emerald bg-summit-mint px-2 py-0.5 rounded-full">
              Week {getEffectiveWeek(enrollment) || 1}
            </span>
          </div>
          <h1 className="text-h1 text-summit-forest mb-1">{focusArea.title}</h1>
          <p className="text-body text-text-secondary">{focusArea.description}</p>
        </div>
      )}

      {phase === 'select' ? (
        <>
          {/* Evidence card */}
          <div className="bg-summit-mint border border-summit-sage rounded-lg p-4 mb-6">
            <p className="text-sm text-summit-forest italic mb-1">{focusArea.evidence}</p>
            <p className="text-xs text-text-muted">— {focusArea.evidenceSource}</p>
          </div>

          {/* AI suggestions header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AutoAwesome className="w-5 h-5 text-summit-lime" />
              <span className="text-body-sm font-semibold text-summit-forest">Choose a {focusArea?.title} Habit</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={generating}
              className="text-body-sm text-summit-forest hover:text-summit-emerald font-medium flex items-center gap-1 transition-colors"
            >
              <Refresh className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {generating ? (
            <div className="flex items-center justify-center py-12">
              <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
              <p className="ml-3 text-text-secondary">Generating ideas...</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedIndex === index

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-summit-mint border-summit-emerald'
                        : 'bg-white border-gray-200 hover:border-summit-sage'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-summit-emerald bg-summit-emerald' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-summit-forest">{suggestion.action}</p>
                        <p className="text-sm text-text-secondary mt-1">
                          <strong>Why:</strong> {suggestion.why}
                        </p>
                        <p className="text-sm text-text-muted mt-0.5">
                          <strong>Tip:</strong> {suggestion.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add my own */}
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 hover:border-summit-emerald rounded-xl text-text-secondary hover:text-summit-emerald font-medium transition-all text-center"
                >
                  + Add my own habit
                </button>
              ) : (
                <div className="p-4 border-2 border-summit-emerald bg-summit-mint rounded-xl">
                  <Input
                    type="text"
                    value={customHabit}
                    onChange={(e) => setCustomHabit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                    placeholder="e.g., Practice 5 minutes of box breathing"
                    autoFocus
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddCustom} disabled={!customHabit.trim()} variant="primary" size="sm">
                      Add
                    </Button>
                    <Button onClick={() => { setShowCustomInput(false); setCustomHabit('') }} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next button */}
          {selectedIndex !== null && (
            <div className="mt-6">
              <Button onClick={handleNext} variant="primary" size="lg" className="w-full">
                Next: Schedule This Habit
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Schedule Phase */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <p className="font-semibold text-summit-forest mb-4">
              {suggestions[selectedIndex]?.action}
            </p>

            <div className="mb-4 bg-summit-mint border border-summit-sage rounded-lg p-3">
              <p className="text-sm text-summit-forest">
                <strong>Nice!</strong> Let's lock in when you'll do this. Pick days that realistically work for you.
              </p>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-normal text-summit-forest mb-2">
                When will you do this?
              </label>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => {
                      setDayCommitments(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      )
                    }}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all border ${
                      dayCommitments.includes(day)
                        ? 'bg-summit-mint text-summit-emerald border-summit-emerald'
                        : 'bg-white text-text-secondary border-gray-300 hover:bg-summit-mint'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="w-full lg:w-auto lg:flex-shrink-0">
                <select
                  value={timePreference}
                  onChange={(e) => setTimePreference(e.target.value)}
                  className="w-full lg:min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition"
                >
                  {timeOfDayOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {dayCommitments.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              variant="primary"
              size="lg"
              className="w-full"
              leftIcon={!saving && <CheckCircle className="w-5 h-5" />}
            >
              {saving ? 'Saving...' : 'Save Habit'}
            </Button>
          )}
        </>
      )}
    </main>
  )
}
