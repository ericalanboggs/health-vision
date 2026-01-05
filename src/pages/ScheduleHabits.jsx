import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { getCurrentWeekNumber } from '../utils/weekCalculator'
import { saveHabitsForWeek } from '../services/habitService'
import { getCurrentUser, getProfile } from '../services/authService'

export default function ScheduleHabits() {
  const navigate = useNavigate()
  const location = useLocation()
  const habits = location.state?.habits || []
  
  const [saving, setSaving] = useState(false)
  const [userTimezone, setUserTimezone] = useState('America/Chicago')
  const [dayCommitments, setDayCommitments] = useState(
    habits.reduce((acc, _, index) => ({ ...acc, [index]: [] }), {})
  )
  const [timePreferences, setTimePreferences] = useState(
    habits.reduce((acc, _, index) => ({ ...acc, [index]: 'mid-morning' }), {})
  )

  useEffect(() => {
    const fetchUserTimezone = async () => {
      const { success, user } = await getCurrentUser()
      if (success && user) {
        const { success: profileSuccess, data: profile } = await getProfile(user.id)
        if (profileSuccess && profile?.timezone) {
          setUserTimezone(profile.timezone)
        }
      }
    }
    fetchUserTimezone()
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

  const handleSave = async () => {
    // Validate that all habits have at least one day selected
    const allHaveDays = habits.every((_, index) => {
      const days = dayCommitments[index] || []
      return days.length > 0
    })

    if (!allHaveDays) {
      alert('Please select at least one day for each habit.')
      return
    }

    setSaving(true)
    
    try {
      const weekNumber = getCurrentWeekNumber()
      
      // Create habits array for database
      const newHabits = []
      habits.forEach((habit, index) => {
        const selectedDays = dayCommitments[index] || []
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

      // Save new habits (this will add to existing habits)
      const { success } = await saveHabitsForWeek(weekNumber, newHabits)
      
      if (success) {
        navigate('/habits')
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

  if (habits.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">No habits selected</p>
          <button
            onClick={() => navigate('/add-habit')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Select Habits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/add-habit')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Schedule Your Habits</h1>
          <p className="text-stone-600">
            Choose when you'll do each habit. Pick specific days and times that work for you.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
            </p>
            <p className="text-sm text-green-800 mt-2">
              People are far more likely to follow through when they decide <em>when</em> they'll act, not just <em>what</em> they'll do.
            </p>
          </div>

          <div className="space-y-6">
            {habits.map((habit, index) => {
              const committedDays = dayCommitments[index] || []
              const timeSlot = timePreferences[index] || 'mid-morning'

              return (
                <div key={index} className="border border-stone-200 rounded-lg p-5">
                  <p className="font-semibold text-stone-900 mb-4">{habit.action}</p>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-normal text-stone-900 mb-2">
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
                              ? 'bg-green-50 text-green-700 border-green-600'
                              : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
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
                        className="w-full lg:min-w-[200px] px-4 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
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
          <div className="flex gap-3 mt-6 pt-6 border-t border-stone-200">
            <button
              onClick={() => navigate('/add-habit')}
              className="flex items-center gap-2 px-6 py-3 text-stone-600 hover:text-stone-700 hover:bg-stone-100 font-semibold rounded-lg border-2 border-stone-300 transition"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save Habits
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
