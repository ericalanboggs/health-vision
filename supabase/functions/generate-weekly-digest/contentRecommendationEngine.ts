import { UserContext, ReflectionSignals, ContentRecommendation, FrictionTheme } from './types.ts'
import { YouTubeAPI } from './youtubeApi.ts'

/**
 * Content Recommendation Engine
 * Generates personalized content based on user context, goals, and reflection signals
 *
 * Priority order:
 * 1. Reflection-based content (what didn't go well + what user will try)
 * 2. Vision-based content (for users without habits or reflection)
 * 3. AI-generated queries based on vision/habits (when no reflection exists)
 * 4. Habit-based content (fallback to fill remaining slots)
 *
 * Future: Curated library content (Phase 2) will slot in between 1 and 2
 */
export class ContentRecommendationEngine {
  private readonly youtubeAPI: YouTubeAPI
  private readonly openaiApiKey: string | null
  private excludeVideoIds: Set<string> = new Set()

  constructor(youtubeApiKey: string, openaiApiKey?: string) {
    this.youtubeAPI = new YouTubeAPI(youtubeApiKey)
    this.openaiApiKey = openaiApiKey || null
  }

  /**
   * Set video IDs to exclude (from previous weeks)
   */
  setExcludedVideoIds(videoIds: string[]): void {
    this.excludeVideoIds = new Set(videoIds)
    console.log(`📋 Excluding ${this.excludeVideoIds.size} previously sent videos`)
  }

  /**
   * Generate personalized content recommendations based on user context
   *
   * PRIORITY ORDER:
   * 1. Reflection-based content (what didn't go well + what user will try) - up to 4 pieces
   * 2. Vision-based content (for users without habits or reflection)
   * 3. AI-generated content (when no reflection exists - uses GPT to generate targeted queries)
   * 4. Habit-based content (fills remaining slots)
   */
  async generateRecommendations(context: UserContext): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    // Analyze user's current habits and goals
    const habitCategories = this.analyzeHabits(context.habits || [])
    const goalSignals = this.extractGoalSignals(context)
    const challengeAreas = this.identifyChallenges(context.reflection_signals)
    const frictionThemes = context.reflection_signals?.friction_themes || []

    const hasHabits = context.habits && context.habits.length > 0
    const hasReflection = frictionThemes.length > 0

    console.log(`📊 Content analysis:`, {
      hasHabits,
      hasReflection,
      habitCategories,
      goalSignals,
      challengeAreas,
      frictionThemes: frictionThemes.map(t => t.theme)
    })

    // PRIORITY 1: Reflection-based content (THIS IS THE MAIN SOURCE)
    // Pull from what didn't go well + what user will try differently
    if (hasReflection) {
      console.log(`🎯 PRIORITY 1: Fetching reflection-based content (${frictionThemes.length} themes)...`)
      const frictionContent = await this.getFrictionBasedContent(frictionThemes)
      recommendations.push(...frictionContent)
      console.log(`✅ Added ${frictionContent.length} reflection-based recommendations`)
    }

    // PRIORITY 2: Vision-based content (for users without habits OR without reflection)
    if (!hasHabits || (!hasReflection && goalSignals.length > 0)) {
      console.log(`🎯 PRIORITY 2: Generating vision-based recommendations...`)
      const visionContent = await this.getVisionBasedContent(context, goalSignals)
      // Only add vision content if we need more recommendations
      const slotsRemaining = 6 - recommendations.length
      recommendations.push(...visionContent.slice(0, slotsRemaining))
    }

    // PRIORITY 3: AI-generated content (when no reflection data exists)
    // Uses OpenAI to generate targeted search queries based on vision/habits
    if (!hasReflection && recommendations.length < 5) {
      console.log(`🎯 PRIORITY 3: Generating AI-powered recommendations...`)
      const aiContent = await this.getAIGeneratedContent(context)
      const slotsRemaining = 6 - recommendations.length
      recommendations.push(...aiContent.slice(0, slotsRemaining))
      console.log(`✅ Added ${Math.min(aiContent.length, slotsRemaining)} AI-generated recommendations`)
    }

    // PRIORITY 4: Habit-based content (fills remaining slots, only if we need more)
    if (recommendations.length < 5) {
      console.log(`🎯 PRIORITY 4: Adding habit-based content to fill ${6 - recommendations.length} remaining slots...`)
      const habitContent = await this.getRealTimeContent(context, habitCategories, goalSignals)
      const slotsRemaining = 6 - recommendations.length
      recommendations.push(...habitContent.slice(0, slotsRemaining))
    }

    // Deduplicate by video ID and limit to top 6
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations)
    return uniqueRecommendations.slice(0, 6)
  }

  /**
   * Get content based purely on user's vision (for users without habits)
   */
  private async getVisionBasedContent(context: UserContext, goalSignals: string[]): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    console.log(`🌟 Generating vision-based content for signals:`, goalSignals)

    // Map goal signals to search queries
    const signalQueries: Record<string, { query: string; reason: string }> = {
      'energy': { query: 'increase energy naturally daily habits', reason: 'Supports your vision of having more energy and vitality.' },
      'family': { query: 'work life balance present parenting tips', reason: 'Helps you be more present with your family.' },
      'health': { query: 'healthy lifestyle habits beginners guide', reason: 'Aligns with your health and wellness goals.' },
      'stress_management': { query: 'reduce stress calm mind techniques', reason: 'Supports your goal of finding more peace and calm.' },
      'focus': { query: 'improve focus concentration productivity', reason: 'Helps you achieve the focus and productivity you envision.' },
      'gratitude': { query: 'gratitude practice daily happiness', reason: 'Supports your practice of gratitude and positivity.' }
    }

    // Get content for up to 3 goal signals
    for (const signal of goalSignals.slice(0, 3)) {
      const queryInfo = signalQueries[signal]
      if (queryInfo) {
        try {
          console.log(`🔍 Vision search: "${queryInfo.query}"`)
          const videos = await this.youtubeAPI.searchWorkoutVideos(queryInfo.query, 2)
          const freshVideos = videos.filter(v => !this.excludeVideoIds.has(v.videoId))

          if (freshVideos.length > 0) {
            recommendations.push(...this.transformVideosToRecommendations(
              freshVideos.slice(0, 2),
              queryInfo.reason
            ))
          }
        } catch (error) {
          console.error(`❌ Error fetching vision content for "${signal}":`, error)
        }
      }
    }

    // If we still don't have enough, add general getting-started content
    if (recommendations.length < 4) {
      try {
        console.log(`🌱 Adding getting-started content...`)
        const starterVideos = await this.youtubeAPI.searchWorkoutVideos('building healthy habits beginners motivation', 2)
        const freshStarter = starterVideos.filter(v =>
          !this.excludeVideoIds.has(v.videoId) &&
          !recommendations.some(r => r.url.includes(v.videoId))
        )

        if (freshStarter.length > 0) {
          recommendations.push(...this.transformVideosToRecommendations(
            freshStarter,
            'Great starting point for building the life you envision.'
          ))
        }
      } catch (error) {
        console.error('❌ Error fetching starter content:', error)
      }
    }

    return recommendations
  }

  /**
   * AI-powered content query generation (Phase 3)
   * Uses OpenAI to analyze user's vision and habits, then generates targeted search queries
   * Only used when no reflection themes are available
   */
  private async getAIGeneratedContent(context: UserContext): Promise<ContentRecommendation[]> {
    if (!this.openaiApiKey) {
      console.log('⚠️ No OpenAI API key - skipping AI content generation')
      return []
    }

    console.log('🤖 Generating AI-powered content recommendations...')

    const recommendations: ContentRecommendation[] = []

    // Build context for the AI
    const habitsList = context.habits && context.habits.length > 0
      ? context.habits.map(h => h.habit_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')
      : 'No habits set up yet'

    const visionStatement = context.vision?.visionStatement || 'Not provided'
    const whyMatters = context.vision?.whyMatters || ''
    const feelingState = context.vision?.feelingState || ''

    const prompt = `You are a health and wellness coach helping someone find helpful YouTube content.

USER'S VISION:
${visionStatement}

WHY IT MATTERS TO THEM:
${whyMatters}

HOW THEY WANT TO FEEL:
${feelingState}

THEIR CURRENT HABITS:
${habitsList}

Based on this person's goals and situation, generate 3 specific YouTube search queries that would find helpful, practical content for them THIS WEEK.

Rules:
- Focus on actionable, practical content (how-to videos, guided practices, tips)
- Avoid generic motivation videos - be specific to their situation
- Consider what challenges someone with these goals might face
- Keep queries concise (3-6 words) for best YouTube results

Return as JSON array:
[
  {
    "query": "your search query here",
    "reason": "One sentence explaining why this helps them"
  }
]

Return ONLY the JSON array, no other text.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a wellness content curator. Generate specific, practical YouTube search queries. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ OpenAI API error:', error)
        return []
      }

      const data = await response.json()
      let content = data.choices[0]?.message?.content?.trim()

      if (!content) {
        console.error('❌ Empty response from OpenAI')
        return []
      }

      // Strip markdown code fences if present
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      const queries = JSON.parse(content) as Array<{ query: string; reason: string }>

      console.log('🤖 AI generated queries:', queries.map(q => q.query))

      // Search YouTube for each AI-generated query
      for (const { query, reason } of queries.slice(0, 3)) {
        try {
          console.log(`🔍 AI search: "${query}"`)
          const videos = await this.youtubeAPI.searchWorkoutVideos(query, 2)
          const freshVideos = videos.filter(v =>
            !this.excludeVideoIds.has(v.videoId) &&
            !recommendations.some(r => r.url.includes(v.videoId))
          )

          if (freshVideos.length > 0) {
            recommendations.push(...this.transformVideosToRecommendations(
              freshVideos.slice(0, 1),
              reason
            ))
            console.log(`✅ Added AI-recommended video for: "${query}"`)
          }
        } catch (error) {
          console.error(`❌ Error searching for AI query "${query}":`, error)
        }
      }

      console.log(`🤖 Total AI-generated recommendations: ${recommendations.length}`)
      return recommendations

    } catch (error) {
      console.error('❌ Error in AI content generation:', error)
      return []
    }
  }

  /**
   * Get content specifically addressing friction/challenges from reflection
   * THIS IS THE HIGHEST PRIORITY - aims for 3-4 pieces of reflection-based content
   */
  private async getFrictionBasedContent(frictionThemes: FrictionTheme[]): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    // Get content for up to 3 friction/adjustment themes
    const themesToSearch = frictionThemes.slice(0, 3)

    for (const theme of themesToSearch) {
      try {
        console.log(`🎯 Reflection-based search: "${theme.searchQuery}"`)
        const videos = await this.youtubeAPI.searchWorkoutVideos(theme.searchQuery, 3)

        // Filter out previously sent videos
        const freshVideos = videos.filter(v => !this.excludeVideoIds.has(v.videoId))

        if (freshVideos.length > 0) {
          // Take up to 2 videos per theme for variety
          const videosToAdd = freshVideos.slice(0, recommendations.length < 2 ? 2 : 1)
          recommendations.push(...this.transformVideosToRecommendations(
            videosToAdd,
            theme.whyRelevant
          ))
          console.log(`✅ Added ${videosToAdd.length} videos for "${theme.theme}"`)
        }
      } catch (error) {
        console.error(`❌ Error fetching content for theme "${theme.theme}":`, error)
      }
    }

    console.log(`📊 Total reflection-based recommendations: ${recommendations.length}`)

    // If we didn't get at least 3 reflection-based, try generic wellness content
    if (recommendations.length < 3) {
      try {
        const fallbackQuery = 'building healthy habits wellness tips'
        console.log(`🔍 Adding wellness fallback content...`)
        const fallbackVideos = await this.youtubeAPI.searchWorkoutVideos(fallbackQuery, 2)
        const freshFallback = fallbackVideos.filter(v =>
          !this.excludeVideoIds.has(v.videoId) &&
          !recommendations.some(r => r.url.includes(v.videoId))
        )

        if (freshFallback.length > 0) {
          const needed = 3 - recommendations.length
          recommendations.push(...this.transformVideosToRecommendations(
            freshFallback.slice(0, needed),
            'Supports your wellness journey with practical strategies.'
          ))
        }
      } catch (error) {
        console.error('❌ Error fetching fallback content:', error)
      }
    }

    return recommendations
  }

  /**
   * Remove duplicate recommendations and filter out previously sent content
   */
  private deduplicateRecommendations(recommendations: ContentRecommendation[]): ContentRecommendation[] {
    const seen = new Set<string>()
    return recommendations.filter(rec => {
      // Check for duplicates in current batch
      if (seen.has(rec.url)) return false
      seen.add(rec.url)

      // Check if this video was sent in previous weeks
      const videoIdMatch = rec.url.match(/[?&]v=([^&]+)/)
      if (videoIdMatch && this.excludeVideoIds.has(videoIdMatch[1])) {
        console.log(`🚫 Filtering out previously sent video: ${videoIdMatch[1]}`)
        return false
      }

      return true
    })
  }

  /**
   * Get real-time content from APIs based on user context
   * Uses improved YouTube API with quality filtering and fallbacks
   * Always aims for 6 recommendations minimum
   */
  private async getRealTimeContent(context: UserContext, habitCategories: string[], goalSignals: string[]): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    console.log('🎯 Habit categories detected:', habitCategories)
    console.log('🎯 Goal signals detected:', goalSignals)

    // Determine primary content category from user's habits
    const primaryCategory = YouTubeAPI.getContentCategory(context)
    console.log('🎯 Primary content category:', primaryCategory)

    // YouTube content for mindfulness/meditation habits
    if (habitCategories.includes('mindfulness') || goalSignals.includes('stress_management')) {
      console.log('🧘 Fetching mindfulness videos...')
      try {
        const mindfulnessVideos = await this.youtubeAPI.searchWorkoutVideos('guided meditation for calm and relaxation', 2)
        console.log('📺 Mindfulness videos found:', mindfulnessVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          mindfulnessVideos,
          'Supports your meditation practice with guided sessions.'
        ))
      } catch (error) {
        console.error('❌ Error fetching mindfulness videos:', error)
      }
    }

    // NOTE: Removed generic "creativity/storytelling" category - was too loosely triggered
    // and not relevant to most users' health/wellness goals

    // YouTube content for wellness/gratitude habits
    if (habitCategories.includes('wellness') || goalSignals.includes('gratitude')) {
      console.log('🙏 Fetching gratitude videos...')
      try {
        const wellnessVideos = await this.youtubeAPI.searchWorkoutVideos('gratitude practice benefits science', 2)
        console.log('📺 Gratitude videos found:', wellnessVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          wellnessVideos,
          'Supports your gratitude and wellness practices.'
        ))
      } catch (error) {
        console.error('❌ Error fetching gratitude videos:', error)
      }
    }

    // YouTube content for exercise/fitness habits
    if (habitCategories.includes('strengthTraining') || goalSignals.includes('health')) {
      console.log('🏋️ Fetching fitness videos...')
      try {
        const baseQuery = YouTubeAPI.generatePersonalizedQuery(context)
        const workoutQuery = this.buildGenderAwareQuery(baseQuery, context)
        console.log('🔍 Workout query:', workoutQuery)
        const youtubeVideos = await this.youtubeAPI.searchWorkoutVideos(workoutQuery, 2)
        console.log('📺 Fitness videos found:', youtubeVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          youtubeVideos,
          'Supports your fitness goals with effective workout techniques.'
        ))
      } catch (error) {
        console.error('❌ Error fetching fitness videos:', error)
      }
    }

    // YouTube content for nutrition/healthy eating habits
    if (habitCategories.includes('nutrition') || goalSignals.includes('health')) {
      console.log('🥗 Fetching nutrition videos...')
      try {
        const nutritionQuery = this.buildGenderAwareQuery('healthy meal prep batch cooking beginner', context)
        const nutritionVideos = await this.youtubeAPI.searchWorkoutVideos(nutritionQuery, 2)
        console.log('📺 Nutrition videos found:', nutritionVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          nutritionVideos,
          'Supports your healthy eating goals with practical meal ideas.'
        ))
      } catch (error) {
        console.error('❌ Error fetching nutrition videos:', error)
      }
    }

    // YouTube content for productivity/focus habits
    if (habitCategories.includes('productivity') || goalSignals.includes('focus')) {
      console.log('⚡ Fetching productivity videos...')
      try {
        const productivityVideos = await this.youtubeAPI.searchWorkoutVideos('productivity tips focus deep work', 2)
        console.log('📺 Productivity videos found:', productivityVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          productivityVideos,
          'Enhances your focus and productivity strategies.'
        ))
      } catch (error) {
        console.error('❌ Error fetching productivity videos:', error)
      }
    }

    // YouTube content for sleep/recovery habits
    if (habitCategories.includes('sleep')) {
      console.log('😴 Fetching sleep videos...')
      try {
        const sleepVideos = await this.youtubeAPI.searchWorkoutVideos('better sleep tips sleep hygiene', 2)
        console.log('📺 Sleep videos found:', sleepVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          sleepVideos,
          'Helps improve your sleep quality and recovery.'
        ))
      } catch (error) {
        console.error('❌ Error fetching sleep videos:', error)
      }
    }

    // Add complementary content to ensure variety (aim for 6 total)
    if (recommendations.length < 5) {
      console.log('📦 Adding complementary content to reach 6 recommendations...')
      await this.addComplementaryContent(recommendations, habitCategories, goalSignals, context)
    }

    // TODO: Re-enable podcasts and articles once links are verified
    // Podcasts and articles temporarily disabled

    console.log('✅ Total recommendations generated:', recommendations.length)
    console.log('📊 Recommendation types:', recommendations.map(r => r.type))

    return recommendations
  }

  /**
   * Get a curated podcast based on user's habit categories
   */
  private getCuratedPodcast(habitCategories: string[], goalSignals: string[]): ContentRecommendation | null {
    // Mindfulness/stress focused
    if (habitCategories.includes('mindfulness') || goalSignals.includes('stress_management')) {
      return {
        type: 'podcast' as const,
        title: 'Ten Percent Happier with Dan Harris',
        url: 'https://open.spotify.com/show/1CfW319UkBMVhCXfei8huv',
        brief_description: 'Practical meditation guidance from experts',
        why_this_for_you: 'Supports your mindfulness practice with expert guidance.',
        duration_minutes: 45,
        source: 'Ten Percent Happier',
        thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
      }
    }

    // Fitness/health focused
    if (habitCategories.includes('strengthTraining') || habitCategories.includes('nutrition') || goalSignals.includes('health') || goalSignals.includes('energy')) {
      return {
        type: 'podcast' as const,
        title: 'Huberman Lab',
        url: 'https://open.spotify.com/show/79CkJF3UJTHFV8Dse3Ez0P',
        brief_description: 'Science-based tools for everyday life, health, and performance',
        why_this_for_you: 'Science-backed insights to optimize your health and fitness goals.',
        duration_minutes: 120,
        source: 'Andrew Huberman',
        thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
      }
    }

    // Productivity focused
    if (habitCategories.includes('productivity') || goalSignals.includes('focus')) {
      return {
        type: 'podcast' as const,
        title: 'Deep Questions with Cal Newport',
        url: 'https://open.spotify.com/show/0e9lFr3AdJByoBpM6tAbxD',
        brief_description: 'Building a focused life in a distracted world',
        why_this_for_you: 'Strategies for deep work and focused productivity.',
        duration_minutes: 60,
        source: 'Cal Newport',
        thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
      }
    }

    // Family/relationships focused
    if (goalSignals.includes('family')) {
      return {
        type: 'podcast' as const,
        title: 'Good Inside with Dr. Becky Kennedy',
        url: 'https://open.spotify.com/show/69su0q4Xfwq3mQdFC0eMjA',
        brief_description: 'Practical strategies for parenting and relationships',
        why_this_for_you: 'Supports your goal of being present with your family.',
        duration_minutes: 45,
        source: 'Dr. Becky Kennedy',
        thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
      }
    }

    // Default wellness podcast
    return {
      type: 'podcast' as const,
      title: 'The Happiness Lab with Dr. Laurie Santos',
      url: 'https://open.spotify.com/show/3i5TCKhc6GY42pOWkpWveG',
      brief_description: 'Science-based insights on what actually makes us happy',
      why_this_for_you: 'Research-backed strategies for well-being and fulfillment.',
      duration_minutes: 40,
      source: 'Dr. Laurie Santos',
      thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
    }
  }

  /**
   * Add complementary content to ensure variety and reach target count
   */
  private async addComplementaryContent(
    recommendations: ContentRecommendation[],
    habitCategories: string[],
    goalSignals: string[],
    context: UserContext
  ): Promise<void> {
    const existingTypes = new Set(recommendations.map(r => r.url))

    // If user has fitness habits, add mindfulness as complement
    if ((habitCategories.includes('strengthTraining') || habitCategories.includes('nutrition')) &&
        !habitCategories.includes('mindfulness') && recommendations.length < 5) {
      console.log('🧘 Adding complementary mindfulness content...')
      try {
        const mindfulnessVideos = await this.youtubeAPI.searchWorkoutVideos('5 minute meditation for energy recovery', 1)
        const newRecs = this.transformVideosToRecommendations(
          mindfulnessVideos,
          'Recovery and mental clarity complement your physical training.'
        ).filter(r => !existingTypes.has(r.url))
        recommendations.push(...newRecs)
      } catch (error) {
        console.error('❌ Error fetching complementary mindfulness:', error)
      }
    }

    // If user has mindfulness habits, add movement as complement
    if (habitCategories.includes('mindfulness') && !habitCategories.includes('strengthTraining') && recommendations.length < 5) {
      console.log('🏃 Adding complementary movement content...')
      try {
        const movementVideos = await this.youtubeAPI.searchWorkoutVideos('gentle yoga morning stretch routine', 1)
        const newRecs = this.transformVideosToRecommendations(
          movementVideos,
          'Gentle movement complements your mindfulness practice.'
        ).filter(r => !existingTypes.has(r.url))
        recommendations.push(...newRecs)
      } catch (error) {
        console.error('❌ Error fetching complementary movement:', error)
      }
    }

    // Add motivation/mindset content for everyone if still under target
    if (recommendations.length < 5) {
      console.log('💡 Adding motivation content...')
      try {
        const motivationVideos = await this.youtubeAPI.searchWorkoutVideos('building habits motivation science', 1)
        const newRecs = this.transformVideosToRecommendations(
          motivationVideos,
          'Insights to keep you motivated on your journey.'
        ).filter(r => !existingTypes.has(r.url))
        recommendations.push(...newRecs)
      } catch (error) {
        console.error('❌ Error fetching motivation content:', error)
      }
    }

    // Add family/presence content if it's in their vision
    if (goalSignals.includes('family') && recommendations.length < 5) {
      console.log('👨‍👩‍👧 Adding family wellness content...')
      try {
        const familyVideos = await this.youtubeAPI.searchWorkoutVideos('work life balance present parenting', 1)
        const newRecs = this.transformVideosToRecommendations(
          familyVideos,
          'Supports your goal of being present with your family.'
        ).filter(r => !existingTypes.has(r.url))
        recommendations.push(...newRecs)
      } catch (error) {
        console.error('❌ Error fetching family content:', error)
      }
    }
  }

  /**
   * Build a gender-aware search query based on user's profile
   * Uses sex field if available, otherwise returns gender-neutral query
   */
  private buildGenderAwareQuery(baseQuery: string, context: UserContext): string {
    const sex = context.sex

    if (!sex || sex === 'prefer_not_to_say') {
      // Gender-neutral: avoid triggering gendered results
      return baseQuery
    }

    if (sex === 'male') {
      return `${baseQuery} for men`
    }

    if (sex === 'female') {
      return `${baseQuery} for women`
    }

    return baseQuery
  }

  /**
   * Transform YouTube videos to ContentRecommendation format
   */
  private transformVideosToRecommendations(videos: any[], whyThisForYou: string): ContentRecommendation[] {
    return videos.map(video => ({
      type: 'youtube' as const,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      brief_description: this.truncateDescription(video.description),
      why_this_for_you: whyThisForYou,
      duration_minutes: YouTubeAPI.parseDurationMinutes(video.duration),
      source: video.channelTitle,
      thumbnail_url: video.thumbnailUrl
    }))
  }

  /**
   * Truncate description to a reasonable length
   */
  private truncateDescription(description: string): string {
    if (!description) return ''
    const cleaned = description.replace(/\n/g, ' ').trim()
    if (cleaned.length <= 150) return cleaned
    return cleaned.substring(0, 147) + '...'
  }

  /**
   * Analyze user habits to determine content categories
   */
  private analyzeHabits(habits: any[]): string[] {
    const categories = new Set<string>()

    // Handle null/undefined habits
    if (!habits || habits.length === 0) {
      console.log('📋 No habits to analyze')
      return []
    }

    habits.forEach(habit => {
      const habitName = habit.habit_name.toLowerCase()
      
      // Exercise & Fitness
      if (habitName.includes('strength') || habitName.includes('workout') || habitName.includes('exercise') || 
          habitName.includes('gym') || habitName.includes('lift') || habitName.includes('cardio') ||
          habitName.includes('run') || habitName.includes('walk') || habitName.includes('bike') ||
          habitName.includes('yoga') || habitName.includes('stretch')) {
        categories.add('strengthTraining')
      }
      
      // Mindfulness & Mental Health
      if (habitName.includes('meditate') || habitName.includes('mindful') || habitName.includes('breathe') || 
          habitName.includes('meditation') || habitName.includes('calm') || habitName.includes('relax') ||
          habitName.includes('anxiety') || habitName.includes('stress')) {
        categories.add('mindfulness')
      }
      
      // Sleep & Recovery
      if (habitName.includes('sleep') || habitName.includes('bedtime') || habitName.includes('rest') ||
          habitName.includes('wind down') || habitName.includes('recovery')) {
        categories.add('sleep')
      }
      
      // Productivity & Focus
      if (habitName.includes('focus') || habitName.includes('deep work') || habitName.includes('pomodoro') ||
          habitName.includes('productive') || habitName.includes('organize') || habitName.includes('plan') ||
          habitName.includes('schedule') || habitName.includes('time block')) {
        categories.add('productivity')
      }
      
      // Learning & Development
      if (habitName.includes('read') || habitName.includes('learn') || habitName.includes('study') ||
          habitName.includes('book') || habitName.includes('course') || habitName.includes('skill') ||
          habitName.includes('practice') || habitName.includes('develop')) {
        categories.add('learning')
      }
      
      // Nutrition & Health
      if (habitName.includes('healthy') || habitName.includes('nutrition') || habitName.includes('eat') ||
          habitName.includes('meal') || habitName.includes('cook') || habitName.includes('water') ||
          habitName.includes('vitamin') || habitName.includes('diet')) {
        categories.add('nutrition')
      }
      
      // Journaling & Reflection (separate from creativity - more wellness focused)
      if (habitName.includes('journal') || habitName.includes('reflect') || habitName.includes('diary') ||
          habitName.includes('morning pages') || habitName.includes('evening reflection')) {
        categories.add('wellness') // Journal habits map to wellness, not creativity
      }

      // NOTE: Removed generic "creativity" category - habits like "write" and "journal"
      // were triggering irrelevant "storytelling" content.
      // If user explicitly has creative hobbies, those should be handled differently.
      
      // Wellness & Gratitude
      if (habitName.includes('grateful') || habitName.includes('gratitude') || habitName.includes('reflect') ||
          habitName.includes('appreciate') || habitName.includes('positive') || habitName.includes('affirmation') ||
          habitName.includes('self-care') || habitName.includes('wellness')) {
        categories.add('wellness')
      }
      
      // Social & Relationships
      if (habitName.includes('call') || habitName.includes('connect') || habitName.includes('family') ||
          habitName.includes('friend') || habitName.includes('social') || habitName.includes('relationship') ||
          habitName.includes('communicate') || habitName.includes('reach out')) {
        categories.add('social')
      }
      
      // Career & Professional
      if (habitName.includes('work') || habitName.includes('career') || habitName.includes('professional') ||
          habitName.includes('network') || habitName.includes('skill') || habitName.includes('goal') ||
          habitName.includes('project') || habitName.includes('business')) {
        categories.add('professional')
      }
      
      // Financial & Money
      if (habitName.includes('budget') || habitName.includes('save') || habitName.includes('money') ||
          habitName.includes('invest') || habitName.includes('financial') || habitName.includes('expense') ||
          habitName.includes('income') || habitName.includes('debt')) {
        categories.add('financial')
      }
      
      // Home & Environment
      if (habitName.includes('clean') || habitName.includes('organize') || habitName.includes('declutter') ||
          habitName.includes('tidy') || habitName.includes('home') || habitName.includes('space') ||
          habitName.includes('environment') || habitName.includes('maintenance')) {
        categories.add('home')
      }
    })

    return Array.from(categories)
  }

  /**
   * Extract goal signals from user's vision and context
   * Enhanced to extract more signals for users without habits
   */
  private extractGoalSignals(context: UserContext): string[] {
    const signals: string[] = []

    if (context.vision?.visionStatement) {
      const vision = context.vision.visionStatement.toLowerCase()

      // Energy & Vitality
      if (vision.includes('energy') || vision.includes('vitality') || vision.includes('energized') || vision.includes('vibrant')) {
        signals.push('energy')
      }
      // Family & Relationships
      if (vision.includes('family') || vision.includes('children') || vision.includes('parent') ||
          vision.includes('kids') || vision.includes('husband') || vision.includes('wife') ||
          vision.includes('partner') || vision.includes('relationship')) {
        signals.push('family')
      }
      // Health & Wellness
      if (vision.includes('health') || vision.includes('wellness') || vision.includes('healthy') ||
          vision.includes('fit') || vision.includes('strong') || vision.includes('body')) {
        signals.push('health')
      }
      // Stress Management & Peace
      if (vision.includes('calm') || vision.includes('peace') || vision.includes('stress') ||
          vision.includes('relax') || vision.includes('anxiety') || vision.includes('balance') ||
          vision.includes('centered') || vision.includes('grounded')) {
        signals.push('stress_management')
      }
      // Focus & Productivity
      if (vision.includes('focus') || vision.includes('productivity') || vision.includes('deep work') ||
          vision.includes('accomplish') || vision.includes('achieve') || vision.includes('goals') ||
          vision.includes('career') || vision.includes('work') || vision.includes('success')) {
        signals.push('focus')
      }
      // Gratitude & Positivity
      if (vision.includes('gratitude') || vision.includes('grateful') || vision.includes('positive') ||
          vision.includes('happy') || vision.includes('joy') || vision.includes('appreciate')) {
        signals.push('gratitude')
      }
      // Mindfulness & Presence
      if (vision.includes('present') || vision.includes('mindful') || vision.includes('awareness') ||
          vision.includes('moment') || vision.includes('intentional')) {
        signals.push('stress_management')
      }
    }

    // If no signals found but user has a vision, add a general health signal
    // This ensures we always have something to work with
    if (signals.length === 0 && context.vision?.visionStatement) {
      console.log('⚠️ No specific signals found in vision, adding default health signal')
      signals.push('health')
    }

    return [...new Set(signals)] // Remove duplicates
  }

  /**
   * Identify challenge areas from reflection signals
   */
  private identifyChallenges(reflectionSignals: ReflectionSignals | null): string[] {
    if (!reflectionSignals) return []

    const challenges = []

    // Energy challenges
    if (reflectionSignals.mood_energy_signal === 'low') {
      challenges.push('low_energy')
    }
    if (reflectionSignals.time_constraint_signal === 'high') {
      challenges.push('time_constraints')
    }

    // Specific blockers
    if (reflectionSignals.blockers.length > 0) {
      challenges.push('habit_formation')
    }

    return challenges
  }

  /**
   * Get content specific to user's current habits
   */
  private getHabitSpecificContent(habitCategories: string[]): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = []

    habitCategories.forEach(category => {
      const categoryContent = this.contentDatabase[category as keyof typeof this.contentDatabase]
      if (categoryContent && categoryContent.length > 0) {
        // Take the most relevant content from each category
        const content = categoryContent[0] // Most relevant item
        recommendations.push({
          ...content,
          why_this_for_you: `Supports your ${category.replace(/([A-Z])/g, ' $1').toLowerCase()} habit with practical strategies.`
        })
      }
    })

    return recommendations
  }

  /**
   * Get content aligned with user's goals
   */
  private getGoalAlignedContent(goalSignals: string[]): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = []

    goalSignals.forEach(signal => {
      let content: any[] = []

      switch (signal) {
        case 'energy':
          content = [...this.contentDatabase.strengthTraining, ...this.contentDatabase.nutrition]
          break
        case 'family':
          content = [...this.contentDatabase.productivity, ...this.contentDatabase.mindfulness]
          break
        case 'health':
          content = [...this.contentDatabase.strengthTraining, ...this.contentDatabase.nutrition, ...this.contentDatabase.sleep]
          break
        case 'stress_management':
          content = [...this.contentDatabase.mindfulness, ...this.contentDatabase.sleep]
          break
        case 'focus':
          content = [...this.contentDatabase.productivity, ...this.contentDatabase.mindfulness]
          break
      }

      if (content.length > 0) {
        const selectedContent = content[Math.floor(Math.random() * Math.min(2, content.length))]
        recommendations.push({
          ...selectedContent,
          why_this_for_you: `Aligns with your goal to improve ${signal.replace('_', ' ')}.`
        })
      }
    })

    return recommendations
  }

  /**
   * Get content to address specific challenges
   */
  private getChallengeBasedContent(challengeAreas: string[]): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = []

    challengeAreas.forEach(challenge => {
      let content: any[] = []

      switch (challenge) {
        case 'low_energy':
          content = [...this.contentDatabase.nutrition, ...this.contentDatabase.sleep]
          break
        case 'time_constraints':
          content = [...this.contentDatabase.productivity, ...this.contentDatabase.mindfulness]
          break
        case 'habit_formation':
          content = [...this.contentDatabase.motivation, ...this.contentDatabase.strengthTraining]
          break
      }

      if (content.length > 0) {
        const selectedContent = content[Math.floor(Math.random() * Math.min(2, content.length))]
        recommendations.push({
          ...selectedContent,
          why_this_for_you: `Addresses your ${challenge.replace('_', ' ')} challenges with targeted strategies.`
        })
      }
    })

    return recommendations
  }

  /**
   * Get motivational content for all users
   */
  private getMotivationalContent(context: UserContext): ContentRecommendation {
    const motivationalContent = {
      type: 'article' as const,
      title: 'The Science of Habit Streaks',
      url: 'https://jamesclear.com/habit-streaks',
      brief_description: 'Why consistency beats intensity every time',
      duration_minutes: 5,
      source: 'James Clear',
      thumbnail_url: 'https://via.placeholder.com/300x300'
    }
    
    return {
      ...motivationalContent,
      why_this_for_you: `Reinforces your commitment to building meaningful habits, ${context.user_name.split(' ')[0]}.`
    }
  }

}
