import { useState, useEffect } from 'react'
import {
  CheckCircle, FormatListBulleted, AdsClick, TrendingUp, Autorenew,
  AccessTime, FavoriteBorder, Replay, ArrowForward,
} from '@mui/icons-material'
import { Button, Input, Banner, Badge, buttonVariants } from '@summit/design-system'
import { trackEvent } from '../lib/posthog'

// Email-first opt-in landing for the postpartum "Your Turn" ad funnel. Lead magnet is
// the Your Turn guide PDF; the page also presents the method as a readable web version.
// Capture → capture-freebie-lead → nurture drip → trial. Audience: moms rebuilding
// ~6mo–3yr postpartum. Voice: ERIC_VOICE.md (Eric-as-coach), non-clinical + refer-out.

const FREEBIE_SLUG = 'postpartum-guide'
const PDF_PATH = `/freebies/${FREEBIE_SLUG}.pdf`
const TRIAL_URL = 'https://summithealth.app/use-cases/postpartum?source=postpartum'

const STEPS = [
  {
    Icon: FormatListBulleted,
    title: 'Name what you miss — and name your turn.',
    body: 'Pick one thing you’ve lost track of — energy, sleep, feeling strong, ten quiet minutes, you. Just one, not the whole list. Then write your turn in one line: what are you reaching for? That line is yours. Keep it close.',
  },
  {
    Icon: AdsClick,
    title: 'Shrink it small. Decide when.',
    body: 'Make that one thing almost too easy — a start, not a workout. Then decide exactly when and where it happens: “five minutes during the first nap,” “a short walk after lunch.” A plan without a time is just a wish.',
  },
  {
    Icon: TrendingUp,
    title: 'Run it a week. Small still counts.',
    body: 'Do the small version — on the good days and the loud ones. Plan for the Tuesday you actually have, not the one you wish you had. A 2-minute version beats a skipped 20.',
  },
  {
    Icon: Autorenew,
    title: 'Add the next only when the last holds.',
    body: 'If it stuck — even mostly — keep it and add one more. One a week, that’s the pace. If it didn’t, don’t pile on; shrink the first one until it’s easy again. It feels slow. It’s supposed to.',
  },
]

const KEEP_GOING = [
  {
    Icon: AccessTime,
    title: 'Small still counts',
    body: 'A missed day isn’t a relapse. It’s a Tuesday. Start again at the next nap, the next walk, the next meal — not next Monday.',
  },
  {
    Icon: FavoriteBorder,
    title: 'Keep your turn-line close',
    body: 'Put it on your phone. Read it when you’re about to skip. Motivation fades; a written line holds.',
  },
  {
    Icon: Replay,
    title: 'You’re not behind',
    body: 'There’s no schedule for this. The only pace that matters is the one you can actually keep.',
  },
]

const TRUST = ['Free — no credit card', 'No app to download', 'Built for moms rebuilding', 'Takes 2 minutes']

export default function YourTurn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  // Source/campaign attribution from the ad URL; falls back to the page name.
  // Fold utm_content (the per-ad variant) into source so a multi-ad test is
  // distinguishable in freebie_leads — e.g. "postpartum-rebuild/validation".
  const [source] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const campaign = p.get('utm_campaign')
      const content = p.get('utm_content')
      if (campaign) return content ? `${campaign}/${content}` : campaign
      return p.get('source') || 'yourturn_page'
    } catch {
      return 'yourturn_page'
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
      console.error('Your Turn guide lead capture failed:', err)
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
            For moms rebuilding — 6 months to 3 years in
          </Badge>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Everyone’s been asking you to do things for others.
            <span className="text-summit-lime"> This one’s about you.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            A no-overhaul way back to yourself — five minutes at a time, and anything counts. Get the
            free 2-page guide and worksheet, and I’ll walk you through it.
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

        {/* The method — the centerpiece, as a visual sequence */}
        <section>
          <SectionEyebrow>The method</SectionEyebrow>
          <h2 className="mb-3 text-2xl font-bold text-summit-forest sm:text-3xl">
            Four steps. One small thing at a time.
          </h2>
          <p className="mb-7 max-w-2xl text-base leading-relaxed text-text-secondary">
            This isn’t a hunch — it’s how habits actually form: start small, anchor it to something you
            already do, add one at a time. The experts have said it for years; they just never said it
            to someone running on no sleep with a kid on her hip. The guide makes it simple — and lets
            you practice it, not just read about it.
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

        {/* Founder note — why this, for moms (text; no video for now) */}
        <section>
          <SectionEyebrow>From the founder</SectionEyebrow>
          <h2 className="mb-4 text-2xl font-bold text-summit-forest sm:text-3xl">
            Why I want this in front of more moms
          </h2>
          <div className="space-y-3 text-base leading-relaxed text-text-secondary">
            <p>
              When I piloted Summit, I didn’t know if it would matter to moms. A few were in the
              group, so I watched.
            </p>
            <p>
              I figured they wanted a way out of the burnout — time to put their own health somewhere
              on the list. That part was right. What surprised me was how little it took: five or ten
              minutes on you, just you, with someone actually in your corner.
            </p>
            <p>
              It puts you first and asks for almost nothing — and it doesn’t live in another app you
              have to open. That’s why I want it in front of more moms.
            </p>
          </div>
          <p className="mt-4 text-sm font-medium text-summit-moss">— Eric, Summit founder</p>
        </section>

        {/* Proof band — real pilot mom, in her words */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-10 text-center sm:px-10">
          <p className="mx-auto max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">
            “Summit provided structure, easy-to-implement habits, and the support I needed as a
            postpartum mom looking to revive energy and feel more connected within.”
          </p>
          <p className="mt-4 text-sm font-medium text-summit-lime">AJ, postpartum mom</p>
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
              stuff — your mood, pain, your pelvic floor — deserves your provider, not a guide. This is
              for the everyday rebuild.
            </span>
          </p>
        </section>

        {/* Worksheet teaser + second capture */}
        <section className="rounded-3xl bg-summit-sage/50 px-6 py-10 sm:px-10">
          <div className="text-center">
            <SectionEyebrow>The take-home</SectionEyebrow>
            <h2 className="text-2xl font-bold text-summit-forest sm:text-3xl">
              Page 2 is your turn, on paper
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
              The PDF’s second page is a fill-in worksheet — name what you miss, write your turn in one
              line, pick the one small thing, and decide when you’ll do it. Print it or fill it on your phone.
            </p>
          </div>
          <div className="mt-7">{renderCapture('worksheet')}</div>
        </section>

        {/* Footer CTA → Summit trial (bookends the dark hero) */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-12 text-center sm:px-10">
          <h2 className="mx-auto max-w-xl text-2xl font-bold text-white sm:text-3xl">
            You keep everyone else going.
            <span className="text-summit-lime"> Your turn to be kept going.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">
            Summit puts you first and asks for almost nothing — a nudge over text on the day it slips,
            a moment to reflect, and a real coach in your corner. The guide is step one. This is the
            follow-through.
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
