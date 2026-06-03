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
} from '@mui/icons-material'

// Material Symbol component for icons not in @mui/icons-material
const MaterialSymbol = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
)

// Telescope isn't in the Material Symbols font (renders as literal text), so draw it
// as an inline SVG (Lucide-style). Inherits color via currentColor.
const TelescopeIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" />
    <path d="m13.56 11.747 4.332-.924" />
    <path d="m16 21-3.105-6.21" />
    <path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" />
    <path d="m6.158 8.633 1.114 4.456" />
    <path d="m8 21 3.105-6.21" />
    <circle cx="12" cy="13" r="2" />
  </svg>
)
import { trackEvent } from '../lib/posthog'
import { EMPTY_VISION_FORM } from '../data/visionFormDefaults'
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
  const [formData, setFormData] = useState({ ...EMPTY_VISION_FORM })
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
        // Merge over defaults so a partial row (e.g. one seeded by the /welcome
        // screen) keeps every key — prevents undefined controlled inputs.
        setFormData({ ...EMPTY_VISION_FORM, ...result.data.form_data })

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
          {/* Progress bar — step name on the left, Step X/N on the right */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-sm font-semibold text-summit-emerald">
                {steps[currentStep].label}
              </span>
              <span className="text-body-sm text-text-secondary">
                Step {currentVisibleIndex + 1}/{visibleSteps.length}
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
          <div className="w-32 h-32 rounded-full bg-white shadow-elevated flex items-center justify-center">
            <img
              src="/summit-illustration.png"
              alt="Summit"
              className="w-[96px] h-[96px]"
            />
          </div>
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
            A clear vision makes habits easier to keep—especially when they're hard—because it gives you something to return to when motivation fades. Research backs this up: connecting daily actions to a meaningful future is associated with{' '}
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8669210/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-summit-emerald hover:text-summit-forest"
            >
              lower disease risk
            </a>{' '}
            and reduced mortality.
          </p>
        </div>
      </Card>

      {/* Path Selection Cards */}
      <div className="space-y-4 mb-8">
        {/* Quick Start Card */}
        <button
          onClick={() => onSelectPath('quickstart')}
          className="w-full text-left bg-white p-6 rounded-xl border-2 border-summit-sage hover:border-summit-emerald transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:-translate-y-1 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-summit-sage rounded-lg flex items-center justify-center transition-all duration-200 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md">
                <MaterialSymbol name="bolt" className="text-[28px] text-summit-pine" />
              </div>
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
          className="w-full text-left bg-white p-6 rounded-xl border-2 border-summit-sage hover:border-summit-emerald transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:-translate-y-1 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-summit-sage rounded-lg flex items-center justify-center transition-all duration-200 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md">
                <TelescopeIcon className="w-7 h-7 text-summit-pine" />
              </div>
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
