import React from 'react'
import { Flag, ArrowRight } from 'lucide-react'

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

  const insertSuggestion = (field, suggestionText) => {
    const current = formData[field] || ''
    updateFormData(field, current + suggestionText)
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
        <div className="p-3 bg-green-100 rounded-xl">
          <Flag className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-stone-900">Step 1: Vision Setting</h2>
          <p className="text-stone-500">Your Future State & Why It Matters</p>
        </div>
      </div>

      <p className="text-lg text-stone-700 mb-8 leading-relaxed">
        Paint a vivid picture of your ideal health state 1-2 years from now, then anchor it to what truly drives you.
      </p>

      <div className="space-y-8">
        {/* Q1: Health Summit */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What is your health summit?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Imagine yourself 1–2 years from now. Describe your <strong>ideal state of health and well-being</strong>.
          </p>
          <textarea
            value={formData.visionStatement || ''}
            onChange={(e) => updateFormData('visionStatement', e.target.value)}
            placeholder="In 12 months, I wake up feeling energized and clear-headed. My body moves easily and I have the stamina to..."
            className="w-full h-40 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {visionSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('visionStatement', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Q2: How You Feel */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            How do you feel in this future version of you?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Describe your <strong>energy, mood, daily functioning, and confidence</strong>.
          </p>
          <textarea
            value={formData.feelingState || ''}
            onChange={(e) => updateFormData('feelingState', e.target.value)}
            placeholder="I feel calm and resilient. My energy is steady throughout the day. I'm confident in my body and..."
            className="w-full h-32 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
          
          {/* Suggestion Chips */}
          <div className="mt-3">
            <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {feelingSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertSuggestion('feelingState', suggestion.text)}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Q3: What You're Able to Do (Optional) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What are you able to do that you can't (or struggle to) do today? <span className="text-sm font-normal text-stone-500">(Optional)</span>
          </label>
          <p className="text-sm text-stone-600 mb-4">
            This can be powerful for motivation.
          </p>
          <textarea
            value={formData.futureAbilities || ''}
            onChange={(e) => updateFormData('futureAbilities', e.target.value)}
            placeholder="I can hike for hours without fatigue. I play with my kids without getting winded. I sleep through the night..."
            className="w-full h-28 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
        </div>

        {/* Motivation Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <h3 className="text-2xl font-bold text-stone-900 mb-4">Why This Vision Matters</h3>
          
          {/* Q5: Why Does This Matter */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-stone-800 mb-2">
              Why does this vision matter to you?
            </label>
            <p className="text-sm text-stone-600 mb-4">
              Connect to your <strong>personal reasons, values, identity, and life goals</strong>.
            </p>
            <textarea
              value={formData.whyMatters || ''}
              onChange={(e) => updateFormData('whyMatters', e.target.value)}
              placeholder="This matters because I want to be present for my family, have the energy to pursue my passions, and feel like myself again..."
              className="w-full h-32 p-4 border border-green-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
            />
            
            {/* Suggestion Chips */}
            <div className="mt-3">
              <p className="text-xs text-stone-500 mb-2">💡 Quick starts (click to add):</p>
              <div className="flex flex-wrap gap-2">
                {whyMattersSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion('whyMatters', suggestion.text)}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition-all"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue to Base Camp
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default NorthStarStep
