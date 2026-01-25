import React, { useState, useEffect, useRef } from 'react'
import { Description, Print, FileDownload, Flag, Inventory2, TrendingUp, DirectionsWalk, Edit, Notifications, ExpandMore } from '@mui/icons-material'

const SummaryPage = ({ formData, onNavigate }) => {
  const [showReminderDropdown, setShowReminderDropdown] = useState(false)
  const dropdownRef = useRef(null)

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
    // Create a text version of the health vision for download
    const content = `
MY HEALTH VISION
================

STEP 1: SUMMIT VISION (1–2 Years)
-----------------------------------

Ideal Health State:
${formData.futureState || 'Not yet defined'}

Purpose & Impact:
${formData.impact || 'Not yet defined'}


STEP 2: BASE CAMP INVENTORY (Your Resources)
---------------------------------------------

Non-negotiables:
${formData.nonNegotiables || 'Not yet defined'}

Strengths & Resources:
${formData.strengths || 'Not yet defined'}

Energizers:
${formData.energizers || 'Not yet defined'}

Gaps & Needs:
${formData.gapsWants || 'Not yet defined'}


STEP 3: CHART THE ASCENT (3–5 Years)
--------------------------------------

Milestones:
${formData.milestones || 'Not yet defined'}

Obstacles:
${formData.constraints || 'Not yet defined'}

Opportunities:
${formData.opportunities || 'Not yet defined'}


STEP 4: FIRST STEPS (0–90 Days)
---------------------------------

90-Day Actions & Habits:
${formData.routeStart || 'Not yet defined'}


---
Generated: ${new Date().toLocaleDateString()}
Review this vision every 3-6 months to track your progress and adjust your path.
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-vision-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReminder = (period) => {
    const now = new Date()
    let reminderDate = new Date(now)
    
    // Calculate reminder date based on period
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

    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const startDate = formatICSDate(reminderDate)
    const endDate = formatICSDate(new Date(reminderDate.getTime() + 60 * 60 * 1000)) // 1 hour duration

    // Create health vision summary for calendar body
    const visionSummary = `
HEALTH VISION REVIEW
====================

It's time to review and update your Health Vision!

CURRENT VISION SNAPSHOT:
------------------------

SUMMIT VISION (1-2 Years):
${formData.futureState || 'Not yet defined'}

PURPOSE & IMPACT:
${formData.impact || 'Not yet defined'}

BASE CAMP INVENTORY:
- Non-negotiables: ${formData.nonNegotiables || 'Not yet defined'}
- Strengths & Resources: ${formData.strengths || 'Not yet defined'}
- Energizers: ${formData.energizers || 'Not yet defined'}
- Gaps & Needs: ${formData.gapsWants || 'Not yet defined'}

THE ASCENT (3-5 Years):
- Milestones: ${formData.milestones || 'Not yet defined'}
- Obstacles: ${formData.constraints || 'Not yet defined'}
- Opportunities: ${formData.opportunities || 'Not yet defined'}

FIRST STEPS (0-90 Days):
${formData.routeStart || 'Not yet defined'}

-------------------------
Review your vision at: https://your-career-compass.vercel.app

Remember: Your health vision is a living document. Update it as you grow and your goals evolve.
    `.trim()

    // Create ICS file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Health Vision//Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@healthvision.app
DTSTAMP:${formatICSDate(now)}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Review Your Health Vision
DESCRIPTION:${visionSummary.replace(/\n/g, '\\n')}
LOCATION:Health Vision App
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:Health Vision Review Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`.trim()

    // Download ICS file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-vision-reminder-${period}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setShowReminderDropdown(false)
  }

  const isEmpty = (value) => !value || value.trim() === ''

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 no-print">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Description className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-4xl font-bold text-stone-900">My Health Vision</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Remind Me Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowReminderDropdown(!showReminderDropdown)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Notifications className="w-4 h-4" />
              Remind Me
              <ExpandMore className="w-4 h-4" />
            </button>
            
            {showReminderDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-stone-200 py-2 min-w-[160px] z-10">
                <button
                  onClick={() => handleReminder('1week')}
                  className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700"
                >
                  In 1 Week
                </button>
                <button
                  onClick={() => handleReminder('1month')}
                  className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700"
                >
                  In 1 Month
                </button>
                <button
                  onClick={() => handleReminder('3months')}
                  className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700"
                >
                  In 3 Months
                </button>
                <button
                  onClick={() => handleReminder('6months')}
                  className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors text-stone-700"
                >
                  In 6 Months
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Print className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <FileDownload className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">My Health Vision</h1>
        <p className="text-stone-600">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <p className="text-lg text-stone-700 mb-8 leading-relaxed">
        This is your complete health vision, synthesized from the 4-step process. 
        Review this every 3-6 months to track your progress and adjust your path.
      </p>

      {/* Summary Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Step 1: North Star */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Step 1: Summit Vision (1–2 Years)
            </h3>
            <button
              onClick={() => onNavigate('step1')}
              className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-amber-600 transition-colors"
              title="Edit this section"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">Ideal Health State</h4>
              <p className="text-stone-800 leading-relaxed">
                {isEmpty(formData.futureState) ? (
                  <span className="text-stone-400 italic text-sm">Not yet defined</span>
                ) : (
                  formData.futureState
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">Purpose & Impact</h4>
              <p className="text-stone-800 leading-relaxed">
                {isEmpty(formData.impact) ? (
                  <span className="text-stone-400 italic text-sm">Not yet defined</span>
                ) : (
                  formData.impact
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Step 2: Cardinal Directions */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <Inventory2 className="w-5 h-5" />
              Step 2: Base Camp Inventory (Your Resources)
            </h3>
            <button
              onClick={() => onNavigate('step2')}
              className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-amber-600 transition-colors"
              title="Edit this section"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⛔ Non-negotiables</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.nonNegotiables) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.nonNegotiables
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">💪 Strengths & Resources</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.strengths) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.strengths
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⚡ Energizers</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.energizers) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.energizers
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">🎯 Gaps & Needs</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.gapsWants) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.gapsWants
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Step 3: Map the Terrain */}
        <section className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Step 3: Chart the Ascent (3–5 Years)
            </h3>
            <button
              onClick={() => onNavigate('step3')}
              className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-amber-600 transition-colors"
              title="Edit this section"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">🎯 Milestones</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.milestones) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.milestones
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">⚠️ Obstacles</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.constraints) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.constraints
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-1">✨ Opportunities</h4>
              <p className="text-stone-800 text-sm leading-relaxed">
                {isEmpty(formData.opportunities) ? (
                  <span className="text-stone-400 italic">Not yet defined</span>
                ) : (
                  formData.opportunities
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Step 4: Start the Route */}
        <section className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <DirectionsWalk className="w-5 h-5" />
              Step 4: First Steps (0–90 Days)
            </h3>
            <button
              onClick={() => onNavigate('step4')}
              className="no-print flex items-center gap-1 text-sm text-stone-600 hover:text-amber-600 transition-colors"
              title="Edit this section"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-stone-600 mb-1">90-Day Actions & Habits</h4>
            <p className="text-stone-800 text-sm leading-relaxed">
              {isEmpty(formData.routeStart) ? (
                <span className="text-stone-400 italic">Not yet defined</span>
              ) : (
                formData.routeStart
              )}
            </p>
          </div>
        </section>
      </div>

      {/* Footer Note */}
      <div className="mt-8 bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
        <h4 className="font-semibold text-stone-900 mb-2">📅 Next Steps</h4>
        <ul className="text-sm text-stone-700 space-y-1">
          <li>• Save or print this vision for easy reference</li>
          <li>• Schedule a calendar reminder to review in 3 months</li>
          <li>• Share with a health coach or accountability partner</li>
          <li>• Start your first 90-day action this week</li>
        </ul>
      </div>
    </div>
  )
}

export default SummaryPage
