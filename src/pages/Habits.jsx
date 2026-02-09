import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowBack,
  Science,
  Save,
  Edit,
  CheckCircle,
  Delete,
  Add,
  CalendarMonth,
  ContentCopy,
  Check,
  MoreVert,
  Autorenew,
} from '@mui/icons-material'
import { getHabits, deleteAllUserHabits, saveHabits } from '../services/habitService'
import { getCurrentWeekNumber } from '../utils/weekCalculator' // Still used for pilot timeline display
import { formatDaysDisplay, convertShortToFullDays } from '../utils/formatDays'
import { getCurrentUser, getProfile } from '../services/authService'
import { getAllTrackingConfigs, disableTracking, saveTrackingConfig, getAiSuggestion, renameHabitTracking } from '../services/trackingService'
import { METRIC_UNITS } from '../constants/metricUnits'
import WeeklyTracker from '../components/WeeklyTracker'
import { Toggle, ToggleButtonGroup } from '@summit/design-system'

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
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Scroll hide/show behavior for header
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

  // Store userId in ref so loadHabits/loadTrackingConfigs can reuse it
  const userIdRef = useRef(null)

  const loadTrackingConfigs = async (userId = null) => {
    const uid = userId || userIdRef.current
    const { success, data } = await getAllTrackingConfigs(uid)
    if (success && data) {
      const configMap = {}
      data.forEach(config => {
        configMap[config.habit_name] = config
      })
      setTrackingConfigs(configMap)
    }
  }

  const loadHabits = async (userId = null) => {
    setLoading(true)
    const week = getCurrentWeekNumber()
    setWeekNumber(week)

    const uid = userId || userIdRef.current
    const { success, data } = await getHabits(uid)
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

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true)

      // Get user first (single auth call)
      const { success: userSuccess, user } = await getCurrentUser()
      if (!userSuccess || !user) {
        setLoading(false)
        return
      }
      const userId = user.id
      userIdRef.current = userId

      // Run all data fetches in parallel
      const [profileResult, habitsResult, configsResult] = await Promise.all([
        getProfile(userId),
        getHabits(userId),
        getAllTrackingConfigs(userId)
      ])

      // Process profile/timezone
      if (profileResult.success && profileResult.data?.timezone) {
        setUserTimezone(profileResult.data.timezone)
      }

      // Process tracking configs
      if (configsResult.success && configsResult.data) {
        const configMap = {}
        configsResult.data.forEach(config => {
          configMap[config.habit_name] = config
        })
        setTrackingConfigs(configMap)
      }

      // Process habits
      const week = getCurrentWeekNumber()
      setWeekNumber(week)

      if (habitsResult.success && habitsResult.data && habitsResult.data.length > 0) {
        const data = habitsResult.data
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

    loadAllData()
  }, [])

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
      // Get unique habit names (before any changes)
      const habitGroups = {}
      habits.forEach(habit => {
        if (!habitGroups[habit.habit_name]) {
          habitGroups[habit.habit_name] = habit
        }
      })

      const uniqueHabitNames = Object.keys(habitGroups)

      // Check for name changes and update tracking data
      for (let index = 0; index < uniqueHabitNames.length; index++) {
        const originalHabitName = uniqueHabitNames[index]
        const newHabitName = editedHabitNames[index]

        // If the name was edited and is different, rename tracking data
        if (newHabitName && newHabitName !== originalHabitName) {
          await renameHabitTracking(originalHabitName, newHabitName)
        }
      }

      // Delete all existing habits and re-save (habits persist across weeks)
      await deleteAllUserHabits()

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
      const { success } = await saveHabits(newHabits)

      if (success) {
        await loadHabits()
        await loadTrackingConfigs() // Reload tracking configs with new names
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

        await saveHabits(newHabits)
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
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <p className="text-text-secondary">Loading habits...</p>
      </div>
    )
  }

  const groupedHabits = getGroupedHabits()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header */}
      <header className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors"
            >
              <ArrowBack className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            
            {/* Overflow Menu - Only show if habits exist */}
            {groupedHabits.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-text-secondary hover:text-summit-forest hover:bg-summit-mint rounded-lg transition"
                  title="More actions"
                >
                  <MoreVert className="w-5 h-5" />
                </button>

                {menuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <button
                        onClick={() => {
                          handleReminder()
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-summit-forest hover:bg-summit-mint transition"
                      >
                        <CalendarMonth className="w-4 h-4 text-summit-emerald" />
                        <span>Add to Calendar</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopyToClipboard()
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-summit-forest hover:bg-summit-mint transition"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-summit-emerald" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <ContentCopy className="w-4 h-4 text-summit-emerald" />
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
          <h1 className="text-h1 text-summit-forest mb-2">Your Habits</h1>
          <p className="text-body text-text-secondary">
            These habits repeat each week on the days you've scheduled.
          </p>
        </div>

        {groupedHabits.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <Science className="w-16 h-16 text-summit-sage mx-auto mb-4" />
            <h2 className="text-h2 text-summit-forest mb-2">
              No Habits Set Yet
            </h2>
            <p className="text-body text-text-secondary mb-6">
              Create your vision and build your habit plan to get started.
            </p>
            <button
              onClick={() => navigate('/vision')}
              className="px-6 py-3 bg-summit-lime hover:bg-summit-lime-dark text-summit-forest font-semibold rounded-lg transition"
            >
              Create Your Plan
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-summit-sage rounded-xl">
                <Science className="w-6 h-6 text-summit-emerald" />
              </div>
              <div>
                <h2 className="text-h2 text-summit-forest">Habit Experiments</h2>
              </div>
            </div>

            <div className="space-y-4">
              {groupedHabits.map(([habitName, habitList], index) => {
                const committedDays = dayCommitments[index] || []
                const timeSlot = timePreferences[index] || 'mid-morning'
                const isEditing = editingHabitIndex === index

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      {isEditing ? (
                        <textarea
                          value={editedHabitNames[index] || habitName}
                          onChange={(e) => handleHabitNameChange(index, e.target.value)}
                          className="flex-1 font-semibold text-summit-forest p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none mr-2"
                          rows={2}
                        />
                      ) : (
                        <p className="font-semibold text-summit-forest">{habitName}</p>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(index, habitName)}
                            className="p-2 text-text-secondary hover:text-summit-emerald hover:bg-summit-mint rounded-lg transition"
                            title="Edit habit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(index, habitName)}
                            disabled={saving}
                            className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete habit"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <>
                        <div className="mb-4 bg-summit-mint border border-summit-sage rounded-lg p-3">
                          <p className="text-sm text-summit-forest">
                            <strong>Nice!</strong> Let's lock in when you'll try this—take a quick look at your calendar and choose days that realistically work for you.
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-normal text-summit-forest mb-2">
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

                        {/* Save/Cancel buttons for this habit */}
                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleCancelEdit(index)}
                            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-summit-forest hover:bg-summit-mint font-medium rounded-lg border border-gray-300 transition text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveHabit(index)}
                            disabled={saving}
                            className="flex items-center gap-2 bg-summit-emerald hover:bg-emerald-700 disabled:bg-summit-sage disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-all text-sm"
                          >
                            {saving ? (
                              <>
                                <Autorenew className="w-4 h-4 animate-spin" />
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
                        <div className="text-sm text-summit-forest">
                          <p className="mb-1">
                            <strong>Days:</strong> {committedDays.length > 0 ? formatDaysDisplay(convertShortToFullDays(committedDays)) : 'Not set'}
                          </p>
                          <p>
                            <strong>Time:</strong> {timeOfDayOptions.find(opt => opt.value === timeSlot)?.label || 'Not set'}
                          </p>
                        </div>

                        {/* Track Details Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {/* Track Details Toggle Row */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-summit-forest">Track Details</span>
                            <Toggle
                              checked={trackingConfigs[habitName]?.tracking_enabled || false}
                              onChange={() => handleToggleTracking(habitName)}
                              disabled={togglingTracking === habitName}
                              size="xs"
                            />
                          </div>

                          {/* Expanded Tracking Controls (when enabled) */}
                          {trackingConfigs[habitName]?.tracking_enabled && (
                            <div className="mt-4 space-y-4">
                              {/* Tracking Type Segmented Button + Unit Dropdown */}
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Y/N | Metrics Toggle Button Group */}
                                <ToggleButtonGroup
                                  options={[
                                    { value: 'boolean', label: 'Y/N' },
                                    { value: 'metric', label: 'Metrics' },
                                  ]}
                                  value={trackingConfigs[habitName].tracking_type}
                                  onChange={(value) => handleTrackingTypeChange(habitName, value)}
                                  size="sm"
                                />

                                {/* Unit Dropdown (only for metrics) */}
                                {trackingConfigs[habitName].tracking_type === 'metric' && (() => {
                                  const currentUnit = trackingConfigs[habitName].metric_unit || 'minutes'
                                  const isCustomUnit = !METRIC_UNITS.find(u => u.value === currentUnit)
                                  const showCustomInput = currentUnit === 'other' || isCustomUnit
                                  const localCustomValue = customUnitInputs[habitName]

                                  return (
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
                                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald"
                                    >
                                      {METRIC_UNITS.map(unit => (
                                        <option key={unit.value} value={unit.value}>
                                          {unit.value}
                                        </option>
                                      ))}
                                      <option value="other">Other...</option>
                                    </select>
                                  )
                                })()}

                                {/* Custom Unit Input (on its own line) */}
                                {trackingConfigs[habitName].tracking_type === 'metric' && (() => {
                                  const currentUnit = trackingConfigs[habitName].metric_unit || 'minutes'
                                  const isCustomUnit = !METRIC_UNITS.find(u => u.value === currentUnit)
                                  const showCustomInput = currentUnit === 'other' || isCustomUnit
                                  const localCustomValue = customUnitInputs[habitName]

                                  return showCustomInput ? (
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
                                      className="basis-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald"
                                      autoFocus
                                    />
                                  ) : null
                                })()}
                              </div>

                              {/* Helper Text */}
                              <p className="text-xs text-text-muted">
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
                <div className="mt-4 p-4 bg-summit-mint border border-summit-sage rounded-lg text-center">
                  <p className="text-sm text-summit-forest">
                    You've reached your limit of 3 habit experiments. Great work!
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/add-habit')}
                  className="w-full mt-4 p-4 border-2 border-dashed border-gray-300 hover:border-summit-emerald rounded-lg text-text-secondary hover:text-summit-emerald font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <Add className="w-5 h-5 group-hover:scale-110 transition-transform" />
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
                <Delete className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-h2 text-summit-forest mb-2">
                  Delete Habit?
                </h3>
                <p className="text-body text-text-secondary">
                  Are you sure you want to delete <strong>"{deleteModal.habitName}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2.5 text-text-secondary hover:text-summit-forest hover:bg-summit-mint font-medium rounded-lg border border-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <Delete className="w-4 h-4" />
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
