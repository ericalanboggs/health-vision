import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Save, Loader2, CheckCircle } from 'lucide-react'
import { saveReflection, getCurrentWeekReflection } from '../services/reflectionService'
import { getCurrentWeekNumber, getCurrentWeekDateRange } from '../utils/weekCalculator'

export default function Reflection() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weekNumber, setWeekNumber] = useState(1)
  const [weekDateRange, setWeekDateRange] = useState('')
  const [reflection, setReflection] = useState({
    went_well: '',
    friction: '',
    adjustment: ''
  })

  useEffect(() => {
    loadReflection()
  }, [])

  const loadReflection = async () => {
    setLoading(true)
    const week = getCurrentWeekNumber()
    const dateRange = getCurrentWeekDateRange()
    setWeekNumber(week)
    setWeekDateRange(dateRange)

    const { success, data } = await getCurrentWeekReflection()
    if (success && data) {
      setReflection({
        went_well: data.went_well || '',
        friction: data.friction || '',
        adjustment: data.adjustment || ''
      })
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setReflection(prev => ({
      ...prev,
      [field]: value
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    const { success } = await saveReflection(weekNumber, reflection)
    
    if (success) {
      setSaved(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } else {
      alert('Failed to save reflection. Please try again.')
    }
    
    setSaving(false)
  }

  const isComplete = reflection.went_well.trim() && 
                     reflection.friction.trim() && 
                     reflection.adjustment.trim()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <p className="text-stone-600">Loading reflection...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Weekly Reflection</h1>
          <p className="text-stone-600">
            Week {weekNumber} ({weekDateRange})
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900">This Week's Check-In</h2>
              <p className="text-sm text-stone-600 mt-1">
                Take a moment to reflect on your week. No judgment—just learning.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Question 1: What went well */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <label className="block text-lg font-semibold text-stone-900 mb-2">
                What went well this week?
              </label>
              <p className="text-sm text-stone-600 mb-3">
                What worked? What felt good? What surprised you in a positive way?
              </p>
              <textarea
                value={reflection.went_well}
                onChange={(e) => handleChange('went_well', e.target.value)}
                className="w-full h-32 p-4 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none bg-white"
                placeholder="I stuck to my morning walks on Monday and Wednesday. I felt more energized..."
              />
            </div>

            {/* Question 2: What was challenging */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <label className="block text-lg font-semibold text-stone-900 mb-2">
                What friction or challenges came up?
              </label>
              <p className="text-sm text-stone-600 mb-3">
                What got in the way? What felt harder than expected? What barriers showed up?
              </p>
              <textarea
                value={reflection.friction}
                onChange={(e) => handleChange('friction', e.target.value)}
                className="w-full h-32 p-4 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white"
                placeholder="Thursday was really busy at work and I skipped my planned walk. I felt tired in the evenings..."
              />
            </div>

            {/* Question 3: What to adjust */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <label className="block text-lg font-semibold text-stone-900 mb-2">
                What will you adjust or try differently next week?
              </label>
              <p className="text-sm text-stone-600 mb-3">
                Based on what you learned, what small change makes sense? What feels doable?
              </p>
              <textarea
                value={reflection.adjustment}
                onChange={(e) => handleChange('adjustment', e.target.value)}
                className="w-full h-32 p-4 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                placeholder="I'll try morning walks instead of evening. Maybe just 5 minutes on busy days instead of skipping..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            {saved ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Reflection Saved!</p>
                    <p className="text-sm text-green-700">Redirecting you back to dashboard...</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !isComplete}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Reflection
                  </>
                )}
              </button>
            )}
            
            {!isComplete && !saved && (
              <p className="text-sm text-stone-500 mt-3">
                Please answer all three questions before saving.
              </p>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 bg-stone-100 border-l-4 border-stone-400 p-5 rounded-r-lg">
          <h4 className="font-semibold text-stone-900 mb-2">💡 Why Weekly Reflections?</h4>
          <p className="text-sm text-stone-700">
            Research shows that people who reflect on their progress weekly are more likely to stick with new habits. 
            This isn't about perfection—it's about learning what works for <em>you</em>.
          </p>
        </div>
      </main>
    </div>
  )
}
