import React from 'react'
import { Map, ArrowForward } from '@mui/icons-material'

const TerrainStep = ({ formData, updateFormData, onNext }) => {
  const barrierOptions = [
    'Time',
    'Energy',
    'Stress',
    'Motivation',
    'Clarity',
    'Environment',
    'Support',
    'Knowledge'
  ]

  const habitOptions = [
    'Movement/Exercise',
    'Nutrition',
    'Sleep',
    'Stress Management',
    'Alcohol/Substance Moderation',
    'Planning/Organization',
    'Tech Boundaries',
    'Social Connection'
  ]

  const toggleBarrier = (option) => {
    const current = formData.barriers || []
    if (current.includes(option)) {
      updateFormData('barriers', current.filter(item => item !== option))
    } else {
      updateFormData('barriers', [...current, option])
    }
  }

  const toggleHabit = (option) => {
    const current = formData.habitsToImprove || []
    if (current.includes(option)) {
      updateFormData('habitsToImprove', current.filter(item => item !== option))
    } else {
      updateFormData('habitsToImprove', [...current, option])
    }
  }

  const toggleFocusArea = (option) => {
    const current = formData.focusAreas || []
    if (current.includes(option)) {
      updateFormData('focusAreas', current.filter(item => item !== option))
    } else if (current.length < 2) {
      // Limit to 2 focus areas
      updateFormData('focusAreas', [...current, option])
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-xl">
          <Map className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-stone-900">Step 3: Assess the Route</h2>
          <p className="text-stone-500">Survey the Terrain & Choose Your Path</p>
        </div>
      </div>

      <p className="text-lg text-stone-700 mb-8 leading-relaxed">
        Every mountain has multiple routes to the summit. Survey where you stand today, identify the obstacles in your path, and choose the trail that fits your strengths.
      </p>

      <div className="space-y-8">
        {/* Q7: Current Score Slider */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            How far up the mountain are you today?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Rate your current health on a scale of 1-10, where 10 is your summit.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500 font-medium">1</span>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.currentScore || 5}
              onChange={(e) => updateFormData('currentScore', parseInt(e.target.value))}
              className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <span className="text-sm text-stone-500 font-medium">10</span>
          </div>
          <div className="mt-3 text-center">
            <span className="text-3xl font-bold text-green-600">{formData.currentScore || 5}</span>
            <span className="text-stone-600 ml-2">/ 10</span>
          </div>
        </div>

        {/* Q8: Barriers (Multi-select) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What obstacles are blocking your path?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Select all that apply:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {barrierOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleBarrier(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (formData.barriers || []).includes(option)
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-stone-700 border border-stone-300 hover:border-green-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <textarea
            value={formData.barriersNotes || ''}
            onChange={(e) => updateFormData('barriersNotes', e.target.value)}
            placeholder="Any additional notes about your barriers..."
            className="w-full h-32 p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
          />
        </div>

        {/* Q10: Habits to Improve (Multi-select) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <label className="block text-xl font-semibold text-stone-800 mb-2">
            What skills or habits will help you navigate this terrain?
          </label>
          <p className="text-sm text-stone-600 mb-4">
            Select all that apply:
          </p>
          <div className="flex flex-wrap gap-2">
            {habitOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleHabit(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (formData.habitsToImprove || []).includes(option)
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
          Continue to Capacity & Support
          <ArrowForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default TerrainStep
