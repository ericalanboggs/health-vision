import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarMonth, Save, Autorenew, CheckCircle, Schedule, Edit, Visibility, ChevronLeft, ChevronRight } from '@mui/icons-material'
import { saveReflection, getCurrentWeekReflection, getReflectionByWeek, getAllReflections } from '../services/reflectionService'
import { getCurrentWeekNumber, getCurrentWeekDateRange, getWeekStartDate, getWeekEndDate, hasWeekPassed } from '../utils/weekCalculator'
import { Banner } from '@summit/design-system'

export default function Reflection() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [reflection, setReflection] = useState({
    went_well: '',
    friction: '',
    adjustment: '',
    app_feedback: ''
  })
  const [weekReflections, setWeekReflections] = useState({}) // Store all weeks' reflections
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem('reflection-banner-dismissed'))

  useEffect(() => {
    loadAllReflections()
  }, [])

  useEffect(() => {
    loadSelectedWeekReflection()
  }, [selectedWeek])

  const loadAllReflections = async () => {
    setLoading(true)
    const week = getCurrentWeekNumber()
    setCurrentWeek(week)
    setSelectedWeek(week) // Default to current week

    // Load all reflections at once, indexed by week_number
    const reflections = {}
    try {
      const { success, data } = await getAllReflections()
      if (success && data) {
        data.forEach(r => {
          reflections[r.week_number] = r
        })
      }
    } catch (error) {
      console.error('Failed to load reflections:', error)
    }

    setWeekReflections(reflections)
    setLoading(false)
  }

  const loadSelectedWeekReflection = async () => {
    const weekStart = getWeekStartDate(selectedWeek)
    const weekEnd = getWeekEndDate(selectedWeek)
    
    // Use the same timezone-safe date formatting as the tabs
    const formatDateUTC = (date) => {
      const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
      return utcDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      })
    }
    
    // Calculate start and end dates correctly
    const startOffset = (selectedWeek - 1) * 7
    const endOffset = startOffset + 6
    const dateRange = `${formatDateUTC(weekStart)} - ${formatDateUTC(weekEnd)}`
    setWeekDateRange(dateRange)

    // Load the selected week's reflection
    const existingReflection = weekReflections[selectedWeek]
    if (existingReflection) {
      setReflection({
        went_well: existingReflection.went_well || '',
        friction: existingReflection.friction || '',
        adjustment: existingReflection.adjustment || '',
        app_feedback: existingReflection.app_feedback || ''
      })
    } else {
      setReflection({
        went_well: '',
        friction: '',
        adjustment: '',
        app_feedback: ''
      })
    }
  }

  const handleChange = (field, value) => {
    setReflection(prev => ({
      ...prev,
      [field]: value
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    // Prevent double-submit
    if (saving) return

    setSaving(true)

    const { success } = await saveReflection(selectedWeek, reflection)
    
    if (success) {
      // Update the stored reflections
      setWeekReflections(prev => ({
        ...prev,
        [selectedWeek]: {
          ...reflection,
          created_at: new Date().toISOString()
        }
      }))
      
      setSaved(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } else {
      alert('Failed to save reflection. Please try again.')
    }
    
    setSaving(false)
  }

  const isCurrentWeek = selectedWeek === currentWeek
  const isPastWeek = hasWeekPassed(selectedWeek)
  const isFutureWeek = selectedWeek > currentWeek
  const isEditable = !isFutureWeek // Past and current weeks are always editable
  const isComplete = reflection.went_well.trim() &&
                   reflection.friction.trim() &&
                   reflection.adjustment.trim()
  const hasExistingReflection = weekReflections[selectedWeek]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-600">Loading reflection...</p>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-h1 text-summit-forest mb-2">Weekly Reflection</h1>
          <p className="text-body text-text-secondary mb-4">
            Reflect on your week and adjust your approach.
          </p>

          {/* Info Banner */}
          {showBanner && (
            <Banner
              title="Why Weekly Reflections?"
              dismissible
              onDismiss={() => { localStorage.setItem('reflection-banner-dismissed', '1'); setShowBanner(false) }}
              className="mb-4"
            >
              Research shows that people who reflect on their progress weekly are more likely to stick with new habits.
              This isn't about perfection—it's about learning what works for <em>you</em>.
            </Banner>
          )}

        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 sm:p-8">
          {/* Week Carousel */}
          <div className="flex items-center justify-center mb-6">
            <button
              onClick={() => setSelectedWeek(prev => prev - 1)}
              disabled={selectedWeek <= 1}
              className="p-1 text-summit-moss hover:text-summit-forest hover:bg-summit-sage/50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[160px]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-summit-forest">
                  Week of {getWeekStartDate(selectedWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {weekReflections[selectedWeek] && (
                  <CheckCircle className="w-4 h-4 text-summit-emerald" />
                )}
              </div>
              <span className="text-xs text-summit-moss">{weekDateRange}</span>
            </div>
            <button
              onClick={() => setSelectedWeek(prev => prev + 1)}
              disabled={selectedWeek >= currentWeek}
              className="p-1 text-summit-moss hover:text-summit-forest hover:bg-summit-sage/50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Show form for current and past weeks (always editable) */}
          {isEditable ? (
            <>
              
              <div className="space-y-6">
                {/* Question 1: What went well */}
                <div className="bg-summit-mint/50 border border-summit-sage rounded-lg p-5">
                  <label className="block text-lg font-semibold text-summit-forest mb-2">
                    What went well this week?
                  </label>
                  <p className="text-sm text-stone-600 mb-3">
                    What worked? What felt good? What surprised you in a positive way?
                  </p>
                  <textarea
                    value={reflection.went_well}
                    onChange={(e) => handleChange('went_well', e.target.value)}
                    className="w-full h-32 p-4 border border-summit-sage rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white"
                    placeholder="I stuck to my morning walks on Monday and Wednesday. I felt more energized..."
                  />
                </div>

                {/* Question 2: What was challenging */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <label className="block text-lg font-semibold text-summit-forest mb-2">
                    What friction or challenges came up?
                  </label>
                  <p className="text-sm text-stone-600 mb-3">
                    What got in the way? What felt harder than expected? What barriers showed up?
                  </p>
                  <textarea
                    value={reflection.friction}
                    onChange={(e) => handleChange('friction', e.target.value)}
                    className="w-full h-32 p-4 border border-amber-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white"
                    placeholder="Thursday was really busy at work and I skipped my planned walk. I felt tired in the evenings..."
                  />
                </div>

                {/* Question 3: What to adjust */}
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-5">
                  <label className="block text-lg font-semibold text-summit-forest mb-2">
                    What will you adjust or try differently next week?
                  </label>
                  <p className="text-sm text-stone-600 mb-3">
                    Based on what you learned, what small change makes sense? What feels doable?
                  </p>
                  <textarea
                    value={reflection.adjustment}
                    onChange={(e) => handleChange('adjustment', e.target.value)}
                    className="w-full h-32 p-4 border border-sky-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white"
                    placeholder="I'll try morning walks instead of evening. Maybe just 5 minutes on busy days instead of skipping..."
                  />
                </div>

                {/* Question 4: App Feedback (Optional) */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <label className="block text-lg font-semibold text-summit-forest mb-2">
                    Feedback about the app <span className="text-sm font-normal text-stone-500">(Optional)</span>
                  </label>
                  <p className="text-sm text-stone-600 mb-3">
                    How's your experience with the app? Any suggestions or issues?
                  </p>
                  <textarea
                    value={reflection.app_feedback}
                    onChange={(e) => handleChange('app_feedback', e.target.value)}
                    className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none bg-white"
                    placeholder="The reminders are helpful, but I'd love to see... / The app is working great for me..."
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-summit-mint rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarMonth className="w-8 h-8 text-summit-sage" />
              </div>
              <h3 className="text-xl font-semibold text-summit-forest mb-2">
                Future Week
              </h3>
              <p className="text-stone-600 mb-4">
                This week hasn't started yet. Check back when it begins.
              </p>
              <p className="text-sm text-stone-600">
                You can complete reflections once the week starts.
              </p>
            </div>
          )}

          {/* Save Button - Show for editable weeks (current and past) */}
          {isEditable && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              {saved ? (
                <div className="bg-summit-mint border-2 border-summit-emerald rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-summit-emerald" />
                    <div>
                      <p className="font-semibold text-summit-forest">Reflection Saved!</p>
                      <p className="text-sm text-stone-600">Redirecting you back to dashboard...</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !isComplete}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-summit-emerald hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {saving ? (
                    <>
                      <Autorenew className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Reflection
                    </>
                  )}
                </button>
              )}
              
              {!isComplete && !saved && (
                <p className="text-sm text-stone-600 mt-3">
                  Please answer all three questions before saving.
                </p>
              )}
            </div>
          )}
        </div>
    </main>
  )
}
