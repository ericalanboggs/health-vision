import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowBack, Science, AutoAwesome, Refresh, Add, Autorenew } from '@mui/icons-material'
import { getCurrentWeekNumber } from '../utils/weekCalculator'
import { getCurrentWeekHabits, saveHabitsForWeek } from '../services/habitService'
import { loadJourney } from '../services/journeyService'
import { enhanceActionPlan } from '../utils/aiService'
import { generateActionPlan } from '../utils/planGenerator'
import { Button, Checkbox, Input, Card } from '@summit/design-system'

export default function AddHabit() {
  const navigate = useNavigate()
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
  const lastScrollY = useRef(0)

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

  const generateSuggestions = async (formData) => {
    setGenerating(true)
    try {
      // First generate base action plan
      const basePlan = generateActionPlan(formData)
      
      // Try to enhance with AI if API key is available
      try {
        const aiActions = await enhanceActionPlan(formData, basePlan)
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
      await generateSuggestions(visionData)
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
    if (!customHabit.trim()) return

    if (currentHabitsCount >= 3) {
      alert('You can have a maximum of 3 habits per week. Consider removing an existing habit first.')
      return
    }

    // Navigate directly to scheduling with the custom habit
    const habit = {
      action: customHabit.trim(),
      why: 'Your personal habit goal',
      tip: 'Set specific days and times to make this a routine'
    }

    navigate('/schedule-habits', { state: { habits: [habit] } })
  }

  const handleNext = () => {
    if (selectedHabits.length === 0) return
    
    // Store selected habits in state and navigate to scheduling
    const selected = selectedHabits.map(index => suggestions[index])
    navigate('/schedule-habits', { state: { habits: selected } })
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header */}
      <header className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/habits')}
            className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors"
          >
            <ArrowBack className="w-5 h-5" />
            Back to Habits
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-summit-sage rounded-xl">
                <Science className="w-6 h-6 text-summit-emerald" />
              </div>
              <div>
                <h3 className="text-h2 text-summit-forest">Add New Habit</h3>
              </div>
            </div>
          </div>

          <p className="text-body-sm text-text-secondary mb-6">
            You currently have {currentHabitsCount} habit{currentHabitsCount !== 1 ? 's' : ''}.
            {3 - currentHabitsCount > 0
              ? ` Add up to ${3 - currentHabitsCount} more this week.`
              : ' You\'ve reached your limit of 3 habits.'}
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
      </main>
    </div>
  )
}
