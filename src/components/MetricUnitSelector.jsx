import { Select } from '@summit/design-system'
import { METRIC_UNITS, getUnitsByCategory, CATEGORY_LABELS } from '../constants/metricUnits'

/**
 * MetricUnitSelector - Dropdown for selecting metric units
 * Organized by category (Volume, Weight, Distance, etc.)
 */
export default function MetricUnitSelector({
  value,
  onChange,
  disabled = false,
  label,
  helperText,
  errorMessage,
  size = 'md',
  className = ''
}) {
  const unitsByCategory = getUnitsByCategory()
  const categories = Object.keys(unitsByCategory)

  return (
    <Select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
      size={size}
      className={className}
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
    </Select>
  )
}
