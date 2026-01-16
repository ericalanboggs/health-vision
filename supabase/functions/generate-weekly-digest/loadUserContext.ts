import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { UserContext, Profile, Habit, Reflection, VisionData } from './types.ts'

/**
 * Load complete user context for digest generation
 */
export async function loadUserContext(
  supabase: SupabaseClient,
  userId: string,
  weekNumber: number
): Promise<UserContext> {
  console.log(`Loading context for user ${userId}, week ${weekNumber}`)

  // Load profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  // Load vision data
  const { data: journey, error: journeyError } = await supabase
    .from('health_journeys')
    .select('form_data')
    .eq('user_id', userId)
    .maybeSingle()

  if (journeyError && journeyError.code !== 'PGRST116') {
    console.error('Error loading journey:', journeyError)
  }

  const visionData: VisionData | null = journey?.form_data || null

  // Load active habits for current week
  const { data: habits, error: habitsError } = await supabase
    .from('weekly_habits')
    .select('*')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .order('created_at', { ascending: true })

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`)
  }

  // Load reflection for previous week (if available)
  const previousWeek = weekNumber - 1
  const { data: reflection, error: reflectionError } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('week_number', previousWeek)
    .maybeSingle()

  if (reflectionError && reflectionError.code !== 'PGRST116') {
    console.error('Error loading reflection:', reflectionError)
  }

  const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'there'

  console.log(`Context loaded: ${habits?.length || 0} habits, vision: ${!!visionData}, reflection: ${!!reflection}`)

  return {
    user_id: userId,
    user_name: userName,
    email: profile.email,
    timezone: profile.timezone || 'America/Chicago',
    sex: profile.sex || null,
    vision: visionData,
    habits: habits || [],
    reflection: reflection || null,
    reflection_signals: null, // Will be populated by normalizeReflection
    week_number: weekNumber,
  }
}
