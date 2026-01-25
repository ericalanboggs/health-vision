import React from 'react'
import { ArrowForward, Check } from '@mui/icons-material'
import { Button } from '@summit/design-system'

// Material Symbol component for icons not in @mui/icons-material
const MaterialSymbol = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
)

const NorthStarStep = ({ formData, updateFormData, onNext }) => {
  const motivationOptions = [
    'Personal health & longevity',
    'Family & relationships',
    'Career performance',
    'Mental clarity & mood',
    'Physical capability',
    'Self-confidence',
    'Quality of life',
    'Setting an example'
  ]

  // Suggestion chips for vision questions
  const visionSuggestions = [
    { label: "More energy", text: "I wake up feeling energized and ready for the day. " },
    { label: "Better sleep", text: "I sleep deeply and wake refreshed. " },
    { label: "Stronger body", text: "My body is strong and moves with ease. " },
    { label: "Pain-free", text: "I'm free from chronic pain and discomfort. " },
    { label: "Mental clarity", text: "I have mental clarity and focus. " },
    { label: "Healthy weight", text: "I've reached a healthy weight that feels sustainable. " }
  ]

  const feelingSuggestions = [
    { label: "Energized", text: "I feel energized throughout the day. " },
    { label: "Calm & centered", text: "I feel calm, centered, and resilient. " },
    { label: "Confident", text: "I'm confident in my body and abilities. " },
    { label: "Strong", text: "I feel physically strong and capable. " },
    { label: "Balanced", text: "My mood is stable and balanced. " },
    { label: "Rested", text: "I feel well-rested and recovered. " }
  ]

  const whyMattersSuggestions = [
    { label: "Be present for family", text: "I want to be fully present and energized for my family. " },
    { label: "Live longer", text: "I want to live a long, healthy life. " },
    { label: "Feel like myself", text: "I want to feel like myself again. " },
    { label: "Set an example", text: "I want to set a positive example for others. " },
    { label: "Pursue passions", text: "I want the energy to pursue my passions and goals. " },
    { label: "Break free", text: "I want to break free from limitations holding me back. " }
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

  const toggleMotivation = (option) => {
    const current = formData.motivationDrivers || []
    if (current.includes(option)) {
      updateFormData('motivationDrivers', current.filter(item => item !== option))
    } else {
      updateFormData('motivationDrivers', [...current, option])
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-summit-mint rounded-xl">
          <MaterialSymbol name="mountain_flag" className="text-[32px] text-summit-emerald" />
        </div>
        <div>
          <h2 className="text-h2 text-summit-forest">Step 1: Vision Setting</h2>
          <p className="text-stone-500">Your Future State & Why It Matters</p>
        </div>
      </div>

      <p className="text-body-lg text-stone-600 mb-8 leading-relaxed">
        Paint a vivid picture of your ideal health state 1-2 years from now, then anchor it to what truly drives you.
      </p>

      <div className="space-y-8">
        {/* Q1: Health Summit */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            What is your health summit?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Imagine yourself 1–2 years from now. Describe your <strong>ideal state of health and well-being</strong>.
          </p>
          <textarea
            value={formData.visionStatement || ''}
            onChange={(e) => updateFormData('visionStatement', e.target.value)}
            placeholder="In 12 months, I wake up feeling energized and clear-headed. My body moves easily and I have the stamina to..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {visionSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('visionStatement', `vision_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('visionStatement', suggestion.text, `vision_${idx}`)}
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

        {/* Q2: How You Feel */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            How do you feel in this future version of you?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Describe your <strong>energy, mood, daily functioning, and confidence</strong>.
          </p>
          <textarea
            value={formData.feelingState || ''}
            onChange={(e) => updateFormData('feelingState', e.target.value)}
            placeholder="I feel calm and resilient. My energy is steady throughout the day. I'm confident in my body and..."
            className="w-full h-32 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {feelingSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('feelingState', `feeling_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('feelingState', suggestion.text, `feeling_${idx}`)}
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

        {/* Q3: What You're Able to Do (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            What are you able to do that you can't (or struggle to) do today? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <p className="text-sm text-stone-600 mb-4">
            This can be powerful for motivation.
          </p>
          <textarea
            value={formData.futureAbilities || ''}
            onChange={(e) => updateFormData('futureAbilities', e.target.value)}
            placeholder="I can hike for hours without fatigue. I play with my kids without getting winded. I sleep through the night..."
            className="w-full h-28 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />
        </div>

        {/* Motivation Section */}
        <div className="bg-gradient-to-br from-summit-mint to-summit-sage/50 p-6 rounded-xl border-2 border-summit-sage">
          <h3 className="text-xl font-bold text-summit-forest mb-4">Why This Vision Matters</h3>

          {/* Q5: Why Does This Matter */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-summit-forest mb-2">
              Why does this vision matter to you?
            </label>
            <p className="text-sm text-stone-600 mb-4">
              Connect to your <strong>personal reasons, values, identity, and life goals</strong>.
            </p>
            <textarea
              value={formData.whyMatters || ''}
              onChange={(e) => updateFormData('whyMatters', e.target.value)}
              placeholder="This matters because I want to be present for my family, have the energy to pursue my passions, and feel like myself again..."
              className="w-full h-32 p-4 border border-summit-sage rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none bg-white"
            />

            {/* Suggestion Chips */}
            <div className="mt-3">
              <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
              <div className="flex flex-wrap gap-2">
                {whyMattersSuggestions.map((suggestion, idx) => {
                  const isActive = isSuggestionActive('whyMatters', `whyMatters_${idx}`)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertSuggestion('whyMatters', suggestion.text, `whyMatters_${idx}`)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-summit-emerald text-white border-summit-emerald'
                          : 'bg-white text-summit-forest border-summit-sage hover:bg-summit-mint'
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
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={onNext}
          size="lg"
          className="bg-summit-emerald hover:bg-emerald-700 text-white"
          rightIcon={<ArrowForward className="w-5 h-5" />}
        >
          Continue to Base Camp
        </Button>
      </div>
    </div>
  )
}

export default NorthStarStep
