import React, { useState, useEffect } from 'react'
import { Home, Flag, Backpack, TrendingUp, Clock3, FileText, ChevronLeft, Mountain } from 'lucide-react'
import NorthStarStep from './steps/NorthStarStep'
import CardinalDirectionsStep from './steps/CardinalDirectionsStep'
import TerrainStep from './steps/TerrainStep'
import RouteStep from './steps/RouteStep'
import SummaryPage from './steps/SummaryPage'

const CompassApp = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState('intro')
  const [formData, setFormData] = useState({
    visionStatement: '',
    feelingState: '',
    appearanceConfidence: '',
    futureAbilities: '',
    whyMatters: '',
    motivationDrivers: [],
    stakes: '',
    benefits: '',
    meaningfulMoment: '',
    currentScore: 5,
    currentPositives: '',
    barriers: [],
    barriersNotes: '',
    habitsToImprove: [],
    focusAreas: [],
    timeCapacity: '',
    preferredTimes: '',
    sustainableNotes: '',
    readiness: 5,
    supportNeeds: [],
  })

  // Jump to top whenever step changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentStep])

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const steps = [
    { id: 'intro', label: 'Welcome', icon: Home },
    { id: 'vision', label: 'Vision Setting', icon: Flag },
    { id: 'basecamp', label: 'Base Camp', icon: Backpack },
    { id: 'current', label: 'Map the Ascent', icon: TrendingUp },
    { id: 'capacity', label: 'Capacity & Support', icon: Clock3 },
    { id: 'summary', label: 'Personal Plan', icon: FileText },
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroPage onNext={() => setCurrentStep('vision')} />
      case 'vision':
        return <NorthStarStep formData={formData} updateFormData={updateFormData} onNext={() => setCurrentStep('basecamp')} />
      case 'basecamp':
        return <CardinalDirectionsStep formData={formData} updateFormData={updateFormData} onNext={() => setCurrentStep('current')} />
      case 'current':
        return <TerrainStep formData={formData} updateFormData={updateFormData} onNext={() => setCurrentStep('capacity')} />
      case 'capacity':
        return <RouteStep formData={formData} updateFormData={updateFormData} onNext={() => setCurrentStep('summary')} />
      case 'summary':
        return <SummaryPage formData={formData} onNavigate={setCurrentStep} />
      default:
        return <IntroPage onNext={() => setCurrentStep('vision')} />
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-stone-100 border-b md:border-b-0 md:border-r border-stone-200 p-4 no-print">
        <div className="flex items-center justify-between md:block mb-6">
          <h1 className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <Mountain className="w-7 h-7" />
            Health Summit
          </h1>
          <button
            onClick={onBack}
            className="md:hidden text-stone-600 hover:text-stone-900 flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        
        <button
          onClick={onBack}
          className="hidden md:flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </button>

        <ul className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto pb-2 md:pb-0">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <li key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap w-full ${
                    currentStep === step.id
                      ? 'bg-green-100 text-green-800 font-semibold'
                      : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 md:p-12 bg-stone-50">
        {renderStep()}
      </main>
    </div>
  )
}

// Introduction Page Component
const IntroPage = ({ onNext }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold text-stone-900 mb-6">See Your Summit</h2>
      <p className="text-xl text-stone-700 mb-10 leading-relaxed">
        In the next 5–10 minutes, you&apos;ll map out where you&apos;re headed, why it matters, where you are today, and what feels realistic for the next month.
        Move at your own pace—you can always come back to refine or expand.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h3 className="text-2xl font-semibold text-stone-900 mb-4">What to Expect</h3>
          <ul className="space-y-3 text-stone-700">
            <li>• Step 1: Paint a vivid health vision (future state)</li>
            <li>• Step 2: Anchor into your why and core drivers</li>
            <li>• Step 3: Assess your current reality—strengths and hurdles</li>
            <li>• Step 4: Calibrate time, readiness, and support needs</li>
          </ul>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-6">
          <h3 className="text-2xl font-semibold text-green-900 mb-4">Tips for the Journey</h3>
          <ul className="space-y-3 text-green-900">
            <li>• Progress over perfection—capture what you can right now.</li>
            <li>• Answers autosave in your browser so you can pause anytime.</li>
            <li>• This is a safe space: honesty beats polished language.</li>
          </ul>
        </div>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-8">
        <p className="text-lg text-stone-800 leading-relaxed">
          <strong>Reminder:</strong> Your health vision is a living document. Each pass adds clarity, reveals patterns, and helps you commit to the next right step.
        </p>
      </div>

      <button
        onClick={onNext}
        className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
      >
        Start Step 1: Vision Setting →
      </button>
    </div>
  )
}

export default CompassApp
