// Type definitions for Weekly Digest system

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  timezone: string
  pilot_start_date: string
}

export interface VisionData {
  visionStatement?: string
  whyMatters?: string
  feelingState?: string
  futureAbilities?: string
}

export interface Habit {
  id: string
  user_id: string
  habit_name: string
  day_of_week: number
  time_of_day: string
  week_number: number
  created_at: string
}

export interface Reflection {
  id: string
  user_id: string
  week_number: number
  went_well: string
  friction: string
  adjustment: string
  app_feedback?: string
  created_at: string
}

export interface ReflectionSignals {
  worked_well: string[]
  wins: string[]
  blockers: string[]
  felt_hard_because: string[]
  habit_specific_notes: string[]
  mood_energy_signal: 'low' | 'medium' | 'high' | 'unknown'
  time_constraint_signal: 'low' | 'medium' | 'high' | 'unknown'
  freeform_summary: string
}

export interface UserContext {
  user_id: string
  user_name: string
  email: string
  timezone: string
  vision: VisionData | null
  habits: Habit[]
  reflection: Reflection | null
  reflection_signals: ReflectionSignals | null
  week_number: number
}

export interface Strategy {
  blocker: string
  strategy: string
}

export interface WeeklyFocus {
  theme: string
  patterns_to_reinforce: string[]
  top_blockers: string[]
  strategies: Strategy[]
  potential_challenges_narrative?: string
}

export interface ContentRecommendation {
  type: 'article' | 'podcast' | 'youtube'
  title: string
  url: string
  brief_description: string
  why_this_for_you: string
  duration_minutes?: number
  source?: string
  thumbnail_url?: string
}

export interface DigestOutput {
  user_id: string
  week_number: number
  subject: string
  weekly_focus: WeeklyFocus
  recommendations: ContentRecommendation[]
  email_markdown: string
  metadata: {
    generated_at: string
    reflection_available: boolean
    habits_count: number
    content_sources_used: string[]
  }
}

export interface WeeklyDigest {
  id: string
  user_id: string
  week_number: number
  subject: string
  weekly_focus: WeeklyFocus
  strategies: Strategy[]
  recommendations: ContentRecommendation[]
  email_markdown: string
  email_html?: string
  reviewed_by?: string
  reviewed_at?: string
  sent_at?: string
  status: 'draft' | 'reviewed' | 'sent'
  generated_at: string
  created_at: string
  updated_at: string
}
