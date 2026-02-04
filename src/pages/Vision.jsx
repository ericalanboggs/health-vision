import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Flag,
  Backpack,
  TrendingUp,
  Description,
  ArrowForward,
  ArrowBack,
  Check,
  OpenInNew,
} from '@mui/icons-material'

// Material Symbol component for icons not in @mui/icons-material
const MaterialSymbol = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
)
import { trackEvent } from '../lib/posthog'
import { saveJourney, loadJourney } from '../services/journeyService'
import { getCurrentUser } from '../services/authService'
import NorthStarStep from '../components/steps/NorthStarStep'
import CardinalDirectionsStep from '../components/steps/CardinalDirectionsStep'
import TerrainStep from '../components/steps/TerrainStep'
import RouteStep from '../components/steps/RouteStep'
import QuickStartVision from '../components/steps/QuickStartVision'
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
      label: 'Intro',
      icon: Flag,
      shortLabel: 'Intro',
      hidden: true, // Hide from stepper
    },
    {
      id: 'quickstart',
      label: 'Quick Start',
      icon: () => <MaterialSymbol name="bolt" className="text-[20px]" />,
      shortLabel: 'Quick',
      hidden: true, // Hide from stepper (uses own progress)
    },
    {
      id: 'vision',
      label: 'Vision',
      icon: () => <MaterialSymbol name="mountain_flag" className="text-[20px]" />,
      shortLabel: 'Vision'
    },
    {
      id: 'basecamp',
      label: 'Base',
      icon: Backpack,
      shortLabel: 'Base'
    },
    {
      id: 'current',
      label: 'Path',
      icon: TrendingUp,
      shortLabel: 'Path'
    },
    {
      id: 'capacity',
      label: 'Support',
      icon: () => <MaterialSymbol name="concierge" className="text-[20px]" />,
      shortLabel: 'Support'
    },
    {
      id: 'summary',
      label: 'Plan',
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
          // Only resume if user was in the middle of the detailed flow
          // (not intro or quickstart - those should show the fork again)
          const savedStepId = result.data.current_step
          const detailedFlowSteps = ['vision', 'basecamp', 'current', 'capacity']
          if (detailedFlowSteps.includes(savedStepId)) {
            const savedStepIndex = steps.findIndex(s => s.id === savedStepId)
            if (savedStepIndex !== -1) {
              setCurrentStep(savedStepIndex)
            }
          }
          // Otherwise, stay at intro (step 0) to show the fork
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

  // Warn user about unsaved data before leaving (only during active editing)
  useEffect(() => {
    const stepId = steps[currentStep]?.id
    const isActivelyEditing = stepId && !['intro', 'summary'].includes(stepId)
    const hasFormData = formData.visionStatement || formData.feelingState || formData.whyMatters

    const handleBeforeUnload = (e) => {
      if (isActivelyEditing && hasFormData) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentStep, formData])

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
      const currentStepId = steps[currentStep].id
      // If on 'vision' step (detailed flow), go back to intro, not quickstart
      if (currentStepId === 'vision') {
        setCurrentStep(0) // Go to intro
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleSelectPath = (path) => {
    trackEvent('vision_path_selected', { path })
    if (path === 'quickstart') {
      const quickstartIndex = steps.findIndex(s => s.id === 'quickstart')
      setCurrentStep(quickstartIndex)
    } else {
      // Detailed path - go to vision step
      const visionIndex = steps.findIndex(s => s.id === 'vision')
      setCurrentStep(visionIndex)
    }
  }

  const handleQuickStartComplete = async (prefetchedHabits) => {
    trackEvent('vision_quickstart_completed')
    // Save the journey before navigating
    await saveJourney(formData, 'summary')
    // Navigate to habit creation page with prefetched habits
    navigate('/add-habit', {
      state: {
        prefetchedHabits,
        fromQuickStart: true
      }
    })
  }

  const renderStepContent = () => {
    const stepId = steps[currentStep].id

    switch (stepId) {
      case 'intro':
        return <IntroPage onSelectPath={handleSelectPath} />
      case 'quickstart':
        return <QuickStartVision formData={formData} updateFormData={updateFormData} onComplete={handleQuickStartComplete} onBack={() => setCurrentStep(0)} />
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
        return <IntroPage onSelectPath={handleSelectPath} />
    }
  }

  // If in display mode, show simplified vision view
  if (viewMode === 'display') {
    return <VisionDisplay formData={formData} />
  }

  // Filter visible steps for stepper (exclude hidden steps like intro/quickstart)
  const visibleSteps = steps.filter(s => !s.hidden)
  const currentStepId = steps[currentStep].id
  const showStepper = !['intro', 'quickstart'].includes(currentStepId)
  const showBackButton = currentStep > 0 && !['summary', 'quickstart'].includes(currentStepId)

  // Find current visible step index for stepper display
  const currentVisibleIndex = visibleSteps.findIndex(s => s.id === currentStepId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Back Button */}
      {showBackButton && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            leftIcon={<ArrowBack className="w-5 h-5" />}
          >
            Back
          </Button>
        </div>
      )}

      {/* Progress Stepper - hidden for intro and quickstart */}
      {showStepper && (
      <div className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Desktop Stepper */}
          <div className="hidden md:flex items-center justify-between">
            {visibleSteps.map((step, index) => {
              const Icon = step.icon
              const stepIndex = steps.findIndex(s => s.id === step.id)
              const isActive = stepIndex === currentStep
              const isCompleted = stepIndex < currentStep
              const isAccessible = stepIndex <= currentStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => isAccessible && setCurrentStep(stepIndex)}
                    disabled={!isAccessible}
                    className={`flex items-center gap-3 transition-all ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-summit-emerald text-white ring-4 ring-summit-sage'
                          : isCompleted
                          ? 'bg-summit-sage text-summit-emerald'
                          : 'bg-stone-200 text-stone-400'
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
                  {index < visibleSteps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-all ${
                        isCompleted ? 'bg-summit-emerald' : 'bg-stone-200'
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
                Step {currentVisibleIndex + 1} of {visibleSteps.length}
              </span>
              <span className="text-body-sm font-semibold text-summit-emerald">
                {steps[currentStep].label}
              </span>
            </div>
            <div className="w-full bg-summit-sage rounded-full h-2">
              <div
                className="bg-summit-emerald h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentVisibleIndex + 1) / visibleSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderStepContent()}
      </div>
    </div>
  )
}

// Introduction Page Component
const IntroPage = ({ onSelectPath }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <img
            src="/summit-illustration.png"
            alt="Summit"
            className="w-[120px] h-[120px]"
          />
        </div>
        <h1 className="text-h1 text-summit-forest mb-4">
          Create Your Health Vision
        </h1>
      </div>

      <Card className="mb-6 border border-summit-sage">
        <h2 className="text-h2 text-summit-forest mb-4">
          Why Vision Matters
        </h2>

        <div className="space-y-4 text-body text-stone-600 leading-relaxed mb-6">
          <p>
            Research shows that connecting daily actions to a meaningful future vision is associated with lower disease risk and reduced mortality.{' '}
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8669210/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-0.5 text-summit-emerald hover:text-summit-forest"
            >
              <OpenInNew className="w-3.5 h-3.5" />
            </a>
          </p>
          <p>
            A clear vision makes habit formation easier—even when it's hard—because it gives you something to return to when motivation fades.
          </p>
        </div>
      </Card>

      {/* Path Selection Cards */}
      <div className="space-y-4 mb-8">
        {/* Quick Start Card */}
        <button
          onClick={() => onSelectPath('quickstart')}
          className="w-full text-left bg-white p-6 rounded-xl border-2 border-summit-sage hover:border-summit-emerald transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <span className="text-3xl">⚡</span>
              <div>
                <h3 className="text-lg font-semibold text-summit-forest mb-1">Quick Start</h3>
                <p className="text-body-sm text-stone-600 mb-2">
                  Answer 10 quick questions to get started fast
                </p>
                <span className="inline-block text-xs text-stone-500 bg-summit-mint px-2 py-1 rounded-full">
                  ~2-3 minutes
                </span>
              </div>
            </div>
            <ArrowForward className="w-5 h-5 text-stone-400 group-hover:text-summit-emerald transition-colors" />
          </div>
        </button>

        {/* Detailed Vision Card */}
        <button
          onClick={() => onSelectPath('detailed')}
          className="w-full text-left bg-white p-6 rounded-xl border-2 border-summit-sage hover:border-summit-emerald transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🏔️</span>
              <div>
                <h3 className="text-lg font-semibold text-summit-forest mb-1">Detailed Vision</h3>
                <p className="text-body-sm text-stone-600 mb-2">
                  Take your time with guided questions for a deeper vision
                </p>
                <span className="inline-block text-xs text-stone-500 bg-summit-mint px-2 py-1 rounded-full">
                  ~5-10 minutes
                </span>
              </div>
            </div>
            <ArrowForward className="w-5 h-5 text-stone-400 group-hover:text-summit-emerald transition-colors" />
          </div>
        </button>
      </div>

      <div className="text-center text-body-sm text-summit-moss">
        <p>Progress is automatically saved • You can expand your vision later</p>
      </div>
    </div>
  )
}
