import { useState, useEffect } from 'react'
import { Loader2, Lightbulb, Check, Hash } from 'lucide-react'
import MetricUnitSelector from './MetricUnitSelector'
import { getTrackingConfig, saveTrackingConfig, getAiSuggestion } from '../services/trackingService'
import { getUnitByValue } from '../constants/metricUnits'

/**
 * HabitTrackingConfig - Configuration panel for habit tracking
 * Allows users to choose between boolean (yes/no) and metric tracking
 */
export default function HabitTrackingConfig({
  habitName,
  onConfigSaved,
  onCancel
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false)

  const [trackingType, setTrackingType] = useState('boolean')
  const [metricUnit, setMetricUnit] = useState('')
  const [metricTarget, setMetricTarget] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState(null)

  // Load existing config and AI suggestion on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Load existing config
      const { success, data: existingConfig } = await getTrackingConfig(habitName)

      if (success && existingConfig) {
        setTrackingType(existingConfig.tracking_type || 'boolean')
        setMetricUnit(existingConfig.metric_unit || '')
        setMetricTarget(existingConfig.metric_target?.toString() || '')
      } else {
        // No existing config, fetch AI suggestion
        setLoadingAiSuggestion(true)
        const { success: aiSuccess, data: suggestion } = await getAiSuggestion(habitName)

        if (aiSuccess && suggestion) {
          setAiSuggestion(suggestion)
          // Don't auto-apply, let user choose
        }
        setLoadingAiSuggestion(false)
      }

      setLoading(false)
    }

    loadData()
  }, [habitName])

  const handleApplySuggestion = () => {
    if (!aiSuggestion) return

    setTrackingType(aiSuggestion.tracking_type)
    if (aiSuggestion.unit) {
      setMetricUnit(aiSuggestion.unit)
    }
    if (aiSuggestion.suggested_target) {
      setMetricTarget(aiSuggestion.suggested_target.toString())
    }
  }

  const handleSave = async () => {
    setSaving(true)

    const config = {
      tracking_enabled: true,
      tracking_type: trackingType,
      metric_unit: trackingType === 'metric' ? metricUnit : null,
      metric_target: trackingType === 'metric' && metricTarget ? parseFloat(metricTarget) : null,
      ai_suggested_unit: aiSuggestion?.unit || null
    }

    const { success, error } = await saveTrackingConfig(habitName, config)

    setSaving(false)

    if (success) {
      onConfigSaved?.(config)
    } else {
      console.error('Failed to save config:', error)
      alert('Failed to save tracking configuration. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-600 text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-stone-50">
      <h4 className="font-semibold text-stone-900 mb-4">Tracking Configuration</h4>

      {/* AI Suggestion Banner */}
      {aiSuggestion && !loadingAiSuggestion && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <strong>Suggestion:</strong>{' '}
                {aiSuggestion.tracking_type === 'metric' ? (
                  <>
                    Track with <strong>{getUnitByValue(aiSuggestion.unit)?.label || aiSuggestion.unit}</strong>
                    {aiSuggestion.suggested_target && (
                      <> (target: {aiSuggestion.suggested_target})</>
                    )}
                  </>
                ) : (
                  <>Track with simple Yes/No completion</>
                )}
              </p>
              <p className="text-xs text-amber-700 mt-1">{aiSuggestion.reasoning}</p>
              <button
                onClick={handleApplySuggestion}
                className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 underline"
              >
                Apply suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingAiSuggestion && (
        <div className="mb-4 p-3 bg-stone-100 border border-stone-200 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          <span className="text-sm text-stone-600">Getting smart suggestion...</span>
        </div>
      )}

      {/* Tracking Type Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          How do you want to track this?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTrackingType('boolean')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
              trackingType === 'boolean'
                ? 'bg-green-50 text-green-700 border-green-600'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>Yes / No</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setTrackingType('metric')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
              trackingType === 'metric'
                ? 'bg-green-50 text-green-700 border-green-600'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Hash className="w-4 h-4" />
              <span>Number</span>
            </div>
          </button>
        </div>
      </div>

      {/* Metric Options (only shown when metric is selected) */}
      {trackingType === 'metric' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Unit of measurement
            </label>
            <MetricUnitSelector
              value={metricUnit}
              onChange={setMetricUnit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Daily target <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={metricTarget}
              onChange={(e) => setMetricTarget(e.target.value)}
              placeholder="e.g., 64"
              min="0"
              step="any"
              className="w-full px-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-stone-200">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-stone-600 hover:text-stone-700 hover:bg-stone-100 font-medium rounded-lg border border-stone-300 transition text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || (trackingType === 'metric' && !metricUnit)}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Enable Tracking'
          )}
        </button>
      </div>
    </div>
  )
}
