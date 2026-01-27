import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowBack, CheckCircle, Autorenew, Science } from '@mui/icons-material'
import { saveHabits } from '../services/habitService'
import { getCurrentUser, getProfile } from '../services/authService'
import { Button, Card, CardHeader, CardTitle } from '@summit/design-system'

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
      const { success } = await saveHabits(newHabits)

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
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No habits selected</p>
          <Button
            onClick={() => navigate('/add-habit')}
            className="bg-summit-emerald hover:bg-emerald-700 text-white"
          >
            Select Habits
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header */}
      <header className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/add-habit')}
            className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors"
          >
            <ArrowBack className="w-5 h-5" />
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-h1 text-summit-forest mb-2">Schedule Your Habits</h1>
          <p className="text-body text-text-secondary">
            Choose when you'll do each habit. Pick specific days and times that work for you.
          </p>
        </div>

        <Card className="border border-gray-200">
          <CardHeader className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-summit-sage">
                <Science className="h-5 w-5 text-summit-emerald" />
              </div>
              <CardTitle className="text-h3">Habit Experiments</CardTitle>
            </div>
          </CardHeader>

          <div className="mb-6 bg-summit-mint border border-summit-sage rounded-lg p-4">
            <p className="text-body-sm text-summit-forest">
              <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
            </p>
            <p className="text-body-sm text-summit-forest mt-2">
              People are far more likely to follow through when they decide <em>when</em> they'll act, not just <em>what</em> they'll do.
            </p>
          </div>

          <div className="space-y-6">
            {habits.map((habit, index) => {
              const committedDays = dayCommitments[index] || []
              const timeSlot = timePreferences[index] || 'mid-morning'

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-5">
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
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              onClick={() => navigate('/add-habit')}
              variant="secondary"
            >
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              leftIcon={!saving && <CheckCircle className="w-5 h-5" />}
              className="bg-summit-emerald hover:bg-emerald-700 text-white"
            >
              {saving ? 'Saving...' : 'Save Habits'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
