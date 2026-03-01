import supabase from '../lib/supabase'

/**
 * Compute the effective week (1-4) from the stored week1StartDate.
 * Returns 0 if the challenge hasn't started yet (before next Monday).
 * Falls back to enrollment.current_week if no week1StartDate is stored.
 */
export const getEffectiveWeek = (enrollment) => {
  if (!enrollment) return 1
  const startDateStr = enrollment.survey_scores?.week1StartDate
  if (!startDateStr) return enrollment.current_week

  const now = new Date()
  const start = new Date(startDateStr)

  // Zero out the time portions for a clean day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  if (today < startDay) return 0

  const diffDays = Math.floor((today - startDay) / (1000 * 60 * 60 * 24))
  const week = Math.floor(diffDays / 7) + 1
  return Math.min(week, 4)
}

/**
 * Get the next Monday from today. If today is Monday, returns next Monday.
 */
const getNextMonday = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek)
  const nextMon = new Date(today)
  nextMon.setDate(today.getDate() + daysUntilMonday)
  return nextMon.toISOString().split('T')[0] // YYYY-MM-DD
}

export const getActiveEnrollment = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('challenge_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active enrollment:', error)
      return { success: false, error }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error in getActiveEnrollment:', error)
    return { success: false, error }
  }
}

export const getCompletedEnrollments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('challenge_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Error fetching completed enrollments:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getCompletedEnrollments:', error)
    return { success: false, error }
  }
}

export const startChallenge = async (userId, challengeSlug, surveyScores, focusAreaOrder) => {
  try {
    const scores = { ...surveyScores }
    if (focusAreaOrder) {
      scores.focusAreaOrder = focusAreaOrder
    }
    scores.week1StartDate = getNextMonday()

    const { data, error } = await supabase
      .from('challenge_enrollments')
      .insert({
        user_id: userId,
        challenge_slug: challengeSlug,
        survey_scores: scores,
      })
      .select()
      .single()

    if (error) {
      console.error('Error starting challenge:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in startChallenge:', error)
    return { success: false, error }
  }
}

export const advanceWeek = async (enrollmentId) => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('challenge_enrollments')
      .select('current_week, survey_scores')
      .eq('id', enrollmentId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError }
    }

    // Use effective week if available, otherwise fall back to stored value
    const effectiveWeek = getEffectiveWeek(current)
    const nextWeek = Math.max(current.current_week, effectiveWeek) + 1

    if (nextWeek > 4) {
      return { success: false, error: 'Already at week 4' }
    }

    const { data, error } = await supabase
      .from('challenge_enrollments')
      .update({ current_week: nextWeek })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) {
      console.error('Error advancing week:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in advanceWeek:', error)
    return { success: false, error }
  }
}

export const completeChallenge = async (enrollmentId, finalReflection) => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('challenge_enrollments')
      .select('survey_scores')
      .eq('id', enrollmentId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError }
    }

    const updatedScores = {
      ...current.survey_scores,
      final_reflection: finalReflection,
    }

    const { data, error } = await supabase
      .from('challenge_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        survey_scores: updatedScores,
      })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) {
      console.error('Error completing challenge:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in completeChallenge:', error)
    return { success: false, error }
  }
}

export const abandonChallenge = async (enrollmentId) => {
  try {
    const { data, error } = await supabase
      .from('challenge_enrollments')
      .update({ status: 'abandoned' })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) {
      console.error('Error abandoning challenge:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in abandonChallenge:', error)
    return { success: false, error }
  }
}

export const cancelChallenge = async (userId, enrollmentId, challengeSlug) => {
  try {
    // Abandon the enrollment
    const { error: abandonError } = await supabase
      .from('challenge_enrollments')
      .update({ status: 'abandoned' })
      .eq('id', enrollmentId)

    if (abandonError) {
      console.error('Error abandoning enrollment:', abandonError)
      return { success: false, error: abandonError }
    }

    // Remove associated habits from weekly_habits
    await supabase
      .from('weekly_habits')
      .delete()
      .eq('user_id', userId)
      .eq('challenge_slug', challengeSlug)

    // Remove associated tracking configs
    await supabase
      .from('habit_tracking_config')
      .delete()
      .eq('user_id', userId)
      .eq('challenge_slug', challengeSlug)

    return { success: true }
  } catch (error) {
    console.error('Error in cancelChallenge:', error)
    return { success: false, error }
  }
}

export const logChallengeHabit = async (enrollmentId, weekNumber, focusAreaSlug, habitName) => {
  try {
    const { data, error } = await supabase
      .from('challenge_habit_log')
      .insert({
        enrollment_id: enrollmentId,
        week_number: weekNumber,
        focus_area_slug: focusAreaSlug,
        habit_name: habitName,
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging challenge habit:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in logChallengeHabit:', error)
    return { success: false, error }
  }
}

export const getChallengeHabitLog = async (enrollmentId) => {
  try {
    const { data, error } = await supabase
      .from('challenge_habit_log')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('week_number', { ascending: true })

    if (error) {
      console.error('Error fetching challenge habit log:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getChallengeHabitLog:', error)
    return { success: false, error }
  }
}

export const getPersonalHabitCount = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('weekly_habits')
      .select('habit_name')
      .eq('user_id', userId)
      .is('challenge_slug', null)

    if (error) {
      console.error('Error fetching personal habit count:', error)
      return { success: false, count: 0 }
    }

    const uniqueNames = new Set(data.map(h => h.habit_name))
    return { success: true, count: uniqueNames.size }
  } catch (error) {
    console.error('Error in getPersonalHabitCount:', error)
    return { success: false, count: 0 }
  }
}
