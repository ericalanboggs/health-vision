import { useEffect, useRef, useState } from 'react'
import { Close, Share, ContentCopy, Check } from '@mui/icons-material'
import { Button } from '@summit/design-system'
import confetti from 'canvas-confetti'

export default function ChallengeCelebrationModal({ isOpen, onClose, onViewResults, challenge, habitLog }) {
  const hasFired = useRef(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && !hasFired.current) {
      hasFired.current = true
      const defaults = { startVelocity: 30, spread: 60, ticks: 80, zIndex: 100 }
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.6 }, angle: 60 })
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.6 }, angle: 120 })
      // Second burst for extra celebration
      setTimeout(() => {
        confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 }, angle: 90, spread: 120 })
      }, 300)
    }
  }, [isOpen])

  if (!isOpen || !challenge) return null

  const shareText = `I just completed the ${challenge.title} challenge on Summit Health! 4 weeks of building better habits.`
  const shareUrl = `${window.location.origin}/challenges/${challenge.slug}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${challenge.title} Complete!`, text: shareText, url: shareUrl })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  // Group habit log by week with focus area titles
  const weekHabits = (habitLog || []).map(h => {
    const fa = challenge.focusAreas.find(f => f.slug === h.focus_area_slug)
    return { ...h, focusTitle: fa?.title || h.focus_area_slug }
  })

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-summit-forest hover:bg-summit-mint rounded-lg transition"
              aria-label="Close"
            >
              <Close className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-5xl block mb-3">{challenge.icon}</span>
              <h2 className="text-h2 text-summit-forest mb-1">
                Congratulations!
              </h2>
              <p className="text-body text-text-secondary">
                You completed <strong>{challenge.title}</strong> — 4 weeks of building real habits.
              </p>
            </div>
          </div>

          {/* Habits summary */}
          <div className="px-6 pb-2">
            <div className="bg-summit-mint rounded-lg p-4 border border-summit-sage">
              <p className="text-sm font-semibold text-summit-forest mb-3">Your 4-week journey:</p>
              <div className="space-y-2">
                {weekHabits.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-summit-emerald text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                      {'\u2713'}
                    </span>
                    <span className="text-summit-forest">
                      <strong>Week {h.week_number}</strong> ({h.focusTitle}): {h.habit_name}
                    </span>
                  </div>
                ))}
                {weekHabits.length === 0 && (
                  <p className="text-sm text-text-secondary">
                    4 weeks of consistent effort — that takes real commitment.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Share section */}
          <div className="px-6 py-4">
            <p className="text-sm text-text-secondary text-center mb-3">Share your accomplishment</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ContentCopy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-2">
            <Button
              onClick={() => {
                onClose()
                if (onViewResults) onViewResults()
              }}
              size="lg"
              className="w-full bg-summit-emerald hover:bg-emerald-700 text-white"
            >
              View Your Results
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
