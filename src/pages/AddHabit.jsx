import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, Sparkles, RefreshCw, Plus, Loader2 } from 'lucide-react'
import { getCurrentWeekNumber } from '../utils/weekCalculator'
import { getCurrentWeekHabits, saveHabitsForWeek } from '../services/habitService'
import { loadJourney } from '../services/journeyService'
import { enhanceActionPlan } from '../utils/aiService'
import { generateActionPlan } from '../utils/planGenerator'

export default function AddHabit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedHabits, setSelectedHabits] = useState([])
  const [customHabit, setCustomHabit] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [currentHabitsCount, setCurrentHabitsCount] = useState(0)
  const [visionData, setVisionData] = useState(null)

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

    // Load vision data
    const journeyResult = await loadJourney()
    if (journeyResult.success && journeyResult.data?.form_data) {
      setVisionData(journeyResult.data.form_data)
      // Generate initial suggestions
      await generateSuggestions(journeyResult.data.form_data)
    } else {
      // If no vision data, show generic suggestions
      setGenericSuggestions()
    }

    setLoading(false)
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
          alert('You can have a maximum of 3 habits per week. Consider removing an existing habit first.')
          return prev
        }
        return [...prev, index]
      }
    })
  }

  const handleAddCustomHabit = () => {
    if (!customHabit.trim()) return
    
    if (currentHabitsCount + selectedHabits.length >= 3) {
      alert('You can have a maximum of 3 habits per week. Consider removing an existing habit first.')
      return
    }

    const newHabit = {
      action: customHabit,
      why: 'Your personal habit goal',
      tip: 'Set specific days and times to make this a routine'
    }
    
    setSuggestions(prev => [...prev, newHabit])
    setSelectedHabits(prev => [...prev, suggestions.length])
    setCustomHabit('')
    setShowCustomInput(false)
  }

  const handleNext = () => {
    if (selectedHabits.length === 0) return
    
    // Store selected habits in state and navigate to scheduling
    const selected = selectedHabits.map(index => suggestions[index])
    navigate('/schedule-habits', { state: { habits: selected } })
  }

  const maxHabitsReached = currentHabitsCount + selectedHabits.length >= 3

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <p className="text-stone-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/habits')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Habits
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-stone-900">Add New Habit</h3>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-stone-600 mb-6">
            You currently have {currentHabitsCount} habit{currentHabitsCount !== 1 ? 's' : ''}. 
            Choose up to {3 - currentHabitsCount} more to add this week.
          </p>

          {/* AI Suggestions Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">AI-Personalized Suggestions</h4>
              </div>
              <button
                onClick={handleRefresh}
                disabled={generating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 border border-purple-300 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                Refresh ideas
              </button>
            </div>
            <p className="text-sm text-purple-800">
              {visionData 
                ? 'These actions are tailored to your vision and goals. Choose 1–2 new ideas to focus on.'
                : 'These are general healthy habit suggestions. Create your vision for personalized recommendations.'}
            </p>
          </div>

          {/* Habit Suggestions */}
          {generating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="ml-3 text-stone-600">Building your personalized plan...</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => !maxHabitsReached || selectedHabits.includes(index) ? toggleHabitSelection(index) : null}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedHabits.includes(index)
                      ? 'bg-green-50 border-green-600'
                      : maxHabitsReached
                      ? 'bg-stone-50 border-stone-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedHabits.includes(index)}
                      onChange={() => {}}
                      disabled={maxHabitsReached && !selectedHabits.includes(index)}
                      className="mt-1 w-5 h-5 text-green-600 rounded border-stone-300 focus:ring-green-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900 mb-2">{suggestion.action}</p>
                      <p className="text-sm text-purple-800 mb-2">
                        <strong>Why this works:</strong> {suggestion.why}
                      </p>
                      <p className="text-sm text-stone-600">
                        <strong>💡 Tip:</strong> {suggestion.tip}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Habit Input */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              disabled={maxHabitsReached}
              className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-2 transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">+</span>
              Create my own
            </button>
          ) : (
            <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                What habit would you like to add?
              </label>
              <input
                type="text"
                value={customHabit}
                onChange={(e) => setCustomHabit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHabit()}
                placeholder="e.g., Meditate for 5 minutes each morning"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCustomHabit}
                  disabled={!customHabit.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white font-medium rounded-lg transition text-sm"
                >
                  Add Habit
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomHabit('')
                  }}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium rounded-lg transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="mt-6">
            <button
              onClick={handleNext}
              disabled={selectedHabits.length === 0}
              className={`w-full py-3 font-bold rounded-lg shadow-md transition-all ${
                selectedHabits.length > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              Next: Schedule Your Habits
            </button>
            {selectedHabits.length === 0 && (
              <p className="text-xs text-stone-500 text-center mt-2">
                Select at least one habit to continue
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
