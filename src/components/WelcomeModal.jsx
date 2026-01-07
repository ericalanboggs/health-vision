import { X } from 'lucide-react'

export default function WelcomeModal({ isOpen, onClose }) {
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
          <div className="relative p-6 pb-4 border-b border-stone-200">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pr-8">
              <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-1">
                Welcome
              </p>
              <h2 className="text-2xl font-bold text-stone-900">
                You're set to go 🎉
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-stone-700 leading-relaxed">
              You're all set.
            </p>
            
            <p className="text-stone-700 leading-relaxed">
              Take a moment to update anything you want right now—or feel free to jump out and get on with your day. Nothing here needs to be perfect.
            </p>
            
            <p className="text-stone-700 leading-relaxed">
              If you opted in to SMS reminders, we'll text you to help you stay consistent with your habits. You'll also receive a weekly reflection reminder to check in and adjust as needed.
            </p>

            {/* Need Help Section */}
            <div className="bg-stone-50 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-stone-900 mb-3">Need help?</h3>
              <ul className="space-y-2 text-sm text-stone-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>For technical issues or product ideas/feedback, text or email Eric</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>For a coaching session, use the booking link on your dashboard</span>
                </li>
              </ul>
            </div>

            <p className="text-stone-900 font-medium text-center pt-4">
              Let's do it. Small steps. Consistent progress.
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-sm hover:shadow"
            >
              Alright!
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
