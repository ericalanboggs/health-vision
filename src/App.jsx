import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CompassApp from './components/CompassApp'
import Home from './pages/Home'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import AuthTest from './pages/AuthTest'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { trackEvent } from './lib/posthog'

// Legacy health journey component wrapper
function HealthJourney() {
  const [started, setStarted] = useState(false)

  const handleStart = () => {
    trackEvent('journey_started')
    setStarted(true)
  }

  const handleBack = () => {
    trackEvent('journey_exited')
    setStarted(false)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {!started ? (
        <LandingPage onStart={handleStart} />
      ) : (
        <CompassApp onBack={handleBack} />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Legacy health journey route */}
        <Route path="/journey" element={<HealthJourney />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/test" element={<AuthTest />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Home route - handles auth redirect */}
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
