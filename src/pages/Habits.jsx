import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Beaker, Save, Loader2, Edit2, CheckCircle, Trash2, Plus, Calendar, Copy, Check, MoreVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { getAllUserHabits, deleteAllUserHabits, saveHabitsForWeek } from '../services/habitService'
import { getCurrentWeekNumber } from '../utils/weekCalculator'
import { formatDaysDisplay, convertShortToFullDays } from '../utils/formatDays'
import { getCurrentUser, getProfile } from '../services/authService'
import { getAllTrackingConfigs, disableTracking, saveTrackingConfig, getAiSuggestion } from '../services/trackingService'
import { METRIC_UNITS } from '../constants/metricUnits'
import WeeklyTracker from '../components/WeeklyTracker'

export default function Habits() {
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingHabitIndex, setEditingHabitIndex] = useState(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [dayCommitments, setDayCommitments] = useState({})
  const [timePreferences, setTimePreferences] = useState({})
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, habitIndex: null, habitName: '' })
  const [userTimezone, setUserTimezone] = useState('America/Chicago')
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editedHabitNames, setEditedHabitNames] = useState({})
  const [trackingConfigs, setTrackingConfigs] = useState({})
  const [togglingTracking, setTogglingTracking] = useState(null) // habitName being toggled
  const [customUnitInputs, setCustomUnitInputs] = useState({}) // Local state for custom unit typing

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayMap = {
    'Mon': 1,
    'Tue': 2,
    'Wed': 3,
    'Thu': 4,
    'Fri': 5,
    'Sat': 6,
    'Sun': 0
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
    loadHabits()
    loadTrackingConfigs()
  }, [])

  const loadTrackingConfigs = async () => {
    const { success, data } = await getAllTrackingConfigs()
    if (success && data) {
      const configMap = {}
      data.forEach(config => {
        configMap[config.habit_name] = config
      })
      setTrackingConfigs(configMap)
    }
  }

  const loadHabits = async () => {
    setLoading(true)
    const week = getCurrentWeekNumber()
    setWeekNumber(week)

    const { success, data } = await getAllUserHabits()
    if (success && data && data.length > 0) {
      setHabits(data)
      
      // Group habits by habit name and extract day/time info
      const habitGroups = {}
      const dayCommits = {}
      const timePrefs = {}
      
      data.forEach(habit => {
        if (!habitGroups[habit.habit_name]) {
          habitGroups[habit.habit_name] = []
        }
        habitGroups[habit.habit_name].push(habit)
      })

      // Convert to format for display
      Object.entries(habitGroups).forEach(([habitName, habitList], index) => {
        const selectedDays = habitList.map(h => {
          const dayName = Object.keys(dayMap).find(key => dayMap[key] === h.day_of_week)
          return dayName
        }).filter(Boolean)
        
        dayCommits[index] = selectedDays

        // Get time preference from first habit
        if (habitList[0]?.reminder_time) {
          const time = habitList[0].reminder_time
          const [hours] = time.split(':')
          const hour = parseInt(hours)
          
          // Find matching time slot
          const matchingSlot = timeOfDayOptions.find(opt => opt.hour === hour)
          timePrefs[index] = matchingSlot?.value || 'mid-morning'
        } else {
          timePrefs[index] = 'mid-morning'
        }
      })

      setDayCommitments(dayCommits)
      setTimePreferences(timePrefs)
    }
    setLoading(false)
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

  const handleSaveHabit = async (habitIndex) => {
    setSaving(true)

    try {
      // Delete all existing habits and re-save (habits persist across weeks)
      await deleteAllUserHabits()

      // Get unique habit names
      const habitGroups = {}
      habits.forEach(habit => {
        if (!habitGroups[habit.habit_name]) {
          habitGroups[habit.habit_name] = habit
        }
      })

      const uniqueHabitNames = Object.keys(habitGroups)

      // Create new habits array based on selections
      const newHabits = []
      uniqueHabitNames.forEach((originalHabitName, index) => {
        // Use edited name if available, otherwise use original
        const habitName = editedHabitNames[index] || originalHabitName
        const selectedDays = dayCommitments[index] || []
        const timeSlot = timePreferences[index] || 'mid-morning'
        const timeOption = timeOfDayOptions.find(opt => opt.value === timeSlot)
        const reminderTime = `${String(timeOption.hour).padStart(2, '0')}:00:00`

        selectedDays.forEach(day => {
          newHabits.push({
            habit_name: habitName,
            day_of_week: dayMap[day],
            reminder_time: reminderTime,
            timezone: userTimezone
          })
        })
      })

      // Save new habits
      const { success } = await saveHabitsForWeek(weekNumber, newHabits)
      
      if (success) {
        await loadHabits()
        setEditingHabitIndex(null)
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

  const handleStartEdit = (index, habitName) => {
    setEditingHabitIndex(index)
    setEditedHabitNames(prev => ({ ...prev, [index]: habitName }))
  }

  const handleHabitNameChange = (index, newName) => {
    setEditedHabitNames(prev => ({ ...prev, [index]: newName }))
  }

  const handleCancelEdit = (habitIndex) => {
    setEditingHabitIndex(null)
    setEditedHabitNames(prev => {
      const { [habitIndex]: _, ...rest } = prev
      return rest
    })
    loadHabits() // Reload to reset changes
  }

  const openDeleteModal = (habitIndex, habitName) => {
    setDeleteModal({ isOpen: true, habitIndex, habitName })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, habitIndex: null, habitName: '' })
  }

  const confirmDeleteHabit = async () => {
    const { habitIndex, habitName } = deleteModal
    closeDeleteModal()
    setSaving(true)

    try {
      // Get all habits except the one being deleted
      const habitGroups = {}
      habits.forEach(habit => {
        if (!habitGroups[habit.habit_name]) {
          habitGroups[habit.habit_name] = habit
        }
      })

      const uniqueHabitNames = Object.keys(habitGroups).filter((_, idx) => idx !== habitIndex)

      // Delete all habits and re-save remaining ones
      await deleteAllUserHabits()

      // Re-save remaining habits
      if (uniqueHabitNames.length > 0) {
        const newHabits = []
        uniqueHabitNames.forEach((habitName, newIndex) => {
          // Find the original index to get the correct day/time data
          const originalIndex = Object.keys(habitGroups).indexOf(habitName)
          const selectedDays = dayCommitments[originalIndex] || []
          const timeSlot = timePreferences[originalIndex] || 'mid-morning'
          const timeOption = timeOfDayOptions.find(opt => opt.value === timeSlot)
          const reminderTime = `${String(timeOption.hour).padStart(2, '0')}:00:00`

          selectedDays.forEach(day => {
            newHabits.push({
              habit_name: habitName,
              day_of_week: dayMap[day],
              reminder_time: reminderTime,
              time_of_day: reminderTime,
              timezone: userTimezone
            })
          })
        })

        await saveHabitsForWeek(weekNumber, newHabits)
      }

      // Clear state and reload
      setDayCommitments({})
      setTimePreferences({})
      await loadHabits()
    } catch (error) {
      console.error('Error deleting habit:', error)
      alert('Failed to delete habit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyToClipboard = async () => {
    const groupedHabits = getGroupedHabits()
    
    let clipboardText = 'MY HABIT COMMITMENTS\n'
    clipboardText += '===================\n\n'
    
    groupedHabits.forEach(([habitName, habitList], index) => {
      clipboardText += `${index + 1}. ${habitName}\n`
      
      const committedDays = dayCommitments[index] || []
      if (committedDays.length > 0) {
        clipboardText += `   Days: ${committedDays.join(', ')}\n`
      }
      
      const timeSlot = timePreferences[index] || 'mid-morning'
      const timeOption = timeOfDayOptions.find(opt => opt.value === timeSlot)
      if (timeOption) {
        clipboardText += `   Time: ${timeOption.label}\n`
      }
      
      clipboardText += '\n'
    })
    
    try {
      await navigator.clipboard.writeText(clipboardText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleReminder = () => {
    const now = new Date()
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const dayNameToNumber = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }

    const getNextDayOccurrence = (dayName, startFromDate = new Date()) => {
      const targetDay = dayNameToNumber[dayName]
      const date = new Date(startFromDate)
      const currentDay = date.getDay()
      let daysUntilTarget = targetDay - currentDay
      
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }
      
      date.setDate(date.getDate() + daysUntilTarget)
      return date
    }

    const groupedHabits = getGroupedHabits()
    const events = []
    
    groupedHabits.forEach(([habitName, habitList], index) => {
      const committedDays = dayCommitments[index] || []
      const timePreference = timePreferences[index] || 'mid-morning'
      const timeOption = timeOfDayOptions.find(opt => opt.value === timePreference)
      const eventHour = timeOption ? timeOption.hour : 9
      
      if (committedDays.length > 0) {
        committedDays.forEach(day => {
          const eventDate = getNextDayOccurrence(day, now)
          eventDate.setHours(eventHour, 0, 0, 0)
          
          const startDate = formatICSDate(eventDate)
          const endDate = formatICSDate(new Date(eventDate.getTime() + 20 * 60 * 1000))
          
          events.push({
            uid: `${Date.now()}-${index}-${day}@healthvision.app`,
            startDate,
            endDate,
            summary: habitName,
            description: habitName.replace(/\n/g, '\\n')
          })
        })
      }
    })

    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Health Summit//Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`

    events.forEach(event => {
      icsContent += `BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${formatICSDate(now)}
DTSTART:${event.startDate}
DTEND:${event.endDate}
SUMMARY:${event.summary}
DESCRIPTION:${event.description}
LOCATION:Health Summit App
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
DESCRIPTION:Habit Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
`
    })

    icsContent += `END:VCALENDAR`

    const blob = new Blob([icsContent.trim()], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-summit-habits.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Group habits by name for display
  const getGroupedHabits = () => {
    const groups = {}
    habits.forEach(habit => {
      if (!groups[habit.habit_name]) {
        groups[habit.habit_name] = []
      }
      groups[habit.habit_name].push(habit)
    })
    return Object.entries(groups)
  }

  // Toggle tracking on/off with auto AI suggestion when enabling
  const handleToggleTracking = async (habitName) => {
    const currentConfig = trackingConfigs[habitName]
    const isCurrentlyEnabled = currentConfig?.tracking_enabled

    if (isCurrentlyEnabled) {
      // Disable tracking
      setTogglingTracking(habitName)
      const { success } = await disableTracking(habitName)
      if (success) {
        setTrackingConfigs(prev => ({
          ...prev,
          [habitName]: { ...prev[habitName], tracking_enabled: false }
        }))
      }
      setTogglingTracking(null)
    } else {
      // Enable tracking - fetch AI suggestion and auto-apply
      setTogglingTracking(habitName)

      // Get AI suggestion
      const { success: aiSuccess, data: suggestion } = await getAiSuggestion(habitName)

      const config = {
        tracking_enabled: true,
        tracking_type: aiSuccess && suggestion ? suggestion.tracking_type : 'boolean',
        metric_unit: aiSuccess && suggestion?.unit ? suggestion.unit : null,
        metric_target: aiSuccess && suggestion?.suggested_target ? suggestion.suggested_target : null,
        ai_suggested_unit: aiSuccess && suggestion?.unit ? suggestion.unit : null
      }

      const { success } = await saveTrackingConfig(habitName, config)
      if (success) {
        setTrackingConfigs(prev => ({
          ...prev,
          [habitName]: { ...config, habit_name: habitName }
        }))
      }
      setTogglingTracking(null)
    }
  }

  // Update tracking type (Y/N vs Metrics)
  const handleTrackingTypeChange = async (habitName, newType) => {
    const currentConfig = trackingConfigs[habitName]
    const config = {
      ...currentConfig,
      tracking_type: newType,
      metric_unit: newType === 'metric' ? (currentConfig?.metric_unit || 'minutes') : null,
      metric_target: newType === 'metric' ? currentConfig?.metric_target : null
    }

    const { success } = await saveTrackingConfig(habitName, config)
    if (success) {
      setTrackingConfigs(prev => ({
        ...prev,
        [habitName]: { ...config, habit_name: habitName }
      }))
    }
  }

  // Update metric unit
  const handleMetricUnitChange = async (habitName, newUnit) => {
    const currentConfig = trackingConfigs[habitName]
    const config = {
      ...currentConfig,
      metric_unit: newUnit
    }

    const { success } = await saveTrackingConfig(habitName, config)
    if (success) {
      setTrackingConfigs(prev => ({
        ...prev,
        [habitName]: { ...config, habit_name: habitName }
      }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <p className="text-stone-600">Loading habits...</p>
      </div>
    )
  }

  const groupedHabits = getGroupedHabits()

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            
            {/* Overflow Menu - Only show if habits exist */}
            {groupedHabits.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                  title="More actions"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {menuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMenuOpen(false)}
                    />
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-20">
                      <button
                        onClick={() => {
                          handleReminder()
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-stone-700 hover:bg-stone-50 transition"
                      >
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span>Add to Calendar</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleCopyToClipboard()
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-stone-700 hover:bg-stone-50 transition"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-green-600" />
                            <span>Copy to Clipboard</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Your Habits</h1>
          <p className="text-stone-600">
            These habits repeat each week on the days you've scheduled.
          </p>
        </div>

        {groupedHabits.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Beaker className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-800 mb-2">
              No Habits Set Yet
            </h2>
            <p className="text-stone-600 mb-6">
              Create your vision and build your habit plan to get started.
            </p>
            <button
              onClick={() => navigate('/vision')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              Create Your Plan
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-xl">
                <Beaker className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Habit Experiments</h2>
              </div>
            </div>

            <div className="space-y-4">
              {groupedHabits.map(([habitName, habitList], index) => {
                const committedDays = dayCommitments[index] || []
                const timeSlot = timePreferences[index] || 'mid-morning'
                const isEditing = editingHabitIndex === index

                return (
                  <div key={index} className="border border-stone-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      {isEditing ? (
                        <textarea
                          value={editedHabitNames[index] || habitName}
                          onChange={(e) => handleHabitNameChange(index, e.target.value)}
                          className="flex-1 font-semibold text-stone-900 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none mr-2"
                          rows={2}
                        />
                      ) : (
                        <p className="font-semibold text-stone-900">{habitName}</p>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(index, habitName)}
                            className="p-2 text-stone-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Edit habit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(index, habitName)}
                            disabled={saving}
                            className="p-2 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete habit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <>
                        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-900">
                            <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-normal text-stone-900 mb-2">
                            When will you do this?
                          </label>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
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

                        {/* Save/Cancel buttons for this habit */}
                        <div className="flex gap-2 pt-3 border-t border-stone-200">
                          <button
                            onClick={() => handleCancelEdit(index)}
                            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-700 hover:bg-stone-100 font-medium rounded-lg border border-stone-300 transition text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveHabit(index)}
                            disabled={saving}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-all text-sm"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Save
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-stone-700">
                          <p className="mb-1">
                            <strong>Days:</strong> {committedDays.length > 0 ? formatDaysDisplay(convertShortToFullDays(committedDays)) : 'Not set'}
                          </p>
                          <p>
                            <strong>Time:</strong> {timeOfDayOptions.find(opt => opt.value === timeSlot)?.label || 'Not set'}
                          </p>
                        </div>

                        {/* Track Details Section */}
                        <div className="mt-4 pt-4 border-t border-stone-200">
                          {/* Track Details Toggle Row */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-stone-700">Track Details</span>
                            <button
                              onClick={() => handleToggleTracking(habitName)}
                              disabled={togglingTracking === habitName}
                              className="flex items-center gap-1 text-sm transition disabled:opacity-50"
                            >
                              {togglingTracking === habitName ? (
                                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                              ) : trackingConfigs[habitName]?.tracking_enabled ? (
                                <ToggleRight className="w-8 h-8 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-stone-400" />
                              )}
                            </button>
                          </div>

                          {/* Expanded Tracking Controls (when enabled) */}
                          {trackingConfigs[habitName]?.tracking_enabled && (
                            <div className="mt-4 space-y-4">
                              {/* Tracking Type Segmented Button + Unit Dropdown */}
                              <div className="flex items-center gap-3">
                                {/* Y/N | Metrics Segmented Button */}
                                <div className="flex rounded-lg border border-stone-300 overflow-hidden">
                                  <button
                                    onClick={() => handleTrackingTypeChange(habitName, 'boolean')}
                                    className={`px-4 py-2 text-sm font-medium transition ${
                                      trackingConfigs[habitName].tracking_type === 'boolean'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-stone-600 hover:bg-stone-50'
                                    }`}
                                  >
                                    Y/N
                                  </button>
                                  <button
                                    onClick={() => handleTrackingTypeChange(habitName, 'metric')}
                                    className={`px-4 py-2 text-sm font-medium transition border-l border-stone-300 ${
                                      trackingConfigs[habitName].tracking_type === 'metric'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-stone-600 hover:bg-stone-50'
                                    }`}
                                  >
                                    Metrics
                                  </button>
                                </div>

                                {/* Unit Dropdown (only for metrics) */}
                                {trackingConfigs[habitName].tracking_type === 'metric' && (() => {
                                  const currentUnit = trackingConfigs[habitName].metric_unit || 'minutes'
                                  const isCustomUnit = !METRIC_UNITS.find(u => u.value === currentUnit)
                                  const showCustomInput = currentUnit === 'other' || isCustomUnit
                                  const localCustomValue = customUnitInputs[habitName]

                                  return (
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={isCustomUnit && currentUnit !== 'other' ? 'other' : currentUnit}
                                        onChange={(e) => {
                                          if (e.target.value === 'other') {
                                            // Just show the input, don't save yet
                                            setCustomUnitInputs(prev => ({ ...prev, [habitName]: '' }))
                                            handleMetricUnitChange(habitName, 'other')
                                          } else {
                                            // Clear any custom input and save the selected unit
                                            setCustomUnitInputs(prev => {
                                              const { [habitName]: _, ...rest } = prev
                                              return rest
                                            })
                                            handleMetricUnitChange(habitName, e.target.value)
                                          }
                                        }}
                                        className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      >
                                        {METRIC_UNITS.map(unit => (
                                          <option key={unit.value} value={unit.value}>
                                            {unit.value}
                                          </option>
                                        ))}
                                        <option value="other">Other...</option>
                                      </select>
                                      {showCustomInput && (
                                        <input
                                          type="text"
                                          value={localCustomValue !== undefined ? localCustomValue : (currentUnit === 'other' ? '' : currentUnit)}
                                          onChange={(e) => setCustomUnitInputs(prev => ({ ...prev, [habitName]: e.target.value }))}
                                          onBlur={() => {
                                            const value = customUnitInputs[habitName]
                                            if (value !== undefined && value.trim()) {
                                              handleMetricUnitChange(habitName, value.trim())
                                            }
                                            setCustomUnitInputs(prev => {
                                              const { [habitName]: _, ...rest } = prev
                                              return rest
                                            })
                                          }}
                                          placeholder="e.g., things"
                                          className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 w-28"
                                          autoFocus
                                        />
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>

                              {/* Helper Text */}
                              <p className="text-xs text-stone-500">
                                {trackingConfigs[habitName].tracking_type === 'boolean'
                                  ? 'Track you did it, yes or no.'
                                  : 'Enter an amount or unit each day.'}
                              </p>

                              {/* Weekly Tracker */}
                              <WeeklyTracker
                                habitName={habitName}
                                trackingType={trackingConfigs[habitName].tracking_type}
                                metricUnit={trackingConfigs[habitName].metric_unit}
                                metricTarget={trackingConfigs[habitName].metric_target}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Add New Habit Button or Limit Message */}
              {groupedHabits.length >= 3 ? (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-sm text-amber-900">
                    You've reached your limit of 3 habit experiments. Great work! 🎉
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/add-habit')}
                  className="w-full mt-4 p-4 border-2 border-dashed border-stone-300 hover:border-green-500 rounded-lg text-stone-600 hover:text-green-600 font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Add New Habit
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                  Delete Habit?
                </h3>
                <p className="text-stone-600">
                  Are you sure you want to delete <strong>"{deleteModal.habitName}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2.5 text-stone-600 hover:text-stone-700 hover:bg-stone-100 font-medium rounded-lg border border-stone-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
