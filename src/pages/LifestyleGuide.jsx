import { useState, useEffect } from 'react'
import { CheckCircle } from '@mui/icons-material'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Banner, buttonVariants } from '@summit/design-system'
import { trackEvent } from '../lib/posthog'

// Email-first opt-in landing for the cold men-40+ ad funnel. The lead magnet is
// the Lifestyle Changes Guide PDF; this page also renders the guide's method as
// a readable web version so the page has value with or without opting in.
// Capture flows into `capture-freebie-lead` → the freebie nurture drip → trial.

const FREEBIE_SLUG = 'lifestyle-changes-guide'
const PDF_PATH = `/freebies/${FREEBIE_SLUG}.pdf`
const TRIAL_URL = 'https://summithealth.app/use-cases/lifestyle-changes'
const FOUNDER_VIDEO_EMBED = 'https://player.vimeo.com/video/1200892364'

const STEPS = [
  {
    title: 'Get it all on paper',
    body: 'List what your doctor named and what you’ve been avoiding — moving more, the nightly drinks, sleep, late-night carbs. Aim for 3–6. This isn’t a to-do list. It’s a menu, and you’re going to pick one.',
  },
  {
    title: 'Pick ONE. Decide when and where.',
    body: 'Most plans die because people pick five. Pick the smallest, most can’t-fail one — then make it real: “10-minute walk after dinner.” Pin it to something you already do. Run it a week and watch what happens. You’re experimenting, not signing a contract.',
  },
  {
    title: 'Week went well? Add the next one.',
    body: 'If it held — even mostly — keep it and add the second thing. If it didn’t, don’t add anything. Shrink the first one until it’s almost too easy and run it again. A 2-minute walk beats a skipped 30-minute one.',
  },
  {
    title: 'One new thing a week. That’s the pace.',
    body: 'Keep stacking, one habit a week, only when the last one’s holding. It feels slow — it’s supposed to. In three months that’s a dozen small things on autopilot. More real change than any January overhaul ever delivered.',
  },
]

const KEEP_GOING = [
  {
    title: 'Be honest about your time — small still counts.',
    body: 'Don’t plan for the life you wish you had. Plan for the Tuesday you actually have. The guy who does the small version on a busy week beats the guy who does nothing because he couldn’t do the big one.',
  },
  {
    title: 'Keep your “why” close.',
    body: 'Write down why this matters and why now — be specific. “On the floor with my kids without my back screaming.” Keep it on your phone. Read it when the 8pm temptation hits. Motivation fades; a written why holds.',
  },
  {
    title: 'Setbacks are normal — get back on the horse.',
    body: 'You’ll miss days. Everyone does. A missed day isn’t a relapse, it’s a Tuesday. Don’t wait for Monday — restart at the next meal, the next walk, today.',
  },
]

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

  // The email form (hero) + post-capture download. Reused at top and bottom.
  const CaptureBlock = ({ location }) => (
    <div className="max-w-md mx-auto text-left">
      {status === 'sent' ? (
        <Banner variant="success">
          On its way 📬 Check your inbox for the guide. Grab the PDF below too.
        </Banner>
      ) : (
        <form onSubmit={handleCapture} className="flex flex-col sm:flex-row gap-2 items-start">
          <div className="flex-1 w-full">
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
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Email me the guide
          </Button>
        </form>
      )}
      {status !== 'sent' && (
        <p className="text-xs text-text-secondary mt-2 text-center sm:text-left">
          Free 2-page PDF + worksheet. We&apos;ll also send a few short tips. Unsubscribe anytime.
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-feedback-error mt-2 text-center sm:text-left">{errorMsg}</p>
      )}
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAF9] to-[#EEF3F1]">
      <div className="w-full bg-summit-mint py-3 text-center">
        <p className="text-body-sm font-semibold text-summit-forest">
          For men 40+ who were told to make &ldquo;lifestyle changes&rdquo; — and weren&apos;t told how
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <img src="/summit-logo.png" alt="Summit" className="w-28 mx-auto mb-6" />
          <h1 className="text-h1 text-summit-forest mb-4">
            Your doctor said &ldquo;lifestyle changes.&rdquo; Here&apos;s exactly how.
          </h1>
          <p className="text-body text-summit-forest max-w-xl mx-auto">
            A no-overhaul method for men 40+. One small habit at a time — the way that actually
            sticks. Get the free 2-page guide and worksheet, and I&apos;ll walk you through it.
          </p>
          <div className="mt-8">
            <CaptureBlock location="hero" />
          </div>
        </div>

        {/* Founder video */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">90 seconds on why I built this</CardTitle>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={FOUNDER_VIDEO_EMBED}
                title="Why I built Summit"
                className="absolute inset-0 h-full w-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>

        {/* The method */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">The method, in four steps</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-5">
            {STEPS.map(({ title, body }, i) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-summit-mint flex items-center justify-center text-body-sm font-bold text-summit-forest">
                  {i + 1}
                </div>
                <div>
                  <p className="text-body font-semibold text-summit-forest">{title}</p>
                  <p className="text-body-sm text-text-secondary">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Three things that keep it going */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">Three things that keep it going</CardTitle>
          </CardHeader>
          <CardContent className="mt-5 space-y-5">
            {KEEP_GOING.map(({ title, body }) => (
              <div key={title}>
                <p className="text-body font-semibold text-summit-forest">{title}</p>
                <p className="text-body-sm text-text-secondary">{body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clinical guardrail */}
        <Card variant="outlined" className="mb-8">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-summit-emerald flex-shrink-0" />
              <span className="text-body-sm text-text-secondary">
                <strong className="text-summit-forest">Coaching, not medical advice.</strong> The
                actual numbers — cholesterol, blood pressure, labs — belong to you and your care
                team. This is about the habits underneath them.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Worksheet teaser + second capture */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">Page 2 is your starting plan</CardTitle>
          </CardHeader>
          <CardContent className="mt-3 space-y-4">
            <p className="text-body text-text-secondary">
              The PDF&apos;s second page is a fill-in worksheet — list your candidates, pick the one
              to start, decide when and where you&apos;ll do it this week, and write down your why.
              Print it or fill it on your phone and keep it handy.
            </p>
            <CaptureBlock location="worksheet" />
          </CardContent>
        </Card>

        {/* Footer CTA to Summit */}
        <div className="text-center">
          <p className="text-body-sm text-text-secondary mt-6">
            Want a coach who runs this with you — nudges you over text, adjusts when life gets loud,
            and keeps your why in front of you? That&apos;s Summit.{' '}
            <a href={TRIAL_URL} className="text-summit-pine underline font-semibold">
              Try it free for 14 days
            </a>
          </p>
        </div>

      </main>
    </div>
  )
}
