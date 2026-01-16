import { Reflection, ReflectionSignals } from './types.ts'

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
