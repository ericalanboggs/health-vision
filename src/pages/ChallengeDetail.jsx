import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowBack, ExpandMore, DragIndicator } from '@mui/icons-material'
import { Button, Tag, Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@summit/design-system'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getChallengeBySlug } from '../data/challengeConfig'
import {
  getActiveEnrollment,
  getCompletedEnrollments,
  startChallenge,
  getChallengeHabitLog,
  getEffectiveWeek,
  cancelChallenge,
} from '../services/challengeService'
import { getCurrentUser } from '../services/authService'

function ProgressSteps({ currentWeek, habitLog }) {
  const weeks = [1, 2, 3, 4]
  return (
    <div className="flex items-center justify-center gap-0">
      {weeks.map((week, i) => {
        const isCompleted = habitLog.some(h => h.week_number === week)
        const isCurrent = week === currentWeek
        const isFuture = week > currentWeek

        return (
          <div key={week} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? 'bg-summit-emerald text-white'
                    : isCurrent
                    ? 'border-2 border-summit-emerald text-summit-emerald animate-pulse'
                    : 'border-2 border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? '\u2713' : week}
              </div>
              <span className={`text-xs mt-1 ${isCurrent ? 'text-summit-forest font-medium' : 'text-text-muted'}`}>
                Wk {week}
              </span>
            </div>
            {i < weeks.length - 1 && (
              <div className={`w-8 h-0.5 mb-4 ${
                isCompleted ? 'bg-summit-emerald' : 'bg-gray-300'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RangeSlider({ value, onChange, label }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-summit-forest">{label}</label>
        <span className="text-sm font-semibold text-summit-emerald">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-summit-emerald"
      />
      <div className="flex justify-between text-xs text-text-muted mt-1">
        <span>Needs work</span>
        <span>Great</span>
      </div>
    </div>
  )
}

function SortableFocusArea({ fa, isExpanded, onToggleExpanded }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fa.slug })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
        isDragging ? 'shadow-lg opacity-90' : ''
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-summit-forest cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <DragIndicator className="w-5 h-5" />
        </button>

        <div
          className="flex-1 cursor-pointer"
          onClick={() => onToggleExpanded(fa.slug)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-summit-emerald bg-summit-mint px-2 py-0.5 rounded-full">
              Week {fa.week}
            </span>
            <h3 className="font-semibold text-summit-forest">{fa.title}</h3>
          </div>
          <p className="text-sm text-text-secondary mt-1">{fa.description}</p>
        </div>

        <button
          onClick={() => onToggleExpanded(fa.slug)}
          className="p-1 text-gray-400 hover:text-summit-forest transition-colors"
        >
          <ExpandMore className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 ml-10 border-t border-gray-100 pt-3">
          <div className="bg-summit-mint/50 border border-summit-sage rounded-lg p-3">
            <p className="text-sm text-summit-forest italic mb-1">{fa.evidence}</p>
            <p className="text-xs text-text-muted">— {fa.evidenceSource}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChallengeDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const challenge = getChallengeBySlug(slug)

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [habitLog, setHabitLog] = useState([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [surveyScores, setSurveyScores] = useState({})
  const [focusAreas, setFocusAreas] = useState(challenge?.focusAreas || [])
  const [expandedAreas, setExpandedAreas] = useState({})
  const [starting, setStarting] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (!challenge) return
    const load = async () => {
      const { success, user } = await getCurrentUser()
      if (!success || !user) {
        setLoading(false)
        return
      }
      setUserId(user.id)

      const [activeResult, completedResult] = await Promise.all([
        getActiveEnrollment(user.id),
        getCompletedEnrollments(user.id),
      ])

      if (activeResult.success && activeResult.data?.challenge_slug === slug) {
        setEnrollment(activeResult.data)
        const logResult = await getChallengeHabitLog(activeResult.data.id)
        if (logResult.success) {
          setHabitLog(logResult.data)
        }
        // Restore focus area order if saved
        const savedOrder = activeResult.data.survey_scores?.focusAreaOrder
        if (savedOrder) {
          const ordered = savedOrder
            .map((faSlug, idx) => {
              const fa = challenge.focusAreas.find(f => f.slug === faSlug)
              return fa ? { ...fa, week: idx + 1 } : null
            })
            .filter(Boolean)
          if (ordered.length === challenge.focusAreas.length) {
            setFocusAreas(ordered)
          }
        }
      }

      if (completedResult.success && completedResult.data) {
        const completed = completedResult.data.some(e => e.challenge_slug === slug)
        setIsCompleted(completed)
      }

      setLoading(false)
    }
    load()
  }, [slug])

  if (!challenge) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-text-secondary">Challenge not found.</p>
        <Button variant="ghost" onClick={() => navigate('/challenges')} className="mt-4">
          Back to Challenges
        </Button>
      </main>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  const toggleExpanded = (faSlug) => {
    setExpandedAreas(prev => ({ ...prev, [faSlug]: !prev[faSlug] }))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setFocusAreas(prev => {
      const oldIndex = prev.findIndex(fa => fa.slug === active.id)
      const newIndex = prev.findIndex(fa => fa.slug === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered.map((fa, i) => ({ ...fa, week: i + 1 }))
    })
  }

  const allSurveyAnswered = focusAreas.every(fa => surveyScores[fa.slug] !== undefined)

  const handleStart = async () => {
    if (!userId || starting) return
    setStarting(true)

    const focusAreaOrder = focusAreas.map(fa => fa.slug)
    const result = await startChallenge(userId, slug, surveyScores, focusAreaOrder)

    if (result.success) {
      navigate(`/challenges/${slug}/add-habit`)
    } else {
      alert('Failed to start challenge. Please try again.')
    }
    setStarting(false)
  }

  const handleCancel = async () => {
    if (cancelling || !enrollment || !userId) return
    setCancelling(true)

    const result = await cancelChallenge(userId, enrollment.id, slug)
    if (result.success) {
      setShowCancelModal(false)
      navigate('/challenges')
    } else {
      alert('Failed to cancel challenge. Please try again.')
    }
    setCancelling(false)
  }

  // Enrolled state
  if (enrollment) {
    const currentWeek = getEffectiveWeek(enrollment)
    const isPreStart = currentWeek === 0
    const displayWeek = isPreStart ? 1 : currentWeek
    const currentFA = focusAreas.find(fa => fa.week === displayWeek) || focusAreas[displayWeek - 1]
    const habitAddedThisWeek = habitLog.some(h => h.week_number === displayWeek)

    const startDateStr = enrollment.survey_scores?.week1StartDate
    const formattedStartDate = startDateStr
      ? new Date(startDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : null

    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/habits')}
          className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors mb-6"
        >
          <ArrowBack className="w-5 h-5" />
          Back to Habits
        </button>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{challenge.icon}</span>
          <div>
            <h1 className="text-h1 text-summit-forest">{challenge.title}</h1>
            <p className="text-body text-text-secondary">{challenge.tagline}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 mb-6">
          <ProgressSteps currentWeek={isPreStart ? 0 : displayWeek} habitLog={isPreStart ? [] : habitLog} />
        </div>

        {isPreStart && (
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 mb-6 text-center">
            <p className="text-lg font-semibold text-summit-forest mb-2">
              Your challenge begins {formattedStartDate}
            </p>
            <p className="text-body text-text-secondary mb-4">
              Your Week 1 habit is ready to go. When Monday arrives, you'll start tracking it.
            </p>
            {habitAddedThisWeek && (
              <div className="bg-summit-mint border border-summit-emerald rounded-lg p-4 inline-block">
                <p className="text-sm font-medium text-summit-forest">
                  {'\u2713'} Week 1 habit: {habitLog.find(h => h.week_number === 1)?.habit_name}
                </p>
              </div>
            )}
          </div>
        )}

        {!isPreStart && currentFA && (
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6 mb-6">
            <Tag variant="info" size="sm" className="mb-3">Week {currentWeek} Focus</Tag>
            <h2 className="text-xl font-semibold text-summit-forest mb-2">{currentFA.title}</h2>
            <p className="text-body text-text-secondary mb-4">{currentFA.description}</p>

            <div className="bg-summit-mint border border-summit-sage rounded-lg p-4 mb-4">
              <p className="text-sm text-summit-forest italic mb-1">{currentFA.evidence}</p>
              <p className="text-xs text-text-muted">— {currentFA.evidenceSource}</p>
            </div>

            {!habitAddedThisWeek ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/challenges/${slug}/add-habit`)}
              >
                Add This Week's Habit
              </Button>
            ) : (
              <div className="bg-summit-mint border border-summit-emerald rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-summit-forest">
                  {'\u2713'} Habit added for Week {currentWeek}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {habitLog.find(h => h.week_number === currentWeek)?.habit_name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Past weeks */}
        {habitLog.filter(h => h.week_number < displayWeek).length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_0_rgba(2,44,35,0.12)] p-6">
            <h3 className="text-sm font-semibold text-summit-forest mb-3">Previous Weeks</h3>
            <div className="space-y-2">
              {habitLog
                .filter(h => h.week_number < displayWeek)
                .map(h => {
                  const fa = focusAreas.find(f => f.slug === h.focus_area_slug)
                  return (
                    <div key={h.id} className="flex items-center gap-3 text-sm text-text-secondary">
                      <span className="w-6 h-6 rounded-full bg-summit-emerald text-white flex items-center justify-center text-xs font-semibold">{'\u2713'}</span>
                      <span><strong>Week {h.week_number}</strong> ({fa?.title}): {h.habit_name}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Cancel challenge */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-sm text-text-muted hover:text-red-600 transition-colors"
          >
            Cancel Challenge
          </button>
        </div>

        <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} size="sm">
          <ModalHeader>
            <ModalTitle>Cancel this challenge?</ModalTitle>
            <ModalDescription>
              Cancelling will unenroll you from the challenge and remove any associated habits from your plan. This can't be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="secondary" size="md" onClick={() => setShowCancelModal(false)}>
              Keep Going
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCancel}
              disabled={cancelling}
              loading={cancelling}
              className="!bg-red-600 hover:!bg-red-700"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Challenge'}
            </Button>
          </ModalFooter>
        </Modal>
      </main>
    )
  }

  // Not enrolled state
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/challenges')}
        className="flex items-center gap-2 text-text-secondary hover:text-summit-forest font-medium transition-colors mb-6"
      >
        <ArrowBack className="w-5 h-5" />
        Back to Challenges
      </button>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-4xl">{challenge.icon}</span>
        <div>
          <h1 className="text-h1 text-summit-forest">{challenge.title}</h1>
          <p className="text-body text-text-secondary">{challenge.tagline}</p>
        </div>
      </div>

      <p className="text-body text-text-secondary mb-8">{challenge.description}</p>

      {isCompleted && (
        <div className="bg-summit-mint border border-summit-emerald rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-summit-forest">
            {'\u2713'} You've completed this challenge before. You can restart it anytime.
          </p>
        </div>
      )}

      {/* Focus areas with drag-and-drop reordering */}
      <h2 className="text-lg font-semibold text-summit-forest mb-1">4-Week Focus Areas</h2>
      <p className="text-sm text-text-muted mb-4">Drag to reorder the weeks</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={focusAreas.map(fa => fa.slug)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 mb-8">
            {focusAreas.map(fa => (
              <SortableFocusArea
                key={fa.slug}
                fa={fa}
                isExpanded={expandedAreas[fa.slug]}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Micro-survey */}
      <h2 className="text-lg font-semibold text-summit-forest mb-4">Quick Self-Assessment</h2>
      <p className="text-sm text-text-secondary mb-4">
        Rate yourself in each area so we can tailor habit suggestions to where you are right now.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6 mb-8">
        {focusAreas.map(fa => (
          <RangeSlider
            key={fa.slug}
            label={fa.surveyQuestion}
            value={surveyScores[fa.slug] || 5}
            onChange={(val) => setSurveyScores(prev => ({ ...prev, [fa.slug]: val }))}
          />
        ))}
      </div>

      {/* Start button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleStart}
        disabled={!allSurveyAnswered || starting}
        loading={starting}
      >
        {starting ? 'Starting...' : 'Start Challenge'}
      </Button>
      {!allSurveyAnswered && (
        <p className="text-xs text-text-muted text-center mt-2">
          Move each slider to unlock the start button.
        </p>
      )}
    </main>
  )
}
