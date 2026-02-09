import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowBack, Science, AutoAwesome, Refresh, Add, Autorenew, ExpandMore, CheckCircle } from '@mui/icons-material'
import { getCurrentWeekNumber } from '../utils/weekCalculator'
import { getCurrentWeekHabits, saveHabitsForWeek, saveHabits } from '../services/habitService'
import { getCurrentUser, getProfile } from '../services/authService'
import { loadJourney } from '../services/journeyService'
import { enhanceActionPlan } from '../utils/aiService'
import { generateActionPlan } from '../utils/planGenerator'
import { Button, Checkbox, Input, Card } from '@summit/design-system'

export default function AddHabit() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedHabits, setSelectedHabits] = useState([])
  const [customHabit, setCustomHabit] = useState('')
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [aiSuggestionsLoaded, setAiSuggestionsLoaded] = useState(false)
  const [currentHabitsCount, setCurrentHabitsCount] = useState(0)
  const [visionData, setVisionData] = useState(null)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [showCustomHabitInput, setShowCustomHabitInput] = useState(false)
  const [expandedSuggestions, setExpandedSuggestions] = useState({})
  const [phase, setPhase] = useState('select') // 'select' or 'schedule'
  const [userTimezone, setUserTimezone] = useState('America/Chicago')
  const [dayCommitments, setDayCommitments] = useState({})
  const [timePreferences, setTimePreferences] = useState({})
  const lastScrollY = useRef(0)

  // Check if coming from quick start flow with prefetched habits
  const fromQuickStart = location.state?.fromQuickStart
  const prefetchedHabits = location.state?.prefetchedHabits

  // Headroom behavior for nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Get current habits count
    const { success, data } = await getCurrentWeekHabits()
    if (success && data) {
      const habitGroups = {}
      data.forEach(habit => {
        if (!habitGroups[habit.habit_name]) {
          habitGroups[habit.habit_name] = true
        }
      })
      setCurrentHabitsCount(Object.keys(habitGroups).length)
    }

    // Load vision data (but don't generate suggestions yet - wait for user to request)
    const journeyResult = await loadJourney()
    if (journeyResult.success && journeyResult.data?.form_data) {
      setVisionData(journeyResult.data.form_data)
    }

    // If coming from quick start with prefetched habits, auto-show them
    if (prefetchedHabits && prefetchedHabits.length > 0) {
      setSuggestions(prefetchedHabits)
      setShowAiSuggestions(true)
      setAiSuggestionsLoaded(true)
    }

    setLoading(false)
  }

  const handleShowAiSuggestions = async () => {
    setShowAiSuggestions(true)
    if (!aiSuggestionsLoaded) {
      if (visionData) {
        await generateSuggestions(visionData)
      } else {
        setGenericSuggestions()
      }
      setAiSuggestionsLoaded(true)
    }
  }

  const generateSuggestions = async (formData, excludePrevious = false) => {
    setGenerating(true)
    try {
      // First generate base action plan
      const basePlan = generateActionPlan(formData)

      // Try to enhance with AI if API key is available
      try {
        // Pass current suggestions to avoid duplicates when refreshing
        const previousSuggestions = excludePrevious ? suggestions : []
        const aiActions = await enhanceActionPlan(formData, basePlan, previousSuggestions)
        if (Array.isArray(aiActions) && aiActions.length > 0) {
          setSuggestions(aiActions.slice(0, 5))
        } else {
          // Fall back to base plan actions
          const baseActions = basePlan.weeklyActions.flatMap(area =>
            area.actions.map(action => ({
              action,
              why: 'This action supports your health goals',
              tip: 'Start small and build consistency'
            }))
          )
          setSuggestions(baseActions.slice(0, 5))
        }
      } catch (aiError) {
        console.log('AI enhancement not available, using base plan')
        // Use base plan if AI fails
        const baseActions = basePlan.weeklyActions.flatMap(area =>
          area.actions.map(action => ({
            action,
            why: 'This action supports your health goals',
            tip: 'Start small and build consistency'
          }))
        )
        setSuggestions(baseActions.slice(0, 5))
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
      setGenericSuggestions()
    }
    setGenerating(false)
  }

  const setGenericSuggestions = () => {
    setSuggestions([
      {
        action: 'Take a 10-minute walk after lunch',
        why: 'Movement helps boost energy and mental clarity',
        tip: 'Set a recurring calendar reminder right after your typical lunch time'
      },
      {
        action: 'Drink a glass of water first thing in the morning',
        why: 'Hydration jumpstarts your metabolism and helps you feel alert',
        tip: 'Keep a water bottle on your nightstand'
      },
      {
        action: 'Spend 5 minutes stretching before bed',
        why: 'Gentle stretching helps you unwind and improves sleep quality',
        tip: 'Follow a short YouTube stretching routine'
      },
      {
        action: 'Prepare healthy snacks on Sunday for the week',
        why: 'Having healthy options ready makes better choices easier',
        tip: 'Cut up veggies and portion out nuts into small containers'
      },
      {
        action: 'Write down 3 things you\'re grateful for each evening',
        why: 'Gratitude practice improves mood and reduces stress',
        tip: 'Keep a small journal on your bedside table'
      }
    ])
  }

  const handleRefresh = async () => {
    if (visionData) {
      await generateSuggestions(visionData, true) // Pass true to exclude previous suggestions
    } else {
      setGenericSuggestions()
    }
  }

  const toggleHabitSelection = (index) => {
    setSelectedHabits(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        // Limit total habits (current + new) to 3
        if (currentHabitsCount + prev.length >= 3) {
          return prev // Silently prevent - UI already shows limit
        }
        return [...prev, index]
      }
    })
  }

  const handleAddCustomHabit = () => {
    const trimmedHabit = customHabit.trim()

    // Validate custom habit name
    if (!trimmedHabit) return

    if (trimmedHabit.length > 200) {
      alert('Habit name must be 200 characters or less.')
      return
    }

    if (currentHabitsCount >= 3) {
      alert('You can have a maximum of 3 habits per week. Consider removing an existing habit first.')
      return
    }

    // Add custom habit to suggestions and select it
    const customHabitData = {
      action: trimmedHabit,
      why: 'Your personal habit goal',
      tip: 'Set specific days and times to make this a routine'
    }

    const newIndex = suggestions.length
    const updatedSuggestions = [...suggestions, customHabitData]
    const updatedSelectedHabits = [...selectedHabits, newIndex]

    setSuggestions(updatedSuggestions)
    setSelectedHabits(updatedSelectedHabits)
    setCustomHabit('')
    setShowCustomHabitInput(false)

    // Initialize scheduling for all selected habits (including the new custom one)
    const initialDayCommitments = {}
    const initialTimePreferences = {}
    updatedSelectedHabits.forEach((_, idx) => {
      initialDayCommitments[idx] = []
      initialTimePreferences[idx] = 'mid-morning'
    })
    setDayCommitments(initialDayCommitments)
    setTimePreferences(initialTimePreferences)

    // Go directly to scheduling
    setPhase('schedule')
    fetchUserTimezone()
  }

  const handleNext = () => {
    if (selectedHabits.length === 0) return

    // Initialize scheduling state for selected habits
    const initialDayCommitments = {}
    const initialTimePreferences = {}
    selectedHabits.forEach((_, idx) => {
      initialDayCommitments[idx] = []
      initialTimePreferences[idx] = 'mid-morning'
    })
    setDayCommitments(initialDayCommitments)
    setTimePreferences(initialTimePreferences)

    // Switch to schedule phase
    setPhase('schedule')

    // Fetch user timezone
    fetchUserTimezone()
  }

  const fetchUserTimezone = async () => {
    const { success, user } = await getCurrentUser()
    if (success && user) {
      const { success: profileSuccess, data: profile } = await getProfile(user.id)
      if (profileSuccess && profile?.timezone) {
        setUserTimezone(profile.timezone)
      }
    }
  }

  const toggleDayCommitment = (habitIndex, day) => {
    setDayCommitments(prev => {
      const current = prev[habitIndex] || []
      const updated = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day]
      return { ...prev, [habitIndex]: updated }
    })
  }

  const handleTimePreferenceChange = (habitIndex, value) => {
    setTimePreferences(prev => ({
      ...prev,
      [habitIndex]: value
    }))
  }

  // Check if at least one habit has at least one day selected
  const hasAtLeastOneScheduled = selectedHabits.some((_, index) => {
    const days = dayCommitments[index] || []
    return days.length > 0
  })

  const handleSave = async () => {
    // Prevent double-submit
    if (saving) return

    if (!hasAtLeastOneScheduled) {
      alert('Please select at least one day for at least one habit.')
      return
    }

    setSaving(true)

    try {
      // Verify session is still valid before saving
      const { success: sessionValid, user } = await getCurrentUser()
      if (!sessionValid || !user) {
        alert('Your session has expired. Please log in again to save your habits.')
        navigate('/')
        return
      }
      const selectedHabitData = selectedHabits.map(index => suggestions[index])
      const newHabits = []

      selectedHabitData.forEach((habit, index) => {
        const selectedDays = dayCommitments[index] || []
        if (selectedDays.length === 0) return

        const timeSlot = timePreferences[index] || 'mid-morning'
        const timeOption = timeOfDayOptions.find(opt => opt.value === timeSlot)
        const reminderTime = `${String(timeOption.hour).padStart(2, '0')}:00:00`

        selectedDays.forEach(day => {
          newHabits.push({
            habit_name: habit.action,
            day_of_week: dayMap[day],
            reminder_time: reminderTime,
            time_of_day: reminderTime,
            timezone: userTimezone
          })
        })
      })

      const { success } = await saveHabits(newHabits)

      if (success) {
        navigate('/dashboard')
      } else {
        alert('Failed to save habits. Please try again.')
      }
    } catch (error) {
      console.error('Error saving habits:', error)
      alert('Failed to save habits. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBackFromSchedule = () => {
    setPhase('select')
  }

  const maxHabitsReached = currentHabitsCount >= 3
  const canAddMore = 3 - currentHabitsCount - selectedHabits.length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  // Toggle expanded state for a suggestion
  const toggleExpanded = (index) => {
    setExpandedSuggestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Render onboarding flow layout (from Quick Start)
  if (fromQuickStart) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src="/Habit-Plan.png"
                alt="Habit Plan"
                className="w-[200px] h-[200px] object-contain"
              />
            </div>
            <h1 className="text-h1 text-summit-forest mb-3">My Habit Plan</h1>
            <p className="text-body text-text-secondary">
              Add up to 3 new habits to try that align to your Summit vision.
            </p>
          </div>

          {phase === 'select' ? (
            <>
              {/* AI Suggestions Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AutoAwesome className="w-5 h-5 text-summit-lime" />
                  <span className="text-body-sm font-semibold text-summit-forest">AI-Personalized Suggestions</span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={generating}
                  className="text-body-sm text-summit-forest hover:text-summit-emerald font-medium flex items-center gap-1 transition-colors"
                >
                  <Refresh className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {/* Suggestions List */}
              {generating ? (
                <div className="flex items-center justify-center py-12">
                  <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
                  <p className="ml-3 text-text-secondary">Generating ideas...</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = selectedHabits.includes(index)
                    const isDisabled = !canAddMore && !isSelected
                    const isExpanded = expandedSuggestions[index]

                    return (
                      <Card
                        key={index}
                        className={`transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-summit-mint border-summit-emerald'
                            : isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-summit-sage'
                        }`}
                        onClick={() => !isDisabled && toggleHabitSelection(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => !isDisabled && toggleHabitSelection(index)}
                              disabled={isDisabled}
                            />
                          </div>
                          <p
                            className={`flex-1 font-medium ${
                              isDisabled ? 'text-gray-400' : 'text-summit-forest'
                            }`}
                          >
                            {suggestion.action}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(index)
                            }}
                            className="p-1 text-gray-400 hover:text-summit-forest transition-colors"
                          >
                            <ExpandMore
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Expandable content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 pl-8 border-t border-gray-100">
                            <p className="text-body-sm text-summit-forest mb-2">
                              <strong>Why this works:</strong> {suggestion.why}
                            </p>
                            <p className="text-body-sm text-text-secondary">
                              <strong>Tip:</strong> {suggestion.tip}
                            </p>
                          </div>
                        )}
                      </Card>
                    )
                  })}

                  {/* Add My Own Row */}
                  {!showCustomHabitInput ? (
                    <Card
                      onClick={() => setShowCustomHabitInput(true)}
                      className="cursor-pointer hover:border-summit-sage transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox disabled />
                        <span className="text-text-secondary">Add my own...</span>
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-summit-emerald bg-summit-mint">
                      <div className="flex items-start gap-3">
                        <Checkbox disabled className="mt-2" />
                        <div className="flex-1">
                          <Input
                            type="text"
                            value={customHabit}
                            onChange={(e) => setCustomHabit(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHabit()}
                            placeholder="e.g., Meditate for 5 minutes each morning"
                            autoFocus
                            className="mb-3"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddCustomHabit}
                              disabled={!customHabit.trim()}
                              variant="primary"
                              size="sm"
                            >
                              Add
                            </Button>
                            <Button
                              onClick={() => {
                                setShowCustomHabitInput(false)
                                setCustomHabit('')
                              }}
                              variant="ghost"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Bottom Navigation */}
              <div className="mt-8 flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/vision')}
                  leftIcon={<ArrowBack className="w-5 h-5" />}
                >
                  Back
                </Button>

                {selectedHabits.length > 0 && (
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    size="lg"
                  >
                    Next: Schedule {selectedHabits.length} Habit{selectedHabits.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Schedule Phase */}
              <div className="mb-6 bg-summit-mint border border-summit-sage rounded-lg p-4">
                <p className="text-body-sm text-summit-forest">
                  <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
                </p>
                <p className="text-body-sm text-summit-forest mt-2">
                  People are far more likely to follow through when they decide <em>when</em> they'll act, not just <em>what</em> they'll do.
                </p>
              </div>

              {/* Scheduling Cards */}
              <div className="space-y-4 mb-4">
                {selectedHabits.map((suggestionIndex, index) => {
                  const habit = suggestions[suggestionIndex]
                  const committedDays = dayCommitments[index] || []
                  const timeSlot = timePreferences[index] || 'mid-morning'

                  return (
                    <Card key={index} className="border border-gray-200">
                      <p className="font-semibold text-summit-forest mb-4">{habit.action}</p>

                      <div className="mb-3">
                        <label className="block text-body-sm font-normal text-summit-forest mb-2">
                          When will you do this?
                        </label>
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Day Commitment Chips */}
                        <div className="flex flex-wrap gap-2">
                          {days.map(day => (
                            <button
                              key={day}
                              onClick={() => toggleDayCommitment(index, day)}
                              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all border ${
                                committedDays.includes(day)
                                  ? 'bg-summit-mint text-summit-emerald border-summit-emerald'
                                  : 'bg-white text-text-secondary border-gray-300 hover:bg-summit-mint'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>

                        {/* Time of Day Selector */}
                        <div className="w-full lg:w-auto lg:flex-shrink-0">
                          <select
                            value={timeSlot}
                            onChange={(e) => handleTimePreferenceChange(index, e.target.value)}
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
                    </Card>
                  )
                })}
              </div>

              {/* Bottom Navigation */}
              <div className="mt-8 flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={handleBackFromSchedule}
                  leftIcon={<ArrowBack className="w-5 h-5" />}
                >
                  Back
                </Button>

                {hasAtLeastOneScheduled && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    loading={saving}
                    variant="primary"
                    size="lg"
                    leftIcon={!saving && <CheckCircle className="w-5 h-5" />}
                  >
                    {saving ? 'Saving...' : 'Save Habits'}
                  </Button>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    )
  }

  // Standard add habit flow (not from onboarding)
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header */}
      <header className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => phase === 'schedule' ? handleBackFromSchedule() : navigate('/habits')}
            className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors"
          >
            <ArrowBack className="w-5 h-5" />
            {phase === 'schedule' ? 'Back' : 'Back to Habits'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {phase === 'select' ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-summit-sage rounded-xl">
                  <Science className="w-6 h-6 text-summit-emerald" />
                </div>
                <div>
                  <h3 className="text-h2 text-summit-forest">Habit Experiments</h3>
                </div>
              </div>
            </div>

            <p className="text-body-sm text-text-secondary mb-6">
              {maxHabitsReached
                ? 'You\'ve reached your limit of 3 habits this week.'
                : 'Add up to 3 new habits to try that align to your Summit vision.'}
            </p>

          {/* Custom Habit Input - Always visible first */}
          {!maxHabitsReached && (
            <div className="mb-6 p-4 bg-summit-mint rounded-lg border border-summit-sage">
              <label className="block text-sm font-semibold text-summit-forest mb-2">
                What habit would you like to add?
              </label>
              <Input
                type="text"
                value={customHabit}
                onChange={(e) => setCustomHabit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHabit()}
                placeholder="e.g., Meditate for 5 minutes each morning"
                className="mb-3"
              />
              <Button
                onClick={handleAddCustomHabit}
                disabled={!customHabit.trim()}
                variant="primary"
                size="sm"
              >
                Add Habit
              </Button>
            </div>
          )}

          {/* AI Suggestions Section - Expandable */}
          {!showAiSuggestions ? (
            <button
              onClick={handleShowAiSuggestions}
              disabled={maxHabitsReached}
              className="w-full p-4 border-2 border-dashed border-summit-sage hover:border-summit-emerald rounded-lg text-summit-forest hover:bg-summit-mint/50 font-medium transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AutoAwesome className="w-5 h-5 text-summit-emerald group-hover:scale-110 transition-transform" />
              Need ideas? Get AI-Personalized Suggestions
            </button>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* AI Header */}
              <div className="bg-gradient-to-r from-summit-mint to-summit-sage p-4 border-b border-summit-sage">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AutoAwesome className="w-5 h-5 text-summit-emerald" />
                    <h4 className="font-semibold text-summit-forest">AI-Personalized Suggestions</h4>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                    leftIcon={<Refresh className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />}
                  >
                    Refresh
                  </Button>
                </div>
                <p className="text-body-sm text-summit-forest">
                  {visionData
                    ? 'Tailored to your vision and goals. Select any that resonate.'
                    : 'General suggestions. Create your vision for personalized recommendations.'}
                </p>
              </div>

              {/* Suggestions List */}
              <div className="p-4">
                {generating ? (
                  <div className="flex items-center justify-center py-8">
                    <Autorenew className="w-6 h-6 animate-spin text-summit-emerald" />
                    <p className="ml-3 text-text-secondary">Generating ideas...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const isSelected = selectedHabits.includes(index)
                      const isDisabled = !canAddMore && !isSelected

                      return (
                        <div
                          key={index}
                          onClick={() => !isDisabled ? toggleHabitSelection(index) : null}
                          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-summit-mint border-summit-emerald'
                              : isDisabled
                              ? 'bg-summit-sage border-gray-200 opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-summit-emerald'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => !isDisabled ? toggleHabitSelection(index) : null}
                                disabled={isDisabled}
                                shape="square"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-summit-forest mb-2">{suggestion.action}</p>
                              <p className="text-body-sm text-summit-forest mb-2">
                                <strong>Why this works:</strong> {suggestion.why}
                              </p>
                              <p className="text-body-sm text-text-secondary">
                                <strong>Tip:</strong> {suggestion.tip}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Next Button - Only show when AI suggestions are visible and selected */}
            {showAiSuggestions && selectedHabits.length > 0 && (
              <div className="mt-6">
                <Button
                  onClick={handleNext}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Next: Schedule {selectedHabits.length} Habit{selectedHabits.length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Schedule Phase
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
            <div className="mb-6">
              <h3 className="text-h2 text-summit-forest mb-3">Schedule Your Habits</h3>
              <div className="bg-summit-mint border border-summit-sage rounded-lg p-4">
                <p className="text-body-sm text-summit-forest">
                  <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
                </p>
                <p className="text-body-sm text-summit-forest mt-2">
                  People are far more likely to follow through when they decide <em>when</em> they'll act, not just <em>what</em> they'll do.
                </p>
              </div>
            </div>

            {/* Scheduling Cards */}
            <div className="space-y-4 mb-6">
              {selectedHabits.map((suggestionIndex, index) => {
                const habit = suggestions[suggestionIndex]
                const committedDays = dayCommitments[index] || []
                const timeSlot = timePreferences[index] || 'mid-morning'

                return (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-semibold text-summit-forest mb-4">{habit.action}</p>

                    <div className="mb-3">
                      <label className="block text-body-sm font-normal text-summit-forest mb-2">
                        When will you do this?
                      </label>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      {/* Day Commitment Chips */}
                      <div className="flex flex-wrap gap-2">
                        {days.map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDayCommitment(index, day)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all border ${
                              committedDays.includes(day)
                                ? 'bg-summit-mint text-summit-emerald border-summit-emerald'
                                : 'bg-white text-text-secondary border-gray-300 hover:bg-summit-mint'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>

                      {/* Time of Day Selector */}
                      <div className="w-full lg:w-auto lg:flex-shrink-0">
                        <select
                          value={timeSlot}
                          onChange={(e) => handleTimePreferenceChange(index, e.target.value)}
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
                )
              })}
            </div>

            {/* Save Button */}
            {hasAtLeastOneScheduled && (
              <Button
                onClick={handleSave}
                disabled={saving}
                loading={saving}
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={!saving && <CheckCircle className="w-5 h-5" />}
              >
                {saving ? 'Saving...' : 'Save Habits'}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
