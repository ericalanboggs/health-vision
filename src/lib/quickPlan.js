// Pre-auth quiz (/plan) support.
//
// The quiz runs before there's an account, so nothing here touches the database.
// Answers live in localStorage until ProfileSetup flushes them into the journey
// row, mirroring how acquisition source is stashed and claimed (src/lib/acquisition.js).
//
// Deliberately no email/phone field anywhere in this flow — see
// marketing/STRATEGIC_DIRECTION.md §4.2. This is the localStorage-only v0.

const STASH_KEY = 'summit_quick_plan_v1'

// The routing question. Lives here rather than in QuickStartVision's shared set
// because it only belongs to this shortened plan — the ten-question onboarding
// flow already knows the segment from acquisition_source and shouldn't grow an
// eleventh question.
//
// `value` deliberately reuses the acquisition-source slugs from
// src/data/onboardingSegments.js so a self-reported answer and a tagged landing
// page speak the same vocabulary. Note the slug is `lifestyle-changes` even
// though the marketing page moved to /use-cases/warning-signs — the segment key
// did not change with it.
const LIFE_CONTEXT_QUESTION = {
  field: 'lifeContext',
  question: 'What made you think about your health today?',
  subtitle: 'Something usually does. Pick the closest.',
  type: 'single-select-chip',
  otherValue: 'other',
  otherField: 'lifeContextNote',
  options: [
    { value: 'lifestyle-changes', icon: 'monitor_heart', label: 'My numbers came back off' },
    { value: 'postpartum', icon: 'child_friendly', label: "New baby, and I'm last on the list" },
    { value: 'burnout', icon: 'battery_alert', label: 'Work is grinding me down' },
    { value: 'other', icon: 'more_horiz', label: 'Something else' },
  ],
}

// Barriers, reworded. Same field, same stored values, options written the way a
// person would say them rather than as category labels — the lesson the site
// audit drew from watching how consumer quizzes phrase their choices.
//
// `value` is the stable key. It is what lands in the database and what
// resolvePersona and the AI habit prompts match on, so the labels above it can
// be rewritten freely. Do not change a value to fix wording.
//
// "Execution" is new. Nothing in the old set covered "I know what to do, I just
// don't do it", which is the single most common version of this problem and the
// one Summit exists for.
const BARRIERS_QUESTION = {
  field: 'barriers',
  question: "What's getting in the way?",
  subtitle: 'Pick as many as are true.',
  type: 'multi-select-array',
  hasOther: true,
  options: [
    { value: 'Execution', icon: 'repeat', label: "I know what to do, I just don't do it" },
    { value: 'Time', icon: 'schedule', label: "My life doesn't leave much room for this" },
    { value: 'Energy', icon: 'bolt', label: "I'm running on empty" },
    { value: 'Stress', icon: 'waves', label: "There's too much going on" },
    { value: 'Motivation', icon: 'local_fire_department', label: 'I start strong and fall off' },
    { value: 'Clarity', icon: 'lightbulb', label: "I don't know where to start" },
    { value: 'Knowledge', icon: 'school', label: 'I get conflicting advice' },
    { value: 'Support', icon: 'groups', label: "I'm doing this on my own" },
    { value: 'Environment', icon: 'home', label: 'My surroundings work against me' },
  ],
}

// Optional, and last. The option sets cannot anticipate everything, and this is
// the only place someone can say something in their own words. Skippable by
// design — `long-text` always satisfies hasSelection, so nobody is made to type.
const OPEN_QUESTION = {
  field: 'meaningfulMoment',
  question: 'A year from now, what would you want to be able to say about yourself?',
  subtitle: 'No right answer. Skip it if nothing comes to mind.',
  type: 'long-text',
  placeholder: 'In your own words…',
}

// Eight screens: seven questions plus one optional free-text at the end.
//
// `field` names match a question in QuickStartVision's shared set unless the
// entry carries its own `question`. `prompt` and `subtitle` reword a shared
// question for this plan only, so the authenticated /vision flow is untouched.
// `section` relabels the progress chip.
//
// The arc is deliberate: why now, where you are headed, where you are now,
// what's in the way. Capacity sits fifth rather than ninth (where it lives in the
// full flow) because it is the question that keeps the whole thing honest and
// cold traffic never reaches question nine.
export const QUICK_PLAN_QUESTIONS = [
  // The trigger comes first. People do not decide to change their health
  // intellectually — something happens, and naming that on screen one is both the
  // most engaging question and the one that routes everything downstream.
  { field: 'lifeContext', section: 'Why now', question: LIFE_CONTEXT_QUESTION },
  {
    field: 'visionStatement',
    section: 'Where you are headed',
    prompt: "Six months from now, what's actually different?",
    subtitle: 'Not the numbers. The day-to-day.',
  },
  {
    field: 'whyMatters',
    section: 'Where you are headed',
    prompt: 'And why does that matter?',
    subtitle: "This is the part that holds when motivation doesn't.",
  },
  {
    field: 'currentScore',
    section: 'Where you are now',
    prompt: 'Where are you starting from?',
    subtitle: 'Honest, not generous.',
  },
  {
    field: 'timeCapacity',
    section: 'Where you are now',
    prompt: 'How much time can you actually give this?',
    subtitle: 'The real number, not the aspirational one.',
  },
  { field: 'barriers', section: "What's in the way", question: BARRIERS_QUESTION },
  {
    field: 'habitsToImprove',
    section: "What's in the way",
    prompt: "What's worth working on?",
    subtitle: "Select what's true. We'll narrow it later.",
  },
  { field: 'meaningfulMoment', section: 'One more thing', question: OPEN_QUESTION },
]

// Someone who arrived from a persona page already answered the segment question
// by clicking, so asking it again reads as not paying attention. Drop it when a
// recognized ?source= tag is present. resolvePersona prefers the tag over the
// stated answer anyway, so nothing downstream changes.
//
// An unrecognized tag (a UTM campaign, say) is not a segment, so the question
// stays — that visitor genuinely hasn't told us anything.
export const questionsForSource = (acquisitionSource) => {
  const known = ['burnout', 'postpartum', 'lifestyle-changes']
  if (!acquisitionSource || !known.includes(acquisitionSource)) {
    return QUICK_PLAN_QUESTIONS
  }
  return QUICK_PLAN_QUESTIONS.filter(q => q.field !== 'lifeContext')
}

export const saveQuickPlan = (formData) => {
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify({ savedAt: Date.now(), formData }))
  } catch {
    // Private browsing / quota. The quiz still works, it just won't survive a reload.
  }
}

export const loadQuickPlan = () => {
  try {
    const raw = localStorage.getItem(STASH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Stale answers shouldn't silently prefill a journey weeks later.
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    if (!parsed?.formData || Date.now() - (parsed.savedAt || 0) > THIRTY_DAYS) {
      clearQuickPlan()
      return null
    }
    return parsed.formData
  } catch {
    return null
  }
}

export const clearQuickPlan = () => {
  try {
    localStorage.removeItem(STASH_KEY)
  } catch {
    // ignore
  }
}

// Which founder video plays on the payoff screen. Derived from answers the quiz
// already collects, so no extra question is needed.
//
// `not-ready` wins over everything: someone with almost no capacity who named
// motivation or clarity as the barrier is pre-action-stage, and pointing them at
// habit-building is the wrong move. That's the Motivation Mode handoff.
// An entry with `embed` renders a real player. Without one it renders the
// placeholder block, so the four unshot cuts still show at true size.
export const PERSONA_VIDEOS = {
  burnout: {
    key: 'burnout',
    label: 'Burnout',
    headline: 'This one is for the burned-out version of this.',
    status: 'Live',
    duration: '90 sec',
    embed: 'https://player.vimeo.com/video/1219994308',
    heading: '90 seconds on burnout',
    // Shot vertically on a phone (Vimeo reports 240x426). In a 16:9 frame it
    // would sit in a thin column between two black bars, so the container
    // matches the footage instead.
    orientation: 'portrait',
  },
  postpartum: {
    key: 'postpartum',
    label: 'Postpartum',
    headline: "This one is for rebuilding after a baby.",
    status: 'Live',
    duration: '2:37',
    embed: 'https://player.vimeo.com/video/1220258538',
    heading: 'A welcome from Eric',
    orientation: 'portrait',
  },
  'warning-signs': {
    key: 'warning-signs',
    label: 'Warning signs',
    headline: 'This one is for the numbers that came back off.',
    status: 'Live',
    duration: '2:03',
    embed: 'https://player.vimeo.com/video/1220257546',
    heading: 'A welcome from Eric',
    orientation: 'portrait',
  },
  // Never shot as its own cut. Every other script ends on the same two-option
  // branch ("not ready is fine, here's motivation mode"), so the generic video
  // already speaks to these viewers. The route is kept because the persona key
  // still lands in analytics and marks a Motivation Mode candidate — it just
  // plays the generic video rather than a placeholder.
  'not-ready': {
    key: 'not-ready',
    label: 'Not ready yet',
    headline: "This one is for when a habit isn't the next step.",
    status: 'Live (generic cut)',
    duration: '1:47',
    embed: 'https://player.vimeo.com/video/1220260604',
    heading: 'A welcome from Eric',
    orientation: 'portrait',
  },
  // Shown when nobody named a segment — "Something else" on the lifeContext
  // question, or an untagged visitor.
  generic: {
    key: 'generic',
    label: 'General',
    headline: 'This one is the plain version of how Summit works.',
    status: 'Live',
    duration: '1:47',
    embed: 'https://player.vimeo.com/video/1220260604',
    heading: 'A welcome from Eric',
    orientation: 'portrait',
  },
}

const has = (arr, ...values) =>
  Array.isArray(arr) && values.some(v => arr.includes(v))

const parseMinutes = (timeCapacity) => {
  const n = parseInt(timeCapacity, 10)
  return Number.isNaN(n) ? null : n
}

// Segment slug -> video. Both the acquisition tag and the lifeContext answer use
// these slugs, so one lookup serves both.
const SEGMENT_TO_VIDEO = {
  burnout: PERSONA_VIDEOS.burnout,
  postpartum: PERSONA_VIDEOS.postpartum,
  'lifestyle-changes': PERSONA_VIDEOS['warning-signs'],
}

// Routing is signal-first, inference-last:
//
//   1. The landing page they came from (?source=). A fact, not a guess.
//   2. What they told us directly on the lifeContext question. Also a fact.
//   3. Readiness — only when neither of the above named a segment. Someone with
//      almost no capacity whose barrier is motivation or clarity is pre-action
//      stage, and pointing them at habit-building is the wrong move. That's the
//      Motivation Mode handoff.
//   4. Generic fallback.
//
// Note what is NOT here any more: guessing a persona from health goals. Two of
// the three segments are life circumstances (a recent birth, a bad lab result),
// not health preferences, so the goal answers never carried that signal. The old
// heuristic mostly returned burnout for everyone.
//
// Deliberate tradeoff at step 2 vs 3: an explicit segment answer beats the
// readiness fork. If someone names burnout but reports 5 min/day, they still get
// the burnout video, because that's the one that earns trust on this screen.
// Readiness is handled after signup, where Motivation Mode lives.
export const resolvePersona = (formData = {}, acquisitionSource = null) => {
  if (acquisitionSource && SEGMENT_TO_VIDEO[acquisitionSource]) {
    return { ...SEGMENT_TO_VIDEO[acquisitionSource], reason: 'from the page you came in on' }
  }

  const stated = formData.lifeContext
  if (stated && SEGMENT_TO_VIDEO[stated]) {
    return { ...SEGMENT_TO_VIDEO[stated], reason: 'from what you told us' }
  }

  const minutes = parseMinutes(formData.timeCapacity)
  if (minutes !== null && minutes <= 10 && has(formData.barriers, 'Motivation', 'Clarity')) {
    return { ...PERSONA_VIDEOS['not-ready'], reason: 'from your time and what\'s in the way' }
  }

  return { ...PERSONA_VIDEOS.generic, reason: 'nothing specific to route on' }
}

// The vision paragraph, built from the sentence fragments each selected option
// already carries. The authenticated flow runs this through consolidateVisionText
// for an AI polish, but ai-chat requires a signed-in user, so pre-auth we show the
// deterministic version. It reads fine because the fragments are written as whole
// sentences — and it means the payoff screen has no latency and no spinner.
export const buildVisionParagraph = (formData = {}) => {
  const parts = [formData.visionStatement, formData.whyMatters]
    .map(t => (t || '').trim())
    .filter(Boolean)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
