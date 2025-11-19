import React, { useState, useEffect } from 'react'
import { Mountain, Flag, Backpack, TrendingUp, Footprints, ArrowRight } from 'lucide-react'

const LandingPage = ({ onStart }) => {
  const [wiggle, setWiggle] = useState(false)
  const [mountainGlow, setMountainGlow] = useState(false)

  useEffect(() => {
    const triggerWiggle = () => {
      setWiggle(true)
      setTimeout(() => setWiggle(false), 600) // Duration matches animation
    }

    const triggerMountainGlow = () => {
      setMountainGlow(true)
      setTimeout(() => setMountainGlow(false), 3000) // Duration matches animation
    }

    // Initial mountain glow after 1 second
    const initialTimeout = setTimeout(triggerMountainGlow, 1000)

    // Repeat every 5 seconds
    const mountainInterval = setInterval(() => {
      triggerMountainGlow()
    }, 5000)

    // Wiggle the glow randomly between 3-5 seconds
    const wiggleInterval = setInterval(() => {
      triggerWiggle()
    }, Math.random() * 2000 + 3000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(mountainInterval)
      clearInterval(wiggleInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50 to-stone-100">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Mountain 
                className="w-24 h-24 text-green-600" 
                strokeWidth={1.5} 
              />
            </div>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-stone-900 mb-6 leading-tight">
            Climb to Your <span className="text-green-600">Health Summit</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-stone-600 mb-12 leading-relaxed">
            Ascend to optimal health with purpose, not just a plan. Define your Summit Vision and chart a path that adapts as you grow.
          </p>
        </div>

        {/* Four Quadrants Section */}
        <div className="max-w-7xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-stone-900 mb-4">
            Your Ascent in Four Stages
          </h2>
          <p className="text-center text-stone-600 mb-12 text-lg">
            A thoughtful framework to move from vision to action in 30 minutes
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Summit Vision Quadrant */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-300 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Flag className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900">Summit Vision</h3>
                    <p className="text-sm text-stone-500">1-2 Years</p>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Define your ideal health state and the impact you want to create. What does optimal wellbeing look and feel like?
                </p>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Ideal health state and daily vitality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Purpose statement and legacy</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Base Camp Inventory Quadrant */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-300 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Backpack className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900">Base Camp Inventory</h3>
                    <p className="text-sm text-stone-500">Your Resources</p>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Assess your non-negotiables, strengths, energizers, and gaps. Know what you bring and what you need.
                </p>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Core values and health must-haves</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Resources, support, and areas to develop</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Chart the Ascent Quadrant */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-300 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900">Map the Ascent</h3>
                    <p className="text-sm text-stone-500">Your Path</p>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Identify milestones, obstacles, and opportunities. Break down your Summit Vision into achievable checkpoints.
                </p>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Major health milestones</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Realistic obstacles and opportunities</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* First Steps Quadrant */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-300 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Footprints className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900">First Steps</h3>
                    <p className="text-sm text-stone-500">0-90 Days</p>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Take immediate action. Define the smallest version of progress and commit to foundational habits.
                </p>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>90-day moves and quick wins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    <span>Daily habits to build momentum</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-10 py-5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            Begin Your Ascent
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-stone-600">Takes approximately 30 minutes</p>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
