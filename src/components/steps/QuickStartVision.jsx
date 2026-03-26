import React, { useState, useEffect } from 'react'
import { ArrowForward, ArrowBack, Check, ExpandMore, AutoAwesome, Refresh } from '@mui/icons-material'
import { Button, Card, Checkbox, Input } from '@summit/design-system'
import { extractVisionAdjectives, consolidateVisionText, enhanceActionPlan } from '../../utils/aiService'
import { generateActionPlan } from '../../utils/planGenerator'

const QuickStartVision = ({ formData, updateFormData, onComplete, onBack: onBackToIntro }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [otherText, setOtherText] = useState({})
  const [phase, setPhase] = useState('quiz') // 'quiz', 'vision-summary', 'habit-intro'
  const [visionAdjectives, setVisionAdjectives] = useState('')
  const [consolidatedVision, setConsolidatedVision] = useState('')
  const [isLoadingVision, setIsLoadingVision] = useState(false)
  const [prefetchedHabits, setPrefetchedHabits] = useState(null)
  const [isLoadingHabits, setIsLoadingHabits] = useState(false)
  const [selectedHabitIndices, setSelectedHabitIndices] = useState([])
  const [expandedHabits, setExpandedHabits] = useState({})
  const [showCustomHabit, setShowCustomHabit] = useState(false)
  const [customHabitText, setCustomHabitText] = useState('')

  // Question definitions
  const questions = [
    // VISION (Q1-Q3)
    {
      section: 'Vision',
      sectionIndex: 1,
      sectionTotal: 3,
      field: 'visionStatement',
      clickedField: 'visionStatement_clicked',
      question: 'What is your health summit?',
      subtitle: 'Imagine yourself 1-2 years from now.',
      type: 'multi-select-text',
      options: [
        { emoji: '⚡', label: 'More energy', text: 'I wake up feeling energized and ready for the day. ' },
        { emoji: '😴', label: 'Better sleep', text: 'I sleep deeply and wake refreshed. ' },
        { emoji: '💪', label: 'Stronger body', text: 'My body is strong and moves with ease. ' },
        { emoji: '🙌', label: 'Pain-free', text: "I'm free from chronic pain and discomfort. " },
        { emoji: '🧠', label: 'Mental clarity', text: 'I have mental clarity and focus. ' },
        { emoji: '⚖️', label: 'Healthy weight', text: "I've reached a healthy weight that feels sustainable. " },
      ],
      hasOther: true,
    },
    {
      section: 'Vision',
      sectionIndex: 2,
      sectionTotal: 3,
      field: 'feelingState',
      clickedField: 'feelingState_clicked',
      question: 'How do you feel in this future version of you?',
      subtitle: 'Choose what feels most right.',
      type: 'multi-select-text',
      options: [
        { emoji: '⚡', label: 'Energized', text: 'I feel energized throughout the day. ' },
        { emoji: '🧘', label: 'Calm & centered', text: 'I feel calm, centered, and resilient. ' },
        { emoji: '💪', label: 'Confident', text: "I'm confident in my body and abilities. " },
        { emoji: '🏋️', label: 'Strong', text: 'I feel physically strong and capable. ' },
        { emoji: '⚖️', label: 'Balanced', text: 'My mood is stable and balanced. ' },
        { emoji: '😌', label: 'Rested', text: 'I feel well-rested and recovered. ' },
      ],
      hasOther: true,
    },
    {
      section: 'Vision',
      sectionIndex: 3,
      sectionTotal: 3,
      field: 'whyMatters',
      clickedField: 'whyMatters_clicked',
      question: 'Why does this vision matter to you?',
      subtitle: 'Connect to your personal reasons and values.',
      type: 'multi-select-text',
      options: [
        { emoji: '👨‍👩‍👧', label: 'Be present for family', text: 'I want to be fully present and energized for my family. ' },
        { emoji: '🕰️', label: 'Live longer', text: 'I want to live a long, healthy life. ' },
        { emoji: '🪞', label: 'Feel like myself', text: 'I want to feel like myself again. ' },
        { emoji: '🌟', label: 'Set an example', text: 'I want to set a positive example for others. ' },
        { emoji: '🎯', label: 'Pursue passions', text: 'I want the energy to pursue my passions and goals. ' },
        { emoji: '🔓', label: 'Break free', text: 'I want to break free from limitations holding me back. ' },
      ],
      hasOther: true,
    },
    // BASE CAMP (Q4-Q5)
    {
      section: 'Base Camp',
      sectionIndex: 1,
      sectionTotal: 2,
      field: 'strengths',
      clickedField: 'strengths_clicked',
      question: 'What strengths & resources do you have?',
      subtitle: "What's already working for you?",
      type: 'multi-select-text',
      options: [
        { emoji: '🌅', label: 'Morning routine', text: 'Consistent morning routine. ' },
        { emoji: '👥', label: 'Supportive people', text: 'Supportive partner/friends/family. ' },
        { emoji: '🏋️', label: 'Access to facilities', text: 'Access to gym/trails/equipment. ' },
        { emoji: '✅', label: 'Good habits', text: 'Already have some healthy habits in place. ' },
        { emoji: '🔥', label: 'Motivation', text: 'Strong motivation and clear reasons why. ' },
        { emoji: '🏆', label: 'Past success', text: 'History of achieving health goals. ' },
      ],
      hasOther: true,
    },
    {
      section: 'Base Camp',
      sectionIndex: 2,
      sectionTotal: 2,
      field: 'gapsWants',
      clickedField: 'gapsWants_clicked',
      question: 'What do you need to work on most?',
      subtitle: 'Choose the 3 most relevant right now.',
      type: 'multi-select-text',
      options: [
        { emoji: '📚', label: 'Learn techniques', text: 'Learn proper form/techniques. ' },
        { emoji: '🤝', label: 'Find accountability', text: 'Find accountability partner or coach. ' },
        { emoji: '🥗', label: 'Meal prep skills', text: 'Develop meal prep routine. ' },
        { emoji: '😴', label: 'Address sleep', text: 'Address sleep issues. ' },
        { emoji: '🧘', label: 'Stress management', text: 'Better stress management tools. ' },
        { emoji: '⏰', label: 'Time management', text: 'Improve time management. ' },
      ],
      hasOther: true,
    },
    // PATH (Q6-Q8)
    {
      section: 'Path',
      sectionIndex: 1,
      sectionTotal: 3,
      field: 'currentScore',
      question: 'Rate your current health',
      subtitle: 'How far are you up the mountain?',
      type: 'slider',
      min: 1,
      max: 10,
    },
    {
      section: 'Path',
      sectionIndex: 2,
      sectionTotal: 3,
      field: 'barriers',
      question: 'What obstacles are blocking your path?',
      subtitle: 'Select all that apply.',
      type: 'multi-select-array',
      options: [
        { emoji: '⏰', label: 'Time' },
        { emoji: '🔋', label: 'Energy' },
        { emoji: '😰', label: 'Stress' },
        { emoji: '🎯', label: 'Motivation' },
        { emoji: '🤔', label: 'Clarity' },
        { emoji: '🏠', label: 'Environment' },
        { emoji: '👥', label: 'Support' },
        { emoji: '📚', label: 'Knowledge' },
      ],
      hasOther: true,
    },
    {
      section: 'Path',
      sectionIndex: 3,
      sectionTotal: 3,
      field: 'habitsToImprove',
      question: 'What habits do you need to improve most?',
      subtitle: 'Select all that apply.',
      type: 'multi-select-array',
      options: [
        { emoji: '🏃', label: 'Movement/Exercise' },
        { emoji: '🥗', label: 'Nutrition' },
        { emoji: '😴', label: 'Sleep' },
        { emoji: '🧘', label: 'Stress Management' },
        { emoji: '🍷', label: 'Alcohol/Substance Moderation' },
        { emoji: '📋', label: 'Planning/Organization' },
        { emoji: '📱', label: 'Tech Boundaries' },
        { emoji: '👥', label: 'Social Connection' },
      ],
      hasOther: true,
    },
    // SUPPORT (Q9-Q10)
    {
      section: 'Support',
      sectionIndex: 1,
      sectionTotal: 2,
      field: 'timeCapacity',
      question: 'How much time can you give to focusing on future you?',
      subtitle: 'Be realistic about your schedule.',
      type: 'discrete-slider',
      steps: [5, 10, 15, 20, 30, 45, 60],
      unit: 'min/day',
    },
    {
      section: 'Support',
      sectionIndex: 2,
      sectionTotal: 2,
      field: 'supportNeeds',
      question: 'What support would make this easier?',
      subtitle: 'Select all that apply.',
      type: 'multi-select-array',
      options: [
        { emoji: '🤝', label: 'Accountability partner' },
        { emoji: '🔔', label: 'Reminders & check-ins' },
        { emoji: '📊', label: 'Weekly progress review' },
        { emoji: '📝', label: 'Step-by-step plan' },
        { emoji: '👥', label: 'Community support' },
        { emoji: '📚', label: 'Education & resources' },
      ],
      hasOther: true,
    },
  ]

  const currentQ = questions[currentQuestion]
  const totalQuestions = questions.length

  // Toggle selection for multi-select-text (builds text string)
  const toggleTextOption = (option, field, clickedField) => {
    const current = formData[field] || ''
    const clicked = formData[clickedField] || []
    const optionKey = option.label

    if (clicked.includes(optionKey)) {
      // Remove
      const newText = current.replace(option.text, '')
      updateFormData(field, newText)
      updateFormData(clickedField, clicked.filter(k => k !== optionKey))
    } else {
      // Add
      updateFormData(field, current + option.text)
      updateFormData(clickedField, [...clicked, optionKey])
    }
  }

  const isTextOptionSelected = (optionLabel, clickedField) => {
    const clicked = formData[clickedField] || []
    return clicked.includes(optionLabel)
  }

  // Toggle selection for multi-select-array (stores array of labels)
  const toggleArrayOption = (optionLabel, field) => {
    const current = formData[field] || []
    if (current.includes(optionLabel)) {
      updateFormData(field, current.filter(item => item !== optionLabel))
    } else {
      updateFormData(field, [...current, optionLabel])
    }
  }

  const isArrayOptionSelected = (optionLabel, field) => {
    const current = formData[field] || []
    return current.includes(optionLabel)
  }

  // Single-select
  const selectSingleOption = (optionLabel, field) => {
    updateFormData(field, optionLabel)
  }

  const isSingleOptionSelected = (optionLabel, field) => {
    return formData[field] === optionLabel
  }

  // Consume "Other" text into formData
  const consumeOtherText = () => {
    const text = otherText[currentQuestion] || ''
    if (!text.trim()) return

    const q = currentQ
    if (q.type === 'multi-select-text') {
      const current = formData[q.field] || ''
      updateFormData(q.field, current + text.trim() + '. ')
      updateFormData(q.clickedField, [...(formData[q.clickedField] || []), `other_${text.trim()}`])
    } else if (q.type === 'multi-select-array') {
      const current = formData[q.field] || []
      updateFormData(q.field, [...current, text.trim()])
    }
    setOtherText(prev => ({ ...prev, [currentQuestion]: '' }))
  }

  // Generate vision text for summary
  const getFullVisionText = () => {
    return [
      formData.visionStatement,
      formData.feelingState,
      formData.whyMatters
    ].filter(Boolean).join(' ')
  }

  // Load adjectives and consolidated vision when entering vision summary phase
  useEffect(() => {
    if (phase === 'vision-summary' && !visionAdjectives) {
      setIsLoadingVision(true)
      const visionText = getFullVisionText()

      // Run both AI calls in parallel
      Promise.all([
        extractVisionAdjectives(visionText),
        consolidateVisionText(visionText)
      ])
        .then(([adjectives, consolidated]) => {
          setVisionAdjectives(adjectives)
          setConsolidatedVision(consolidated)
          setIsLoadingVision(false)
        })
        .catch(error => {
          console.error('Failed to process vision:', error)
          setVisionAdjectives('Your Health Vision')
          setConsolidatedVision(visionText) // Fall back to original
          setIsLoadingVision(false)
        })
    }
  }, [phase])

  // Pre-fetch habit suggestions when entering habit-intro phase
  useEffect(() => {
    if (phase === 'habit-intro' && !prefetchedHabits && !isLoadingHabits) {
      setIsLoadingHabits(true)

      const fetchHabits = async () => {
        try {
          const basePlan = generateActionPlan(formData)
          const aiActions = await enhanceActionPlan(formData, basePlan)

          if (Array.isArray(aiActions) && aiActions.length > 0) {
            setPrefetchedHabits(aiActions.slice(0, 5))
          } else {
            // Fall back to base plan actions
            const baseActions = basePlan.weeklyActions.flatMap(area =>
              area.actions.map(action => ({
                action,
                why: 'This action supports your health goals',
                tip: 'Start small and build consistency'
              }))
            )
            setPrefetchedHabits(baseActions.slice(0, 5))
          }
        } catch (error) {
          console.error('Error pre-fetching habits:', error)
          // Set generic suggestions as fallback
          setPrefetchedHabits([
            {
              action: 'Take a 10-minute walk after lunch',
              why: 'Movement helps boost energy and mental clarity',
              tip: 'Set a recurring calendar reminder right after your typical lunch time'
            },
            {
              action: 'Drink a glass of water first thing in the morning',
              why: 'Hydration jumpstarts your metabolism and helps you feel alert',
              tip: 'Keep a water bottle on your nightstand'
            },
            {
              action: 'Spend 5 minutes stretching before bed',
              why: 'Gentle stretching helps you unwind and improves sleep quality',
              tip: 'Follow a short YouTube stretching routine'
            }
          ])
        }
        setIsLoadingHabits(false)
      }

      fetchHabits()
    }
  }, [phase, formData, prefetchedHabits, isLoadingHabits])

  const handleNext = () => {
    // Consume any pending "Other" text before moving on
    consumeOtherText()

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Quiz complete, move to vision summary
      setPhase('vision-summary')
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  // Check if current question has any selection
  const hasSelection = () => {
    const q = currentQ
    if (q.type === 'slider') return true // Slider always has a value
    if (q.type === 'discrete-slider') return true // Discrete slider always has a value
    if (q.type === 'single-select') return !!formData[q.field]
    if (q.type === 'multi-select-text') {
      const clicked = formData[q.clickedField] || []
      return clicked.length > 0
    }
    if (q.type === 'multi-select-array') {
      const arr = formData[q.field] || []
      return arr.length > 0
    }
    return false
  }

  const renderQuestion = () => {
    const q = currentQ

    if (q.type === 'slider') {
      const value = formData[q.field] || 5
      const percentage = ((value - q.min) / (q.max - q.min)) * 100
      const steps = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i)

      return (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200">
            {/* Slider track with gradient fill */}
            <div className="relative mb-6">
              {/* Track background */}
              <div className="relative h-3 bg-stone-200 rounded-full">
                {/* Filled portion (gradient) */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-summit-sage to-summit-emerald transition-all duration-150"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Invisible range input for interaction */}
              <input
                type="range"
                min={q.min}
                max={q.max}
                value={value}
                onChange={(e) => updateFormData(q.field, parseInt(e.target.value))}
                className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer"
              />

              {/* Custom thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-150"
                style={{ left: `${percentage}%` }}
              >
                <div className="w-8 h-8 bg-summit-emerald rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{value}</span>
                </div>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex justify-between px-1">
              {steps.map((step) => (
                <button
                  key={step}
                  onClick={() => updateFormData(q.field, step)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    step === value
                      ? 'bg-summit-emerald text-white'
                      : step < value
                      ? 'bg-summit-sage text-summit-forest'
                      : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

          </div>
        </div>
      )
    }

    if (q.type === 'discrete-slider') {
      const steps = q.steps
      // Parse numeric value from stored string like "20 minutes/day", or use raw number
      const rawVal = formData[q.field]
      const numericValue = typeof rawVal === 'string' ? parseInt(rawVal) : rawVal
      const value = steps.includes(numericValue) ? numericValue : steps[Math.floor(steps.length / 2)]
      const currentIndex = steps.indexOf(value)
      const percentage = (currentIndex / (steps.length - 1)) * 100

      // Store as "X minutes/day" string for downstream compatibility
      const storeValue = (stepVal) => updateFormData(q.field, `${stepVal} minutes/day`)

      return (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200">
            {/* Slider track with gradient fill */}
            <div className="relative mb-6">
              {/* Track background */}
              <div className="relative h-3 bg-stone-200 rounded-full">
                {/* Filled portion (gradient) */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-summit-sage to-summit-emerald transition-all duration-150"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Invisible range input for interaction */}
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                value={currentIndex}
                onChange={(e) => storeValue(steps[parseInt(e.target.value)])}
                className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer"
              />

              {/* Custom thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-150"
                style={{ left: `${percentage}%` }}
              >
                <div className="w-8 h-8 bg-summit-emerald rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{value}</span>
                </div>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex justify-between px-1">
              {steps.map((step, idx) => (
                <button
                  key={step}
                  onClick={() => storeValue(step)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    idx === currentIndex
                      ? 'bg-summit-emerald text-white'
                      : idx < currentIndex
                      ? 'bg-summit-sage text-summit-forest'
                      : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Unit label */}
            <p className="text-center text-sm text-stone-500 mt-3">{q.unit}</p>
          </div>
        </div>
      )
    }

    if (q.type === 'single-select') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((option) => {
            const isSelected = isSingleOptionSelected(option.label, q.field)
            return (
              <button
                key={option.label}
                onClick={() => selectSingleOption(option.label, q.field)}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-summit-emerald text-white shadow-lg'
                    : 'bg-white text-summit-forest border border-summit-sage hover:bg-summit-mint'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
                {isSelected && <Check className="w-5 h-5 ml-auto" />}
              </button>
            )
          })}
        </div>
      )
    }

    if (q.type === 'multi-select-text') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((option) => {
              const isSelected = isTextOptionSelected(option.label, q.clickedField)
              return (
                <button
                  key={option.label}
                  onClick={() => toggleTextOption(option, q.field, q.clickedField)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-summit-emerald text-white shadow-lg'
                      : 'bg-white text-summit-forest border border-summit-sage hover:bg-summit-mint'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="font-medium flex-1">{option.label}</span>
                  {isSelected && <Check className="w-5 h-5" />}
                </button>
              )
            })}
          </div>
          {q.hasOther && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-summit-sage">
              <span className="text-2xl">✏️</span>
              <input
                type="text"
                value={otherText[currentQuestion] || ''}
                onChange={(e) => setOtherText(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder="Other..."
                className="flex-1 bg-transparent outline-none text-summit-forest placeholder:text-stone-400"
              />
            </div>
          )}
        </div>
      )
    }

    if (q.type === 'multi-select-array') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((option) => {
              const isSelected = isArrayOptionSelected(option.label, q.field)
              return (
                <button
                  key={option.label}
                  onClick={() => toggleArrayOption(option.label, q.field)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-summit-emerald text-white shadow-lg'
                      : 'bg-white text-summit-forest border border-summit-sage hover:bg-summit-mint'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="font-medium flex-1">{option.label}</span>
                  {isSelected && <Check className="w-5 h-5" />}
                </button>
              )
            })}
          </div>
          {q.hasOther && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-summit-sage">
              <span className="text-2xl">✏️</span>
              <input
                type="text"
                value={otherText[currentQuestion] || ''}
                onChange={(e) => setOtherText(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder="Other..."
                className="flex-1 bg-transparent outline-none text-summit-forest placeholder:text-stone-400"
              />
            </div>
          )}
        </div>
      )
    }

    return null
  }

  // Vision Summary Screen
  if (phase === 'vision-summary') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/summit-illustration.png"
              alt="Summit"
              className="w-[100px] h-[100px]"
            />
          </div>
          <p className="text-body-sm text-summit-emerald font-medium uppercase tracking-wide mb-2">
            Your Vision
          </p>
          <h1 className="text-h1 text-summit-forest mb-6">
            {isLoadingVision ? (
              <div className="h-8 bg-summit-mint rounded-lg w-3/4 mx-auto animate-pulse" />
            ) : (
              visionAdjectives || 'Your Health Vision'
            )}
          </h1>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-200 mb-8 text-left">
          {isLoadingVision ? (
            <div className="space-y-3">
              <div className="h-4 bg-summit-mint rounded-md w-full animate-pulse" />
              <div className="h-4 bg-summit-mint rounded-md w-5/6 animate-pulse" />
              <div className="h-4 bg-summit-mint rounded-md w-4/6 animate-pulse" />
            </div>
          ) : (
            <p className="text-body text-stone-700 leading-relaxed italic">
              "{consolidatedVision}"
            </p>
          )}
        </div>

        <p className="text-body text-stone-600 mb-8">
          Great work! You can continue to evolve your vision over time.<br />
          <span className="font-medium text-summit-forest">Next up, habits.</span>
        </p>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentQuestion(totalQuestions - 1)
              setPhase('quiz')
            }}
            leftIcon={<ArrowBack className="w-5 h-5" />}
          >
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setPhase('habit-intro')}
              size="lg"
              disabled={isLoadingVision}
              className="bg-summit-emerald hover:bg-emerald-700 text-white disabled:opacity-50"
              rightIcon={<ArrowForward className="w-5 h-5" />}
            >
              My Habits
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Habit Intro Screen
  if (phase === 'habit-intro') {
    const habitsReady = prefetchedHabits && prefetchedHabits.length > 0

    const toggleHabitSelect = (index) => {
      setSelectedHabitIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      )
    }

    const toggleHabitExpanded = (index) => {
      setExpandedHabits(prev => ({ ...prev, [index]: !prev[index] }))
    }

    const handleAddCustomHabit = () => {
      if (!customHabitText.trim()) return
      const customHabit = {
        action: customHabitText.trim(),
        why: 'A personal habit you chose for yourself.',
        tip: 'Start small and build consistency.',
      }
      // Add to prefetched list and auto-select
      prefetchedHabits.push(customHabit)
      const newIndex = prefetchedHabits.length - 1
      setSelectedHabitIndices(prev => [...prev, newIndex])
      setCustomHabitText('')
      setShowCustomHabit(false)
    }

    const selectedHabitData = selectedHabitIndices.map(i => prefetchedHabits[i])

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <span className="text-8xl">🌱</span>
          </div>
          <h1 className="text-h1 text-summit-forest mb-2">
            Build Your Habits
          </h1>
          <p className="text-body text-stone-600">
            {habitsReady
              ? 'Pick 1\u20133 habits you want to start building today.'
              : 'Generating personalized habit ideas...'}
          </p>
        </div>

        {/* Skeleton cards while loading */}
        {!habitsReady && (
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl border border-stone-200 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-summit-mint flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-summit-mint rounded-md w-3/4" />
                    <div className="h-3 bg-summit-mint/60 rounded-md w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions header */}
        {habitsReady && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AutoAwesome className="w-5 h-5 text-summit-lime" />
              <span className="text-body-sm font-semibold text-summit-forest">Personalized Suggestions</span>
            </div>
            <button
              onClick={() => {
                setPrefetchedHabits(null)
                setSelectedHabitIndices([])
                setExpandedHabits({})
                setIsLoadingHabits(false)
              }}
              disabled={isLoadingHabits}
              className="text-body-sm text-summit-forest hover:text-summit-emerald font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Refresh className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )}

        {/* Habit selection cards */}
        {habitsReady && (
          <div className="space-y-3 mb-8">
            {prefetchedHabits.map((habit, index) => {
              const isSelected = selectedHabitIndices.includes(index)
              const isExpanded = expandedHabits[index]

              return (
                <Card
                  key={index}
                  className={`transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-summit-mint border-summit-emerald'
                      : 'hover:border-summit-sage'
                  }`}
                  onClick={() => toggleHabitSelect(index)}
                >
                  <div className="flex items-center gap-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleHabitSelect(index)}
                      />
                    </div>
                    <p className="flex-1 font-medium text-summit-forest">
                      {habit.action}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleHabitExpanded(index)
                      }}
                      className="p-1 text-gray-400 hover:text-summit-forest transition-colors"
                    >
                      <ExpandMore
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 pl-8 border-t border-gray-100">
                      <p className="text-body-sm text-summit-forest mb-2">
                        <strong>Why this works:</strong> {habit.why}
                      </p>
                      {habit.tip && (
                        <p className="text-body-sm text-text-secondary">
                          <strong>Tip:</strong> {habit.tip}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}

            {/* Add my own */}
            {!showCustomHabit ? (
              <Card
                onClick={() => setShowCustomHabit(true)}
                className="cursor-pointer hover:border-summit-sage transition-all"
              >
                <div className="flex items-center gap-3">
                  <Checkbox disabled />
                  <span className="text-text-secondary">Add my own...</span>
                </div>
              </Card>
            ) : (
              <Card className="border-summit-emerald bg-summit-mint">
                <div className="flex items-center gap-3">
                  <Checkbox disabled className="mt-0.5" />
                  <div className="flex-1">
                    <Input
                      value={customHabitText}
                      onChange={(e) => setCustomHabitText(e.target.value)}
                      placeholder="e.g., Read for 15 minutes before bed"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomHabit()}
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={handleAddCustomHabit}
                    size="sm"
                    disabled={!customHabitText.trim()}
                    className="bg-summit-emerald text-white"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setPhase('vision-summary')}
            leftIcon={<ArrowBack className="w-5 h-5" />}
          >
            Back
          </Button>

          <Button
            onClick={() => onComplete(selectedHabitData)}
            size="lg"
            disabled={!habitsReady || selectedHabitIndices.length === 0}
            className="bg-summit-emerald hover:bg-emerald-700 text-white disabled:opacity-50"
            rightIcon={<ArrowForward className="w-5 h-5" />}
          >
            {isLoadingHabits ? 'Preparing...' : 'Continue'}
          </Button>
        </div>
      </div>
    )
  }

  // Quiz Screen
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm text-text-secondary">
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span className="text-body-sm font-semibold text-summit-emerald">
            {currentQ.section} ({currentQ.sectionIndex}/{currentQ.sectionTotal})
          </span>
        </div>
        <div className="w-full bg-summit-sage rounded-full h-2">
          <div
            className="bg-summit-emerald h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-h2 text-summit-forest mb-2">{currentQ.question}</h2>
        <p className="text-body text-stone-600">{currentQ.subtitle}</p>
      </div>

      {/* Options */}
      <div className="mb-8">
        {renderQuestion()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={currentQuestion > 0 ? handleBack : onBackToIntro}
          leftIcon={<ArrowBack className="w-5 h-5" />}
        >
          Back
        </Button>

        <Button
          onClick={handleNext}
          size="lg"
          disabled={!hasSelection()}
          className="bg-summit-emerald hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          rightIcon={<ArrowForward className="w-5 h-5" />}
        >
          {currentQuestion === totalQuestions - 1 ? 'Review My Vision' : 'Next'}
        </Button>
      </div>
    </div>
  )
}

export default QuickStartVision
