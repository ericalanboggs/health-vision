import React, { useState, useEffect } from 'react'
import { Terrain, Flag, Inventory2, TrendingUp, DirectionsWalk, ArrowForward } from '@mui/icons-material'

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
      <div className="container mx-auto px-6 pt-12 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-10">
          <div className="flex justify-center mb-6">
            <img
              src="/summit-logo.svg"
              alt="Summit Health"
              className="h-12"
            />
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-stone-900 mb-4 leading-tight">
            Your Fastest Path to a <span className="text-green-600">Healthier You</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-stone-600 mb-6 leading-relaxed">
            Create a crystal-clear vision and a focused plan that adapts with you—no overwhelm, just progress.
          </p>

          {/* CTA Section */}
          <div className="text-center mb-10">
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-10 py-5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Begin Your Ascent
              <ArrowForward className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-4 text-stone-600">5 minutes or less</p>
          </div>
        </div>

        {/* Four Stages Section - Vertical Timeline */}
        <div className="max-w-3xl mx-auto mb-16 pt-12 pb-16 px-8 relative">
          <h2 className="text-3xl font-bold text-center text-stone-900 mb-4">
            Your Ascent in Four Stages
          </h2>
          <p className="text-center text-stone-600 mb-12 text-lg">
            A thoughtful framework to move from vision to action in 5 minutes or less
          </p>
          
          {/* Winding dotted path SVG */}
          <svg className="absolute left-1/2 top-48 -translate-x-1/2 w-24 h-[1200px] pointer-events-none" style={{ zIndex: 0 }}>
            <path
              d="M 48 0 Q 48 80, 20 120 T 48 240 T 76 360 T 48 480 T 20 600 T 48 720 T 76 840 T 48 960 T 20 1080 T 48 1150"
              fill="none"
              stroke="#d6d3d1"
              strokeWidth="3"
              strokeDasharray="8,8"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="flex flex-col items-center gap-24 relative" style={{ zIndex: 1 }}>
            {/* Summit Vision */}
            <div className="flex flex-col items-center text-center max-w-md relative">
              <div className="w-16 h-16 bg-green-100 rounded-full mb-6 flex items-center justify-center shadow-lg">
                <Flag className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-2">Summit Vision</h3>
              <p className="text-base text-stone-600 mb-4">You in 1-2 years</p>
              <p className="text-base text-stone-700 leading-relaxed">
                Define your ideal health state and the impact you want to create.
              </p>
            </div>

            {/* Base Camp Inventory */}
            <div className="flex flex-col items-center text-center max-w-md relative">
              <div className="w-16 h-16 bg-green-100 rounded-full mb-6 flex items-center justify-center shadow-lg">
                <Inventory2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-2">Base Camp Inventory</h3>
              <p className="text-base text-stone-600 mb-4">Your Resources</p>
              <p className="text-base text-stone-700 leading-relaxed">
                Assess your non-negotiables, strengths, energizers, and gaps. Know what you bring and what you need.
              </p>
            </div>

            {/* Map the Ascent */}
            <div className="flex flex-col items-center text-center max-w-md relative">
              <div className="w-16 h-16 bg-green-100 rounded-full mb-6 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-2">Map the Ascent</h3>
              <p className="text-base text-stone-600 mb-4">Know the Path</p>
              <p className="text-base text-stone-700 leading-relaxed">
                Break down your Summit Vision into achievable checkpoints.
              </p>
            </div>

            {/* First Steps */}
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="w-16 h-16 bg-green-100 rounded-full mb-6 flex items-center justify-center shadow-lg">
                <DirectionsWalk className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-2">First Steps</h3>
              <p className="text-base text-stone-600 mb-4">Habit experimentation</p>
              <p className="text-base text-stone-700 leading-relaxed">
                Define the smallest version of progress that seems likely to work for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
