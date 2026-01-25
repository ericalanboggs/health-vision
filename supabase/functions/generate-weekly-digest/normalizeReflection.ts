import { Reflection, ReflectionSignals, FrictionTheme } from './types.ts'

/**
 * Map friction keywords to content search themes
 */
const FRICTION_THEME_MAP: Record<string, { searchQuery: string; whyRelevant: string }> = {
  // Motivation & Discouragement
  'discouraged': { searchQuery: 'resilience bouncing back from setbacks psychology', whyRelevant: 'Helps rebuild momentum when motivation dips' },
  'gave up': { searchQuery: 'how to restart habits after failing', whyRelevant: 'Strategies to get back on track' },
  'stopped': { searchQuery: 'restarting habits after break motivation', whyRelevant: 'Guidance for picking back up' },
  'unmotivated': { searchQuery: 'finding motivation when you dont feel like it', whyRelevant: 'Practical tips for low-motivation days' },
  'motivation': { searchQuery: 'intrinsic motivation building lasting habits', whyRelevant: 'Building sustainable drive' },
  'hard': { searchQuery: 'making habits easier habit stacking', whyRelevant: 'Techniques to reduce friction' },
  'difficult': { searchQuery: 'overcoming habit challenges psychology', whyRelevant: 'Strategies for difficult habits' },

  // Time & Schedule
  'busy': { searchQuery: 'micro habits for busy people time management', whyRelevant: 'Fits habits into packed schedules' },
  'time': { searchQuery: 'quick habits 5 minutes or less', whyRelevant: 'Short but effective practices' },
  'schedule': { searchQuery: 'habit scheduling time blocking productivity', whyRelevant: 'Better time management strategies' },
  'forgot': { searchQuery: 'habit reminders never forget habits', whyRelevant: 'Systems to remember your habits' },

  // Energy & Fatigue
  'tired': { searchQuery: 'habits when exhausted low energy routines', whyRelevant: 'Adapting habits for low-energy days' },
  'exhausted': { searchQuery: 'self care when burnt out recovery', whyRelevant: 'Gentle approaches during fatigue' },
  'energy': { searchQuery: 'boosting energy naturally daily habits', whyRelevant: 'Building sustainable energy' },
  'sleep': { searchQuery: 'better sleep habits sleep hygiene', whyRelevant: 'Improving rest and recovery' },

  // Stress & Overwhelm
  'stress': { searchQuery: 'stress management simple techniques', whyRelevant: 'Managing stress effectively' },
  'overwhelm': { searchQuery: 'feeling overwhelmed simplify habits', whyRelevant: 'Reducing overwhelm with simple steps' },
  'anxiety': { searchQuery: 'calming anxiety daily practices mindfulness', whyRelevant: 'Techniques for anxious moments' },

  // Consistency & Streaks
  'inconsistent': { searchQuery: 'building consistency habits psychology', whyRelevant: 'Developing reliable routines' },
  'streak': { searchQuery: 'habit streaks dont break the chain', whyRelevant: 'Maintaining momentum' },
  'skip': { searchQuery: 'recovering from missed habits', whyRelevant: 'Bouncing back from skipped days' },
  'missed': { searchQuery: 'what to do when you miss a habit', whyRelevant: 'Getting back on track' },

  // Mindset
  'perfecti': { searchQuery: 'overcoming perfectionism good enough habits', whyRelevant: 'Letting go of perfect' },
  'fail': { searchQuery: 'learning from habit failures growth mindset', whyRelevant: 'Reframing setbacks as learning' },
  'guilt': { searchQuery: 'self compassion habits without guilt', whyRelevant: 'Being kinder to yourself' },
}

/**
 * Extract friction themes from reflection text
 */
function extractFrictionThemes(frictionText: string): FrictionTheme[] {
  const themes: FrictionTheme[] = []
  const lowerFriction = frictionText.toLowerCase()
  const addedThemes = new Set<string>()

  for (const [keyword, config] of Object.entries(FRICTION_THEME_MAP)) {
    if (lowerFriction.includes(keyword) && !addedThemes.has(config.searchQuery)) {
      themes.push({
        theme: keyword,
        searchQuery: config.searchQuery,
        whyRelevant: config.whyRelevant,
      })
      addedThemes.add(config.searchQuery)
    }
  }

  // Limit to top 3 most relevant themes
  return themes.slice(0, 3)
}

/**
 * Normalize reflection data into structured signals
 * Handles evolving reflection schemas by extracting key patterns
 */
export function normalizeReflection(reflection: Reflection | null): ReflectionSignals | null {
  if (!reflection) {
    return null
  }

  const signals: ReflectionSignals = {
    worked_well: [],
    wins: [],
    blockers: [],
    felt_hard_because: [],
    habit_specific_notes: [],
    mood_energy_signal: 'unknown',
    time_constraint_signal: 'unknown',
    freeform_summary: '',
    friction_themes: [],
  }

  // Extract what went well
  if (reflection.went_well) {
    const wentWell = reflection.went_well.trim()
    if (wentWell) {
      signals.worked_well.push(wentWell)
      signals.wins.push(wentWell)
      signals.freeform_summary += `What worked: ${wentWell}. `
    }
  }

  // Extract friction/blockers
  if (reflection.friction) {
    const friction = reflection.friction.trim()
    if (friction) {
      signals.blockers.push(friction)
      signals.felt_hard_because.push(friction)
      signals.freeform_summary += `Challenges: ${friction}. `

      // Heuristic: detect energy/time signals
      const lowerFriction = friction.toLowerCase()
      if (lowerFriction.includes('tired') || lowerFriction.includes('energy') || lowerFriction.includes('exhausted')) {
        signals.mood_energy_signal = 'low'
      }
      if (lowerFriction.includes('time') || lowerFriction.includes('busy') || lowerFriction.includes('schedule')) {
        signals.time_constraint_signal = 'high'
      }

      // Extract friction themes for content recommendations
      signals.friction_themes = extractFrictionThemes(friction)
      console.log(`Extracted ${signals.friction_themes.length} friction themes:`, signals.friction_themes.map(t => t.theme))
    }
  }

  // Extract adjustment insights
  if (reflection.adjustment) {
    const adjustment = reflection.adjustment.trim()
    if (adjustment) {
      signals.freeform_summary += `Plan: ${adjustment}. `
    }
  }

  // Extract app feedback
  if (reflection.app_feedback) {
    const feedback = reflection.app_feedback.trim()
    if (feedback) {
      signals.freeform_summary += `Feedback: ${feedback}. `
    }
  }

  console.log(`Normalized reflection signals:`, signals)
  return signals
}
