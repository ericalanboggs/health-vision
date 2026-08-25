import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'

// The vision, set as the headline of the payoff screen and underlined a sentence
// at a time.
//
// Why an underline rather than confetti: underlining is what a person does to
// something that matters to them. Confetti says "you completed a form". An
// underline says "read this again". It also forces the eye to take one sentence
// at a time instead of skimming a paragraph, which is the difference between
// seeing your words and recognising them.
//
// WHY THIS IS AN SVG STROKE AND NOT A DIV.
//
// The first version was a rounded rectangle scaling in from the left. It read as
// a bar appearing, not as a line being drawn, and on a sentence that wrapped to
// two lines it only marked the last one — because a single absolutely positioned
// element can only sit under the bottom of the box, not under each line of text.
//
// So this measures the real line boxes with Range.getClientRects(), one per
// visual line, and draws a slightly uneven stroke along each. The unevenness is
// deterministic per line rather than random, so it does not jitter on re-render.
// stroke-dashoffset does the drawing, which is what makes it read as a pen
// moving rather than a shape resizing.
//
// The whole paragraph is visible from the first frame. The animation adds
// emphasis, it never gates reading — a slow reader, a screen reader, or anyone
// with motion turned off gets the same content at the same moment.

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

// A hand-drawn-ish stroke along one line box. Dips a little in the middle and
// lifts at the end, the way a quick pen line does. Amplitude is derived from the
// index so a given line always draws the same way.
const linePath = (x, y, width, seed) => {
  const wobble = 1.1 + ((seed % 3) * 0.35)
  const lift = 0.6 + ((seed % 2) * 0.5)
  const midX = x + width / 2
  return [
    `M ${x} ${y}`,
    `Q ${x + width * 0.28} ${y + wobble} ${midX} ${y + wobble * 0.45}`,
    `T ${x + width} ${y - lift}`,
  ].join(' ')
}

function Sentence({ text, active, index }) {
  const wrapRef = useRef(null)
  const textRef = useRef(null)
  const [lines, setLines] = useState([])

  // Measure the real line boxes. Re-runs on resize because the number of lines
  // changes with the viewport, and a stale path would underline nothing.
  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current
      const node = textRef.current?.firstChild
      if (!wrap || !node) return
      const range = document.createRange()
      range.selectNodeContents(textRef.current)
      const base = wrap.getBoundingClientRect()
      const rects = Array.from(range.getClientRects())
        .filter(r => r.width > 1)
        .map(r => ({
          x: r.left - base.left,
          // Sit just under the baseline. rect.bottom includes descender space,
          // so back off a touch or the stroke floats away from the text.
          y: r.bottom - base.top - 4,
          width: r.width,
        }))
      setLines(rects)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [text])

  return (
    <span ref={wrapRef} className="relative inline-block">
      <span
        ref={textRef}
        className="text-[1.625rem] sm:text-[2rem] font-medium leading-[1.35] tracking-[-0.02em] text-summit-forest"
      >
        {text}
      </span>

      {lines.length > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          style={{
            opacity: active ? 1 : 0,
            transition: `opacity ${active ? DRAW_MS : FADE_MS}ms ease`,
          }}
        >
          {lines.map((line, i) => {
            // Rough length; only needs to exceed the true path length for the
            // dash trick to hide it completely before drawing.
            const len = line.width + 12
            return (
              <path
                key={i}
                d={linePath(line.x, line.y, line.width, index + i)}
                stroke="currentColor"
                className="text-summit-emerald"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                style={{
                  strokeDasharray: len,
                  strokeDashoffset: active ? 0 : len,
                  // Lines draw in sequence, so a wrapped sentence reads left to
                  // right and top to bottom the way it is read.
                  transition: active
                    ? `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.33, 0.8, 0.4, 1) ${i * 140}ms`
                    : 'none',
                }}
              />
            )
          })}
        </svg>
      )}
    </span>
  )
}

export default function VisionStatement({ text }) {
  const sentences = useMemo(() => toSentences(text), [text])
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

      <div className="space-y-3">
        {sentences.map((sentence, i) => (
          <div key={i} className="text-center">
            <Sentence text={sentence} active={active === i} index={i} />
          </div>
        ))}
      </div>

      {/* Demoted from the h1 it used to be. The vision is the headline here, the
          way it is on the downloadable PDF — the two should agree about what the
          important thing on the page is. */}
      <p className="text-body-sm text-text-tertiary text-center mt-6">
        Here's what you just described.
      </p>
    </div>
  )
}
