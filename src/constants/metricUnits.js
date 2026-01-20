/**
 * Predefined metric units for habit tracking
 * Organized by category for easier selection
 */

export const METRIC_UNITS = [
  { value: 'oz', label: 'Fluid Ounces (oz)', category: 'volume' },
  { value: 'cups', label: 'Cups', category: 'volume' },
  { value: 'liters', label: 'Liters (L)', category: 'volume' },
  { value: 'lbs', label: 'Pounds (lbs)', category: 'weight' },
  { value: 'kg', label: 'Kilograms (kg)', category: 'weight' },
  { value: 'miles', label: 'Miles', category: 'distance' },
  { value: 'km', label: 'Kilometers (km)', category: 'distance' },
  { value: 'steps', label: 'Steps', category: 'count' },
  { value: 'minutes', label: 'Minutes', category: 'time' },
  { value: 'hours', label: 'Hours', category: 'time' },
  { value: 'reps', label: 'Repetitions', category: 'count' },
  { value: 'sets', label: 'Sets', category: 'count' },
  { value: 'servings', label: 'Servings', category: 'nutrition' },
  { value: 'calories', label: 'Calories', category: 'nutrition' },
  { value: 'pages', label: 'Pages', category: 'count' }
]

/**
 * Get units grouped by category for dropdown display
 */
export const getUnitsByCategory = () => {
  const grouped = {}
  METRIC_UNITS.forEach(unit => {
    if (!grouped[unit.category]) {
      grouped[unit.category] = []
    }
    grouped[unit.category].push(unit)
  })
  return grouped
}

/**
 * Get a unit by its value
 */
export const getUnitByValue = (value) => {
  return METRIC_UNITS.find(unit => unit.value === value)
}

/**
 * Category display names
 */
export const CATEGORY_LABELS = {
  volume: 'Volume',
  weight: 'Weight',
  distance: 'Distance',
  time: 'Time',
  count: 'Count',
  nutrition: 'Nutrition'
}

/**
 * Keyword patterns for AI fallback suggestions
 * Maps habit name keywords to suggested tracking configuration
 */
export const KEYWORD_PATTERNS = {
  water: { type: 'metric', unit: 'oz', target: 64 },
  drink: { type: 'metric', unit: 'oz', target: 8 },
  hydrate: { type: 'metric', unit: 'oz', target: 64 },
  run: { type: 'metric', unit: 'miles', target: 3 },
  walk: { type: 'metric', unit: 'steps', target: 10000 },
  workout: { type: 'metric', unit: 'minutes', target: 30 },
  exercise: { type: 'metric', unit: 'minutes', target: 30 },
  gym: { type: 'metric', unit: 'minutes', target: 45 },
  read: { type: 'metric', unit: 'pages', target: 20 },
  reading: { type: 'metric', unit: 'pages', target: 20 },
  meditate: { type: 'metric', unit: 'minutes', target: 10 },
  meditation: { type: 'metric', unit: 'minutes', target: 10 },
  sleep: { type: 'metric', unit: 'hours', target: 8 },
  pushup: { type: 'metric', unit: 'reps', target: 20 },
  'push-up': { type: 'metric', unit: 'reps', target: 20 },
  'push up': { type: 'metric', unit: 'reps', target: 20 },
  situp: { type: 'metric', unit: 'reps', target: 20 },
  'sit-up': { type: 'metric', unit: 'reps', target: 20 },
  squat: { type: 'metric', unit: 'reps', target: 20 },
  plank: { type: 'metric', unit: 'minutes', target: 2 },
  yoga: { type: 'metric', unit: 'minutes', target: 20 },
  stretch: { type: 'metric', unit: 'minutes', target: 10 },
  weight: { type: 'metric', unit: 'lbs', target: null },
  weigh: { type: 'metric', unit: 'lbs', target: null },
  calories: { type: 'metric', unit: 'calories', target: 2000 },
  protein: { type: 'metric', unit: 'servings', target: 3 },
  vegetables: { type: 'metric', unit: 'servings', target: 5 },
  fruit: { type: 'metric', unit: 'servings', target: 3 },
  cycling: { type: 'metric', unit: 'miles', target: 10 },
  bike: { type: 'metric', unit: 'miles', target: 10 },
  swim: { type: 'metric', unit: 'minutes', target: 30 },
  journal: { type: 'boolean', unit: null, target: null },
  gratitude: { type: 'boolean', unit: null, target: null },
  floss: { type: 'boolean', unit: null, target: null },
  vitamins: { type: 'boolean', unit: null, target: null },
  supplements: { type: 'boolean', unit: null, target: null }
}

/**
 * Get suggested tracking config based on habit name keywords
 */
export const getSuggestionFromKeywords = (habitName) => {
  const lowerName = habitName.toLowerCase()

  for (const [keyword, config] of Object.entries(KEYWORD_PATTERNS)) {
    if (lowerName.includes(keyword)) {
      return {
        tracking_type: config.type,
        unit: config.unit,
        suggested_target: config.target,
        reasoning: `Based on "${keyword}" in your habit name`
      }
    }
  }

  // Default to boolean if no match
  return {
    tracking_type: 'boolean',
    unit: null,
    suggested_target: null,
    reasoning: 'Default to simple yes/no tracking'
  }
}
