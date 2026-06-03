// Acquisition attribution — captures where a user came from (which marketing
// landing page / campaign) and persists it across the Supabase auth redirect.
//
// Why localStorage: Google OAuth (and email confirmation) bounce the user off
// our origin and back through /auth/callback, dropping the original URL's query
// params. So we stash the source the moment they land — before any redirect —
// and read it back when the profile is created (ProfileSetup).
//
// Framer CTAs link in with a tag, e.g.:
//   https://go.summithealth.app/login?source=burnout
//   ?source=postpartum  ·  ?source=lifestyle-changes
// The tag drives segment-tailored onboarding — see src/data/onboardingSegments.js.
// Standard UTM params also work: ?utm_campaign=burnout (used as a fallback).

const STORAGE_KEY = 'summit_acquisition'
const MAX_LEN = 120 // sanity cap on any stored string

function clean(value) {
  if (!value) return null
  const trimmed = String(value).trim().slice(0, MAX_LEN)
  return trimmed || null
}

/**
 * Read attribution params from the current URL and persist them (last-touch
 * before signup wins). No-op when no relevant param is present, so it's safe to
 * call on every navigation. Stores a small JSON blob in localStorage.
 */
export const captureAcquisitionFromUrl = (search = window.location.search) => {
  try {
    const params = new URLSearchParams(search)
    const source = clean(params.get('source'))
    const utm_source = clean(params.get('utm_source'))
    const utm_medium = clean(params.get('utm_medium'))
    const utm_campaign = clean(params.get('utm_campaign'))

    // Nothing attribution-relevant on this URL — leave any prior capture intact.
    if (!source && !utm_source && !utm_medium && !utm_campaign) return

    const record = {
      source: source || utm_campaign || utm_source || null,
      utm_source,
      utm_medium,
      utm_campaign,
      landing_path: clean(window.location.pathname),
      captured_at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch (err) {
    // localStorage can throw in private mode / SSR — attribution is best-effort.
    console.warn('captureAcquisitionFromUrl failed:', err)
  }
}

/** Full captured record, or null. */
export const getAcquisition = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Just the source slug (e.g. "burnout"), or null. */
export const getAcquisitionSource = () => getAcquisition()?.source || null

/** Clear after it's been written to the profile, so it can't bleed into a later signup. */
export const clearAcquisition = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
