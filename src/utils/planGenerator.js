import actionLibrary from '../data/actionLibrary.json'
import barrierStrategies from '../data/barrierStrategies.json'

/**
 * Generate a personalized action plan based on user's form data
 */
export const generateActionPlan = (formData) => {
  const plan = {
    weeklyActions: generateWeeklyActions(formData),
    barrierStrategies: generateBarrierStrategies(formData),
    habitRecommendations: generateHabitRecommendations(formData),
    weeklyCheckIn: generateWeeklyCheckIn(formData)
  }
  
  return plan
}

/**
 * Generate specific weekly actions based on focus areas and time capacity
 */
const generateWeeklyActions = (formData) => {
  const { focusAreas = [], timeCapacity = '10 minutes/day' } = formData
  const actions = []
  
  // Get actions for each focus area
  focusAreas.forEach(area => {
    if (actionLibrary[area] && actionLibrary[area][timeCapacity]) {
      const areaActions = actionLibrary[area][timeCapacity]
      actions.push({
        area,
        actions: areaActions.slice(0, 2) // Take top 2 actions per area
      })
    }
  })
  
  // If no focus areas, use all selected habits
  if (actions.length === 0 && formData.habitsToImprove) {
    formData.habitsToImprove.slice(0, 2).forEach(habit => {
      if (actionLibrary[habit] && actionLibrary[habit][timeCapacity]) {
        const habitActions = actionLibrary[habit][timeCapacity]
        actions.push({
          area: habit,
          actions: habitActions.slice(0, 2)
        })
      }
    })
  }
  
  return actions
}

/**
 * Generate strategies to overcome top barriers
 */
const generateBarrierStrategies = (formData) => {
  const { barriers = [] } = formData
  const strategies = []
  
  // Get strategies for top 3 barriers
  barriers.slice(0, 3).forEach(barrier => {
    if (barrierStrategies[barrier]) {
      strategies.push({
        barrier,
        ...barrierStrategies[barrier]
      })
    }
  })
  
  return strategies
}

/**
 * Generate habit-building sequence based on readiness and focus areas
 */
const generateHabitRecommendations = (formData) => {
  const { habitsToImprove = [], focusAreas = [], readiness = 5 } = formData
  
  // Prioritize focus areas
  const prioritized = [
    ...focusAreas,
    ...habitsToImprove.filter(h => !focusAreas.includes(h))
  ]
  
  // Adjust recommendations based on readiness
  let recommendationCount = 2
  if (readiness >= 8) {
    recommendationCount = 3
  } else if (readiness <= 4) {
    recommendationCount = 1
  }
  
  return prioritized.slice(0, recommendationCount).map((habit, index) => ({
    habit,
    priority: index === 0 ? 'Primary' : 'Secondary',
    week: index + 1,
    tip: getHabitTip(habit, readiness)
  }))
}

/**
 * Get a specific tip for building a habit based on readiness
 */
const getHabitTip = (habit, readiness) => {
  const tips = {
    'Movement/Exercise': {
      low: 'Start with just 5 minutes. Movement is movement—every bit counts.',
      medium: 'Build consistency first, intensity second. Show up daily.',
      high: 'Challenge yourself with progressive goals. Track your progress.'
    },
    'Nutrition': {
      low: 'Add one healthy thing rather than removing everything unhealthy.',
      medium: 'Meal prep one day per week to set yourself up for success.',
      high: 'Experiment with new recipes and optimize your nutrition strategy.'
    },
    'Sleep': {
      low: 'Set a bedtime alarm. Protect your sleep like an important meeting.',
      medium: 'Create a wind-down routine 30 minutes before bed.',
      high: 'Optimize your sleep environment and track your sleep quality.'
    },
    'Stress Management': {
      low: 'Try 5-minute breathing exercises when you feel overwhelmed.',
      medium: 'Build a daily practice—meditation, journaling, or walks.',
      high: 'Develop a comprehensive stress management toolkit.'
    },
    'Alcohol/Substance Moderation': {
      low: 'Track your intake without judgment. Awareness is the first step.',
      medium: 'Replace one drink per week with a healthy alternative.',
      high: 'Build a support system and alternative coping strategies.'
    },
    'Planning/Organization': {
      low: 'Start each day by writing down your top 3 priorities.',
      medium: 'Block time on your calendar for health activities.',
      high: 'Build comprehensive systems for planning and organization.'
    },
    'Tech Boundaries': {
      low: 'Put your phone in another room during one meal per day.',
      medium: 'Set app limits and create tech-free zones in your home.',
      high: 'Practice digital minimalism and regular digital detoxes.'
    },
    'Social Connection': {
      low: 'Send one meaningful text or call per day.',
      medium: 'Schedule regular social activities on your calendar.',
      high: 'Build deep connections and community involvement.'
    }
  }
  
  const readinessLevel = readiness <= 4 ? 'low' : readiness >= 8 ? 'high' : 'medium'
  return tips[habit]?.[readinessLevel] || 'Start small and build consistency.'
}

/**
 * Generate weekly check-in prompts
 */
const generateWeeklyCheckIn = (formData) => {
  return {
    prompts: [
      'What went well this week with your health goals?',
      'What challenges did you face? How did you handle them?',
      'What will you do differently next week?',
      'On a scale of 1-10, how sustainable does this feel?'
    ],
    reminderText: `Remember your "why": ${formData.whyMatters || 'Your health vision matters'}`,
    nextSteps: 'Review your plan weekly and adjust as needed. Progress, not perfection.'
  }
}

/**
 * Generate a motivational message based on user's data
 */
export const generateMotivationalMessage = (formData) => {
  const { currentScore = 5, readiness = 5, visionStatement } = formData
  
  let message = ''
  
  if (currentScore >= 7 && readiness >= 7) {
    message = `You're in a strong position at ${currentScore}/10 with high readiness. Build on this momentum!`
  } else if (currentScore <= 4 && readiness >= 7) {
    message = `Your readiness is high—that's powerful. Small consistent steps will move you forward from ${currentScore}/10.`
  } else if (currentScore >= 7 && readiness <= 4) {
    message = `You're at ${currentScore}/10 but readiness is low. Start with the easiest wins to build confidence.`
  } else {
    message = `Starting at ${currentScore}/10 is your baseline. Every small step counts toward your vision.`
  }
  
  if (visionStatement) {
    message += ` Keep your vision in mind: "${visionStatement.slice(0, 100)}${visionStatement.length > 100 ? '...' : ''}"`
  }
  
  return message
}