import React, { useState, useEffect, useRef } from 'react'
import { FileText, Printer, Download, Sparkles, Heart, Map, Clock3, Edit2, Bell, ChevronDown, Target, TrendingUp, Lightbulb, Wand2, Loader2 } from 'lucide-react'
import { generateActionPlan, generateMotivationalMessage } from '../../utils/planGenerator'
import { enhanceActionPlan } from '../../utils/aiService'
import jsPDF from 'jspdf'

const SummaryPage = ({ formData, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('plan') // 'summary' or 'plan'
  const [showReminderDropdown, setShowReminderDropdown] = useState(false)
  const dropdownRef = useRef(null)
  
  // Generate the action plan
  const actionPlan = generateActionPlan(formData)
  const motivationalMessage = generateMotivationalMessage(formData)
  
  // AI Enhancement state
  const [aiEnhanced, setAiEnhanced] = useState(null)
  const [showAiView, setShowAiView] = useState(true) // Default to AI view
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancementError, setEnhancementError] = useState(null)
  const [selectedActions, setSelectedActions] = useState([])
  const [customActions, setCustomActions] = useState([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomAction, setNewCustomAction] = useState('')

  // Auto-run AI enhancement on mount
  useEffect(() => {
    if (!aiEnhanced && !isEnhancing) {
      handleAIEnhancement()
    }
  }, []) // Run once on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowReminderDropdown(false)
      }
    }

    if (showReminderDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showReminderDropdown])

  const handlePrint = () => {
    window.print()
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

    // Action Plan
    addSection('YOUR PERSONALIZED ACTION PLAN')
    
    // Check if AI-enhanced recommendations are available and being viewed
    if (aiEnhanced && showAiView && Array.isArray(aiEnhanced)) {
      addText('AI-Personalized Recommendations:', 11, true)
      addText('These actions have been tailored specifically to your situation, schedule, and goals.', 9)
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

    if (actionPlan.barrierStrategies.length > 0) {
      yPos += 3
      addText('Overcoming Your Barriers:', 11, true)
      actionPlan.barrierStrategies.forEach(item => {
        addText(`${item.barrier}:`, 10, true)
        addText(`Strategy: ${item.strategy}`, 9)
        addText('Tips:', 9, true)
        item.tips.forEach(tip => addText(`  • ${tip}`, 8))
      })
    }

    if (actionPlan.habitRecommendations.length > 0) {
      yPos += 3
      addText('Your Habit-Building Sequence:', 11, true)
      actionPlan.habitRecommendations.forEach(item => {
        addText(`Week ${item.week} (${item.priority}): ${item.habit}`, 10, true)
        addText(`Tip: ${item.tip}`, 9)
      })
    }

    yPos += 3
    addText('Weekly Check-In Prompts:', 11, true)
    actionPlan.weeklyCheckIn.prompts.forEach((prompt, idx) => {
      addText(`${idx + 1}. ${prompt}`, 9)
    })

    yPos += 5
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    addText(`Remember: ${actionPlan.weeklyCheckIn.reminderText}`, 9)
    addText(actionPlan.weeklyCheckIn.nextSteps, 9)

    // Save PDF
    doc.save(`health-summit-plan-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleReminder = (period) => {
    const now = new Date()
    let reminderDate = new Date(now)
    
    switch(period) {
      case '1week':
        reminderDate.setDate(now.getDate() + 7)
        break
      case '1month':
        reminderDate.setMonth(now.getMonth() + 1)
        break
      case '3months':
        reminderDate.setMonth(now.getMonth() + 3)
        break
      case '6months':
        reminderDate.setMonth(now.getMonth() + 6)
        break
      default:
        reminderDate.setMonth(now.getMonth() + 3)
    }

    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const startDate = formatICSDate(reminderDate)
    const endDate = formatICSDate(new Date(reminderDate.getTime() + 60 * 60 * 1000))

    const visionSummary = `
HEALTH SUMMIT REVIEW
====================

It's time to review and update your Health Summit & Action Plan!

YOUR VISION (1-2 years):
${formData.visionStatement || 'Not yet defined'}

WHY IT MATTERS:
${formData.whyMatters || 'Not yet defined'}

CURRENT PROGRESS:
- Current Score: ${formData.currentScore || 5}/10
- Readiness: ${formData.readiness || 5}/10
- Time Capacity: ${formData.timeCapacity || 'Not set'}

YOUR ACTION PLAN:
${actionPlan.weeklyActions.length > 0 ? actionPlan.weeklyActions.map(item => `- ${item.area}: ${item.actions.join(', ')}`).join('\\n') : 'No actions defined'}

TOP BARRIERS TO ADDRESS:
${actionPlan.barrierStrategies.length > 0 ? actionPlan.barrierStrategies.map(item => `- ${item.barrier}: ${item.strategy}`).join('\\n') : 'None identified'}

HABITS TO FOCUS ON:
${(formData.habitsToImprove || []).join(', ') || 'None selected'}

Review your full plan, celebrate progress, and adjust as needed!
    `.trim()

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Health Summit//Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@healthvision.app
DTSTAMP:${formatICSDate(now)}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Review Your Health Summit
DESCRIPTION:${visionSummary.replace(/\n/g, '\\n')}
LOCATION:Health Summit App
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:Health Summit Review Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`.trim()

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-summit-reminder-${period}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setShowReminderDropdown(false)
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

  const isEmpty = (value) => !value || value.trim() === ''
  const isArrayEmpty = (arr) => !arr || arr.length === 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 no-print">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="p-3 bg-green-100 rounded-xl">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-4xl font-bold text-stone-900">My Personal Health Plan</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Remind Me Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowReminderDropdown(!showReminderDropdown)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Bell className="w-4 h-4" />
              Remind Me
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showReminderDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-stone-200 py-2 min-w-[160px] z-10">
                <button onClick={() => handleReminder('1week')} className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700">In 1 Week</button>
                <button onClick={() => handleReminder('1month')} className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700">In 1 Month</button>
                <button onClick={() => handleReminder('3months')} className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700">In 3 Months</button>
                <button onClick={() => handleReminder('6months')} className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700">In 6 Months</button>
              </div>
            )}
          </div>

          <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
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
            <Target className="w-4 h-4" />
            Your Action Plan
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
            Summary of Answers
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

          {/* Barrier Strategies */}
          {actionPlan.barrierStrategies.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Overcoming Your Barriers</h3>
                  <p className="text-sm text-stone-600">Strategies for your top challenges</p>
                </div>
              </div>

              <div className="space-y-6">
                {actionPlan.barrierStrategies.map((item, index) => (
                  <div key={index} className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">🚧</span>
                      {item.barrier}
                    </h4>
                    <p className="text-stone-700 font-medium mb-3">{item.strategy}</p>
                    <ul className="space-y-1.5 text-sm text-stone-600">
                      {item.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Habit Recommendations */}
          {actionPlan.habitRecommendations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Your Habit-Building Sequence</h3>
                  <p className="text-sm text-stone-600">Prioritized based on your readiness</p>
                </div>
              </div>

              <div className="space-y-4">
                {actionPlan.habitRecommendations.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {item.week}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-stone-900">{item.habit}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.priority === 'Primary' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-200 text-blue-800'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">{item.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Build Your Plan - AI Actions with Checkboxes */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 rounded-xl">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-stone-900">Build Your Plan</h3>
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-6">Choose at least 1 (but no more than 3) actions to start with this week</p>

            {/* Loading State */}
            {isEnhancing && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-stone-600">Building your personalized plan...</p>
                </div>
              </div>
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

            {/* AI Personalized Plan Header */}
            {aiEnhanced && !isEnhancing && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">AI-Personalized Plan</h4>
                </div>
                <p className="text-sm text-purple-800">
                  These actions have been tailored specifically to your situation, schedule, and goals.
                </p>
              </div>
            )}

            {/* AI Enhanced Actions with Checkboxes */}
            {aiEnhanced && !isEnhancing && Array.isArray(aiEnhanced) && (
              <div className="space-y-3 mb-4">
                {aiEnhanced.map((item, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedActions.includes(index)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                    onClick={() => toggleActionSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedActions.includes(index)}
                        onChange={() => toggleActionSelection(index)}
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

            {/* Add Your Own Link/Form */}
            {!showAddCustom ? (
              <button
                onClick={() => setShowAddCustom(true)}
                className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <span className="text-lg">+</span>
                Hey smarty, I have another idea
              </button>
            ) : (
              <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                <textarea
                  value={newCustomAction}
                  onChange={(e) => setNewCustomAction(e.target.value)}
                  placeholder="Describe your custom action..."
                  className="w-full p-3 border border-stone-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddCustomAction}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Add Action
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

          {/* Weekly Check-In */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-stone-900 mb-4">📋 Weekly Check-In Prompts</h3>
            <ul className="space-y-3 mb-4">
              {actionPlan.weeklyCheckIn.prompts.map((prompt, index) => (
                <li key={index} className="flex items-start gap-2 text-stone-700">
                  <span className="text-purple-600 font-bold">{index + 1}.</span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>
            <div className="bg-white/50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-stone-700 italic mb-2">{actionPlan.weeklyCheckIn.reminderText}</p>
              <p className="text-sm text-stone-600 font-medium">{actionPlan.weeklyCheckIn.nextSteps}</p>
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
        {/* Step 1: Vision Setting */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Step 1: Vision Setting
            </h3>
            <button onClick={() => onNavigate('vision')} className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-green-600 transition-colors" title="Edit this section">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">Health Summit (1-2 years)</h4>
              <p className="text-stone-800 leading-relaxed">
                {isEmpty(formData.visionStatement) ? <span className="text-stone-400 italic text-sm">Not yet defined</span> : formData.visionStatement}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">How I Feel</h4>
              <p className="text-stone-800 leading-relaxed">
                {isEmpty(formData.feelingState) ? <span className="text-stone-400 italic text-sm">Not yet defined</span> : formData.feelingState}
              </p>
            </div>

            {!isEmpty(formData.appearanceConfidence) && (
              <div>
                <h4 className="text-sm font-semibold text-stone-600 mb-1">How I Look & Carry Myself</h4>
                <p className="text-stone-800 text-sm leading-relaxed">{formData.appearanceConfidence}</p>
              </div>
            )}

            {!isEmpty(formData.futureAbilities) && (
              <div>
                <h4 className="text-sm font-semibold text-stone-600 mb-1">What I'm Able to Do</h4>
                <p className="text-stone-800 text-sm leading-relaxed">{formData.futureAbilities}</p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-2">💚 Why This Matters</h4>
              <p className="text-stone-800 text-sm leading-relaxed mb-3">
                {isEmpty(formData.whyMatters) ? <span className="text-stone-400 italic">Not yet defined</span> : formData.whyMatters}
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
