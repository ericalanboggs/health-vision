import posthog from 'posthog-js'

// Initialize PostHog
export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (apiKey) {
    posthog.init(apiKey, {
      api_host: apiHost,
      // Carry one identity across www.summithealth.app (marketing, summit-web)
      // and go.summithealth.app (this app). Both are subdomains of
      // summithealth.app, so a cookie scoped to the parent domain follows the
      // visitor across the handoff.
      //
      // This only works if BOTH sites use the same PostHog project key. Get it
      // wrong and the numbers still look plausible — the same person counts
      // twice and the homepage -> /plan step reads as zero conversion, which is
      // precisely the step we set analytics up to measure.
      cross_subdomain_cookie: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only', // Only create profiles for identified users
      capture_pageview: true, // Automatically capture pageviews
      capture_pageleave: true, // Capture when users leave
      autocapture: true, // Automatically capture clicks and interactions
      // Session replay is OFF, deliberately (decided 2026-08-24).
      //
      // Summit is a health product. Replay would record people answering
      // questions about their sleep, their lab results, and what they are
      // struggling with. Input masking reduces that exposure but does not remove
      // it, and the funnel questions we actually need answered are answerable
      // from events alone.
      //
      // It is also switched off in the PostHog project settings. Both, on
      // purpose: the dashboard toggle is the one that takes effect, and this
      // flag is the one that records the intent so a future dashboard change
      // does not quietly turn it back on.
      disable_session_recording: true,
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog initialized successfully')
        }
      },
    })
  } else if (import.meta.env.DEV) {
    console.warn('PostHog API key not found. Analytics will not be tracked.')
  }
}

// One-time opt-out for a browser, via ?ph_optout=1 (and ?ph_optin=1 to undo).
//
// Internal-user filtering in PostHog can only key off properties the event
// already carries. Anonymous testing — clicking through the marketing site and
// /plan while logged out — carries nothing that distinguishes it from a real
// visitor, and that is exactly the funnel we care about. So the browser has to
// exclude itself.
//
// opt_out_capturing() persists, so this is visited once per browser and then
// forgotten about.
export const applyOptOutFromUrl = () => {
  if (!posthog.__loaded) return
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ph_optout') === '1') {
      posthog.opt_out_capturing()
      console.log('PostHog: this browser will no longer be tracked.')
    } else if (params.get('ph_optin') === '1') {
      posthog.opt_in_capturing()
      console.log('PostHog: tracking re-enabled for this browser.')
    }
  } catch {
    // URL parsing should never throw, but analytics must never break the app.
  }
}

// Track custom events
export const trackEvent = (eventName, properties = {}) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties)
  }
}

// Identify user (call this when you have user info).
//
// DELIBERATELY NOT SENDING EMAIL. Summit is a health product, and the analytics
// tool does not need to know who anyone is by name to answer the questions we
// are asking it. The Supabase user id is enough to stitch a person's sessions
// together, and it means a breach or a misconfigured share of the analytics
// project exposes opaque UUIDs rather than a list of people using a health
// service.
//
// The one thing we do derive from the email is an is_internal flag, computed
// here and never transmitted, so Eric's own testing can be filtered out of the
// funnel. Set VITE_INTERNAL_EMAILS to a comma-separated list.
export const identifyUser = (userId, { email, ...properties } = {}) => {
  if (!posthog.__loaded || !userId) return

  const internalList = (import.meta.env.VITE_INTERNAL_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  const isInternal = !!email && internalList.includes(email.toLowerCase())

  posthog.identify(userId, {
    ...properties,
    // Always set, so the PostHog filter can be "is_internal is not true" rather
    // than "is not set", which would also exclude everyone anonymous.
    is_internal: isInternal,
  })
}

// Reset user session (call on logout)
export const resetUser = () => {
  if (posthog.__loaded) {
    posthog.reset()
  }
}

export default posthog
