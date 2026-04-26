import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'https://esm.sh/pdf-lib@1.17.1'
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1'

type PDFColor = ReturnType<typeof rgb>

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Summit <hello@summithealth.app>'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://go.summithealth.app'

const CHALLENGES: Record<string, { title: string; focusAreas: { week: number; title: string; slug: string }[] }> = {
  'stress-free': {
    title: 'Stress Free Summiters',
    focusAreas: [
      { slug: 'breathing', week: 1, title: 'Breathwork' },
      { slug: 'movement-calm', week: 2, title: 'Movement for Calm' },
      { slug: 'digital-boundaries', week: 3, title: 'Digital Boundaries' },
      { slug: 'recovery-rituals', week: 4, title: 'Recovery Rituals' },
    ],
  },
  'healthy-hearts': {
    title: 'Healthy Hearts',
    focusAreas: [
      { slug: 'daily-movement', week: 1, title: 'Daily Movement' },
      { slug: 'heart-healthy-eating', week: 2, title: 'Heart-Healthy Eating' },
      { slug: 'bp-awareness', week: 3, title: 'Blood Pressure Awareness' },
      { slug: 'cardio-building', week: 4, title: 'Cardio Building' },
    ],
  },
  'sound-sleepers': {
    title: 'Sound Sleepers',
    focusAreas: [
      { slug: 'sleep-hygiene', week: 1, title: 'Sleep Hygiene' },
      { slug: 'wind-down', week: 2, title: 'Wind-Down Routine' },
      { slug: 'light-temperature', week: 3, title: 'Light & Temperature' },
      { slug: 'sleep-consistency', week: 4, title: 'Consistency' },
    ],
  },
  'energy-masters': {
    title: 'Energy Masters',
    focusAreas: [
      { slug: 'morning-activation', week: 1, title: 'Morning Activation' },
      { slug: 'nutrition-timing', week: 2, title: 'Nutrition Timing' },
      { slug: 'afternoon-reset', week: 3, title: 'Afternoon Reset' },
      { slug: 'movement-breaks', week: 4, title: 'Movement Breaks' },
    ],
  },
  'gut-health': {
    title: 'Gut Health Reset',
    focusAreas: [
      { slug: 'fiber-foundation', week: 1, title: 'Fiber Foundation' },
      { slug: 'fermented-foods', week: 2, title: 'Fermented Foods' },
      { slug: 'hydration-gut', week: 3, title: 'Hydration' },
      { slug: 'mindful-eating', week: 4, title: 'Mindful Eating' },
    ],
  },
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Colors from Claude Design bundle (summit-tracker/project/trackers/styles.css)
const FOREST = rgb(2 / 255, 44 / 255, 34 / 255)        // #022C22
const MOSS = rgb(5 / 255, 150 / 255, 105 / 255)        // #059669
const EMERALD = rgb(16 / 255, 185 / 255, 129 / 255)    // #10B981
const SAGE = rgb(209 / 255, 250 / 255, 229 / 255)      // #D1FAE5 / emerald-100
const GRAY_200 = rgb(229 / 255, 231 / 255, 235 / 255)  // #E5E7EB
const GRAY_300 = rgb(209 / 255, 213 / 255, 219 / 255)  // #D1D5DB
const GRAY_400 = rgb(156 / 255, 163 / 255, 175 / 255)  // #9CA3AF
const GRAY_500 = rgb(107 / 255, 114 / 255, 128 / 255)  // #6B7280
const WHITE = rgb(1, 1, 1)

// Inter TTF URLs via jsdelivr (expo-google-fonts ships clean TTFs; fontsource only ships woff2
// which pdf-lib/fontkit can't decode without brotli).
const INTER_URLS = {
  regular: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_400Regular.ttf',
  semibold: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_600SemiBold.ttf',
  bold: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_700Bold.ttf',
}

interface InterBytes { regular: Uint8Array; semibold: Uint8Array; bold: Uint8Array }
let _fontCache: InterBytes | null = null

async function loadInterFonts(): Promise<InterBytes> {
  if (_fontCache) return _fontCache
  const fetchTTF = async (url: string): Promise<Uint8Array> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Font fetch failed: ${url} (HTTP ${res.status})`)
    return new Uint8Array(await res.arrayBuffer())
  }
  const [regular, semibold, bold] = await Promise.all([
    fetchTTF(INTER_URLS.regular),
    fetchTTF(INTER_URLS.semibold),
    fetchTTF(INTER_URLS.bold),
  ])
  _fontCache = { regular, semibold, bold }
  return _fontCache
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface HabitRow {
  name: string
  sub: string | null
  days: Set<number>
  trackingType: string | null
  metricUnit: string | null
  metricTarget: number | null
}

interface ChallengeContext {
  title: string
  week: number
  focusAreaTitle: string | null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const { userId: inputUserId, email: inputEmail, weekStart: weekStartInput } = body

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let userId = inputUserId
    if (!userId && inputEmail) {
      const { data } = await supabase.from('profiles').select('id').eq('email', inputEmail).maybeSingle()
      userId = data?.id
    }
    if (!userId) throw new Error('userId or email required')

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, email, timezone')
      .eq('id', userId)
      .maybeSingle()
    if (!profile?.email) throw new Error(`No email for user ${userId}`)
    const tz = profile.timezone || 'America/Chicago'

    const weekStart = weekStartInput
      ? new Date(weekStartInput + 'T12:00:00')
      : computeThisMonday(tz)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const { data: vision } = await supabase
      .from('health_journeys')
      .select('form_data')
      .eq('user_id', userId)
      .maybeSingle()
    const visionStatement: string | null =
      (vision?.form_data as { visionStatement?: string } | null)?.visionStatement || null

    const { data: habits } = await supabase
      .from('weekly_habits')
      .select('habit_name, day_of_week, reminder_time, time_of_day')
      .eq('user_id', userId)
      .is('archived_at', null)

    const { data: configs } = await supabase
      .from('habit_tracking_config')
      .select('habit_name, tracking_type, metric_unit, metric_target')
      .eq('user_id', userId)

    const { data: challenge } = await supabase
      .from('challenge_enrollments')
      .select('challenge_slug, current_week')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const habitMap = new Map<string, HabitRow & { _reminderTime: string | null; _timeOfDay: string | null }>()
    for (const h of habits || []) {
      if (!habitMap.has(h.habit_name)) {
        const cfg = (configs || []).find((c: any) => c.habit_name === h.habit_name)
        habitMap.set(h.habit_name, {
          name: h.habit_name,
          sub: null,
          days: new Set(),
          trackingType: cfg?.tracking_type || null,
          metricUnit: cfg?.metric_unit || null,
          metricTarget: cfg?.metric_target || null,
          _reminderTime: h.reminder_time || null,
          _timeOfDay: h.time_of_day || null,
        })
      }
      habitMap.get(h.habit_name)!.days.add(h.day_of_week)
    }
    const habitList: HabitRow[] = Array.from(habitMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(h => ({
        name: h.name,
        sub: buildHabitSub(h as any),
        days: h.days,
        trackingType: h.trackingType,
        metricUnit: h.metricUnit,
        metricTarget: h.metricTarget,
      }))

    let challengeContext: ChallengeContext | null = null
    if (challenge?.challenge_slug) {
      const cfg = CHALLENGES[challenge.challenge_slug]
      if (cfg) {
        const fa = cfg.focusAreas.find(f => f.week === challenge.current_week)
        challengeContext = {
          title: cfg.title,
          week: challenge.current_week,
          focusAreaTitle: fa?.title || null,
        }
      }
    }

    const shortCode = generateShortCode(userId, weekStart)

    const pdfBytes = await generatePDF({
      visionStatement,
      weekStart,
      weekEnd,
      habits: habitList,
      challengeContext,
      shortCode,
    })

    const weekLabel = formatWeekLabelShort(weekStart, weekEnd)
    const pdfBase64 = bytesToBase64(pdfBytes)
    const emailResult = await sendEmailWithAttachment({
      to: profile.email,
      subject: `Your week ahead — ${weekLabel}`,
      html: buildEmailHtml(profile.first_name || 'there', weekLabel, shortCode),
      attachment: {
        filename: `summit-tracker-${weekStart.toISOString().split('T')[0]}.pdf`,
        content: pdfBase64,
      },
    })

    if (!emailResult.success) throw new Error(`Email failed: ${emailResult.error}`)

    return json({
      success: true,
      emailId: emailResult.id,
      weekStart: weekStart.toISOString().split('T')[0],
      shortCode,
      habitCount: habitList.length,
      pdfSizeBytes: pdfBytes.byteLength,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-weekly-tracker error:', msg)
    return json({ success: false, error: msg }, 500)
  }
})

function buildHabitSub(h: {
  trackingType: string | null
  metricUnit: string | null
  metricTarget: number | null
  _reminderTime: string | null
  _timeOfDay: string | null
}): string | null {
  const parts: string[] = []
  if (h.trackingType === 'metric' && h.metricUnit) {
    parts.push(h.metricTarget ? `Aim for ${h.metricTarget} ${h.metricUnit}` : `Tracks ${h.metricUnit}`)
  }
  if (h._timeOfDay) parts.push(h._timeOfDay)
  return parts.length ? parts.join(' · ') : null
}

function computeThisMonday(tz: string): Date {
  const now = new Date()
  const localStr = now.toLocaleDateString('en-CA', { timeZone: tz })
  const localDate = new Date(localStr + 'T12:00:00')
  const dow = localDate.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() + offset)
  return monday
}

function formatWeekLabelShort(start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const sM = months[start.getMonth()]
  const eM = months[end.getMonth()]
  return sM === eM
    ? `${sM} ${start.getDate()}–${end.getDate()}`
    : `${sM} ${start.getDate()} – ${eM} ${end.getDate()}`
}

function formatWeekLabelLong(start: Date, end: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const sM = months[start.getMonth()]
  const eM = months[end.getMonth()]
  const year = end.getFullYear()
  if (sM === eM) return `${sM} ${start.getDate()} — ${end.getDate()}, ${year}`
  return `${sM.slice(0, 3)} ${start.getDate()} — ${eM.slice(0, 3)} ${end.getDate()}, ${year}`
}

function generateShortCode(userId: string, weekStart: Date): string {
  const src = `${userId}:${weekStart.toISOString().split('T')[0]}`
  let hash = 0
  for (let i = 0; i < src.length; i++) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0')
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

async function generatePDF(data: {
  visionStatement: string | null
  weekStart: Date
  weekEnd: Date
  habits: HabitRow[]
  challengeContext: ChallengeContext | null
  shortCode: string
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit as any)
  const inter = await loadInterFonts()
  const [interRegular, interSemibold, interBold, timesBold] = await Promise.all([
    pdf.embedFont(inter.regular),
    pdf.embedFont(inter.semibold),
    pdf.embedFont(inter.bold),
    pdf.embedFont(StandardFonts.TimesRomanBold),
  ])

  const page = pdf.addPage([612, 792])
  const LEFT = 42
  const RIGHT = 570
  const INNER = RIGHT - LEFT // 528

  // ─── Masthead (editorial) ───
  // Wordmark left — slightly letterspaced for a logo feel
  drawTrackedText(page, 'SUMMIT', {
    xLeft: LEFT, y: 740, size: 15, font: interBold, color: FOREST, trackingEm: 0.04,
  })

  // Right-aligned metadata (two stacked lines)
  const titleText = data.challengeContext
    ? `WEEK ${data.challengeContext.week} OF 4 · ${data.challengeContext.title.toUpperCase()}${
        data.challengeContext.focusAreaTitle ? ' · ' + data.challengeContext.focusAreaTitle.toUpperCase() : ''
      }`
    : 'SUMMIT TRACKER · WEEKLY'
  drawTrackedText(page, titleText, {
    xRight: RIGHT, y: 748, size: 7, font: interBold, color: MOSS, trackingEm: 0.2,
  })
  const dateLine = formatWeekLabelLong(data.weekStart, data.weekEnd)
  const dateW = interSemibold.widthOfTextAtSize(dateLine, 8.5)
  page.drawText(dateLine, {
    x: RIGHT - dateW, y: 735, size: 8.5, font: interSemibold, color: FOREST,
  })

  // Forest rule under masthead
  page.drawLine({
    start: { x: LEFT, y: 724 },
    end: { x: RIGHT, y: 724 },
    thickness: 1.5,
    color: FOREST,
  })

  // ─── Pull-quote vision ───
  let gridTop: number
  if (data.visionStatement) {
    const maxVisionW = INNER - 50
    const vision = truncateByWidth(data.visionStatement, interSemibold, 16.5, maxVisionW)
    // Big serif " glyph (Times Roman Bold, emerald)
    page.drawText('“', {
      x: LEFT, y: 676, size: 48, font: timesBold, color: EMERALD,
    })
    drawTrackedText(page, 'YOUR NORTH STAR', {
      xLeft: LEFT + 44, y: 702, size: 7.5, font: interBold, color: MOSS, trackingEm: 0.08,
    })
    page.drawText(vision, {
      x: LEFT + 44, y: 684, size: 16.5, font: interSemibold, color: FOREST,
    })
    gridTop = 656
  } else {
    gridTop = 700
  }

  // ─── Grid header ───
  const nameColEnd = LEFT + 200
  const daysStart = nameColEnd
  const dayColW = (RIGHT - daysStart) / 7
  const dayCenters = DAY_LABELS.map((_, i) => daysStart + i * dayColW + dayColW / 2)

  drawTrackedText(page, 'THE CLIMB', {
    xLeft: LEFT, y: gridTop, size: 7.5, font: interBold, color: MOSS, trackingEm: 0.08,
  })
  for (let i = 0; i < 7; i++) {
    const label = DAY_LABELS[i]
    const num = String(dayDateNum(data.weekStart, i))
    const lw = interBold.widthOfTextAtSize(label, 8)
    page.drawText(label, {
      x: dayCenters[i] - lw / 2, y: gridTop + 2, size: 8, font: interBold, color: MOSS,
    })
    const nw = interBold.widthOfTextAtSize(num, 14)
    page.drawText(num, {
      x: dayCenters[i] - nw / 2, y: gridTop - 12, size: 14, font: interBold, color: FOREST,
    })
  }
  const headerRuleY = gridTop - 18
  page.drawLine({
    start: { x: LEFT, y: headerRuleY },
    end: { x: RIGHT, y: headerRuleY },
    thickness: 1.5,
    color: FOREST,
  })

  // ─── Habit rows ───
  let rowY = headerRuleY - 6
  const NAME_COL_WIDTH = 186
  const NAME_SIZE = 11
  const NAME_LH = 14       // line-height for wrapped names
  const SUB_SIZE = 8
  const SUB_LH = 11        // gap + sub size, acts as line-height for sub
  const MIN_ROW_HEIGHT = 32
  const ROW_V_PAD = 16     // total vertical padding inside a row (top+bottom)

  if (data.habits.length === 0) {
    page.drawText('No active habits yet — add some to see them here next week.', {
      x: LEFT, y: rowY - 14, size: 10, font: interRegular, color: GRAY_500,
    })
    rowY -= 40
  } else {
    for (const habit of data.habits) {
      const nameLines = wrapText(habit.name, interSemibold, NAME_SIZE, NAME_COL_WIDTH, 2)
      const sub = habit.sub ? truncateByWidth(habit.sub, interRegular, SUB_SIZE, NAME_COL_WIDTH) : null

      // Visual text-block height: cap-height of first line + line-height for each additional line + sub
      const blockVisH = NAME_SIZE + (nameLines.length - 1) * NAME_LH + (sub ? SUB_LH : 0)
      const rowHeight = Math.max(MIN_ROW_HEIGHT, blockVisH + ROW_V_PAD)

      const rowTop = rowY
      const rowCenterY = rowTop - rowHeight / 2
      const firstLineCapTop = rowCenterY + blockVisH / 2  // top of first line's cap-height

      // Name lines
      for (let i = 0; i < nameLines.length; i++) {
        const baseline = firstLineCapTop - NAME_SIZE - i * NAME_LH
        page.drawText(nameLines[i], {
          x: LEFT, y: baseline, size: NAME_SIZE, font: interSemibold, color: FOREST,
        })
      }
      // Sub line (if any), just below last name line
      if (sub) {
        const lastNameBaseline = firstLineCapTop - NAME_SIZE - (nameLines.length - 1) * NAME_LH
        const subBaseline = lastNameBaseline - SUB_LH
        page.drawText(sub, {
          x: LEFT, y: subBaseline, size: SUB_SIZE, font: interRegular, color: GRAY_500,
        })
      }

      // Checkboxes/wells/dashes centered vertically on row center
      const cellCenterY = rowCenterY
      const hasMetric = habit.trackingType === 'metric'
      for (let d = 0; d < 7; d++) {
        const dbDay = d === 6 ? 0 : d + 1
        const isScheduled = habit.days.has(dbDay)
        const cx = dayCenters[d]

        if (!isScheduled) {
          page.drawLine({
            start: { x: cx - 4, y: cellCenterY },
            end: { x: cx + 4, y: cellCenterY },
            thickness: 0.8,
            color: GRAY_300,
          })
          continue
        }

        if (hasMetric) {
          const wellW = 42
          const wellH = 18
          page.drawRectangle({
            x: cx - wellW / 2, y: cellCenterY - wellH / 2,
            width: wellW, height: wellH,
            borderColor: GRAY_300, borderWidth: 1,
            color: WHITE,
          })
          const unit = habit.metricUnit === 'time' ? '__:__' : (habit.metricUnit || '')
          if (unit) {
            const uw = interRegular.widthOfTextAtSize(unit, 7)
            page.drawText(unit, {
              x: cx + wellW / 2 - uw - 4, y: cellCenterY - 2.5,
              size: 7, font: interRegular, color: GRAY_400,
            })
          }
        } else {
          page.drawCircle({
            x: cx, y: cellCenterY, size: 8.5,
            borderColor: MOSS, borderWidth: 1.2, color: WHITE,
          })
        }
      }

      rowY -= rowHeight
      page.drawLine({
        start: { x: LEFT, y: rowY + 2 },
        end: { x: RIGHT, y: rowY + 2 },
        thickness: 0.5,
        color: GRAY_200,
      })
    }
  }

  // ─── Two-column reflection ───
  const reflTop = Math.max(rowY - 24, 180)
  const colGap = 24
  const colW = (INNER - colGap) / 2
  const col1X = LEFT
  const col2X = LEFT + colW + colGap
  drawTrackedText(page, 'WINS THIS WEEK', {
    xLeft: col1X, y: reflTop, size: 7.5, font: interBold, color: MOSS, trackingEm: 0.08,
  })
  drawTrackedText(page, 'WHAT SURPRISED YOU', {
    xLeft: col2X, y: reflTop, size: 7.5, font: interBold, color: MOSS, trackingEm: 0.08,
  })
  const lineSpacing = 17
  for (let i = 0; i < 4; i++) {
    const ly = reflTop - 14 - lineSpacing * i
    drawDottedLine(page, col1X, col1X + colW, ly, GRAY_300)
    drawDottedLine(page, col2X, col2X + colW, ly, GRAY_300)
  }

  // ─── Footer ───
  const footY = 30
  page.drawLine({
    start: { x: LEFT, y: footY + 14 },
    end: { x: RIGHT, y: footY + 14 },
    thickness: 0.6,
    color: SAGE,
  })
  const leftFoot = `Code: ${data.shortCode}  ·  go.summithealth.app`
  page.drawText(leftFoot, {
    x: LEFT, y: footY, size: 7.5, font: interRegular, color: GRAY_500,
  })
  const rightFoot = 'one small step at a time'
  const rfW = interSemibold.widthOfTextAtSize(rightFoot, 7.5)
  page.drawText(rightFoot, {
    x: RIGHT - rfW, y: footY, size: 7.5, font: interSemibold, color: MOSS,
  })

  return await pdf.save()
}

function drawTrackedText(
  page: PDFPage,
  text: string,
  opts: {
    xLeft?: number
    xRight?: number
    y: number
    size: number
    font: PDFFont
    color: PDFColor
    trackingEm: number
  }
) {
  const tracking = opts.size * opts.trackingEm
  const chars = Array.from(text)
  const widths = chars.map(c => opts.font.widthOfTextAtSize(c, opts.size))
  const totalW = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1)
  const startX = opts.xLeft !== undefined ? opts.xLeft : (opts.xRight! - totalW)
  let x = startX
  for (let i = 0; i < chars.length; i++) {
    page.drawText(chars[i], {
      x, y: opts.y, size: opts.size, font: opts.font, color: opts.color,
    })
    x += widths[i] + tracking
  }
}

function drawDottedLine(page: PDFPage, x1: number, x2: number, y: number, color: PDFColor) {
  const gap = 3
  let x = x1
  while (x <= x2) {
    page.drawCircle({ x, y, size: 0.5, color })
    x += gap
  }
}

function truncateByWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let t = text
  while (t.length > 0 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const lines: string[] = []
  let i = 0
  while (i < words.length && lines.length < maxLines) {
    let line = ''
    // Greedily pack words into this line
    while (i < words.length) {
      const test = line ? `${line} ${words[i]}` : words[i]
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        line = test
        i++
      } else {
        break
      }
    }
    // If line is still empty, a single word is too wide — hard-place it and move on
    if (!line && i < words.length) {
      line = words[i]
      i++
    }
    // If this is the last allowed line and more words remain, truncate with ellipsis
    if (lines.length === maxLines - 1 && i < words.length) {
      const rest = ' ' + words.slice(i).join(' ')
      let combined = line + rest
      while (
        combined.length > line.length &&
        font.widthOfTextAtSize(combined + '…', size) > maxWidth
      ) {
        combined = combined.slice(0, -1)
      }
      if (font.widthOfTextAtSize(combined + '…', size) <= maxWidth) {
        lines.push(combined + '…')
      } else {
        lines.push(truncateByWidth(line, font, size, maxWidth))
      }
      return lines
    }
    lines.push(line)
  }
  return lines
}

function dayDateNum(weekStart: Date, dayOffset: number): number {
  const d = new Date(weekStart)
  d.setDate(weekStart.getDate() + dayOffset)
  return d.getDate()
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function sendEmailWithAttachment(opts: {
  to: string
  subject: string
  html: string
  attachment: { filename: string; content: string }
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        attachments: [{ filename: opts.attachment.filename, content: opts.attachment.content }],
      }),
    })
    const data = await res.json()
    if (res.ok) return { success: true, id: data.id }
    return { success: false, error: data.message || `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function buildEmailHtml(firstName: string, weekLabel: string, shortCode: string): string {
  const logoUrl = `${FRONTEND_URL}/summit-logo.png`
  const appUrl = FRONTEND_URL
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your week ahead</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 0 40px 8px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Your week ahead
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6a6a6a; letter-spacing: 0.02em;">
                ${weekLabel}
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 20px 40px 16px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Hi ${firstName},
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Your customized tracker for the week is attached. Print it out, stick it on the fridge or your desk, and mark it up with a pen as you go.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Sometimes a pen and paper beats another screen — that's the idea here. No pressure though: SMS tracking still works exactly as always. This is a companion, not a replacement.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 8px 40px 28px 40px;">
              <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Go to Summit
              </a>
            </td>
          </tr>

          <!-- Short code callout -->
          <tr>
            <td style="padding: 0 40px 28px 40px;">
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.6; text-align: center;">
                Tracker code: <strong style="color: #4a4a4a; letter-spacing: 0.04em;">${shortCode}</strong><br>
                <span style="font-size: 12px;">Keep this — you'll be able to sync your marks back soon.</span>
              </p>
            </td>
          </tr>

          <!-- Footer / Signoff -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                One small step at a time.
              </p>
              <p style="margin: 8px 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                Best,<br>
                <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
