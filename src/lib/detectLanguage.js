// Best-effort detection of the user's coaching language from the browser locale.
// Used to set profiles.preferred_language as an OVERRIDABLE DEFAULT at signup, so an organic
// Spanish/Portuguese signup gets their first touch (OTP, opt-in, coaching) in their language
// without any UI. It's a heuristic, not truth — the Profile picker and admin override are the
// correction path. Maps navigator.languages → the supported set (en / es / pt-BR).

const SUPPORTED = ['en', 'es', 'pt-BR']

export function detectLanguage() {
  try {
    const prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || 'en']
    for (const raw of prefs) {
      const code = String(raw).toLowerCase()
      if (code.startsWith('pt')) return 'pt-BR'
      if (code.startsWith('es')) return 'es'
      if (code.startsWith('en')) return 'en'
    }
  } catch (_e) { /* ignore — fall through to default */ }
  return 'en'
}

export { SUPPORTED }
