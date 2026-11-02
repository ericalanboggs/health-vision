import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

/**
 * Shared helpers to refresh the habit list in a weekly digest at send time.
 *
 * `generate-all-weekly-digests` bakes the habit list into `weekly_digests.email_markdown`
 * at generation time and skips users who already have a row for the week, so a habit
 * archived between generation and the Monday send will still appear in the email.
 * These helpers rebuild the habit section from the current active habits just before
 * the email goes out — the AI-generated focus / insights / recommendations stay as is.
 */

export interface ConsolidatedHabit {
  habitName: string
  days: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function consolidate(rows: Array<{ habit_name: string; day_of_week: number }>): ConsolidatedHabit[] {
  const habitMap = new Map<string, number[]>()
  for (const row of rows) {
    if (!habitMap.has(row.habit_name)) habitMap.set(row.habit_name, [])
    habitMap.get(row.habit_name)!.push(row.day_of_week)
  }

  const result: ConsolidatedHabit[] = []
  habitMap.forEach((days, habitName) => {
    days.sort((a, b) => a - b)
    let daysString: string
    if (days.length === 1) {
      daysString = DAY_NAMES[days[0]] ?? 'Unknown'
    } else if (days.length === 7) {
      daysString = 'Daily'
    } else {
      daysString = days.map(d => DAY_ABBREV[d] ?? 'Unknown').join('/')
    }
    result.push({ habitName, days: daysString })
  })
  return result
}

export async function getActiveHabitsConsolidated(
  supabase: SupabaseClient,
  userId: string
): Promise<ConsolidatedHabit[] | null> {
  const { data, error } = await supabase
    .from('weekly_habits')
    .select('habit_name, day_of_week')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[digestHabits] Failed to load active habits:', error)
    return null
  }
  return consolidate(data || [])
}

export async function getActiveHabitsByUser(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ConsolidatedHabit[]>> {
  const out = new Map<string, ConsolidatedHabit[]>()
  if (userIds.length === 0) return out

  const { data, error } = await supabase
    .from('weekly_habits')
    .select('user_id, habit_name, day_of_week')
    .in('user_id', userIds)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[digestHabits] Failed to load active habits for batch:', error)
    // Return empty map; callers skip patching for users not present in the map.
    return out
  }

  const grouped = new Map<string, Array<{ habit_name: string; day_of_week: number }>>()
  for (const row of data || []) {
    if (!grouped.has(row.user_id)) grouped.set(row.user_id, [])
    grouped.get(row.user_id)!.push({ habit_name: row.habit_name, day_of_week: row.day_of_week })
  }
  for (const [uid, rows] of grouped) {
    out.set(uid, consolidate(rows))
  }
  // Ensure every requested user has an entry (empty = genuinely zero active habits)
  for (const uid of userIds) {
    if (!out.has(uid)) out.set(uid, [])
  }
  return out
}

/**
 * A bullet line that looks like a habit entry: "- Habit name (day pattern)".
 * The parenthetical must mention Daily or a day name/abbreviation. The outer
 * `.+?` is lazy so a habit name containing its own parens (e.g. "Track workouts
 * (2x a day) (Daily)") still matches on the trailing day block.
 */
const HABIT_BULLET_RE =
  /^-\s.+?\([^)]*(?:Daily|Sun|Mon|Tue|Wed|Thu|Fri|Sat)[^)]*\)\s*$/i

/**
 * Replace the first contiguous run of habit-like bullet lines in `markdown`
 * with a fresh list built from `consolidated`. Leaves the markdown untouched
 * if no such block is found (e.g. the AI refiner mangled the format).
 */
export function patchHabitListInMarkdown(
  markdown: string,
  consolidated: ConsolidatedHabit[]
): string {
  const lines = markdown.split('\n')

  let firstIdx = -1
  let lastIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (HABIT_BULLET_RE.test(lines[i])) {
      if (firstIdx === -1) firstIdx = i
      lastIdx = i
    } else if (firstIdx !== -1) {
      break
    }
  }

  if (firstIdx === -1) return markdown

  const newBullets = consolidated.length > 0
    ? consolidated.map(({ habitName, days }) => `- ${habitName} (${days})`)
    : [`- No active habits this week — [add some in Summit](https://go.summithealth.app).`]

  return [...lines.slice(0, firstIdx), ...newBullets, ...lines.slice(lastIdx + 1)].join('\n')
}
