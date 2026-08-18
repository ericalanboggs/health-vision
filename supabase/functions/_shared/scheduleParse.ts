/**
 * Deterministic natural-language schedule parsing for SMS habit management.
 * day_of_week uses 0=Sun … 6=Sat, matching weekly_habits.day_of_week.
 *
 * The LLM extracts a rough days/time phrase; these functions turn it into trusted,
 * normalized values (or null), so the confirmation + DB writes never rely on the model
 * to format a time or a day set correctly.
 */

const DAY_TOKENS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

export const WEEKDAYS = [1, 2, 3, 4, 5]
export const WEEKENDS = [0, 6]
export const EVERYDAY = [0, 1, 2, 3, 4, 5, 6]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Parse a days spec into sorted, deduped day_of_week numbers (0-6), or null if nothing parses.
 * Accepts an array of tokens (["mon","wed"]) or a free phrase ("weekdays", "mon/wed/fri",
 * "every day", "tuesday and thursday", "weekends").
 */
export function parseDays(input: string | string[] | null | undefined): number[] | null {
  if (input == null) return null
  const text = (Array.isArray(input) ? input.join(' ') : String(input)).toLowerCase()
  if (!text.trim()) return null

  if (/\b(every ?day|daily|each day|all week|7 days)\b/.test(text)) return [...EVERYDAY]
  if (/\bweek ?days?\b|\bwork ?days?\b/.test(text)) return [...WEEKDAYS]
  if (/\bweek ?ends?\b/.test(text)) return [...WEEKENDS]

  const found = new Set<number>()
  for (const w of text.split(/[^a-z]+/).filter(Boolean)) {
    if (w in DAY_TOKENS) found.add(DAY_TOKENS[w])
  }
  if (found.size === 0) return null
  return [...found].sort((a, b) => a - b)
}

/**
 * Parse a time-of-day spec into "HH:MM:SS" (24h), or null. Handles "9am", "9:30 pm",
 * "noon", "midnight", "17:00", bare "9" (assumes the literal hour; am unless 24h form).
 */
export function parseTime(input: string | null | undefined): string | null {
  if (input == null) return null
  const text = String(input).toLowerCase().trim()
  if (!text) return null
  if (/\bnoon\b/.test(text)) return '12:00:00'
  if (/\bmidnight\b/.test(text)) return '00:00:00'

  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const mer = m[3]
  if (hour > 23 || min > 59) return null
  if (mer === 'pm' && hour < 12) hour += 12
  else if (mer === 'am' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
}

/** "09:00:00" -> "9am" / "9:30pm" for confirmation copy. */
export function formatTime(hms: string | null | undefined): string {
  if (!hms) return ''
  const [h, m] = hms.split(':').map((n) => parseInt(n, 10))
  const mer = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${mer}` : `${h12}:${String(m).padStart(2, '0')}${mer}`
}

/** [1,2,3,4,5] -> "weekdays"; [0,6] -> "weekends"; [0..6] -> "every day"; else "Mon/Wed/Fri". */
export function formatDays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return ''
  const s = [...new Set(days)].sort((a, b) => a - b)
  if (s.length === 7) return 'every day'
  if (s.join(',') === '1,2,3,4,5') return 'weekdays'
  if (s.join(',') === '0,6') return 'weekends'
  return s.map((d) => DAY_NAMES[d]).join('/')
}
