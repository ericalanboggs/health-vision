import React, { useState } from 'react'
import LandingPage from './components/LandingPage'
import CompassApp from './components/CompassApp'

function App() {
  const [started, setStarted] = useState(false)

  return (
    <div className="min-h-screen bg-stone-50">
      {!started ? (
        <LandingPage onStart={() => setStarted(true)} />
      ) : (
        <CompassApp onBack={() => setStarted(false)} />
      )}
    </div>
  )
}

export default App
