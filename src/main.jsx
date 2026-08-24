import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { initPostHog, identifyUser, resetUser, applyOptOutFromUrl } from './lib/posthog'
import { onAuthStateChange } from './services/authService'

// Initialize PostHog analytics
initPostHog()
applyOptOutFromUrl()

// Tie analytics sessions to the account once someone signs in.
//
// identifyUser existed but was never called anywhere, which had two
// consequences: with person_profiles: 'identified_only' no person profile was
// ever created, so every user stayed an anonymous UUID forever; and no person
// property was ever set, so there was nothing to filter internal testing on.
//
// Lives here rather than in a component so it runs once for the whole app,
// regardless of which route someone lands on.
onAuthStateChange((event, session) => {
  if (session?.user?.id) {
    identifyUser(session.user.id, { email: session.user.email })
  } else if (event === 'SIGNED_OUT') {
    // Stop attributing a shared browser's later activity to the person who
    // just left.
    resetUser()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
