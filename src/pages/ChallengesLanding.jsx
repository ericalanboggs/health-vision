import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Tag } from '@summit/design-system'
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

          return (
            <Card
              key={challenge.slug}
              interactive={!hasActiveOther || isCompleted}
              variant="outlined"
              padding="md"
              className={hasActiveOther && !isCompleted ? 'opacity-60' : ''}
              onClick={() => navigate(`/challenges/${challenge.slug}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
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
                <CardTitle>{challenge.title}</CardTitle>
                <CardDescription>{challenge.tagline}</CardDescription>
              </CardHeader>

              <CardContent className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {challenge.focusAreas.map(fa => (
                    <Tag key={fa.slug} size="sm" variant="neutral">
                      {fa.title}
                    </Tag>
                  ))}
                </div>
              </CardContent>

              {hasActiveOther && !isCompleted && (
                <CardFooter className="pt-2">
                  <p className="text-xs text-text-muted">
                    Complete your current challenge first
                  </p>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
    </main>
  )
}
