import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Sparkles, Heart, Map, Clock3, Edit2, Bell, Beaker, TrendingUp, Lightbulb, Wand2, Loader2, RefreshCw, Copy, Check, CheckCircle, Mountain } from 'lucide-react'
import { generateActionPlan, generateMotivationalMessage } from '../../utils/planGenerator'
import { enhanceActionPlan } from '../../utils/aiService'
import { saveHabitsForWeek } from '../../services/habitService'
import { getCurrentWeekNumber } from '../../utils/weekCalculator'
import { getCurrentUser } from '../../services/authService'
import jsPDF from 'jspdf'

const SummaryPage = ({ formData, onNavigate }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('plan') // 'summary' or 'plan'
  const [copied, setCopied] = useState(false)
  const [isConfirmingHabits, setIsConfirmingHabits] = useState(false)
  const [habitsConfirmed, setHabitsConfirmed] = useState(false)
  
  // Generate the action plan
  const actionPlan = generateActionPlan(formData)
  const motivationalMessage = generateMotivationalMessage(formData)
  
  // AI Enhancement state
  const [aiEnhanced, setAiEnhanced] = useState(null)
  const [showAiView, setShowAiView] = useState(true) // Default to AI view
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false) // Track refresh vs initial load
  const [enhancementError, setEnhancementError] = useState(null)
  const [selectedActions, setSelectedActions] = useState([])
  const [selectedAiActions, setSelectedAiActions] = useState([]) // Store actual selected AI action objects
  const [customActions, setCustomActions] = useState([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomAction, setNewCustomAction] = useState('')
  const [isPlanFinalized, setIsPlanFinalized] = useState(false)
  const [dayCommitments, setDayCommitments] = useState({}) // Track day commitments per action
  const [timePreferences, setTimePreferences] = useState({}) // Track time-of-day per action
  const [encouragementMessage] = useState(() => {
    const messages = ['Nice!', 'Great!', 'Ok!']
    return messages[Math.floor(Math.random() * messages.length)]
  })

  // Time of day options with corresponding hours
  const timeOfDayOptions = [
    { label: 'Early Morning (6-8am)', value: 'early-morning', hour: 6, startHour: 6 },
    { label: 'Mid-Morning (8-10am)', value: 'mid-morning', hour: 8, startHour: 8 },
    { label: 'Lunch Time (12-1pm)', value: 'lunch', hour: 12, startHour: 12 },
    { label: 'Early Afternoon (1-3pm)', value: 'early-afternoon', hour: 13, startHour: 13 },
    { label: 'Afternoon (3-5pm)', value: 'afternoon', hour: 15, startHour: 15 },
    { label: 'After Work (5-7pm)', value: 'after-work', hour: 17, startHour: 17 },
    { label: 'Before Bedtime (9-10pm)', value: 'bedtime', hour: 21, startHour: 21 }
  ]

  // Check if user has sufficient data for personalization
  const hasSufficientData = () => {
    return (
      formData.visionStatement && formData.visionStatement.trim() !== '' &&
      formData.whyMatters && formData.whyMatters.trim() !== '' &&
      formData.currentScore !== undefined &&
      formData.readiness !== undefined &&
      formData.timeCapacity && formData.timeCapacity.trim() !== ''
    )
  }

  // Auto-run AI enhancement on mount if user has sufficient data
  useEffect(() => {
    if (!aiEnhanced && !isEnhancing && hasSufficientData()) {
      handleAIEnhancement()
    }
  }, []) // Run once on mount

  const handleCopyToClipboard = async () => {
    const finalizedActions = getSelectedActionsData()
    
    let clipboardText = 'MY HABIT COMMITMENTS\n'
    clipboardText += '===================\n\n'
    
    finalizedActions.forEach((item, index) => {
      clipboardText += `${index + 1}. ${item.action}\n`
      
      const committedDays = dayCommitments[index] || []
      if (committedDays.length > 0) {
        clipboardText += `   Days: ${committedDays.join(', ')}\n`
      }
      
      if (item.type === 'ai') {
        clipboardText += `   Why this works: ${item.why}\n`
        clipboardText += `   💡 Tip: ${item.tip}\n`
      }
      
      clipboardText += '\n'
    })
    
    clipboardText += '---\n'
    clipboardText += `Vision: ${formData.visionStatement || 'Not yet defined'}\n`
    
    try {
      await navigator.clipboard.writeText(clipboardText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPos = 20

    // Helper function to add text with word wrap
    const addText = (text, fontSize = 10, isBold = false, color = [0, 0, 0]) => {
      doc.setFontSize(fontSize)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, maxWidth)
      lines.forEach(line => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(line, margin, yPos)
        yPos += fontSize * 0.5
      })
      yPos += 3
    }

    const addSection = (title) => {
      yPos += 5
      doc.setFontSize(14)
      doc.setTextColor(34, 197, 94) // Green color
      doc.text(title, margin, yPos)
      yPos += 8
      doc.setTextColor(0, 0, 0)
    }

    // Title
    doc.setFontSize(18)
    doc.setTextColor(34, 197, 94)
    doc.text('MY HEALTH SUMMIT & PERSONAL PLAN', margin, yPos)
    yPos += 10
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos)
    yPos += 10

    // Vision Setting
    addSection('STEP 1: VISION SETTING')
    addText('Health Summit (1-2 years):', 11, true)
    addText(formData.visionStatement || 'Not yet defined')
    addText('How I Feel:', 11, true)
    addText(formData.feelingState || 'Not yet defined')
    if (formData.futureAbilities) {
      addText("What I'm Able to Do:", 11, true)
      addText(formData.futureAbilities)
    }
    addText('Why This Matters:', 11, true)
    addText(formData.whyMatters || 'Not yet defined')

    // Base Camp
    addSection('STEP 2: BASE CAMP (Resources)')
    addText('Non-negotiables:', 11, true)
    addText(formData.nonNegotiables || 'Not yet defined')
    addText('Strengths & Resources:', 11, true)
    addText(formData.strengths || 'Not yet defined')
    addText('Energizers:', 11, true)
    addText(formData.energizers || 'Not yet defined')
    addText('Gaps & Needs:', 11, true)
    addText(formData.gapsWants || 'Not yet defined')

    // Assess the Route
    addSection('STEP 3: ASSESS THE ROUTE')
    addText(`Current Position: ${formData.currentScore || 5}/10 up the mountain`, 11, true)
    addText('Obstacles:', 11, true)
    addText((formData.barriers || []).join(', ') || 'None selected')
    if (formData.barriersNotes) addText(`Notes: ${formData.barriersNotes}`)
    addText('Skills/Habits to Navigate:', 11, true)
    addText((formData.habitsToImprove || []).join(', ') || 'None selected')

    // Capacity & Support
    addSection('STEP 4: CAPACITY & SUPPORT')
    addText(`Time Capacity: ${formData.timeCapacity || 'Not yet defined'}`, 11, true)
    addText(`Readiness: ${formData.readiness || 5}/10`, 11, true)
    if (formData.preferredTimes) {
      addText('Preferred Times:', 11, true)
      addText(formData.preferredTimes)
    }
    if (formData.sustainableNotes) {
      addText('What Feels Sustainable:', 11, true)
      addText(formData.sustainableNotes)
    }

    // Action Plan - Show Finalized Plan if available
    addSection('YOUR PERSONALIZED ACTION PLAN')
    
    // Check if plan is finalized and has selected actions
    const finalizedActions = getSelectedActionsData()
    if (isPlanFinalized && finalizedActions.length > 0) {
      addText('Your Committed Actions for This Week:', 11, true)
      addText('These are the actions you have chosen to focus on.', 9)
      yPos += 3
      
      finalizedActions.forEach((item, index) => {
        addText(`✓ ${index + 1}. ${item.action}`, 10, true)
        const committedDays = dayCommitments[index] || []
        if (committedDays.length > 0) {
          addText(`Days: ${committedDays.join(', ')}`, 9)
        }
        if (item.type === 'ai') {
          addText(`Why this works: ${item.why}`, 9)
          addText(`💡 Tip: ${item.tip}`, 9)
        } else {
          addText('(Custom action)', 9)
        }
        yPos += 2
      })
    } else if (aiEnhanced && Array.isArray(aiEnhanced)) {
      // Show all AI recommendations if plan not finalized
      addText('AI-Personalized Suggestions:', 11, true)
      addText('These actions are tailored to your situation, schedule, and goals. Already doing some? Nice work. Choose 1–2 new ideas to focus on, or tap Refresh ideas for more options.', 9)
      yPos += 3
      
      aiEnhanced.forEach((item, index) => {
        addText(`${index + 1}. ${item.action}`, 10, true)
        addText(`Why this works: ${item.why}`, 9)
        addText(`💡 Tip: ${item.tip}`, 9)
        yPos += 2
      })
    } else {
      // Original action plan
      addText(`This Week's Actions (${formData.timeCapacity || '10 minutes/day'}):`, 11, true)
      if (actionPlan.weeklyActions.length > 0) {
        actionPlan.weeklyActions.forEach(item => {
          addText(`${item.area}:`, 10, true)
          item.actions.forEach(action => addText(`  • ${action}`, 9))
        })
      } else {
        addText('Complete the previous steps to generate actions')
      }
    }

    if (actionPlan.habitRecommendations.length > 0) {
      yPos += 3
      addText('Your Plan: Start Small, Then Stack', 11, true)
      addText('Each week, you\'ll choose 1–2 small habits to experiment with.', 9)
      addText('Going from 0→100 is a recipe for burnout. Successful plans start with incremental, achievable actions that build momentum over time.', 9)
      addText('As habits stick, you can extend, modify, or level them up—based on what actually worked last week.', 9)
      if (actionPlan.habitRecommendations.length > 0) {
        const habits = actionPlan.habitRecommendations.map(rec => rec.habit.toLowerCase())
        const habitText = habits.length === 1 
          ? habits[0] 
          : `${habits[0]} and ${habits[1]}`
        addText(`Based on your vision and needs, experiment with habits focused around ${habitText}.`, 9, true)
      }
    }

    // Save PDF
    doc.save(`health-summit-plan-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleReminder = () => {
    const now = new Date()
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayNameToNumber = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }

    // Get the next occurrence of a specific day
    const getNextDayOccurrence = (dayName, startFromDate = new Date()) => {
      const targetDay = dayNameToNumber[dayName]
      const date = new Date(startFromDate)
      const currentDay = date.getDay()
      let daysUntilTarget = targetDay - currentDay
      
      // If the day has passed this week, get next week's occurrence
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }
      
      date.setDate(date.getDate() + daysUntilTarget)
      return date
    }

    // Build finalized actions content
    const finalizedActions = getSelectedActionsData()
    
    // Create events array
    const events = []
    
    finalizedActions.forEach((item, index) => {
      const committedDays = dayCommitments[index] || []
      const timePreference = timePreferences[index] || 'mid-morning'
      const timeOption = timeOfDayOptions.find(opt => opt.value === timePreference)
      const eventHour = timeOption ? timeOption.hour : 9
      
      if (committedDays.length > 0) {
        // Create an event for each committed day
        committedDays.forEach(day => {
          const eventDate = getNextDayOccurrence(day, now)
          // Set time based on user's preference
          eventDate.setHours(eventHour, 0, 0, 0)
          
          const startDate = formatICSDate(eventDate)
          const endDate = formatICSDate(new Date(eventDate.getTime() + 20 * 60 * 1000)) // 20 minutes
          
          let description = `${item.action}`
          if (item.type === 'ai') {
            description += `\\n\\nWhy this works: ${item.why}\\n\\n💡 Tip: ${item.tip}`
          }
          description += `\\n\\n---\\nYour Vision: ${formData.visionStatement || 'Not yet defined'}`
          
          events.push({
            uid: `${Date.now()}-${index}-${day}@healthvision.app`,
            startDate,
            endDate,
            summary: item.action,
            description: description.replace(/\n/g, '\\n')
          })
        })
      }
    })

    // Build ICS content with all events
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

  const handleConfirmHabits = async () => {
    setIsConfirmingHabits(true)
    
    try {
      // Check if user is authenticated
      const { user } = await getCurrentUser()
      if (!user) {
        alert('Please log in to save your habits')
        navigate('/login')
        return
      }

      // Get current week number
      const weekNumber = getCurrentWeekNumber()
      
      // Get selected actions with their day/time commitments
      const finalizedActions = getSelectedActionsData()
      
      // Map day names to numbers (0 = Sunday, 6 = Saturday)
      const dayNameToNumber = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      }
      
      // Build habits array for database
      const habits = []
      
      finalizedActions.forEach((item, index) => {
        const committedDays = dayCommitments[index] || []
        const timePreference = timePreferences[index] || 'mid-morning'
        const timeOption = timeOfDayOptions.find(opt => opt.value === timePreference)
        const eventHour = timeOption ? timeOption.hour : 9
        const eventStartHour = timeOption ? timeOption.startHour : 9
        const eventEndHour = timeOption ? timeOption.endHour : 10
        
        // Create a habit entry for each committed day
        committedDays.forEach(dayName => {
          habits.push({
            habit_name: item.action,
            day_of_week: dayNameToNumber[dayName],
            reminder_time: `${String(eventStartHour).padStart(2, '0')}:00:00`,
            time_of_day: `${String(eventStartHour).padStart(2, '0')}:00:00`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'
          })
        })
      })
      
      // Validate: at least 1 habit with at least 1 day
      if (habits.length === 0) {
        alert('Please select at least one day for your habits')
        setIsConfirmingHabits(false)
        return
      }
      
      // Validate: max 3 habits (unique habit names)
      const uniqueHabits = [...new Set(habits.map(h => h.habit_name))]
      if (uniqueHabits.length > 3) {
        alert('Please select a maximum of 3 habits for this week')
        setIsConfirmingHabits(false)
        return
      }
      
      
      // Save to database
      const result = await saveHabitsForWeek(weekNumber, habits)
      
      if (result.success) {
        setHabitsConfirmed(true)
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        alert('Failed to save habits. Please try again.')
        console.error('Save habits error:', result.error)
      }
    } catch (error) {
      console.error('Error confirming habits:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsConfirmingHabits(false)
    }
  }

  const handleAIEnhancement = async () => {
    setIsEnhancing(true)
    setEnhancementError(null)
    
    try {
      const enhanced = await enhanceActionPlan(formData, actionPlan)
      setAiEnhanced(enhanced)
      setShowAiView(true)
    } catch (error) {
      console.error('Enhancement error:', error)
      setEnhancementError(error.message || 'Failed to enhance plan. Please check your API key.')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleRefreshSuggestions = async () => {
    setIsRefreshing(true)
    setIsEnhancing(true)
    setEnhancementError(null)
    
    try {
      // Save currently selected actions before refreshing
      const currentlySelected = selectedActions.map(index => aiEnhanced[index])
      
      // Clear the selected indices FIRST to prevent index conflicts
      setSelectedActions([])
      
      // Then merge with previously selected actions
      setSelectedAiActions(prev => {
        const combined = [...prev, ...currentlySelected]
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(t => t.action === item.action)
        )
        return unique
      })
      
      // Get new suggestions
      const enhanced = await enhanceActionPlan(formData, actionPlan)
      setAiEnhanced(enhanced)
    } catch (error) {
      console.error('Enhancement error:', error)
      setEnhancementError(error.message || 'Failed to refresh suggestions. Please check your API key.')
    } finally {
      setIsEnhancing(false)
      setIsRefreshing(false)
    }
  }

  const toggleActionSelection = (index) => {
    setSelectedActions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleAddCustomAction = () => {
    if (newCustomAction.trim()) {
      setCustomActions(prev => [...prev, newCustomAction.trim()])
      setNewCustomAction('')
      setShowAddCustom(false)
    }
  }

  const handleRemoveCustomAction = (index) => {
    setCustomActions(prev => prev.filter((_, i) => i !== index))
  }

  const handleFinalizePlan = () => {
    if (selectedActions.length > 0 || selectedAiActions.length > 0 || customActions.length > 0) {
      // Initialize day commitments and time preferences for each action if not already set
      const actionsData = getSelectedActionsData()
      const initialCommitments = {}
      const initialTimePrefs = {}
      actionsData.forEach((_, index) => {
        if (!dayCommitments[index]) {
          initialCommitments[index] = []
        }
        if (!timePreferences[index]) {
          initialTimePrefs[index] = 'mid-morning' // Default to mid-morning
        }
      })
      setDayCommitments(prev => ({ ...prev, ...initialCommitments }))
      setTimePreferences(prev => ({ ...prev, ...initialTimePrefs }))
      setIsPlanFinalized(true)
    }
  }

  const handleEditPlan = () => {
    setIsPlanFinalized(false)
  }

  const toggleDayCommitment = (actionIndex, day) => {
    setDayCommitments(prev => {
      const currentDays = prev[actionIndex] || []
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day]
      return { ...prev, [actionIndex]: newDays }
    })
  }

  const handleTimePreferenceChange = (actionIndex, timeValue) => {
    setTimePreferences(prev => ({
      ...prev,
      [actionIndex]: timeValue
    }))
  }

  const getSelectedActionsData = () => {
    // Combine selected AI actions from current suggestions
    const currentAiActions = selectedActions.map(index => ({
      type: 'ai',
      ...aiEnhanced[index]
    }))
    // Add previously selected AI actions
    const previousAiActions = selectedAiActions.map(action => ({
      type: 'ai',
      ...action
    }))
    const customActionsData = customActions.map(action => ({
      type: 'custom',
      action: action
    }))
    return [...previousAiActions, ...currentAiActions, ...customActionsData]
  }

  const isEmpty = (value) => !value || value.trim() === ''
  const isArrayEmpty = (arr) => !arr || arr.length === 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-green-100 rounded-xl">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-4xl font-bold text-stone-900">My Personal Health Plan</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-stone-200 no-print">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'plan'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            My Plan
          </div>
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'summary'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            My Vision
          </div>
        </button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">My Personal Health Plan</h1>
        <p className="text-stone-600">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Action Plan Tab */}
      {activeTab === 'plan' && (
        <>
          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-8">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Your Starting Point</h3>
                <p className="text-stone-700 leading-relaxed">{motivationalMessage}</p>
              </div>
            </div>
          </div>

          {/* Habit Recommendations */}
          {actionPlan.habitRecommendations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Your Plan: Start Small, Then Stack</h3>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <p className="text-stone-700">
                  Each week, you'll choose 1–2 small habits to experiment with.
                </p>
                <p className="text-stone-700">
                  Going from 0→100 is a recipe for burnout. Successful plans start with incremental, achievable actions that build momentum over time.
                </p>
                <p className="text-stone-700">
                  As habits stick, you can extend, modify, or level them up—based on what actually worked last week.
                </p>
                {actionPlan.habitRecommendations.length > 0 && (
                  <p className="text-stone-700 pt-2">
                    <strong>Based on your vision and needs, experiment with habits focused around {
                      actionPlan.habitRecommendations.length === 1
                        ? actionPlan.habitRecommendations[0]?.habit.toLowerCase()
                        : `${actionPlan.habitRecommendations[0]?.habit.toLowerCase()} and ${actionPlan.habitRecommendations[1]?.habit.toLowerCase()}`
                    }.</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Build Your Plan - AI Actions with Checkboxes */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Beaker className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Habit Experiments</h3>
                </div>
              </div>
              {isPlanFinalized && (
                <button
                  onClick={handleEditPlan}
                  className="flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 font-semibold transition-colors no-print"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
            {!isPlanFinalized && (
              <>
                <p className="text-sm text-stone-600 mb-4">Choose 1–3 habits to start with this week.</p>
                
                {/* Add Your Own Link/Form - Moved to top */}
                {!showAddCustom ? (
                  <button
                    onClick={() => setShowAddCustom(true)}
                    className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-2 transition-colors mb-6"
                  >
                    <span className="text-lg">+</span>
                    Add My Own
                  </button>
                ) : (
                  <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <textarea
                      value={newCustomAction}
                      onChange={(e) => setNewCustomAction(e.target.value)}
                      placeholder="Describe your custom habit..."
                      className="w-full p-3 border border-stone-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddCustomAction}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Add Habit
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCustom(false)
                          setNewCustomAction('')
                        }}
                        className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading State - Only show during initial enhancement, not refresh */}
            {isEnhancing && !isRefreshing && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-stone-600">Building your personalized plan...</p>
                </div>
              </div>
            )}

            {/* Insufficient Data Message */}
            {!aiEnhanced && !isEnhancing && !enhancementError && !hasSufficientData() && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Complete your profile to get personalized recommendations</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Fill out your vision, why it matters, current state, and time capacity in the previous steps to generate AI-personalized suggestions.
                </p>
              </div>
            )}

            {/* Manual Trigger Button (if data exists but AI hasn't run) */}
            {!aiEnhanced && !isEnhancing && !enhancementError && hasSufficientData() && (
              <button
                onClick={handleAIEnhancement}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                Generate Personalized Plan
              </button>
            )}

            {/* Error Message */}
            {enhancementError && !isEnhancing && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {enhancementError}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Make sure you've added your OpenAI API key to the .env file.
                </p>
              </div>
            )}

            {/* AI Personalized Plan Header - Only show in edit mode */}
            {aiEnhanced && !isPlanFinalized && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">AI-Personalized Suggestions</h4>
                  </div>
                  <button
                    onClick={handleRefreshSuggestions}
                    disabled={isEnhancing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 border border-purple-300 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Refresh ideas
                  </button>
                </div>
                <p className="text-sm text-purple-800">
                  These actions are tailored to your situation, schedule, and goals.
                  Already doing some? Nice work. Choose 1–2 new ideas to focus on, or tap Refresh ideas for more options.
                </p>
              </div>
            )}

            {/* Finalized Plan View */}
            {isPlanFinalized ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      {encouragementMessage} Let's lock in when you'll try {getSelectedActionsData().length === 1 ? 'this' : 'these'}—take a quick look at your calendar and choose days that realistically work for you.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      People are far more likely to follow through when they decide <em>when</em> they'll act, not just <em>what</em> they'll do.
                    </p>
                  </div>
                  {getSelectedActionsData().map((item, index) => {
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    const committedDays = dayCommitments[index] || []
                    
                    return (
                      <div key={index} className="p-4 rounded-lg border-2 border-stone-200 bg-white">
                        <div className="flex-1">
                          <p className="font-semibold text-stone-900 mb-2">{item.action}</p>
                          {item.type === 'ai' && (
                            <>
                              <p className="text-sm text-stone-700 mb-1">
                                <strong>Why this works:</strong> {item.why}
                              </p>
                              <p className="text-sm text-stone-600 mb-3">
                                <strong>💡 Tip:</strong> {item.tip}
                              </p>
                            </>
                          )}
                          {item.type === 'custom' && (
                            <p className="text-xs text-blue-600 mb-3">Custom action</p>
                          )}
                          
                          {/* When will you do this? Label */}
                          <div className="mb-2">
                            <label className="block text-sm font-normal text-stone-900">
                              When will you do this?
                            </label>
                          </div>
                          
                          {/* Day Commitment Chips and Time Selector - Responsive Layout */}
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
                                value={timePreferences[index] || 'mid-morning'}
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
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons - After Finalized Plan */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-stone-200">
                  {!habitsConfirmed ? (
                    <>
                      {/* Confirm This Week's Habits Button - Primary Action */}
                      <button
                        onClick={handleConfirmHabits}
                        disabled={isConfirmingHabits}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        {isConfirmingHabits ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Confirm This Week's Habits
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="w-full bg-green-50 border-2 border-green-500 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">Habits Confirmed!</p>
                          <p className="text-sm text-green-700">Redirecting you to your dashboard...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Previously Selected AI Actions */}
                {selectedAiActions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {selectedAiActions.map((item, index) => (
                      <div 
                        key={`selected-${index}`} 
                        className="p-4 rounded-lg border-2 transition-all cursor-pointer bg-green-50 border-green-300 hover:border-green-400 hover:shadow-sm"
                        onClick={() => {
                          setSelectedAiActions(prev => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => {
                              setSelectedAiActions(prev => prev.filter((_, i) => i !== index))
                            }}
                            className="mt-1 w-5 h-5 text-green-600 rounded border-stone-300 focus:ring-green-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-stone-900 mb-2">{item.action}</p>
                            <p className="text-sm text-purple-800 mb-2">
                              <strong>Why this works:</strong> {item.why}
                            </p>
                            <p className="text-sm text-stone-600">
                              <strong>💡 Tip:</strong> {item.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Enhanced Actions with Checkboxes */}
                {aiEnhanced && (!isEnhancing || isRefreshing) && Array.isArray(aiEnhanced) && (
                  <div className="space-y-3 mb-4">
                    {aiEnhanced
                      .map((item, originalIndex) => ({ item, originalIndex }))
                      .filter(({ item }) => !selectedAiActions.some(selected => selected.action === item.action))
                      .map(({ item, originalIndex }) => (
                      <div 
                        key={originalIndex} 
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedActions.includes(originalIndex)
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                        onClick={() => toggleActionSelection(originalIndex)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedActions.includes(originalIndex)}
                            onChange={() => toggleActionSelection(originalIndex)}
                            className="mt-1 w-5 h-5 text-green-600 rounded border-stone-300 focus:ring-green-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-stone-900 mb-2">{item.action}</p>
                            <p className="text-sm text-purple-800 mb-2">
                              <strong>Why this works:</strong> {item.why}
                            </p>
                            <p className="text-sm text-stone-600">
                              <strong>💡 Tip:</strong> {item.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Actions */}
                {customActions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {customActions.map((action, index) => (
                      <div key={`custom-${index}`} className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="mt-1 w-5 h-5 text-blue-600 rounded border-stone-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-stone-900">{action}</p>
                            <p className="text-xs text-blue-600 mt-1">Custom action</p>
                          </div>
                          <button
                            onClick={() => handleRemoveCustomAction(index)}
                            className="text-stone-400 hover:text-red-600 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule Habits Button */}
                {aiEnhanced && (!isEnhancing || isRefreshing) && (
                  <div className="mt-6">
                    <button
                      onClick={handleFinalizePlan}
                      disabled={selectedActions.length === 0 && selectedAiActions.length === 0 && customActions.length === 0}
                      className={`w-full py-3 font-bold rounded-lg shadow-md transition-all ${
                        selectedActions.length > 0 || selectedAiActions.length > 0 || customActions.length > 0
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      Schedule Habits
                    </button>
                    {selectedActions.length === 0 && selectedAiActions.length === 0 && customActions.length === 0 && (
                      <p className="text-xs text-stone-500 text-center mt-2">
                        Select at least one action to finalize your plan
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Hidden: Original Plan (kept for reference but not displayed) */}
            <div className="hidden">
              {actionPlan.weeklyActions.length > 0 && (
                <div className="space-y-6">
                  {actionPlan.weeklyActions.map((item, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-stone-900 mb-3">{item.area}</h4>
                      <ul className="space-y-2">
                        {item.actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-stone-700">
                            <span className="text-green-600 mt-1">✓</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <>
          <p className="text-lg text-stone-700 mb-8 leading-relaxed">
            This is your personalized health plan based on your vision, motivation, current state, and capacity. 
            Review this regularly and adjust as you grow.
          </p>

          {/* Summary Content */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Health Summit */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <Mountain className="w-5 h-5" />
              Health Summit
            </h3>
            <button onClick={() => onNavigate('vision')} className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-green-600 transition-colors" title="Edit this section">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-stone-800 leading-relaxed">
              {isEmpty(formData.visionStatement) && isEmpty(formData.feelingState) && isEmpty(formData.whyMatters) ? (
                <span className="text-stone-400 italic text-sm">Not yet defined</span>
              ) : (
                <>
                  {!isEmpty(formData.visionStatement) && formData.visionStatement}
                  {!isEmpty(formData.feelingState) && (
                    <>{!isEmpty(formData.visionStatement) && ' '}{formData.feelingState}</>
                  )}
                  {!isEmpty(formData.appearanceConfidence) && (
                    <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState)) && ' '}{formData.appearanceConfidence}</>
                  )}
                  {!isEmpty(formData.futureAbilities) && (
                    <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState) || !isEmpty(formData.appearanceConfidence)) && ' '}{formData.futureAbilities}</>
                  )}
                  {!isEmpty(formData.whyMatters) && (
                    <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState) || !isEmpty(formData.appearanceConfidence) || !isEmpty(formData.futureAbilities)) && ' '}This matters because {formData.whyMatters}</>
                  )}
                </>
              )}
            </p>

            {!isArrayEmpty(formData.motivationDrivers) && (
              <div>
                <p className="text-xs font-semibold text-stone-600 mb-2">My Biggest Drivers:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.motivationDrivers.map((driver) => (
                    <span key={driver} className="px-3 py-1 bg-green-200 text-green-900 text-xs font-medium rounded-full">{driver}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Base Camp */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Step 2: Base Camp (Resources)
            </h3>
            <button onClick={() => onNavigate('basecamp')} className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-green-600 transition-colors" title="Edit this section">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⛔ Non-negotiables</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.nonNegotiables) ? <span className="text-stone-400 italic">Not yet defined</span> : formData.nonNegotiables}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">💪 Strengths & Resources</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.strengths) ? <span className="text-stone-400 italic">Not yet defined</span> : formData.strengths}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⚡ Energizers</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.energizers) ? <span className="text-stone-400 italic">Not yet defined</span> : formData.energizers}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">🎯 Gaps & Needs</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.gapsWants) ? <span className="text-stone-400 italic">Not yet defined</span> : formData.gapsWants}
              </p>
            </div>
          </div>
        </section>

        {/* Step 3: Assess the Route */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <Map className="w-5 h-5" />
              Step 3: Assess the Route
            </h3>
            <button onClick={() => onNavigate('current')} className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-green-600 transition-colors" title="Edit this section">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-1">Current Position on the Mountain</h4>
              <p className="text-3xl font-bold text-green-600">{formData.currentScore || 5} <span className="text-lg text-stone-600">/ 10</span></p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-2">🚧 Obstacles Blocking Your Path</h4>
              {!isArrayEmpty(formData.barriers) ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.barriers.map((barrier) => (
                    <span key={barrier} className="px-3 py-1 bg-green-100 text-green-900 text-xs font-medium rounded-full">{barrier}</span>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 italic text-sm">None selected</p>
              )}
              {!isEmpty(formData.barriersNotes) && (
                <p className="text-stone-700 text-sm mt-2">{formData.barriersNotes}</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-2">🔧 Skills/Habits to Navigate Terrain</h4>
              {!isArrayEmpty(formData.habitsToImprove) ? (
                <div className="flex flex-wrap gap-2">
                  {formData.habitsToImprove.map((habit) => (
                    <span key={habit} className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-medium rounded-full">{habit}</span>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 italic text-sm">None selected</p>
              )}
            </div>
          </div>
        </section>

        {/* Step 4: Capacity & Support */}
        <section className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <Clock3 className="w-5 h-5" />
              Step 4: Capacity & Support
            </h3>
            <button onClick={() => onNavigate('capacity')} className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-green-600 transition-colors" title="Edit this section">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⏰ Time Capacity</h4>
              <p className="text-stone-800 text-sm font-medium">
                {formData.timeCapacity || <span className="text-stone-400 italic">Not yet defined</span>}
              </p>
            </div>

            {!isEmpty(formData.preferredTimes) && (
              <div>
                <h4 className="text-sm font-semibold text-stone-600 mb-1">📅 Preferred Times</h4>
                <p className="text-stone-800 text-sm">{formData.preferredTimes}</p>
              </div>
            )}

            {!isEmpty(formData.sustainableNotes) && (
              <div>
                <h4 className="text-sm font-semibold text-stone-600 mb-1">🌱 What Feels Sustainable</h4>
                <p className="text-stone-800 text-sm">{formData.sustainableNotes}</p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-1">Readiness Level</h4>
              <p className="text-3xl font-bold text-green-600">{formData.readiness || 5} <span className="text-lg text-stone-600">/ 10</span></p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-2">🤝 Support Needs</h4>
              {!isArrayEmpty(formData.supportNeeds) ? (
                <div className="flex flex-wrap gap-2">
                  {formData.supportNeeds.map((need) => (
                    <span key={need} className="px-3 py-1 bg-green-100 text-green-900 text-xs font-medium rounded-full">{need}</span>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 italic text-sm">None selected</p>
              )}
            </div>
          </div>
        </section>
      </div>

          {/* Footer Note */}
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
            <h4 className="font-semibold text-stone-900 mb-2">📅 Next Steps</h4>
            <ul className="text-sm text-stone-700 space-y-1">
              <li>• Save or print this plan for easy reference</li>
              <li>• Set a calendar reminder to review in 1-3 months</li>
              <li>• Start with your 1-2 focus areas this week</li>
              <li>• Share with a health coach or accountability partner if helpful</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default SummaryPage
