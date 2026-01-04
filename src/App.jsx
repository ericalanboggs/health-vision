import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CompassApp from './components/CompassApp'
import Home from './pages/Home'
import Login from './pages/Login'
import PilotIntake from './pages/PilotIntake'
import ProfileSetup from './pages/ProfileSetup'
import Profile from './pages/Profile'
import Start from './pages/Start'
import Vision from './pages/Vision'
import Habits from './pages/Habits'
import AddHabit from './pages/AddHabit'
import ScheduleHabits from './pages/ScheduleHabits'
import Reflection from './pages/Reflection'
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
        <Route path="/pilot" element={<PilotIntake />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/test" element={<AuthTest />} />
        
        {/* Profile setup - Public for Twilio verification */}
        <Route 
          path="/profile-setup" 
          element={<ProfileSetup />} 
        />
        
        {/* First-time user experience */}
        <Route 
          path="/start" 
          element={
            <ProtectedRoute>
              <Start />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vision" 
          element={
            <ProtectedRoute>
              <Vision />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        {/* Profile - Public for Twilio verification */}
        <Route 
          path="/profile" 
          element={<Profile />} 
        />
        <Route 
          path="/habits" 
          element={
            <ProtectedRoute>
              <Habits />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/add-habit" 
          element={
            <ProtectedRoute>
              <AddHabit />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/schedule-habits" 
          element={
            <ProtectedRoute>
              <ScheduleHabits />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reflection" 
          element={
            <ProtectedRoute>
              <Reflection />
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
