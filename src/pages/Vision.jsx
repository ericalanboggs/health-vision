import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Flag,
  Backpack,
  TrendingUp,
  Schedule,
  Description,
  ArrowForward,
  ArrowBack,
  Check,
} from '@mui/icons-material'
import { trackEvent } from '../lib/posthog'
import { saveJourney, loadJourney } from '../services/journeyService'
import { getCurrentUser } from '../services/authService'
import NorthStarStep from '../components/steps/NorthStarStep'
import CardinalDirectionsStep from '../components/steps/CardinalDirectionsStep'
import TerrainStep from '../components/steps/TerrainStep'
import RouteStep from '../components/steps/RouteStep'
import SummaryPage from '../components/steps/SummaryPage'
import VisionDisplay from '../components/VisionDisplay'
import { Card, Button } from '@summit/design-system'

export default function Vision() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const viewMode = searchParams.get('view')
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
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Headroom behavior for nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      icon: Schedule,
      shortLabel: 'Capacity'
    },
    {
      id: 'summary',
      label: 'Personal Plan',
      icon: Description,
      shortLabel: 'Plan'
    },
  ]

  // Load saved journey on mount
  useEffect(() => {
    const loadSavedJourney = async () => {
      // Get user first for optimized loading
      const { user } = await getCurrentUser()
      const userId = user?.id

      const result = await loadJourney(userId)
      if (result.success && result.data) {
        setFormData(result.data.form_data)

        // If in display mode, don't change the step
        if (viewMode === 'display') {
          return
        }

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

  // If in display mode, show simplified vision view
  if (viewMode === 'display') {
    return <VisionDisplay formData={formData} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Progress Stepper */}
      <div className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                          ? 'bg-summit-lime text-summit-forest ring-4 ring-summit-sage'
                          : isCompleted
                          ? 'bg-summit-sage text-summit-emerald'
                          : 'bg-gray-200 text-text-muted'
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
                          isActive ? 'text-summit-emerald' : isCompleted ? 'text-summit-forest' : 'text-text-muted'
                        }`}
                      >
                        {step.label}
                      </div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-all ${
                        isCompleted ? 'bg-summit-emerald' : 'bg-gray-200'
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
              <span className="text-body-sm text-text-secondary">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-body-sm font-semibold text-summit-emerald">
                {steps[currentStep].label}
              </span>
            </div>
            <div className="w-full bg-summit-sage rounded-full h-2">
              <div
                className="bg-summit-lime h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderStepContent()}

        {/* Navigation Buttons */}
        {currentStep > 0 && steps[currentStep].id !== 'summary' && (
          <div className="mt-8 flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handleBack}
              leftIcon={<ArrowBack className="w-5 h-5" />}
            >
              Back
            </Button>
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
        <h1 className="text-h1 text-summit-forest mb-4">
          Create Your Health Vision
        </h1>
        <p className="text-body-lg text-text-secondary leading-relaxed">
          Building sustainable health habits starts with a clear vision of where you're going and why it matters.
        </p>
      </div>

      <Card className="mb-8 border border-summit-sage">
        <h2 className="text-h2 text-summit-forest mb-4">
          Why Vision Matters for Health Habits
        </h2>

        <div className="space-y-4 text-body text-summit-forest leading-relaxed mb-6">
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

        <div className="bg-summit-mint rounded-xl border border-summit-sage p-6 mb-6">
          <h3 className="text-h3 text-summit-forest mb-3">What You'll Do</h3>
          <ul className="space-y-2 text-body text-summit-forest">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-summit-emerald" />
              <span><strong>Vision:</strong> Define your ideal health state 1-2 years from now</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-summit-emerald" />
              <span><strong>Base Camp:</strong> Assess where you are today and what drives you</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-summit-emerald" />
              <span><strong>Map the Ascent:</strong> Identify barriers and areas for improvement</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-summit-emerald" />
              <span><strong>Capacity & Support:</strong> Determine what's realistic for you right now</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-summit-emerald" />
              <span><strong>Personal Plan:</strong> Review your complete health roadmap</span>
            </li>
          </ul>
        </div>

        <div className="bg-summit-sage/50 rounded-xl border border-summit-sage p-6 mb-6">
          <h3 className="text-h3 text-summit-forest mb-3">Tips for Success</h3>
          <ul className="space-y-2 text-body-sm text-summit-forest">
            <li>• <strong>Be honest:</strong> This is for you, not anyone else</li>
            <li>• <strong>Think big:</strong> Your vision should inspire you</li>
            <li>• <strong>Be specific:</strong> Vivid details make your vision more powerful</li>
            <li>• <strong>Take your time:</strong> Your answers auto-save, so you can pause anytime</li>
          </ul>
        </div>

        <Button
          onClick={onNext}
          size="lg"
          className="w-full"
          rightIcon={<ArrowForward className="w-5 h-5" />}
        >
          Start Creating Your Vision
        </Button>
      </Card>

      <div className="text-center text-body-sm text-text-muted">
        <p>Takes about 5-10 minutes • Progress is automatically saved</p>
      </div>
    </div>
  )
}
