import React from 'react'
import { ArrowForward, Check } from '@mui/icons-material'
import { Button, RadioSelect } from '@summit/design-system'

// Material Symbol component for icons not in @mui/icons-material
const MaterialSymbol = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
)

const RouteStep = ({ formData, updateFormData, onNext }) => {
  const timeOptions = [
    { value: '5 minutes/day', label: '5 minutes/day' },
    { value: '10 minutes/day', label: '10 minutes/day' },
    { value: '20 minutes/day', label: '20 minutes/day' },
    { value: '30 minutes/day', label: '30 minutes/day' },
    { value: '45 minutes/day', label: '45 minutes/day' },
    { value: '60 minutes/day', label: '60 minutes/day' },
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

  const insertSuggestion = (field, suggestionText, suggestionKey) => {
    const current = formData[field] || ''
    const clickedKey = `${field}_clicked`
    const clickedSuggestions = formData[clickedKey] || []
    
    if (clickedSuggestions.includes(suggestionKey)) {
      // Remove the suggestion text
      const newText = current.replace(suggestionText, '')
      updateFormData(field, newText)
      updateFormData(clickedKey, clickedSuggestions.filter(key => key !== suggestionKey))
    } else {
      // Add the suggestion text
      updateFormData(field, current + suggestionText)
      updateFormData(clickedKey, [...clickedSuggestions, suggestionKey])
    }
  }
  
  const isSuggestionActive = (field, suggestionKey) => {
    const clickedKey = `${field}_clicked`
    const clickedSuggestions = formData[clickedKey] || []
    return clickedSuggestions.includes(suggestionKey)
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
        <div className="p-3 bg-summit-mint rounded-xl">
          <MaterialSymbol name="concierge" className="text-[32px] text-summit-emerald" />
        </div>
        <div>
          <h2 className="text-h2 text-summit-forest">Step 4: Support</h2>
          <p className="text-stone-500">Time, Readiness & What You Need</p>
        </div>
      </div>

      <p className="text-body-lg text-stone-600 mb-8 leading-relaxed">
        Ground your plan in realistic constraints and identify the support that will make this sustainable.
      </p>

      <div className="space-y-8">
        {/* Q12: Time Capacity */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            How much time do you realistically have each day to work on your health?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Be honest about your current schedule and commitments.
          </p>
          <RadioSelect
            name="timeCapacity"
            options={timeOptions}
            value={formData.timeCapacity}
            onChange={(value) => updateFormData('timeCapacity', value)}
          />
        </div>

        {/* Q: Preferred Times (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            What days or times usually work best for you? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <textarea
            value={formData.preferredTimes || ''}
            onChange={(e) => updateFormData('preferredTimes', e.target.value)}
            placeholder="Mornings before work, Tuesday/Thursday evenings, weekend mornings..."
            className="w-full h-24 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {preferredTimesSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('preferredTimes', `preferredTimes_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('preferredTimes', suggestion.text, `preferredTimes_${idx}`)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-summit-emerald text-white border-summit-emerald'
                        : 'bg-summit-mint text-summit-forest border-summit-sage hover:bg-summit-sage'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {suggestion.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Q: Sustainability (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            What feels sustainable for the next 2–4 weeks? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Not forever—just what you can commit to right now.
          </p>
          <textarea
            value={formData.sustainableNotes || ''}
            onChange={(e) => updateFormData('sustainableNotes', e.target.value)}
            placeholder="Starting small with 10-minute walks. Meal prepping on Sundays. Going to bed 30 minutes earlier..."
            className="w-full h-28 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {sustainableSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('sustainableNotes', `sustainableNotes_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('sustainableNotes', suggestion.text, `sustainableNotes_${idx}`)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-summit-emerald text-white border-summit-emerald'
                        : 'bg-summit-mint text-summit-forest border-summit-sage hover:bg-summit-sage'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {suggestion.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Q13: Readiness Slider */}
        <div className="bg-gradient-to-br from-summit-mint to-summit-sage/50 p-6 rounded-xl border-2 border-summit-sage">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
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
              className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-summit-emerald"
            />
            <span className="text-sm text-stone-500 font-medium">10</span>
          </div>
          <div className="mt-3 text-center">
            <span className="text-3xl font-bold text-summit-emerald">{formData.readiness || 5}</span>
            <span className="text-stone-600 ml-2">/ 10</span>
          </div>
        </div>

        {/* Q14: Support Needs (Multi-select) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
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
                    ? 'bg-summit-emerald text-white shadow-md'
                    : 'bg-summit-mint text-summit-forest border border-summit-sage hover:bg-summit-sage'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={onNext}
          size="lg"
          className="bg-summit-emerald hover:bg-emerald-700 text-white"
          rightIcon={<ArrowForward className="w-5 h-5" />}
        >
          View My Plan
        </Button>
      </div>
    </div>
  )
}

export default RouteStep
