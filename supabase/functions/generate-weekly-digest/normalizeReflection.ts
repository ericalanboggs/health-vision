import { Reflection, ReflectionSignals, FrictionTheme } from './types.ts'

/**
 * Map friction keywords to content search themes
 * These are challenges the user faced - we find content to help address them
 */
const FRICTION_THEME_MAP: Record<string, { searchQuery: string; whyRelevant: string; category: string }> = {
  // Motivation & Discouragement
  'discouraged': { searchQuery: 'resilience bouncing back from setbacks psychology', whyRelevant: 'Helps rebuild momentum when motivation dips', category: 'motivation' },
  'gave up': { searchQuery: 'how to restart habits after failing', whyRelevant: 'Strategies to get back on track', category: 'motivation' },
  'stopped': { searchQuery: 'restarting habits after break motivation', whyRelevant: 'Guidance for picking back up', category: 'motivation' },
  'unmotivated': { searchQuery: 'finding motivation when you dont feel like it', whyRelevant: 'Practical tips for low-motivation days', category: 'motivation' },
  'motivation': { searchQuery: 'intrinsic motivation building lasting habits', whyRelevant: 'Building sustainable drive', category: 'motivation' },
  'hard': { searchQuery: 'making habits easier habit stacking', whyRelevant: 'Techniques to reduce friction', category: 'motivation' },
  'difficult': { searchQuery: 'overcoming habit challenges psychology', whyRelevant: 'Strategies for difficult habits', category: 'motivation' },
  'lazy': { searchQuery: 'overcoming laziness productivity tips', whyRelevant: 'Getting moving when you don\'t feel like it', category: 'motivation' },
  'procrastinat': { searchQuery: 'stop procrastinating start doing', whyRelevant: 'Breaking the procrastination cycle', category: 'motivation' },

  // Time & Schedule
  'busy': { searchQuery: 'micro habits for busy people time management', whyRelevant: 'Fits habits into packed schedules', category: 'time' },
  'time': { searchQuery: 'quick habits 5 minutes or less', whyRelevant: 'Short but effective practices', category: 'time' },
  'schedule': { searchQuery: 'habit scheduling time blocking productivity', whyRelevant: 'Better time management strategies', category: 'time' },
  'forgot': { searchQuery: 'habit reminders never forget habits', whyRelevant: 'Systems to remember your habits', category: 'time' },
  'morning': { searchQuery: 'morning routine habits productive start', whyRelevant: 'Building an effective morning routine', category: 'time' },
  'evening': { searchQuery: 'evening routine wind down habits', whyRelevant: 'Creating a restful evening routine', category: 'time' },
  'routine': { searchQuery: 'building daily routine habits', whyRelevant: 'Creating structure in your day', category: 'time' },

  // Energy & Fatigue
  'tired': { searchQuery: 'habits when exhausted low energy routines', whyRelevant: 'Adapting habits for low-energy days', category: 'energy' },
  'exhausted': { searchQuery: 'self care when burnt out recovery', whyRelevant: 'Gentle approaches during fatigue', category: 'energy' },
  'energy': { searchQuery: 'boosting energy naturally daily habits', whyRelevant: 'Building sustainable energy', category: 'energy' },
  'sleep': { searchQuery: 'better sleep habits sleep hygiene', whyRelevant: 'Improving rest and recovery', category: 'energy' },
  'fatigue': { searchQuery: 'fighting fatigue natural energy boost', whyRelevant: 'Overcoming daily fatigue', category: 'energy' },
  'burnout': { searchQuery: 'recovering from burnout self care', whyRelevant: 'Healing from burnout', category: 'energy' },
  'rest': { searchQuery: 'importance of rest recovery habits', whyRelevant: 'Prioritizing recovery', category: 'energy' },

  // Stress & Overwhelm
  'stress': { searchQuery: 'stress management simple techniques', whyRelevant: 'Managing stress effectively', category: 'stress' },
  'overwhelm': { searchQuery: 'feeling overwhelmed simplify habits', whyRelevant: 'Reducing overwhelm with simple steps', category: 'stress' },
  'anxiety': { searchQuery: 'calming anxiety daily practices mindfulness', whyRelevant: 'Techniques for anxious moments', category: 'stress' },
  'worry': { searchQuery: 'stop worrying mindfulness techniques', whyRelevant: 'Managing worry and anxiety', category: 'stress' },
  'distract': { searchQuery: 'managing distractions focus techniques', whyRelevant: 'Staying focused amid distractions', category: 'stress' },

  // Consistency & Streaks
  'inconsistent': { searchQuery: 'building consistency habits psychology', whyRelevant: 'Developing reliable routines', category: 'consistency' },
  'streak': { searchQuery: 'habit streaks dont break the chain', whyRelevant: 'Maintaining momentum', category: 'consistency' },
  'skip': { searchQuery: 'recovering from missed habits', whyRelevant: 'Bouncing back from skipped days', category: 'consistency' },
  'missed': { searchQuery: 'what to do when you miss a habit', whyRelevant: 'Getting back on track', category: 'consistency' },
  'consistent': { searchQuery: 'building consistency habits psychology', whyRelevant: 'Developing reliable routines', category: 'consistency' },

  // Mindset
  'perfecti': { searchQuery: 'overcoming perfectionism good enough habits', whyRelevant: 'Letting go of perfect', category: 'mindset' },
  'fail': { searchQuery: 'learning from habit failures growth mindset', whyRelevant: 'Reframing setbacks as learning', category: 'mindset' },
  'guilt': { searchQuery: 'self compassion habits without guilt', whyRelevant: 'Being kinder to yourself', category: 'mindset' },
  'negative': { searchQuery: 'positive mindset habits self talk', whyRelevant: 'Shifting to positive thinking', category: 'mindset' },
  'confidence': { searchQuery: 'building confidence through habits', whyRelevant: 'Growing self-confidence', category: 'mindset' },

  // Health & Fitness specific
  'workout': { searchQuery: 'staying consistent with workouts motivation', whyRelevant: 'Keeping up with your fitness goals', category: 'fitness' },
  'exercise': { searchQuery: 'making exercise a habit beginner tips', whyRelevant: 'Building a sustainable exercise habit', category: 'fitness' },
  'gym': { searchQuery: 'gym motivation consistency tips', whyRelevant: 'Staying consistent at the gym', category: 'fitness' },
  'eating': { searchQuery: 'healthy eating habits meal prep', whyRelevant: 'Making healthy eating easier', category: 'nutrition' },
  'diet': { searchQuery: 'sustainable healthy eating habits', whyRelevant: 'Building lasting nutrition habits', category: 'nutrition' },
  'snack': { searchQuery: 'healthy snacking habits mindful eating', whyRelevant: 'Managing snacking and cravings', category: 'nutrition' },
  'hydrat': { searchQuery: 'drinking more water hydration habits', whyRelevant: 'Staying well hydrated', category: 'nutrition' },
  'water': { searchQuery: 'drinking more water hydration tips', whyRelevant: 'Building a hydration habit', category: 'nutrition' },

  // Travel & Disruption
  'travel': { searchQuery: 'maintaining habits while traveling', whyRelevant: 'Keeping habits during travel', category: 'disruption' },
  'trip': { searchQuery: 'staying on track habits vacation', whyRelevant: 'Habits while away from home', category: 'disruption' },
  'vacation': { searchQuery: 'healthy habits on vacation', whyRelevant: 'Balancing relaxation with routines', category: 'disruption' },
  'sick': { searchQuery: 'getting back to habits after illness', whyRelevant: 'Recovering your routine after being sick', category: 'disruption' },
  'ill': { searchQuery: 'restarting habits after being sick', whyRelevant: 'Gentle return to your routine', category: 'disruption' },

  // Family & Life
  'kids': { searchQuery: 'habits for busy parents time management', whyRelevant: 'Fitting habits into family life', category: 'family' },
  'family': { searchQuery: 'balancing family and self care habits', whyRelevant: 'Making time for yourself', category: 'family' },
  'parent': { searchQuery: 'self care habits for parents', whyRelevant: 'Prioritizing yourself as a parent', category: 'family' },
  'baby': { searchQuery: 'habits for new parents self care', whyRelevant: 'Finding moments for yourself', category: 'family' },
}

/**
 * Map adjustment keywords to content search themes
 * These are things the user wants to try - we find content to help them succeed
 */
const ADJUSTMENT_THEME_MAP: Record<string, { searchQuery: string; whyRelevant: string; category: string }> = {
  // Morning intentions
  'wake up earlier': { searchQuery: 'how to wake up earlier morning person', whyRelevant: 'Helps you become an early riser', category: 'morning' },
  'morning': { searchQuery: 'morning routine habits productive day', whyRelevant: 'Building an energizing morning routine', category: 'morning' },
  'earlier': { searchQuery: 'waking up earlier tips habits', whyRelevant: 'Shifting to an earlier schedule', category: 'morning' },

  // Exercise intentions
  'workout': { searchQuery: 'home workout routine beginners', whyRelevant: 'Getting started with workouts', category: 'fitness' },
  'exercise': { searchQuery: 'starting exercise habit motivation', whyRelevant: 'Building your exercise routine', category: 'fitness' },
  'walk': { searchQuery: 'walking habit health benefits', whyRelevant: 'Making walking a daily habit', category: 'fitness' },
  'run': { searchQuery: 'starting running habit couch to 5k', whyRelevant: 'Beginning your running journey', category: 'fitness' },
  'yoga': { searchQuery: 'yoga for beginners daily practice', whyRelevant: 'Starting a yoga practice', category: 'fitness' },
  'stretch': { searchQuery: 'daily stretching routine flexibility', whyRelevant: 'Building a stretching habit', category: 'fitness' },
  'gym': { searchQuery: 'gym routine for beginners', whyRelevant: 'Getting comfortable at the gym', category: 'fitness' },

  // Planning intentions
  'plan': { searchQuery: 'weekly planning habit productivity', whyRelevant: 'Making planning a weekly habit', category: 'productivity' },
  'schedule': { searchQuery: 'time blocking schedule habits', whyRelevant: 'Organizing your time effectively', category: 'productivity' },
  'organize': { searchQuery: 'organizing habits daily routine', whyRelevant: 'Creating order in your day', category: 'productivity' },
  'prepare': { searchQuery: 'meal prep weekly planning', whyRelevant: 'Preparing ahead for success', category: 'productivity' },

  // Mindfulness intentions
  'meditat': { searchQuery: 'meditation for beginners daily practice', whyRelevant: 'Starting a meditation habit', category: 'mindfulness' },
  'mindful': { searchQuery: 'mindfulness exercises daily life', whyRelevant: 'Bringing mindfulness into your day', category: 'mindfulness' },
  'breath': { searchQuery: 'breathing exercises calm stress', whyRelevant: 'Using breath for calm', category: 'mindfulness' },
  'gratitude': { searchQuery: 'gratitude practice benefits how to', whyRelevant: 'Building a gratitude habit', category: 'mindfulness' },
  'journal': { searchQuery: 'journaling habit benefits how to start', whyRelevant: 'Starting a journaling practice', category: 'mindfulness' },

  // Nutrition intentions
  'eat': { searchQuery: 'healthy eating habits simple tips', whyRelevant: 'Making healthier food choices', category: 'nutrition' },
  'meal prep': { searchQuery: 'meal prep beginners weekly', whyRelevant: 'Getting started with meal prep', category: 'nutrition' },
  'cook': { searchQuery: 'cooking at home habits healthy', whyRelevant: 'Cooking more meals at home', category: 'nutrition' },
  'water': { searchQuery: 'drinking more water daily habit', whyRelevant: 'Staying hydrated', category: 'nutrition' },
  'hydrat': { searchQuery: 'hydration habits tips tricks', whyRelevant: 'Building a hydration habit', category: 'nutrition' },

  // Sleep intentions
  'sleep': { searchQuery: 'better sleep habits hygiene tips', whyRelevant: 'Improving your sleep quality', category: 'sleep' },
  'bed': { searchQuery: 'bedtime routine better sleep', whyRelevant: 'Creating a restful bedtime routine', category: 'sleep' },
  'rest': { searchQuery: 'importance of rest recovery habits', whyRelevant: 'Prioritizing rest and recovery', category: 'sleep' },

  // Focus intentions
  'focus': { searchQuery: 'improving focus concentration habits', whyRelevant: 'Building better focus', category: 'productivity' },
  'phone': { searchQuery: 'reduce phone screen time habits', whyRelevant: 'Managing screen time', category: 'productivity' },
  'screen': { searchQuery: 'digital detox screen time limits', whyRelevant: 'Creating healthy tech boundaries', category: 'productivity' },
  'distract': { searchQuery: 'eliminating distractions focus tips', whyRelevant: 'Reducing distractions', category: 'productivity' },

  // Consistency intentions
  'consistent': { searchQuery: 'building consistency habits tips', whyRelevant: 'Becoming more consistent', category: 'consistency' },
  'every day': { searchQuery: 'daily habits consistency tips', whyRelevant: 'Making it a daily practice', category: 'consistency' },
  'daily': { searchQuery: 'building daily habits routine', whyRelevant: 'Creating daily consistency', category: 'consistency' },
  'routine': { searchQuery: 'building daily routine habits', whyRelevant: 'Establishing your routine', category: 'consistency' },
}

/**
 * Extract themes from friction text (what didn't go well)
 */
function extractFrictionThemes(frictionText: string): FrictionTheme[] {
  const themes: FrictionTheme[] = []
  const lowerText = frictionText.toLowerCase()
  const addedCategories = new Set<string>()

  for (const [keyword, config] of Object.entries(FRICTION_THEME_MAP)) {
    // Only add one theme per category to avoid redundancy
    if (lowerText.includes(keyword) && !addedCategories.has(config.category)) {
      themes.push({
        theme: keyword,
        searchQuery: config.searchQuery,
        whyRelevant: config.whyRelevant,
      })
      addedCategories.add(config.category)
    }
  }

  // Limit to top 3 most relevant themes
  return themes.slice(0, 3)
}

/**
 * Extract themes from adjustment text (what user will try differently)
 */
function extractAdjustmentThemes(adjustmentText: string): FrictionTheme[] {
  const themes: FrictionTheme[] = []
  const lowerText = adjustmentText.toLowerCase()
  const addedCategories = new Set<string>()

  for (const [keyword, config] of Object.entries(ADJUSTMENT_THEME_MAP)) {
    // Only add one theme per category to avoid redundancy
    if (lowerText.includes(keyword) && !addedCategories.has(config.category)) {
      themes.push({
        theme: keyword,
        searchQuery: config.searchQuery,
        whyRelevant: config.whyRelevant,
      })
      addedCategories.add(config.category)
    }
  }

  // Limit to top 2 themes from adjustments
  return themes.slice(0, 2)
}

/**
 * Normalize reflection data into structured signals
 * Handles evolving reflection schemas by extracting key patterns
 */
export function normalizeReflection(reflection: Reflection | null): ReflectionSignals | null {
  if (!reflection) {
    return null
  }

  const signals: ReflectionSignals = {
    worked_well: [],
    wins: [],
    blockers: [],
    felt_hard_because: [],
    habit_specific_notes: [],
    mood_energy_signal: 'unknown',
    time_constraint_signal: 'unknown',
    freeform_summary: '',
    friction_themes: [],
  }

  // Extract what went well
  if (reflection.went_well) {
    const wentWell = reflection.went_well.trim()
    if (wentWell) {
      signals.worked_well.push(wentWell)
      signals.wins.push(wentWell)
      signals.freeform_summary += `What worked: ${wentWell}. `
    }
  }

  // Extract friction/blockers (what didn't go well)
  let frictionThemes: FrictionTheme[] = []
  if (reflection.friction) {
    const friction = reflection.friction.trim()
    if (friction) {
      signals.blockers.push(friction)
      signals.felt_hard_because.push(friction)
      signals.freeform_summary += `Challenges: ${friction}. `

      // Heuristic: detect energy/time signals
      const lowerFriction = friction.toLowerCase()
      if (lowerFriction.includes('tired') || lowerFriction.includes('energy') || lowerFriction.includes('exhausted') ||
          lowerFriction.includes('sleep') || lowerFriction.includes('fatigue')) {
        signals.mood_energy_signal = 'low'
      }
      if (lowerFriction.includes('time') || lowerFriction.includes('busy') || lowerFriction.includes('schedule') ||
          lowerFriction.includes('forgot') || lowerFriction.includes('didn\'t have')) {
        signals.time_constraint_signal = 'high'
      }

      // Extract friction themes for content recommendations
      frictionThemes = extractFrictionThemes(friction)
      console.log(`Extracted ${frictionThemes.length} friction themes:`, frictionThemes.map(t => t.theme))
    }
  }

  // Extract adjustment insights (what user will try differently)
  let adjustmentThemes: FrictionTheme[] = []
  if (reflection.adjustment) {
    const adjustment = reflection.adjustment.trim()
    if (adjustment) {
      signals.freeform_summary += `Plan: ${adjustment}. `

      // Extract themes from what user wants to try
      adjustmentThemes = extractAdjustmentThemes(adjustment)
      console.log(`Extracted ${adjustmentThemes.length} adjustment themes:`, adjustmentThemes.map(t => t.theme))
    }
  }

  // Combine friction and adjustment themes
  // Priority: friction themes first (address challenges), then adjustment themes (support goals)
  const allThemes = [...frictionThemes]
  const existingQueries = new Set(frictionThemes.map(t => t.searchQuery))

  for (const theme of adjustmentThemes) {
    if (!existingQueries.has(theme.searchQuery)) {
      allThemes.push(theme)
      existingQueries.add(theme.searchQuery)
    }
  }

  signals.friction_themes = allThemes.slice(0, 4) // Allow up to 4 combined themes
  console.log(`Combined ${signals.friction_themes.length} total reflection themes`)

  // Extract app feedback
  if (reflection.app_feedback) {
    const feedback = reflection.app_feedback.trim()
    if (feedback) {
      signals.freeform_summary += `Feedback: ${feedback}. `
    }
  }

  console.log(`Normalized reflection signals:`, signals)
  return signals
}
