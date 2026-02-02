import { UserContext, WeeklyFocus, ContentRecommendation, PersonalInsight } from './types.ts'

/**
 * Assemble final email in Markdown format
 * This is the primary artifact for Milestone 1 review
 */
export function assembleMarkdown(
  context: UserContext,
  focus: WeeklyFocus,
  recommendations: ContentRecommendation[],
  insight: PersonalInsight | null = null,
  reflectionPrompt: string | null = null
): string {
  const sections: string[] = []

  // Greeting (first name only)
  const firstName = context.user_name.split(' ')[0]
  sections.push(`# Hi ${firstName}! 👋\n`)

  // TL;DR for skimmers
  const topRecommendation = recommendations[0]
  sections.push(`## This Week in 30 Seconds\n`)
  sections.push(`- **Focus:** ${focus.theme}`)
  if (focus.strategies.length > 0) {
    sections.push(`- **Try:** ${focus.strategies[0].strategy}`)
  }
  if (topRecommendation) {
    sections.push(`- **Watch/Listen:** [${topRecommendation.title}](${topRecommendation.url})`)
  }
  sections.push(`\n`)

  // Milestone celebration (if applicable)
  if (insight?.milestone) {
    sections.push(`> 🎉 **${insight.milestone}**\n`)
  }

  // What I Noticed (AI-generated insight)
  if (insight?.observation) {
    sections.push(`## What I Noticed 💡\n`)
    sections.push(`${insight.observation}\n`)
    if (insight.connection_to_vision) {
      sections.push(`${insight.connection_to_vision}\n`)
    }
  }

  // Vision anchor (if available and no insight already connected to it)
  if (context.vision?.visionStatement && !insight?.connection_to_vision) {
    sections.push(`## Your Summit ⛰️\n`)
    sections.push(`Remember why you're here:\n`)
    sections.push(`> ${context.vision.visionStatement}\n`)
  }

  // Wins & reinforcement (if reflection available)
  if (context.reflection_signals && context.reflection_signals.worked_well.length > 0) {
    sections.push(`## Last Week's Wins 🎉\n`)
    sections.push(`Let's celebrate what worked:\n`)
    context.reflection_signals.worked_well.forEach(win => {
      sections.push(`- ${win}`)
    })
    sections.push(`\nThis is progress. Keep building on it.\n`)
  }

  // This week's focus
  sections.push(`## This Week's Focus 🎯\n`)
  sections.push(`**${focus.theme}**\n`)

  // List habits with their scheduled days (consolidated)
  if (context.habits.length > 0) {
    sections.push(`Here's what you're working on:\n`)
    const consolidatedHabits = consolidateHabits(context.habits)
    consolidatedHabits.forEach(({ habitName, days }) => {
      sections.push(`- ${habitName} (${days})`)
    })
    sections.push(`\n`)
    sections.push(`[Modify these in your app](https://summit-pilot.vercel.app)\n`)
  } else {
    // No habits yet - simple CTA on its own line
    sections.push(`[Add habits in your app →](https://summit-pilot.vercel.app)\n`)
  }

  // Patterns to reinforce
  if (focus.patterns_to_reinforce.length > 0) {
    sections.push(`### What's Working\n`)
    focus.patterns_to_reinforce.forEach(pattern => {
      sections.push(`- ${pattern}`)
    })
    sections.push(`\n`)
  }

  // Roadblocks & strategies (as a table)
  if (focus.potential_challenges_narrative || focus.strategies.length > 0) {
    sections.push(`### Navigating Potential Challenges\n`)

    // Add narrative if available
    if (focus.potential_challenges_narrative) {
      sections.push(`${focus.potential_challenges_narrative}\n`)
    }

    // Add specific strategies as a markdown table
    if (focus.strategies.length > 0) {
      sections.push(`| Challenge | Strategy |`)
      sections.push(`|-----------|----------|`)
      focus.strategies.forEach(({ blocker, strategy }) => {
        sections.push(`| ${blocker} | ${strategy} |`)
      })
      sections.push(`\n`)
    }
  }

  // Content recommendations
  if (recommendations.length > 0) {
    sections.push(`## This Week's Picks 📚\n`)
    sections.push(`A few resources for you this week:\n`)

    // Group by type
    const podcasts = recommendations.filter(r => r.type === 'podcast')
    const videos = recommendations.filter(r => r.type === 'youtube')
    const articles = recommendations.filter(r => r.type === 'article')

    if (podcasts.length > 0) {
      sections.push(`### 🎙️ Podcasts\n`)
      podcasts.forEach(rec => {
        sections.push(formatRecommendationSimple(rec))
      })
    }

    if (videos.length > 0) {
      sections.push(`### 🎥 Videos\n`)
      videos.forEach(rec => {
        sections.push(formatRecommendationSimple(rec))
      })
    }

    if (articles.length > 0) {
      sections.push(`### 📖 Articles\n`)
      articles.forEach(rec => {
        sections.push(formatRecommendationSimple(rec))
      })
    }
  }

  // Reflection prompt for the week ahead
  if (reflectionPrompt) {
    sections.push(`## Something to Consider 🤔\n`)
    sections.push(`*${reflectionPrompt}*\n`)
  }

  // One-minute action plan (different for users with vs without habits)
  sections.push(`## Your One-Minute Action Plan ⚡\n`)
  sections.push(`Before this week starts:\n`)
  if (context.habits.length > 0) {
    sections.push(`1. Review your habits in the app`)
    sections.push(`2. Pick ONE strategy from above to try`)
    if (recommendations.length > 0) {
      sections.push(`3. Choose ONE piece of content to consume this week`)
    }
  } else {
    sections.push(`1. Watch or listen to ONE piece of content from above`)
    sections.push(`2. Pick ONE small action from the strategies to try`)
    sections.push(`3. [Set up your first habit](https://summit-pilot.vercel.app) when you're ready`)
  }
  sections.push(`\n`)

  // Footer
  sections.push(`---\n`)
  sections.push(`You're building something meaningful, ${firstName}. One week at a time.\n`)
  sections.push(`— Your Summit Coach\n`)
  sections.push(`\n*Reply to this email anytime — I read every response.*\n`)

  return sections.join('\n')
}

function formatRecommendationSimple(rec: ContentRecommendation): string {
  const duration = rec.duration_minutes ? ` (${rec.duration_minutes} min)` : ''
  const source = rec.source ? ` — *${rec.source}*` : ''
  
  return `- **[${rec.title}](${rec.url})**${duration}${source}`
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

function getDayAbbreviation(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayOfWeek] || 'Unknown'
}

function consolidateHabits(habits: any[]): Array<{ habitName: string; days: string }> {
  const habitMap = new Map<string, number[]>()
  
  // Group habits by name
  habits.forEach(habit => {
    const name = habit.habit_name
    if (!habitMap.has(name)) {
      habitMap.set(name, [])
    }
    habitMap.get(name)!.push(habit.day_of_week)
  })
  
  // Format consolidated habits
  const consolidated: Array<{ habitName: string; days: string }> = []
  habitMap.forEach((dayNumbers, habitName) => {
    // Sort days
    dayNumbers.sort((a, b) => a - b)
    
    // Format days string
    let daysString: string
    if (dayNumbers.length === 1) {
      daysString = getDayName(dayNumbers[0])
    } else if (dayNumbers.length === 7) {
      daysString = 'Daily'
    } else {
      daysString = dayNumbers.map(d => getDayAbbreviation(d)).join('/')
    }
    
    consolidated.push({ habitName, days: daysString })
  })
  
  return consolidated
}

/**
 * Generate email subject line
 */
export function generateSubject(context: UserContext, focus: WeeklyFocus): string {
  const firstName = context.user_name.split(' ')[0]
  
  // Create a concise subject from theme
  const themeWords = focus.theme.split(' ')
  const shortTheme = themeWords.length > 6 
    ? themeWords.slice(0, 6).join(' ') + '...'
    : focus.theme
  
  return `${firstName}, this week: ${shortTheme.toLowerCase()}`
}
