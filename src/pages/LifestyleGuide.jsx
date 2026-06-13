import { useState, useEffect } from 'react'
import {
  CheckCircle, FormatListBulleted, AdsClick, TrendingUp, Autorenew,
  AccessTime, FavoriteBorder, Replay, ArrowForward,
} from '@mui/icons-material'
import { Button, Input, Banner, Badge, buttonVariants } from '@summit/design-system'
import { trackEvent } from '../lib/posthog'

// Email-first opt-in landing for the cold men-40+ ad funnel. Lead magnet is the
// Lifestyle Changes Guide PDF; the page also presents the guide's method as a
// readable web version. Capture → capture-freebie-lead → nurture drip → trial.
// Voice: ERIC_VOICE.md. Visual structure follows the landing design brief.

const FREEBIE_SLUG = 'lifestyle-changes-guide'
const PDF_PATH = `/freebies/${FREEBIE_SLUG}.pdf`
const TRIAL_URL = 'https://summithealth.app/use-cases/lifestyle-changes'
const FOUNDER_VIDEO_EMBED = 'https://player.vimeo.com/video/1200892364'

const STEPS = [
  {
    Icon: FormatListBulleted,
    title: 'Get it all on paper',
    body: 'List what your doctor named and what you’ve been avoiding — moving more, the nightly drinks, sleep, late-night carbs. Aim for 3–6. This isn’t a to-do list. It’s a menu, and you’re going to pick one.',
  },
  {
    Icon: AdsClick,
    title: 'Pick ONE. Decide when and where.',
    body: 'Most plans die because people pick five. Pick the smallest, most can’t-fail one — then make it real: “10-minute walk after dinner.” Pin it to something you already do. Run it a week and watch. You’re experimenting, not signing a contract.',
  },
  {
    Icon: TrendingUp,
    title: 'Week went well? Add the next one.',
    body: 'If it held — even mostly — keep it and add the second thing. If it didn’t, don’t add anything. Shrink the first one until it’s almost too easy and run it again. A 2-minute walk beats a skipped 30-minute one.',
  },
  {
    Icon: Autorenew,
    title: 'One new thing a week. That’s the pace.',
    body: 'Keep stacking, one habit a week, only when the last one’s holding. It feels slow — it’s supposed to. In three months that’s a dozen small things on autopilot. More real change than any January overhaul ever delivered.',
  },
]

const KEEP_GOING = [
  {
    Icon: AccessTime,
    title: 'Small still counts',
    body: 'Don’t plan for the life you wish you had. Plan for the Tuesday you actually have. The guy who does the small version on a busy week beats the guy who does nothing.',
  },
  {
    Icon: FavoriteBorder,
    title: 'Keep your “why” close',
    body: 'Write down why this matters and why now — be specific. Keep it on your phone. Read it when the 8pm temptation hits. Motivation fades; a written why holds.',
  },
  {
    Icon: Replay,
    title: 'Setbacks are normal',
    body: 'You’ll miss days. Everyone does. A missed day isn’t a relapse, it’s a Tuesday. Don’t wait for Monday — restart at the next meal, the next walk, today.',
  },
]

const TRUST = ['Free — no credit card', 'No app to download', 'Built for men 40+', 'Takes 2 minutes']

export default function LifestyleGuide() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  // Source/campaign attribution from the ad URL; falls back to the page name.
  const [source] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      return p.get('utm_campaign') || p.get('source') || 'lifestyle_guide_page'
    } catch {
      return 'lifestyle_guide_page'
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
      setStatus('sent')
    } catch (err) {
      console.error('Lifestyle guide lead capture failed:', err)
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
            For men 40+ told to “make some lifestyle changes”
          </Badge>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Your doctor said “lifestyle changes.”
            <span className="text-summit-lime"> Here’s exactly how.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            A no-overhaul method, one small habit at a time — the way that actually sticks. Get the
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

        {/* Founder video */}
        <section>
          <SectionEyebrow>From the founder</SectionEyebrow>
          <h2 className="mb-5 text-2xl font-bold text-summit-forest">90 seconds on why I built this</h2>
          {/* Portrait clip (9:16, 240x426): fill the card width on mobile, cap + center on desktop */}
          <div className="mx-auto w-full sm:max-w-[380px]">
            <div
              className="relative w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5"
              style={{ paddingTop: '177.5%' }}
            >
              <iframe
                src={FOUNDER_VIDEO_EMBED}
                title="Why I built Summit"
                className="absolute inset-0 h-full w-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* The method — the centerpiece, as a visual sequence */}
        <section>
          <SectionEyebrow>The method</SectionEyebrow>
          <h2 className="mb-7 text-2xl font-bold text-summit-forest sm:text-3xl">
            Four steps. One thing at a time.
          </h2>
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

        {/* Proof / founder conviction band (honest — founder's own words, not a fabricated review).
            TODO(eric): when you have a real user result/quote, add it as a testimonial here. */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-10 text-center sm:px-10">
          <p className="mx-auto max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">
            “I built the coach I went looking for and couldn’t find. Direct, no shame, still there on
            the days that get away from you.”
          </p>
          <p className="mt-4 text-sm font-medium text-summit-lime">Eric — Summit founder</p>
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
              <strong className="text-summit-forest">Coaching, not medical advice.</strong> The actual
              numbers — cholesterol, blood pressure, labs — belong to you and your care team. This is
              about the habits underneath them.
            </span>
          </p>
        </section>

        {/* Worksheet teaser + second capture */}
        <section className="rounded-3xl bg-summit-sage/50 px-6 py-10 sm:px-10">
          <div className="text-center">
            <SectionEyebrow>The take-home</SectionEyebrow>
            <h2 className="text-2xl font-bold text-summit-forest sm:text-3xl">
              Page 2 is your starting plan
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
              The PDF’s second page is a fill-in worksheet — list your candidates, pick the one to
              start, decide when and where, and write your why. Print it or fill it on your phone.
            </p>
          </div>
          <div className="mt-7">{renderCapture('worksheet')}</div>
        </section>

        {/* Footer CTA → Summit trial (bookends the dark hero) */}
        <section className="rounded-3xl bg-gradient-to-br from-summit-forest to-summit-pine px-6 py-12 text-center sm:px-10">
          <h2 className="mx-auto max-w-xl text-2xl font-bold text-white sm:text-3xl">
            Want a coach in your corner for the part that’s actually hard?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">
            Summit nudges you over text, adjusts when life gets loud, and keeps your why in front of
            you. The guide is step one. This is the follow-through.
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
