import { useState, useEffect, useMemo } from 'react'

// The vision, set as the headline of the payoff screen and underlined a sentence
// at a time.
//
// Why an underline rather than confetti: underlining is what a person does to
// something that matters to them. Confetti says "you completed a form". An
// underline says "read this again". It also forces the eye to take one sentence
// at a time instead of skimming a paragraph, which is the difference between
// seeing your words and recognising them.
//
// The whole paragraph is visible from the first frame. The animation adds
// emphasis, it never gates reading — so a slow reader, a screen reader, or
// anyone with motion turned off gets the same content at the same moment.

const DRAW_MS = 600
const HOLD_MS = 2200
const FADE_MS = 400
const STEP_MS = DRAW_MS + HOLD_MS + FADE_MS

// Split on sentence enders without lookbehind, which Safari only picked up
// relatively recently. Falls back to the whole string if there's no punctuation.
const toSentences = (text) => {
  const matches = (text || '').match(/[^.!?]+[.!?]+/g)
  return matches ? matches.map(s => s.trim()).filter(Boolean) : [text].filter(Boolean)
}

export default function VisionStatement({ text }) {
  const sentences = useMemo(() => toSentences(text), [text])

  // -1 means "nothing underlined yet"; sentences.length means "finished".
  const [active, setActive] = useState(-1)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = (e) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion || sentences.length === 0) return

    // Runs once and stops. A loop would turn a moment into a distraction sitting
    // directly above the founder video.
    const timers = sentences.map((_, i) =>
      setTimeout(() => setActive(i), 400 + i * STEP_MS)
    )
    timers.push(
      setTimeout(() => setActive(sentences.length), 400 + sentences.length * STEP_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [sentences, reducedMotion])

  if (!text) return null

  return (
    <div className="mb-8">
      <p className="text-body-sm text-summit-emerald font-medium uppercase tracking-wide mb-3 text-center">
        Your vision
      </p>

      <div className="space-y-2">
        {sentences.map((sentence, i) => (
          <div key={i} className="text-center">
            {/* The wrapper is inline-block so it shrinks to the text. An underline
                pinned to the full-width container reads as a divider rule rather
                than as underlining, which is the whole point of the gesture. */}
            <span className="relative inline-block text-[1.625rem] sm:text-[2rem] font-medium leading-[1.3] tracking-[-0.02em] text-summit-forest">
              {sentence}
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-1.5 h-[3px] rounded-full bg-summit-emerald origin-left"
                style={{
                  transform: active === i ? 'scaleX(1)' : 'scaleX(0)',
                  opacity: active === i ? 1 : 0,
                  transitionDuration: active === i ? `${DRAW_MS}ms, ${DRAW_MS}ms` : `0ms, ${FADE_MS}ms`,
                  transitionProperty: 'transform, opacity',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </span>
          </div>
        ))}
      </div>

      {/* Demoted from the h1 it used to be. The vision is the headline here, the
          way it is on the downloadable PDF — the two should agree about what the
          important thing on the page is. */}
      <p className="text-body-sm text-text-tertiary text-center mt-5">
        Here's what you just described.
      </p>
    </div>
  )
}
