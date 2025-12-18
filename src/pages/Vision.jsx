import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Backpack, TrendingUp, Clock3, FileText, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { trackEvent } from '../lib/posthog'
import { saveJourney, loadJourney } from '../services/journeyService'
import NorthStarStep from '../components/steps/NorthStarStep'
import CardinalDirectionsStep from '../components/steps/CardinalDirectionsStep'
import TerrainStep from '../components/steps/TerrainStep'
import RouteStep from '../components/steps/RouteStep'
import SummaryPage from '../components/steps/SummaryPage'

export default function Vision() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
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

  const steps = [
    { 
      id: 'intro', 
      label: 'Introduction', 
      icon: Flag,
      shortLabel: 'Intro'
    },
    { 
      id: 'vision', 
      label: 'Vision', 
      icon: Flag,
      shortLabel: 'Vision'
    },
    { 
      id: 'basecamp', 
      label: 'Base Camp', 
      icon: Backpack,
      shortLabel: 'Base Camp'
    },
    { 
      id: 'current', 
      label: 'Map the Ascent', 
      icon: TrendingUp,
      shortLabel: 'Map'
    },
    { 
      id: 'capacity', 
      label: 'Capacity & Support', 
      icon: Clock3,
      shortLabel: 'Capacity'
    },
    { 
      id: 'summary', 
      label: 'Personal Plan', 
      icon: FileText,
      shortLabel: 'Plan'
    },
  ]

  // Load saved journey on mount
  useEffect(() => {
    const loadSavedJourney = async () => {
      const result = await loadJourney()
      if (result.success && result.data) {
        setFormData(result.data.form_data)
        
        // Check if vision has been completed (has visionStatement)
        const hasCompletedVision = result.data.form_data?.visionStatement && 
                                    result.data.form_data.visionStatement.trim().length > 0
        
        if (hasCompletedVision) {
          // If vision exists, go directly to summary page
          const summaryIndex = steps.findIndex(s => s.id === 'summary')
          setCurrentStep(summaryIndex)
        } else {
          // Otherwise, use saved step or start from beginning
          const savedStepId = result.data.current_step
          const savedStepIndex = steps.findIndex(s => s.id === savedStepId)
          if (savedStepIndex !== -1) {
            setCurrentStep(savedStepIndex)
          }
        }
      }
    }
    loadSavedJourney()
  }, [])

  // Jump to top whenever step changes and track navigation
  useEffect(() => {
    window.scrollTo(0, 0)
    if (currentStep > 0) {
      trackEvent('vision_step_viewed', { 
        step: steps[currentStep].id,
        stepNumber: currentStep 
      })
    }
  }, [currentStep])

  // Auto-save journey data whenever formData or currentStep changes
  useEffect(() => {
    const autoSave = async () => {
      if (currentStep > 0) {
        await saveJourney(formData, steps[currentStep].id)
      }
    }
    
    const timeoutId = setTimeout(autoSave, 1000)
    return () => clearTimeout(timeoutId)
  }, [formData, currentStep])

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    const stepId = steps[currentStep].id

    switch (stepId) {
      case 'intro':
        return <IntroPage onNext={handleNext} />
      case 'vision':
        return <NorthStarStep formData={formData} updateFormData={updateFormData} onNext={handleNext} />
      case 'basecamp':
        return <CardinalDirectionsStep formData={formData} updateFormData={updateFormData} onNext={handleNext} />
      case 'current':
        return <TerrainStep formData={formData} updateFormData={updateFormData} onNext={handleNext} />
      case 'capacity':
        return <RouteStep formData={formData} updateFormData={updateFormData} onNext={handleNext} />
      case 'summary':
        return <SummaryPage formData={formData} onNavigate={(stepId) => {
          const index = steps.findIndex(s => s.id === stepId)
          if (index !== -1) setCurrentStep(index)
        }} />
      default:
        return <IntroPage onNext={handleNext} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Progress Stepper */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Desktop Stepper */}
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              const isAccessible = index <= currentStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => isAccessible && setCurrentStep(index)}
                    disabled={!isAccessible}
                    className={`flex items-center gap-3 transition-all ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-green-600 text-white ring-4 ring-green-100'
                          : isCompleted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <div
                        className={`text-sm font-semibold ${
                          isActive ? 'text-green-600' : isCompleted ? 'text-stone-700' : 'text-stone-500'
                        }`}
                      >
                        {step.label}
                      </div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-all ${
                        isCompleted ? 'bg-green-600' : 'bg-stone-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile Stepper */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm font-semibold text-green-600">
                {steps[currentStep].label}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {renderStepContent()}

        {/* Navigation Buttons */}
        {currentStep > 0 && steps[currentStep].id !== 'summary' && (
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Introduction Page Component
const IntroPage = ({ onNext }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
          Create Your Health Vision
        </h1>
        <p className="text-xl text-stone-600 leading-relaxed">
          Building sustainable health habits starts with a clear vision of where you're going and why it matters.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">
          Why Vision Matters for Health Habits
        </h2>
        
        <div className="space-y-4 text-stone-700 leading-relaxed mb-6">
          <p>
            Research shows that people who connect their daily actions to a compelling future vision are{' '}
            <strong>3x more likely to stick with new habits</strong>. Your vision becomes your North Star—a 
            reference point when motivation wanes and obstacles arise.
          </p>
          
          <p>
            Without a clear vision, health habits feel like arbitrary tasks on a to-do list. With a vivid vision, 
            they become meaningful steps toward the life you want to live.
          </p>
          
          <p>
            In the next few minutes, you'll create a personalized health vision and map out a realistic path 
            to get there. Your words and vision will guide your entire experience.
          </p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-green-900 mb-3">What You'll Do</h3>
          <ul className="space-y-2 text-green-900">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <span><strong>Vision:</strong> Define your ideal health state 1-2 years from now</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <span><strong>Base Camp:</strong> Assess where you are today and what drives you</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <span><strong>Map the Ascent:</strong> Identify barriers and areas for improvement</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <span><strong>Capacity & Support:</strong> Determine what's realistic for you right now</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <span><strong>Personal Plan:</strong> Review your complete health roadmap</span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">Tips for Success</h3>
          <ul className="space-y-2 text-amber-900 text-sm">
            <li>• <strong>Be honest:</strong> This is for you, not anyone else</li>
            <li>• <strong>Think big:</strong> Your vision should inspire you</li>
            <li>• <strong>Be specific:</strong> Vivid details make your vision more powerful</li>
            <li>• <strong>Take your time:</strong> Your answers auto-save, so you can pause anytime</li>
          </ul>
        </div>

        <button
          onClick={onNext}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          Start Creating Your Vision
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      <div className="text-center text-sm text-stone-500">
        <p>Takes about 5-10 minutes • Progress is automatically saved</p>
      </div>
    </div>
  )
}
