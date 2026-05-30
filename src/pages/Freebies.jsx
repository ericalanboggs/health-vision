import { useState, useEffect } from 'react'
import { CheckCircle } from '@mui/icons-material'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Banner, buttonVariants } from '@summit/design-system'
import { trackEvent } from '../lib/posthog'

const FREEBIE_SLUG = 'summit-weekly-reflection'
const ZIP_PATH = `/freebies/${FREEBIE_SLUG}.zip`

const WHAT_IT_DOES = [
  {
    title: 'Find your summit',
    body: 'A one-time vision — what better health actually looks like for you a year out, and why it matters.',
  },
  {
    title: 'Run weekly experiments',
    body: 'Not goals. Not commitments. Pick 1–3 small things, sized to the week you actually have. The framing is the point.',
  },
  {
    title: 'Reflect every Sunday',
    body: 'What went well, what you skipped, one thing to change. Then set the next week.',
  },
]

// The screenshottable demo — a short transcript in the Summit voice.
const TRANSCRIPT = [
  { who: 'coach', text: "Before we build anything, let's find your summit. A year from now, what does better health actually look like for you? Paint the picture." },
  { who: 'you', text: 'Honestly? Having the energy to get on the floor and play with my kids without my back screaming.' },
  { who: 'coach', text: "That's a good one — specific and it matters. So this week, one experiment, not a commitment: what's one small thing you could try that nudges toward that? Realistic, not heroic." },
  { who: 'you', text: 'Maybe a short walk after dinner?' },
  { who: 'coach', text: 'Love it. A 10-minute walk after dinner. Which days do you want to try it? 💪' },
]

const INSTALL_STEPS = [
  {
    platform: 'Claude Code',
    step: 'Unzip into ~/.claude/skills/ and say "start my weekly reflection."',
  },
  {
    platform: 'Claude.ai Project',
    step: 'Paste the reference files, then SKILL.md, into your Project instructions.',
  },
  {
    platform: 'ChatGPT',
    step: 'Build a Custom GPT and paste the reference files + SKILL.md as its instructions.',
  },
]

export default function Freebies() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  // Page-view event for the marketing funnel (PostHog also auto-captures pageviews).
  useEffect(() => {
    trackEvent('freebie_page_viewed', { freebie_slug: FREEBIE_SLUG })
  }, [])

  // Fire on every download click. Soft capture: the download always proceeds.
  const handleDownload = (location) => {
    trackEvent('freebie_download_clicked', {
      freebie_slug: FREEBIE_SLUG,
      location,
      has_email: status === 'sent',
    })
  }

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
        body: JSON.stringify({ email: trimmed, freebieSlug: FREEBIE_SLUG, source: 'freebies_page' }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error || `Request failed: ${res.status}`)

      trackEvent('freebie_lead_captured', { freebie_slug: FREEBIE_SLUG })
      setStatus('sent')
    } catch (err) {
      console.error('Freebie lead capture failed:', err)
      // Soft capture — never block the user. The download buttons still work.
      setErrorMsg("Couldn't send the email just now, but your download below works fine.")
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAF9] to-[#EEF3F1]">
      <div className="w-full bg-summit-mint py-3 text-center">
        <p className="text-body-sm font-semibold text-summit-forest">
          🎁 A free coach you can install on the AI you already use
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <img src="/summit-logo.png" alt="Summit" className="w-28 mx-auto mb-6" />
          <h1 className="text-h1 text-summit-forest mb-4">
            A pocket-sized version of Summit's coach. Free.
          </h1>
          <p className="text-body text-summit-forest max-w-xl mx-auto">
            A short weekly ritual that fits the ten minutes you actually have. Capture a vision, pick
            1–3 small experiments sized to your week, and reflect every Sunday — coached in a real
            voice, on whatever AI you already use.
          </p>
          <div className="mt-8">
            <a
              href={ZIP_PATH}
              download
              onClick={() => handleDownload('hero')}
              className={buttonVariants({ variant: 'primary', size: 'xl' })}
            >
              Download the skill
            </a>
            <p className="text-xs text-text-secondary mt-3">Free · No account · ~2-minute setup</p>
          </div>

          {/* Optional soft email capture — download above never depends on this */}
          <div className="mt-8 max-w-md mx-auto text-left">
            {status === 'sent' ? (
              <Banner variant="success">
                Sent! 📬 Check your inbox for the download link and setup tips.
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
                  variant="secondary"
                  size="lg"
                  loading={status === 'loading'}
                  disabled={status === 'loading'}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  Email me the link
                </Button>
              </form>
            )}
            {status !== 'sent' && (
              <p className="text-xs text-text-secondary mt-2 text-center sm:text-left">
                Optional — get the link in your inbox plus occasional tips and new freebies.
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-feedback-error mt-2 text-center sm:text-left">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* What it does */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">How it works</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-5">
            {WHAT_IT_DOES.map(({ title, body }, i) => (
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

        {/* What it looks like — the demo */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">What it looks like</CardTitle>
          </CardHeader>
          <CardContent className="mt-5 space-y-3">
            {TRANSCRIPT.map(({ who, text }, i) => (
              <div key={i} className={who === 'you' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    who === 'you'
                      ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-summit-pine px-4 py-2.5 text-body-sm text-white'
                      : 'max-w-[80%] rounded-2xl rounded-bl-sm bg-summit-sage px-4 py-2.5 text-body-sm text-summit-forest'
                  }
                >
                  {text}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* The responsible line */}
        <Card variant="outlined" className="mb-8">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-summit-emerald flex-shrink-0" />
              <span className="text-body-sm text-text-secondary">
                <strong className="text-summit-forest">Wellness, not medicine.</strong> It coaches
                habits — it won't interpret symptoms, lab numbers, or medications. Those go to your
                care team.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-summit-emerald flex-shrink-0" />
              <span className="text-body-sm text-text-secondary">
                <strong className="text-summit-forest">Your data stays with you.</strong> No account,
                no backend. Everything lives in a short note you keep.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Install quickstart */}
        <Card variant="outlined" className="mb-8">
          <CardHeader>
            <CardTitle as="h2">Install in about two minutes</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            {INSTALL_STEPS.map(({ platform, step }) => (
              <div key={platform} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-32 text-body-sm font-semibold text-summit-forest pt-0.5">
                  {platform}
                </div>
                <p className="text-body-sm text-text-secondary">{step}</p>
              </div>
            ))}
            <p className="text-body-sm text-text-secondary pt-2">
              The download includes step-by-step <code>INSTALL.md</code> for each platform.
            </p>
          </CardContent>
        </Card>

        {/* Download + footer */}
        <div className="text-center">
          <a
            href={ZIP_PATH}
            download
            onClick={() => handleDownload('footer')}
            className={buttonVariants({ variant: 'primary', size: 'xl' })}
          >
            Download the skill
          </a>
          <p className="text-body-sm text-text-secondary mt-6">
            Want the full experience? Summit brings this same coaching to daily text check-ins that
            hold the thread when life gets loud, plus challenges and reminders that actually sound
            human.{' '}
            <a href="https://summithealth.app" className="text-summit-pine underline font-semibold">
              See Summit
            </a>
          </p>
        </div>

      </main>
    </div>
  )
}
