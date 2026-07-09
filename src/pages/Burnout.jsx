import { useState, useEffect } from 'react'
import {
  CheckCircle, FormatListBulleted, AdsClick, TrendingUp, Autorenew,
  AccessTime, FavoriteBorder, Replay, ArrowForward,
} from '@mui/icons-material'
import { Button, Input, Banner, Badge, buttonVariants } from '@summit/design-system'
import { trackEvent } from '../lib/posthog'

// Email-first opt-in landing for the burnout ad funnel. Lead magnet is the
// "Off the Treadmill" guide PDF; the page also presents the method as a readable
// web version. Capture → capture-freebie-lead → nurture drip → trial. Audience:
// mid-to-senior knowledge workers running on fumes, app-fatigued, high WTP.
// Voice: ERIC_VOICE.md (Eric-as-coach), non-clinical + refer-out. Repositioned
// around values/time alignment (recovery is the entry, realignment is the point).
// DRAFT — some copy carries [BRACKET] outcome numbers pending real data; testimonial
// is a placeholder until a burnout pilot quote lands. See marketing/burnout-funnel-plan.md.

const FREEBIE_SLUG = 'burnout-guide'
const PDF_PATH = `/freebies/${FREEBIE_SLUG}.pdf`
const TRIAL_URL = 'https://summithealth.app/use-cases/burnout?source=burnout'

const STEPS = [
  {
    Icon: FormatListBulleted,
    title: 'Name what’s draining you — and what you’d protect.',
    body: 'Pick the one thing the treadmill crowded out — sleep, a workout, dinner without a laptop, ten minutes that are actually yours. Just one. Then write it in a line: what are you reaching for? That line is the anchor. Keep it close.',
  },
  {
    Icon: AdsClick,
    title: 'Shrink it small. Anchor it to your day.',
    body: 'Make it almost too easy — a start, not a project. Then hook it to a cue you already hit every workday: “one walk after the last meeting,” “laptop shut by 9.” A plan without a time is just a wish you keep breaking.',
  },
  {
    Icon: TrendingUp,
    title: 'Run it a week. Small still counts.',
    body: 'Do the small version — on the light weeks and the brutal ones. Plan for the Thursday you actually have, not the one you keep promising yourself. A 2-minute version beats a skipped hour.',
  },
  {
    Icon: Autorenew,
    title: 'Add the next only when the last holds.',
    body: 'If it stuck — even mostly — keep it and add one more. One a week, that’s the pace. If it didn’t, don’t pile on; shrink it until it’s easy again. It feels slow. That’s how it survives a hard week.',
  },
]

const KEEP_GOING = [
  {
    Icon: AccessTime,
    title: 'Small still counts',
    body: 'A blown week isn’t a relapse. It’s a launch that slipped. Start again at the next meeting-end, the next commute, the next evening — not next quarter.',
  },
  {
    Icon: FavoriteBorder,
    title: 'Keep your one line close',
    body: 'Put it where you’ll see it before you say yes to one more thing. Motivation fades; a written line holds when the calendar doesn’t.',
  },
  {
    Icon: Replay,
    title: 'It survives the hard week',
    body: 'The point isn’t a perfect streak. It’s a system small enough that a 60-hour week can’t break it. That’s the whole difference.',
  },
]

const TRUST = ['Free — no credit card', 'No app to download', 'Built for busy professionals', 'Takes 2 minutes']

export default function Burnout() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  // Source/campaign attribution from the ad URL; falls back to the page name.
  // Fold utm_content (the per-ad variant) into source so a multi-ad test is
  // distinguishable in freebie_leads — e.g. "burnout-realign/values".
  const [source] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const campaign = p.get('utm_campaign')
      const content = p.get('utm_content')
      if (campaign) return content ? `${campaign}/${content}` : campaign
      return p.get('source') || 'burnout_page'
    } catch {
      return 'burnout_page'
    }
  })

  useEffect(() => {
    trackEvent('freebie_page_viewed', { freebie_slug: FREEBIE_SLUG })
  }, [])

  const handleCapture = async (e) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email.')
      return
    }

    setStatus('loading')
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/capture-freebie-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
        body: JSON.stringify({ email: trimmed, freebieSlug: FREEBIE_SLUG, source }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error || `Request failed: ${res.status}`)

      trackEvent('freebie_lead_captured', { freebie_slug: FREEBIE_SLUG, source })
      // Meta Pixel: standard Lead event so ad delivery optimizes toward opt-ins.
      if (window.fbq) window.fbq('track', 'Lead', { content_name: FREEBIE_SLUG, source })
      setStatus('sent')
    } catch (err) {
      console.error('Off the Treadmill guide lead capture failed:', err)
      // Soft fallback — never block the guide. The download appears either way.
      setErrorMsg("Couldn't email it just now, but your download below works fine.")
      setStatus('error')
    }
  }

  const captured = status === 'sent' || status === 'error'
  const scrollToCapture = () =>
    document.getElementById('get-guide')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Inline render fn (NOT a nested component) so the input keeps focus on each keystroke.
  const renderCapture = (location) => (
    <div
      id={location === 'hero' ? 'get-guide' : undefined}
      className="mx-auto max-w-md rounded-2xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5"
    >
      {status === 'sent' ? (
        <Banner variant="success">
          On its way 📬 Check your inbox for the guide. Grab the PDF below too.
        </Banner>
      ) : (
        <form onSubmit={handleCapture} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="w-full flex-1">
            <Input
              type="email"
              name="email"
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={status === 'loading'}
            disabled={status === 'loading'}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            Email me the guide
          </Button>
        </form>
      )}
      {status !== 'sent' && (
        <p className="mt-2 text-center text-xs text-text-secondary sm:text-left">
          Free 2-page PDF + worksheet. We’ll also send a few short tips. Unsubscribe anytime.
        </p>
      )}
      {errorMsg && <p className="mt-2 text-center text-xs text-feedback-error sm:text-left">{errorMsg}</p>}
      {captured && (
        <div className="mt-4 text-center sm:text-left">
          <a
            href={PDF_PATH}
            download
            onClick={() => trackEvent('freebie_download_clicked', { freebie_slug: FREEBIE_SLUG, location })}
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Download the PDF
          </a>
        </div>
      )}
    </div>
  )

  const SectionEyebrow = ({ children }) => (
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-summit-moss">{children}</p>
  )

  return (
    <div className="min-h-screen bg-summit-mint">
      {/* Sticky mobile CTA — the capture is the whole goal and the page is long on a phone */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-summit-sage bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          onClick={scrollToCapture}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-summit-emerald px-4 py-3 font-semibold text-white shadow"
        >
          Email me the free guide <ArrowForward className="h-4 w-4" />
        </button>
      </div>

      {/* Brand bar (logo reads on light) */}
      <div className="flex justify-center bg-summit-mint py-4">
        <img src="/summit-logo.png" alt="Summit" className="h-7" />
      </div>

      {/* HERO — dark band for presence + contrast */}
      <header className="relative overflow-hidden bg-gradient-to-b from-summit-forest to-summit-pine">
        {/* soft accent glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-summit-emerald/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <Badge variant="default" size="lg" className="mb-5">
            For high-output people running on fumes
          </Badge>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Burnout isn’t a stamina problem.
            <span className="text-summit-lime"> It’s a sign your days stopped matching what matters.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            A no-overhaul way back to what you’re actually building toward — in the small increments you
            already have. Get the free 2-page guide and worksheet, and I’ll walk you through it.
          </p>
          <div className="mt-8">{renderCapture('hero')}</div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-white/75">
                <CheckCircle className="h-4 w-4 text-summit-lime" /> {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-16 px-4 pb-28 pt-14 sm:px-6 sm:pb-16">

        {/* Problem — the "sound familiar" mirror, condensed from the copy draft */}
        <section>
          <SectionEyebrow>Sound familiar?</SectionEyebrow>
          <h2 className="mb-4 text-2xl font-bold text-summit-forest sm:text-3xl">
            You’re good at your job. That’s the problem.
          </h2>
          <div className="space-y-3 text-base leading-relaxed text-text-secondary">
            <p>
              The work keeps coming and you keep saying yes. You stopped sleeping through the night about
              a year ago. Weekends don’t unplug anymore. You say yes to everything at work and no to the
              things that are actually yours.
            </p>
            <p>
              You’ve tried Headspace, Calm, Whoop, Oura, that productivity coach in your podcast feed —
              each one worked for about ten days. The problem was never that you don’t know what to do.
              It’s that nothing you tried built a system that survives a hard week.
            </p>
          </div>
        </section>

        {/* The method — the centerpiece, as a visual sequence */}
        <section>
          <SectionEyebrow>The method</SectionEyebrow>
          <h2 className="mb-3 text-2xl font-bold text-summit-forest sm:text-3xl">
            Four steps. One small thing at a time.
          </h2>
          <p className="mb-7 max-w-2xl text-base leading-relaxed text-text-secondary">
            This isn’t a hunch — it’s how habits actually form: start small, anchor it to something you
            already do, add one at a time. The experts have said it for years; they just never said it to
            someone with back-to-back meetings and a full inbox. The guide makes it simple — and lets you
            practice it, not just read about it.
          </p>
          <ol className="space-y-2">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li key={title} className="flex gap-4 sm:gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-summit-forest text-white shadow-md">
                    <Icon className="h-6 w-6" />
                  </div>
                  {i < STEPS.length - 1 && <div className="my-1 w-0.5 flex-1 bg-summit-sage" />}
                </div>
                <div className="pb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-summit-moss">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-summit-forest">{title}</h3>
                  <p className="mt-1 text-base leading-relaxed text-text-secondary">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Founder note — why this, from someone who's been on the treadmill */}
        <section>
          <SectionEyebrow>From the founder</SectionEyebrow>
          <h2 className="mb-4 text-2xl font-bold text-summit-forest sm:text-3xl">
            Why I built this instead of another app
          </h2>
          <div className="space-y-3 text-base leading-relaxed text-text-secondary">
            <p>
              I know the treadmill personally — the good-at-your-job trap, the yeses that pile up, the
              year your own health quietly drops off the list. I got certified at Mayo Clinic, then built
              Summit for the version of me that didn’t need another dashboard to babysit.
            </p>
            <p>
              What surprised me in the pilot was how little it took: five or ten minutes on you, a nudge
              over text on the day it slips, and a real coach in your corner. Not to help you grind
              better — to help you come back to what you’re actually building toward.
            </p>
            <p>
              It puts you first and asks for almost nothing. That’s why I want it in front of more people
              running hard but no longer sure toward what.
            </p>
          </div>
          <p className="mt-4 text-sm font-medium text-summit-moss">— Eric, Summit founder</p>
        </section>

        {/* Proof band — real Summit member */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-10 text-center sm:px-10">
          <p className="mx-auto max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">
            “Summit helped me see what was holding me back. It gave me the tools to kickstart my path
            toward a more centered and healthier life.”
          </p>
          <p className="mt-4 text-sm font-medium text-summit-lime">Julie D., Summit member</p>
        </section>

        {/* Three things that keep it going */}
        <section>
          <SectionEyebrow>What keeps it going</SectionEyebrow>
          <h2 className="mb-6 text-2xl font-bold text-summit-forest sm:text-3xl">
            Three things that make it stick
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {KEEP_GOING.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-summit-mint text-summit-moss">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-summit-forest">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-text-secondary">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-summit-emerald" />
            <span>
              <strong className="text-summit-forest">Coaching, not medical care.</strong> The heavier
              stuff — chronic exhaustion, anxiety, depression — deserves a clinician, not a guide. This is
              for the everyday realign.
            </span>
          </p>
        </section>

        {/* Worksheet teaser + second capture */}
        <section className="rounded-3xl bg-summit-sage/50 px-6 py-10 sm:px-10">
          <div className="text-center">
            <SectionEyebrow>The take-home</SectionEyebrow>
            <h2 className="text-2xl font-bold text-summit-forest sm:text-3xl">
              Page 2 is your plan, on paper
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
              The PDF’s second page is a fill-in worksheet — name what’s draining you, write the one line
              you’re reaching for, pick the one small thing, and anchor it to your day. Print it or fill it
              on your phone.
            </p>
          </div>
          <div className="mt-7">{renderCapture('worksheet')}</div>
        </section>

        {/* Footer CTA → Summit trial (bookends the dark hero) */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-12 text-center sm:px-10">
          <h2 className="mx-auto max-w-xl text-2xl font-bold text-white sm:text-3xl">
            Stop optimizing the grind.
            <span className="text-summit-lime"> Start protecting what it’s for.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">
            Summit doesn’t add another app to your stack — it removes the need for one. A nudge over text
            on the day it slips, a five-minute weekly reflection, and a real coach in your corner. The
            guide is step one. This is the follow-through.
          </p>
          <a
            href={TRIAL_URL}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-summit-lime px-7 py-3.5 font-semibold text-summit-forest shadow-md transition hover:scale-[1.02]"
          >
            Try Summit free for 14 days <ArrowForward className="h-4 w-4" />
          </a>
        </section>
      </main>
    </div>
  )
}
