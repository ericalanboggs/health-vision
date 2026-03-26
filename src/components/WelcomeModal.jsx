import { useEffect, useRef } from 'react'
import { Close } from '@mui/icons-material'
import { Button } from '@summit/design-system'
import confetti from 'canvas-confetti'

export default function WelcomeModal({ isOpen, onClose }) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (isOpen && !hasFired.current) {
      hasFired.current = true
      // Fire confetti burst from both sides
      const defaults = { startVelocity: 30, spread: 60, ticks: 80, zIndex: 100 }
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.6 }, angle: 60 })
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.6 }, angle: 120 })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
              aria-label="Close"
            >
              <Close className="w-5 h-5" />
            </button>
            <div className="text-center pr-0">
              <img src="/summit-logo.png" alt="Summit" className="w-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-summit-forest mb-1">
                Welcome to Base Camp!
              </h2>
              <p className="text-body text-text-secondary">
                You just took a big first step. That matters.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-2 space-y-4">
            <p className="text-stone-700 leading-relaxed">
              Your dashboard is your home base. From here you can track habits, reflect on your week, and access personalized resources — all designed to meet you where you are.
            </p>

            <div className="bg-summit-mint rounded-lg p-4 border border-summit-sage">
              <p className="text-sm font-semibold text-summit-forest mb-2">Here's what happens next:</p>
              <ul className="space-y-1.5 text-sm text-stone-700">
                <li className="flex items-start gap-2">
                  <span className="text-summit-emerald flex-shrink-0 mt-0.5">&#10003;</span>
                  <span>We'll send you gentle SMS reminders to help you stay consistent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-summit-emerald flex-shrink-0 mt-0.5">&#10003;</span>
                  <span>Each week, you'll get a quick reflection prompt to check in with yourself</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-summit-emerald flex-shrink-0 mt-0.5">&#10003;</span>
                  <span>Personalized resources will show up in your Guides section over time</span>
                </li>
              </ul>
            </div>

            <p className="text-summit-forest font-medium text-center pt-2">
              Small steps. Consistent progress. You've got this.
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4">
            <Button
              onClick={onClose}
              size="lg"
              className="w-full bg-summit-emerald hover:bg-emerald-700 text-white"
            >
              Let's Go!
            </Button>
            <p className="text-xs text-text-muted text-center mt-3">
              Questions anytime? Email help@summithealth.app
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
