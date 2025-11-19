import React from 'react'
import { Clock3, ArrowRight } from 'lucide-react'

const RouteStep = ({ formData, updateFormData, onNext }) => {
  const timeOptions = [
    '5 minutes/day',
    '10 minutes/day',
    '20 minutes/day',
    '30-60 minutes/day',
    'More than 1 hour/day'
  ]

  const supportOptions = [
    'Accountability partner',
    'Reminders & check-ins',
    'Weekly progress review',
    'Step-by-step plan',
    'Community support',
    'Education & resources'
  ]

  // Suggestion chips
  const preferredTimesSuggestions = [
    { label: "Early mornings", text: "Early mornings before work. " },
    { label: "Lunch breaks", text: "Lunch breaks. " },
    { label: "Evenings", text: "Evenings after work. " },
    { label: "Weekends", text: "Weekend mornings. " },
    { label: "Flexible", text: "Flexible throughout the day. " }
  ]

  const sustainableSuggestions = [
    { label: "Start small", text: "Starting with just 5-10 minutes daily. " },
    { label: "Morning routine", text: "Adding to my morning routine. " },
    { label: "Weekly prep", text: "Meal prepping on Sundays. " },
    { label: "Consistent schedule", text: "Same time each day for consistency. " },
    { label: "One habit", text: "Focusing on one habit at a time. " },
    { label: "Rest days", text: "Including rest days to avoid burnout. " }
  ]

  const insertSuggestion = (field, suggestionText) => {
    const current = formData[field] || ''
    updateFormData(field, current + suggestionText)
  }

  const toggleSupport = (option) => {
    const current = formData.supportNeeds || []
    if (current.includes(option)) {
      updateFormData('supportNeeds', current.filter(item => item !== option))
    } else {
      updateFormData('supportNeeds', [...current, option])
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-xl">
          <Clock3 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-stone-900">Step 4: Capacity & Support</h2>
          <p className="text-stone-500">Time, Readiness & What You Need</p>
        </div>
      </div>

      <p className="text-lg text-stone-700 mb-8 leading-relaxed">
        Ground your plan in realistic constraints and identify the support that will make this sustainable.
      </p>

      <div className="space-y-8">
        {/* Q12: Time Capacity */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            How much time do you realistically have each day to work on your health?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Be honest about your current schedule and commitments.
          </p>
          <div className="space-y-2">
            {timeOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 p-3 border border-stone-300 rounded-lg hover:bg-stone-50 cursor-pointer transition"
              >
                <input
                  type="radio"
                  name="timeCapacity"
                  value={option}
                  checked={formData.timeCapacity === option}
                  onChange={(e) => updateFormData('timeCapacity', e.target.value)}
                  className="w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-stone-800 font-medium">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q: Preferred Times (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What days or times usually work best for you? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <textarea
            value={formData.preferredTimes || ''}
            onChange={(e) => updateFormData('preferredTimes', e.target.value)}
            placeholder="Mornings before work, Tuesday/Thursday evenings, weekend mornings..."
            className="w-full h-24 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {preferredTimesSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('preferredTimes', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Q: Sustainability (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What feels sustainable for the next 2–4 weeks? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Not forever—just what you can commit to right now.
          </p>
          <textarea
            value={formData.sustainableNotes || ''}
            onChange={(e) => updateFormData('sustainableNotes', e.target.value)}
            placeholder="Starting small with 10-minute walks. Meal prepping on Sundays. Going to bed 30 minutes earlier..."
            className="w-full h-28 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {sustainableSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('sustainableNotes', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Q13: Readiness Slider */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            How ready are you to begin?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            0 = Not ready yet, 10 = All in
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500 font-medium">0</span>
            <input
              type="range"
              min="0"
              max="10"
              value={formData.readiness || 5}
              onChange={(e) => updateFormData('readiness', parseInt(e.target.value))}
              className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <span className="text-sm text-stone-500 font-medium">10</span>
          </div>
          <div className="mt-3 text-center">
            <span className="text-3xl font-bold text-green-600">{formData.readiness || 5}</span>
            <span className="text-stone-600 ml-2">/ 10</span>
          </div>
        </div>

        {/* Q14: Support Needs (Multi-select) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What support would make this easier?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Select all that apply:
          </p>
          <div className="flex flex-wrap gap-2">
            {supportOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleSupport(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (formData.supportNeeds || []).includes(option)
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-stone-700 border border-stone-300 hover:border-green-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          View My Personal Plan
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default RouteStep
