import { METRIC_UNITS, getUnitsByCategory, CATEGORY_LABELS } from '../constants/metricUnits'

/**
 * MetricUnitSelector - Dropdown for selecting metric units
 * Organized by category (Volume, Weight, Distance, etc.)
 */
export default function MetricUnitSelector({
  value,
  onChange,
  disabled = false,
  className = ''
}) {
  const unitsByCategory = getUnitsByCategory()
  const categories = Object.keys(unitsByCategory)

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition disabled:bg-stone-100 disabled:cursor-not-allowed ${className}`}
      aria-label="Select metric unit"
    >
      <option value="">Select a unit...</option>
      {categories.map(category => (
        <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
          {unitsByCategory[category].map(unit => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
