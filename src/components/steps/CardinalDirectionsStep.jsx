import React from 'react'
import { Backpack, ArrowRight } from 'lucide-react'

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

  const insertSuggestion = (field, suggestionText) => {
    const current = formData[field] || ''
    updateFormData(field, current + suggestionText)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-xl">
          <Backpack className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-stone-900">Step 2: Pack Your Base Camp</h2>
          <p className="text-stone-500">Your Resources</p>
        </div>
      </div>

      <p className="text-lg text-stone-700 mb-8 leading-relaxed">
        Before any climb, you assess what you're bringing and what you need. This inventory reveals your foundation.
      </p>

      <div className="space-y-8">
        {/* Non-negotiables */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⛔</span>
            <label className="text-xl font-semibold text-stone-800">
              Non-negotiables
            </label>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            List 3-5 non-negotiable <strong>values</strong> and <strong>health must-haves</strong> (e.g., adequate sleep, no extreme diets, family time).
          </p>
          <textarea
            value={formData.nonNegotiables}
            onChange={(e) => updateFormData('nonNegotiables', e.target.value)}
            placeholder="1. 7+ hours of sleep nightly&#10;2. Sustainable, not restrictive&#10;3. Time for family meals..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {nonNegotiablesSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('nonNegotiables', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💪</span>
            <label className="text-xl font-semibold text-stone-800">
              Strengths & Resources
            </label>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            List your current <strong>health strengths</strong> and <strong>resources</strong>. What's already working? What support do you have?
          </p>
          <textarea
            value={formData.strengths}
            onChange={(e) => updateFormData('strengths', e.target.value)}
            placeholder="1. Consistent morning routine&#10;2. Supportive partner&#10;3. Access to gym/trails&#10;4. Good stress management..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {strengthsSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('strengths', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Energizers */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚡</span>
            <label className="text-xl font-semibold text-stone-800">
              Energizers
            </label>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            Identify 3-5 health activities that <strong>replenish your energy</strong>. What makes you feel alive, restored, and vibrant?
          </p>
          <textarea
            value={formData.energizers}
            onChange={(e) => updateFormData('energizers', e.target.value)}
            placeholder="1. Morning walks in nature&#10;2. Cooking healthy meals&#10;3. Yoga or stretching&#10;4. Quality sleep..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {energizersSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('energizers', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gaps & Needs */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <label className="text-xl font-semibold text-stone-800">
              Gaps & Needs
            </label>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            List 3-5 critical <strong>skills</strong>, <strong>support</strong>, or <strong>resources</strong> you need to acquire to reach your Summit Vision.
          </p>
          <textarea
            value={formData.gapsWants}
            onChange={(e) => updateFormData('gapsWants', e.target.value)}
            placeholder="1. Learn proper strength training form&#10;2. Find accountability partner&#10;3. Develop meal prep routine&#10;4. Address sleep issues..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {gapsSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('gapsWants', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue to Current State
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default CardinalDirectionsStep
