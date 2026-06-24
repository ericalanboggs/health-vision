import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { sendEmail, sendEmailsInBatches, type EmailPayload } from '../_shared/resend.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const APP_URL = 'https://go.summithealth.app'
const LOGO_URL = 'https://go.summithealth.app/summit-logo.png'

// Where the "start your trial" CTA points: the men's-health / lifestyle-changes
// landing page. Its own CTAs carry ?source=lifestyle-changes, so signups from
// here get the tailored /welcome onboarding. UTMs here attribute the drip.
const TRIAL_URL = 'https://summithealth.app/use-cases/lifestyle-changes?utm_source=freebie_drip&utm_medium=email'

// Drip-specific founder video (Vimeo watch URL). DIFFERENT from the landing-page
// video (vimeo.com/1200892364) — that one is top-of-funnel and ends with "go grab
// the guide," which is wrong here: drip recipients already downloaded it. This
// video should be a post-download "why I care / why try Summit" message.
// Empty until filmed — when empty, the day-10 email renders text-only (no card).
// TODO(eric): set to the drip-version Vimeo URL once recorded.
const FOUNDER_VIDEO_URL = ''

// Clean-start floor: don't retro-enroll leads captured before the drip went live —
// they opted in for a free download, not a nurture sequence. Only leads from this
// date forward enter the drip (set to the day cron was scheduled).
const DRIP_LAUNCH_FLOOR = '2026-06-12T00:00:00Z'

// Postpartum "Your Turn" cohort overrides. Trial CTA points at the postpartum
// product page (?source=postpartum → tailored /welcome onboarding fork).
const POSTPARTUM_TRIAL_URL = 'https://summithealth.app/use-cases/postpartum?source=postpartum&utm_source=freebie_drip&utm_medium=email'

// Postpartum-specific day-10 founder video (Vimeo watch URL). Empty until recorded —
// when empty, the day-10 email renders text-only. Script: marketing/founder-video-scripts.md.
// TODO(eric): set once the "Your Turn" founder video is filmed + uploaded.
const POSTPARTUM_FOUNDER_VIDEO_URL = ''

// ─── Shared email chrome ───────────────────────────────────────────────
// Same look as the onboarding emails, but with a freebie-appropriate footer:
// these go to leads who grabbed a free skill, not signed-up members, so the
// footer carries a working unsubscribe link (CAN-SPAM for cold traffic).

function unsubscribeUrl(email: string, freebieSlug: string): string {
  const base = `${SUPABASE_URL}/functions/v1/freebie-unsubscribe`
  return `${base}?email=${encodeURIComponent(email)}&slug=${encodeURIComponent(freebieSlug)}`
}

function wrapEmail(title: string, bodyHtml: string, unsubUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Summit" width="120" style="display: block; max-width: 120px; height: auto;">
            </td>
          </tr>
${bodyHtml}
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center; line-height: 1.5;">
                You're getting this because you grabbed a free Summit tool and asked for tips.<br>
                Not useful? <a href="${unsubUrl}" style="color: #6a6a6a;">Unsubscribe here</a> — no hard feelings.
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

function heading(text: string): string {
  return `
          <tr>
            <td align="center" style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                ${text}
              </h1>
            </td>
          </tr>`
}

function paragraph(text: string): string {
  return `
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                ${text}
              </p>
            </td>
          </tr>`
}

function subheading(text: string): string {
  return `
          <tr>
            <td style="padding: 0 40px 12px 40px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">
                ${text}
              </p>
            </td>
          </tr>`
}

function bulletList(items: string[]): string {
  const lis = items.map(i => `<li style="margin-bottom: 10px;">${i}</li>`).join('\n                ')
  return `
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
                ${lis}
              </ul>
            </td>
          </tr>`
}

function ctaButton(label: string, url: string): string {
  return `
          <tr>
            <td align="center" style="padding: 8px 40px 30px 40px;">
              <a href="${url}" style="display: inline-block; padding: 16px 32px; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                ${label}
              </a>
            </td>
          </tr>`
}

function videoBlock(url: string): string {
  // Linked "play" card — email clients won't embed video, so this is a
  // tappable thumbnail-style block that opens the hosted video.
  return `
          <tr>
            <td align="center" style="padding: 4px 40px 28px 40px;">
              <a href="${url}" style="display: block; text-decoration: none;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f2417; border-radius: 12px;">
                  <tr>
                    <td align="center" style="padding: 36px 24px;">
                      <div style="font-size: 40px; line-height: 1;">▶</div>
                      <p style="margin: 12px 0 0 0; font-size: 16px; font-weight: 600; color: #ffffff;">
                        Watch: 90 seconds on why I built this
                      </p>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>`
}

function spacer(px: number = 10): string {
  return `
          <tr><td style="height: ${px}px;"></td></tr>`
}

function signoff(): string {
  return `
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
                — <strong>Coach Eric</strong><br>
                <span style="font-size: 14px; color: #6a6a6a;">Summit Founder</span>
              </p>
            </td>
          </tr>`
}

// ─── Drip emails ───────────────────────────────────────────────────────
// Sequence runs after the instant download email from capture-freebie-lead.
// Day 1 = capture day. Voice: direct, no throat-clearing, no toxic positivity,
// no "journey"/summit metaphors. See SUMMIT_COACH_VOICE.md.

// Day 2 — Why lifestyle change actually works
function buildWhyHtml(unsubUrl: string): string {
  const body = [
    heading('Why willpower keeps failing you'),
    paragraph(`You've probably done the 6-week overhaul. New plan, new app, all in — and three weeks later it's gone. That's not a discipline problem. That's how all-or-nothing is designed to fail.`),
    paragraph(`Here's the part the fitness industry doesn't sell, because you can't charge much for it: <strong>small, consistent actions beat big heroic ones.</strong> Not because they feel impressive — they don't — but because they survive a bad week. And bad weeks are where every plan actually gets tested.`),
    subheading('What the research keeps showing'),
    bulletList([
      `A daily action you'll <em>actually repeat</em> compounds harder than an intense one you quit. Consistency is the whole game.`,
      `Identity follows behavior, not the other way around. You don't think your way into being "a person who moves" — you walk after lunch a few times and your brain catches up.`,
      `Missing once changes nothing. Missing the <em>plan-around-missing</em> is what ends it. The fix is having a 60-second version ready.`,
    ]),
    paragraph(`That free download you grabbed runs on exactly this idea — pick one small thing, run it a week, see what holds, then add the next. Over the next couple weeks I'll show you how it works and why it sticks when life doesn't cooperate.`),
    signoff(),
  ].join('')
  return wrapEmail('Why willpower keeps failing you', body, unsubUrl)
}

// Day 4 — How it works (the mechanics)
function buildHowHtml(unsubUrl: string): string {
  const body = [
    heading('The 5-minute version of everything'),
    paragraph(`Most health advice fails on arithmetic. "Meal prep on Sundays, gym 5x, 8 hours of sleep" assumes a life you don't have. So you do none of it.`),
    paragraph(`The move is the opposite. Shrink the habit until it's almost embarrassing to skip:`),
    bulletList([
      `<strong>Walk after dinner</strong> — 5 minutes, not a workout plan.`,
      `<strong>Protein at breakfast</strong> — one swap, not a diet.`,
      `<strong>Lights down by 10</strong> — one cue, not a sleep overhaul.`,
    ]),
    paragraph(`Then keep the same habit long enough that it stops costing you anything to do. That's the unlock — not adding more, but repeating one thing until it's automatic, then stacking the next.`),
    paragraph(`When a week goes sideways — and it will — you don't quit. You drop to the 60-second version. One walk to the mailbox. One glass of water. Done beats perfect, every time.`),
    paragraph(`Boring? A little. Boring is what works.`),
    signoff(),
  ].join('')
  return wrapEmail('The 5-minute version of everything', body, unsubUrl)
}

// Day 7 — How Summit works (the system)
function buildSystemHtml(unsubUrl: string): string {
  const body = [
    heading('What Summit actually does'),
    paragraph(`The free skill is a pocket version of this. Summit is the whole thing — a coach that knows your life and checks in over text, so the small stuff actually happens.`),
    subheading('How it works'),
    bulletList([
      `<strong>Start with what you're after.</strong> Not a generic goal — your real reason. More energy, better labs, keeping up with your kids. That shapes everything else.`,
      `<strong>A few small habits, not a checklist.</strong> We cap them on purpose. Momentum from three beats burnout from twelve.`,
      `<strong>Texts that sound like a person.</strong> Reminders, a real check-in, and you can text back anything — "slammed this week, help me adjust" — and it actually adjusts.`,
      `<strong>A two-minute reflection.</strong> What worked, what got in the way, what you'll tweak. That loop is where change compounds.`,
    ]),
    paragraph(`No streak guilt. No "you missed 47 days" notifications. You can turn it down when life's heavy and back up when you've got air.`),
    paragraph(`That's the system. In a few days I'll tell you why I built it — and then, if it sounds like your kind of thing, you can try the whole thing free.`),
    signoff(),
  ].join('')
  return wrapEmail('What Summit actually does', body, unsubUrl)
}

// Day 10 — Why me / why I care (VIDEO)
function buildWhyMeHtml(unsubUrl: string): string {
  // Only show the video when a drip-specific URL is set (see FOUNDER_VIDEO_URL).
  const videoIntro = FOUNDER_VIDEO_URL
    ? [
        paragraph(`Quick one — I wanted you to actually see who's behind these emails.`),
        videoBlock(FOUNDER_VIDEO_URL),
      ]
    : []
  const body = [
    heading('Why I built this'),
    ...videoIntro,
    paragraph(`Short version: I hit my 40s and watched the all-or-nothing approach burn out everyone I knew, including me. The plans weren't the problem. The plans were fine. What was missing was someone in your corner on the ordinary days — the ones with no motivation and a packed calendar.`),
    paragraph(`So I built the coach I wanted. Direct, in your corner, no shame, no fluff. Knows the research, won't lecture you with it. Meets you on the week you actually have, not the one a brochure imagines.`),
    paragraph(`That's the whole reason Summit exists. If that's the kind of thing you've been looking for, I'd genuinely love to have you give it a shot.`),
    signoff(),
  ].join('')
  return wrapEmail('Why I built this', body, unsubUrl)
}

// Day 13 — Ready for this? (trial CTA)
function buildTrialHtml(unsubUrl: string): string {
  const body = [
    heading('Ready for this?'),
    paragraph(`You've got the free skill. You know how Summit works and why it exists. Here's the actual offer:`),
    paragraph(`<strong>Try the whole thing free for 14 days.</strong> Your reason, a few small habits, a coach over text that adjusts to your real week. No card-and-forget trap — if it's not pulling its weight, you walk, and your account stays put.`),
    subheading('In your first week you get'),
    bulletList([
      `A plan built around your life, not a template.`,
      `Text check-ins that read like a person, not a robot.`,
      `A two-minute weekly reflection that quietly compounds.`,
      `Someone genuinely in your corner on the boring days.`,
    ]),
    spacer(6),
    ctaButton('Start my 14-day free trial', TRIAL_URL),
    paragraph(`Two weeks is enough to feel the difference between "another app" and a coach who knows you. Worst case, you keep the free skill and we part as friends.`),
    signoff(),
  ].join('')
  return wrapEmail('Ready for this?', body, unsubUrl)
}

// Day 17 — Gentle last note for non-converters
function buildLastNoteHtml(unsubUrl: string): string {
  const body = [
    heading('Last note from me'),
    paragraph(`I'll stop crowding your inbox after this one.`),
    paragraph(`If the timing's not right, that's completely fine — the free download is yours to keep, and it works on its own. Pick one small thing, run it a week, then add the next. That alone will move things.`),
    paragraph(`And if you ever want the coach version — the texts, the check-ins, someone tracking the small stuff with you — the door's open whenever you are. No expiration on the offer.`),
    spacer(6),
    ctaButton('Try Summit free when you\'re ready', TRIAL_URL),
    paragraph(`Either way, I'm rooting for you. Go do the small thing today.`),
    signoff(),
  ].join('')
  return wrapEmail('Last note from me', body, unsubUrl)
}

// ─── Drip config ────────────────────────────────────────────────────────

interface DripStep {
  day: number
  emailType: string
  subject: string
  buildHtml: (unsubUrl: string) => string
}

const DRIP_STEPS: DripStep[] = [
  { day: 2,  emailType: 'freebie_drip_why',     subject: 'Why willpower keeps failing you',       buildHtml: buildWhyHtml },
  { day: 4,  emailType: 'freebie_drip_how',     subject: 'The 5-minute version of everything',    buildHtml: buildHowHtml },
  { day: 7,  emailType: 'freebie_drip_system',  subject: 'What Summit actually does',             buildHtml: buildSystemHtml },
  { day: 10, emailType: 'freebie_drip_why_me',  subject: 'Why I built this',                      buildHtml: buildWhyMeHtml },
  { day: 13, emailType: 'freebie_drip_trial',   subject: 'Ready for this?',                       buildHtml: buildTrialHtml },
  { day: 17, emailType: 'freebie_drip_last',    subject: 'Last note from me',                     buildHtml: buildLastNoteHtml },
]

const MAX_DRIP_DAY = Math.max(...DRIP_STEPS.map(s => s.day))

// ─── Postpartum "Your Turn" drip variants ──────────────────────────────
// Same day schedule + emailTypes as the default drip; postpartum voice + audience
// (moms rebuilding ~6mo–3yr postpartum). Non-clinical, refer-out, no bounce-back.
// Voice: ERIC_VOICE.md (Eric-as-coach). Selected by freebie_slug in the handler.

function buildPpWhyHtml(unsubUrl: string): string {
  const body = [
    heading(`It's not a willpower problem`),
    paragraph(`If your own health is the first thing to slide when the day gets loud — that's not a discipline problem. You're not lazy. You're stretched thin, doing for everyone, running on interrupted sleep. Willpower was never going to win that fight.`),
    paragraph(`Here's what does: <strong>small and consistent beats big and heroic.</strong> Not because small is impressive — it isn't — but because it survives a bad night. And right now, most nights are the test.`),
    subheading('What actually holds'),
    bulletList([
      `A two-minute thing you'll <em>actually repeat</em> beats a 30-minute plan you abandon by Thursday. Consistency is the whole game.`,
      `You don't think your way back to yourself. You take five minutes a few times, and it starts to feel normal.`,
      `Missing a day changes nothing. Not having a tiny version ready for the hard days is what ends it.`,
    ]),
    paragraph(`The guide you grabbed runs on exactly this — name your turn, pick one small thing, run it a week, keep what holds, add the next. Over the next couple weeks I'll show you how it works when life refuses to cooperate.`),
    signoff(),
  ].join('')
  return wrapEmail(`It's not a willpower problem`, body, unsubUrl)
}

function buildPpHowHtml(unsubUrl: string): string {
  const body = [
    heading('The five-minute version'),
    paragraph(`Most advice for moms fails on math. "Meal prep Sundays, work out five times, sleep eight hours" assumes a life you don't have right now. So you do none of it — and feel behind on top of everything else.`),
    paragraph(`Flip it. Shrink the thing until it's almost too small to count — then decide exactly <em>when</em> it happens:`),
    bulletList([
      `<strong>Five minutes of stretching</strong> during the first nap — not a workout.`,
      `<strong>A glass of water and a real breakfast</strong> before the coffee — not a diet.`,
      `<strong>Lights out ten minutes earlier</strong> — one cue, not a sleep overhaul.`,
    ]),
    paragraph(`Pick the time, not just the thing. "During the first nap" beats "sometime today," every time.`),
    paragraph(`And on the days it all goes sideways — teething, no sleep, everyone needs you at once — you don't quit. You do the 60-second version. One stretch. One glass of water. Small still counts.`),
    signoff(),
  ].join('')
  return wrapEmail('The five-minute version', body, unsubUrl)
}

function buildPpSystemHtml(unsubUrl: string): string {
  const body = [
    heading('What Summit actually does'),
    paragraph(`The guide is the pocket version. Summit is the whole thing — a coach that knows your life and checks in over text, so the small stuff actually happens even when you're running on no sleep.`),
    subheading('How it works'),
    bulletList([
      `<strong>It starts with you.</strong> Not a generic goal — your real one. Ten minutes that are yours, energy by 2pm, strong enough for the stairs without losing your breath.`,
      `<strong>One or two small things, not a checklist.</strong> We keep it tiny on purpose. Momentum from one beats burnout from ten.`,
      `<strong>Texts that sound like a person.</strong> A nudge, a check-in, and you can text back "rough week, help me shrink it" — and it actually adjusts.`,
      `<strong>No app to open.</strong> It lives in your messages, where you already are.`,
    ]),
    paragraph(`No streak guilt. No "you missed 12 days." Turn it down when the week is heavy, back up when you've got air.`),
    paragraph(`That's the system. In a few days I'll tell you why I built it — and then, if it sounds like your thing, you can try the whole thing free.`),
    signoff(),
  ].join('')
  return wrapEmail('What Summit actually does', body, unsubUrl)
}

function buildPpWhyMeHtml(unsubUrl: string): string {
  const videoIntro = POSTPARTUM_FOUNDER_VIDEO_URL
    ? [
        paragraph(`Quick one — I wanted you to actually see who's behind these emails.`),
        videoBlock(POSTPARTUM_FOUNDER_VIDEO_URL),
      ]
    : []
  const body = [
    heading('Why I built this'),
    ...videoIntro,
    paragraph(`When I piloted Summit, I didn't know if it would matter to moms. A few were in the group, so I watched.`),
    paragraph(`I figured they wanted a way out of the burnout — time to put their own health somewhere on the list. That part was right. What surprised me was how little it took: five or ten minutes on you, just you, with someone actually in your corner.`),
    paragraph(`It puts you first and asks for almost nothing — and it doesn't live in another app you have to open. That's why I want it in front of more moms.`),
    paragraph(`<strong>We say moms are heroes. Let's start treating them like it.</strong>`),
    signoff(),
  ].join('')
  return wrapEmail('Why I built this', body, unsubUrl)
}

function buildPpTrialHtml(unsubUrl: string): string {
  const body = [
    heading('Ready for your turn?'),
    paragraph(`You've got the guide. You know how Summit works and why it exists. Here's the offer:`),
    paragraph(`<strong>Try the whole thing free for 14 days.</strong> When you start, you pick how to begin — a little daily encouragement to ease in, or jump straight to one small habit. Either way, a coach over text that adjusts to your actual week. No card-and-forget trap; if it's not helping, you walk and your account stays put.`),
    subheading('Your first week'),
    bulletList([
      `A start built around your life, not a template.`,
      `Text check-ins that read like a person, not a robot.`,
      `A two-minute reflection that quietly adds up.`,
      `Someone in your corner on the days it's all on you.`,
    ]),
    spacer(6),
    ctaButton('Start my 14-day free trial', POSTPARTUM_TRIAL_URL),
    paragraph(`Two weeks is enough to feel the difference between "another app" and a coach who knows you. Worst case, you keep the guide and we part as friends.`),
    signoff(),
  ].join('')
  return wrapEmail('Ready for your turn?', body, unsubUrl)
}

function buildPpLastHtml(unsubUrl: string): string {
  const body = [
    heading('Last note from me'),
    paragraph(`I'll stop crowding your inbox after this.`),
    paragraph(`If now's not the time, that's completely okay — the guide is yours to keep, and it works on its own. Name your turn, pick one small thing, decide when, run it a week. That alone moves things.`),
    paragraph(`And if you ever want the coach version — the texts, the nudges, someone holding the small stuff with you so it isn't all on you — the door's open whenever you are. No expiration.`),
    spacer(6),
    ctaButton('Try Summit free when you\'re ready', POSTPARTUM_TRIAL_URL),
    paragraph(`Either way, I'm rooting for you. Go take your five minutes today.`),
    signoff(),
  ].join('')
  return wrapEmail('Last note from me', body, unsubUrl)
}

// Postpartum content keyed by emailType (same days as DRIP_STEPS).
const POSTPARTUM_CONTENT: Record<string, { subject: string; buildHtml: (u: string) => string }> = {
  freebie_drip_why:    { subject: `It's not a willpower problem`, buildHtml: buildPpWhyHtml },
  freebie_drip_how:    { subject: 'The five-minute version',      buildHtml: buildPpHowHtml },
  freebie_drip_system: { subject: 'What Summit actually does',    buildHtml: buildPpSystemHtml },
  freebie_drip_why_me: { subject: 'Why I built this',             buildHtml: buildPpWhyMeHtml },
  freebie_drip_trial:  { subject: 'Ready for your turn?',         buildHtml: buildPpTrialHtml },
  freebie_drip_last:   { subject: 'Last note from me',            buildHtml: buildPpLastHtml },
}

// Resolve the right subject + body for a lead's cohort. Postpartum leads get the
// "Your Turn" variants; everyone else gets the default step content.
function resolveContent(freebieSlug: string, step: DripStep): { subject: string; buildHtml: (u: string) => string } {
  if (freebieSlug === 'postpartum-guide' && POSTPARTUM_CONTENT[step.emailType]) {
    return POSTPARTUM_CONTENT[step.emailType]
  }
  return { subject: step.subject, buildHtml: step.buildHtml }
}

interface FreebieLead {
  email: string
  freebie_slug: string
  created_at: string
}

/**
 * Days since the lead was captured (1-indexed). Day 1 = capture day.
 * UTC-date based, matching send-onboarding-emails.
 */
function getDripDay(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const createdDate = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate())
  const nowDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((nowDate - createdDate) / (1000 * 60 * 60 * 24)) + 1
}

// ─── Handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    // Test mode: { testEmail, testDay } sends one step to one address.
    let testEmail: string | null = null
    let testDay: number | null = null
    let testFreebie = 'summit-weekly-reflection'
    try {
      const body = await req.json()
      testEmail = body.testEmail || null
      testDay = body.testDay || null
      testFreebie = body.testFreebie || testFreebie // e.g. 'postpartum-guide'
    } catch {
      // No body — normal cron run.
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    if (testEmail && testDay) {
      const step = DRIP_STEPS.find(s => s.day === testDay)
      if (!step) {
        return new Response(
          JSON.stringify({ error: `No drip step for day ${testDay}. Valid days: ${DRIP_STEPS.map(s => s.day).join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const content = resolveContent(testFreebie, step)
      const unsubUrl = unsubscribeUrl(testEmail, testFreebie)
      const result = await sendEmail({ to: testEmail, subject: content.subject, html: content.buildHtml(unsubUrl) })
      return new Response(
        JSON.stringify(result.success
          ? { message: `Test drip day ${testDay} sent`, email: testEmail, resendId: result.id }
          : { error: 'Failed to send test email', details: result.error }),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const now = new Date()
    console.log(`Running freebie drip check at ${now.toISOString()}`)

    // Leads captured within the drip window who still want tips. Never reach back
    // before the launch floor (clean start — see DRIP_LAUNCH_FLOOR).
    const windowStart = new Date(now)
    windowStart.setUTCDate(windowStart.getUTCDate() - (MAX_DRIP_DAY + 2))
    const floor = new Date(DRIP_LAUNCH_FLOOR)
    const effectiveStart = windowStart > floor ? windowStart : floor

    const { data: leads, error: leadsError } = await supabase
      .from('freebie_leads')
      .select('email, freebie_slug, created_at, wants_tips')
      .eq('wants_tips', true)
      .gte('created_at', effectiveStart.toISOString())

    if (leadsError) throw leadsError
    console.log(`Found ${leads?.length || 0} active leads in drip window`)

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: 'No leads in drip window', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } })
    }

    const dayByStep = new Map(DRIP_STEPS.map(s => [s.day, s]))

    // Match each lead to the step due today.
    const dueLeads: Array<{ lead: FreebieLead; step: DripStep }> = []
    for (const lead of leads) {
      const step = dayByStep.get(getDripDay(lead.created_at))
      if (step) dueLeads.push({ lead, step })
    }

    if (dueLeads.length === 0) {
      return new Response(JSON.stringify({ message: 'No drip emails due today', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } })
    }

    const emails = [...new Set(dueLeads.map(d => d.lead.email))]

    // Skip anyone who already created a Summit account — don't pitch a trial
    // to someone who already signed up.
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('email')
      .in('email', emails)
    const convertedEmails = new Set((existingProfiles || []).map(p => (p.email || '').toLowerCase()))

    // Dedup against already-sent drip steps.
    const { data: sentRows } = await supabase
      .from('freebie_lead_emails')
      .select('email, freebie_slug, email_type')
      .in('email', emails)
      .like('email_type', 'freebie_drip_%')
    const sentSet = new Set((sentRows || []).map(r => `${r.email}:${r.freebie_slug}:${r.email_type}`))

    const payloads: Array<EmailPayload & { emailType: string; freebieSlug: string }> = []
    let skippedConverted = 0
    for (const { lead, step } of dueLeads) {
      if (convertedEmails.has(lead.email.toLowerCase())) { skippedConverted++; continue }
      const key = `${lead.email}:${lead.freebie_slug}:${step.emailType}`
      if (sentSet.has(key)) continue
      const content = resolveContent(lead.freebie_slug, step)
      const unsubUrl = unsubscribeUrl(lead.email, lead.freebie_slug)
      payloads.push({
        to: lead.email,
        subject: content.subject,
        html: content.buildHtml(unsubUrl),
        emailType: step.emailType,
        freebieSlug: lead.freebie_slug,
      })
    }

    console.log(`${payloads.length} drip emails to send (${skippedConverted} skipped — already signed up)`)

    if (payloads.length === 0) {
      return new Response(JSON.stringify({ message: 'No new drip emails to send', count: 0, skippedConverted }),
        { headers: { 'Content-Type': 'application/json' } })
    }

    const batchResults = await sendEmailsInBatches(
      payloads.map(p => ({ to: p.to, subject: p.subject, html: p.html })), 100, 1000
    )

    let sent = 0, failed = 0
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const p = payloads[i]
      await supabase.from('freebie_lead_emails').insert({
        email: p.to,
        freebie_slug: p.freebieSlug,
        email_type: p.emailType,
        subject: p.subject,
        status: result.success ? 'sent' : 'failed',
        resend_id: result.success ? result.id : null,
        error_message: result.success ? null : result.error,
      })
      if (result.success) { sent++; console.log(`✓ ${p.emailType} → ${p.to}`) }
      else { failed++; console.error(`✗ ${p.emailType} → ${p.to}: ${result.error}`) }
    }

    return new Response(
      JSON.stringify({ message: 'Freebie drip check complete', leadsInWindow: leads.length, sent, failed, skippedConverted }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-freebie-drip-emails:', error)
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
