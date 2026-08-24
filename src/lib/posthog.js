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

// Track custom events
export const trackEvent = (eventName, properties = {}) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties)
  }
}

// Identify user (call this when you have user info)
export const identifyUser = (userId, properties = {}) => {
  if (posthog.__loaded) {
    posthog.identify(userId, properties)
  }
}

// Reset user session (call on logout)
export const resetUser = () => {
  if (posthog.__loaded) {
    posthog.reset()
  }
}

export default posthog
