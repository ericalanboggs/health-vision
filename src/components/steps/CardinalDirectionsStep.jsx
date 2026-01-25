import React from 'react'
import { Backpack, ArrowForward, Check } from '@mui/icons-material'
import { Button } from '@summit/design-system'

const CardinalDirectionsStep = ({ formData, updateFormData, onNext }) => {
  // Suggestion chips for base camp questions
  const nonNegotiablesSuggestions = [
    { label: "7+ hours sleep", text: "7+ hours of sleep nightly. " },
    { label: "Sustainable approach", text: "Sustainable, not restrictive or extreme. " },
    { label: "Family time", text: "Time for family meals and connection. " },
    { label: "No injury", text: "Avoid injury or burnout. " },
    { label: "Enjoyment", text: "Activities I actually enjoy. " },
    { label: "Flexibility", text: "Flexibility for life's demands. " }
  ]

  const strengthsSuggestions = [
    { label: "Morning routine", text: "Consistent morning routine. " },
    { label: "Supportive people", text: "Supportive partner/friends/family. " },
    { label: "Access to facilities", text: "Access to gym/trails/equipment. " },
    { label: "Good habits", text: "Already have some healthy habits in place. " },
    { label: "Motivation", text: "Strong motivation and clear reasons why. " },
    { label: "Past success", text: "History of achieving health goals. " }
  ]

  const energizersSuggestions = [
    { label: "Nature walks", text: "Walking or hiking in nature. " },
    { label: "Cooking", text: "Cooking healthy meals. " },
    { label: "Yoga/stretching", text: "Yoga or stretching. " },
    { label: "Quality sleep", text: "Getting quality sleep. " },
    { label: "Social time", text: "Spending time with loved ones. " },
    { label: "Creative hobbies", text: "Creative hobbies or activities. " }
  ]

  const gapsSuggestions = [
    { label: "Learn techniques", text: "Learn proper form/techniques. " },
    { label: "Find accountability", text: "Find accountability partner or coach. " },
    { label: "Meal prep skills", text: "Develop meal prep routine. " },
    { label: "Address sleep", text: "Address sleep issues. " },
    { label: "Stress management", text: "Better stress management tools. " },
    { label: "Time management", text: "Improve time management. " }
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-summit-mint rounded-xl">
          <Backpack className="w-8 h-8 text-summit-emerald" />
        </div>
        <div>
          <h2 className="text-h2 text-summit-forest">Step 2: Pack Your Base Camp</h2>
          <p className="text-stone-500">Your Resources</p>
        </div>
      </div>

      <p className="text-body-lg text-stone-600 mb-8 leading-relaxed">
        Before any climb, you assess what you're bringing and what you need. This inventory reveals your foundation.
      </p>

      <div className="space-y-8">
        {/* Non-negotiables */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            Non-negotiables
          </label>
          <p className="text-sm text-stone-600 mb-4">
            List 3-5 non-negotiable <strong>values</strong> and <strong>health must-haves</strong> (e.g., adequate sleep, no extreme diets, family time).
          </p>
          <textarea
            value={formData.nonNegotiables}
            onChange={(e) => updateFormData('nonNegotiables', e.target.value)}
            placeholder="1. 7+ hours of sleep nightly&#10;2. Sustainable, not restrictive&#10;3. Time for family meals..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {nonNegotiablesSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('nonNegotiables', `nonNegotiables_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('nonNegotiables', suggestion.text, `nonNegotiables_${idx}`)}
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

        {/* Strengths */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            Strengths & Resources
          </label>
          <p className="text-sm text-stone-600 mb-4">
            List your current <strong>health strengths</strong> and <strong>resources</strong>. What's already working? What support do you have?
          </p>
          <textarea
            value={formData.strengths}
            onChange={(e) => updateFormData('strengths', e.target.value)}
            placeholder="1. Consistent morning routine&#10;2. Supportive partner&#10;3. Access to gym/trails&#10;4. Good stress management..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {strengthsSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('strengths', `strengths_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('strengths', suggestion.text, `strengths_${idx}`)}
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

        {/* Energizers */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            Energizers
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Identify 3-5 health activities that <strong>replenish your energy</strong>. What makes you feel alive, restored, and vibrant?
          </p>
          <textarea
            value={formData.energizers}
            onChange={(e) => updateFormData('energizers', e.target.value)}
            placeholder="1. Morning walks in nature&#10;2. Cooking healthy meals&#10;3. Yoga or stretching&#10;4. Quality sleep..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {energizersSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('energizers', `energizers_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('energizers', suggestion.text, `energizers_${idx}`)}
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

        {/* Gaps & Needs */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-lg font-semibold text-summit-forest mb-2">
            Gaps & Needs
          </label>
          <p className="text-sm text-stone-600 mb-4">
            List 3-5 critical <strong>skills</strong>, <strong>support</strong>, or <strong>resources</strong> you need to acquire to reach your Summit Vision.
          </p>
          <textarea
            value={formData.gapsWants}
            onChange={(e) => updateFormData('gapsWants', e.target.value)}
            placeholder="1. Learn proper strength training form&#10;2. Find accountability partner&#10;3. Develop meal prep routine&#10;4. Address sleep issues..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald transition resize-none"
          />

          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {gapsSuggestions.map((suggestion, idx) => {
                const isActive = isSuggestionActive('gapsWants', `gapsWants_${idx}`)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('gapsWants', suggestion.text, `gapsWants_${idx}`)}
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
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={onNext}
          size="lg"
          className="bg-summit-emerald hover:bg-emerald-700 text-white"
          rightIcon={<ArrowForward className="w-5 h-5" />}
        >
          Continue to Path
        </Button>
      </div>
    </div>
  )
}

export default CardinalDirectionsStep
