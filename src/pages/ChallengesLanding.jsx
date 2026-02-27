import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tag } from '@summit/design-system'
import { CHALLENGES } from '../data/challengeConfig'
import { getActiveEnrollment, getCompletedEnrollments, getEffectiveWeek } from '../services/challengeService'
import { getCurrentUser } from '../services/authService'

export default function ChallengesLanding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeEnrollment, setActiveEnrollment] = useState(null)
  const [completedSlugs, setCompletedSlugs] = useState(new Set())

  useEffect(() => {
    const load = async () => {
      const { success, user } = await getCurrentUser()
      if (!success || !user) {
        setLoading(false)
        return
      }

      const [activeResult, completedResult] = await Promise.all([
        getActiveEnrollment(user.id),
        getCompletedEnrollments(user.id),
      ])

      if (activeResult.success && activeResult.data) {
        setActiveEnrollment(activeResult.data)
      }

      if (completedResult.success && completedResult.data) {
        setCompletedSlugs(new Set(completedResult.data.map(e => e.challenge_slug)))
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Loading challenges...</p>
      </div>
    )
  }

  const colorMap = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200',
    yellow: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-h1 text-summit-forest mb-2">Challenges</h1>
        <p className="text-body text-text-secondary">
          4-week guided programs to build lasting habits, one focus area per week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHALLENGES.map(challenge => {
          const isActive = activeEnrollment?.challenge_slug === challenge.slug
          const isCompleted = completedSlugs.has(challenge.slug)
          const hasActiveOther = activeEnrollment && !isActive
          const cardColor = colorMap[challenge.color] || colorMap.blue

          return (
            <button
              key={challenge.slug}
              onClick={() => navigate(`/challenges/${challenge.slug}`)}
              className={`text-left rounded-2xl border-2 p-5 transition-all ${cardColor} ${
                hasActiveOther && !isCompleted
                  ? 'opacity-60 cursor-default'
                  : 'hover:shadow-md cursor-pointer'
              }`}
              disabled={false}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{challenge.icon}</span>
                {isActive && (
                  <Tag variant="info" size="sm">
                    {getEffectiveWeek(activeEnrollment) === 0
                      ? 'Starting Soon'
                      : `In Progress — Week ${getEffectiveWeek(activeEnrollment)}`}
                  </Tag>
                )}
                {isCompleted && !isActive && (
                  <Tag variant="success" size="sm">Completed</Tag>
                )}
              </div>

              <h2 className="text-lg font-semibold text-summit-forest mb-1">
                {challenge.title}
              </h2>
              <p className="text-sm text-text-secondary mb-3">{challenge.tagline}</p>

              <div className="flex flex-wrap gap-1.5">
                {challenge.focusAreas.map(fa => (
                  <span
                    key={fa.slug}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/70 text-summit-forest border border-white/50"
                  >
                    {fa.title}
                  </span>
                ))}
              </div>

              {hasActiveOther && !isCompleted && (
                <p className="text-xs text-text-muted mt-3">
                  Complete your current challenge first
                </p>
              )}
            </button>
          )
        })}
      </div>
    </main>
  )
}
