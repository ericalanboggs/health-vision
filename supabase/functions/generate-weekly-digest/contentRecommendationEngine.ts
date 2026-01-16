import { UserContext, ReflectionSignals, ContentRecommendation } from './types.ts'
import { YouTubeAPI } from './youtubeApi.ts'

/**
 * Content Recommendation Engine
 * Generates personalized content based on user context, goals, and reflection signals
 * Uses improved YouTube API with two-step search, quality filtering, and fallbacks
 */
export class ContentRecommendationEngine {
  private readonly youtubeAPI: YouTubeAPI

  constructor(youtubeApiKey: string, spotifyAccessToken?: string) {
    this.youtubeAPI = new YouTubeAPI(youtubeApiKey)
    // Spotify integration disabled for now
  }

  /**
   * Generate personalized content recommendations based on user context
   */
  async generateRecommendations(context: UserContext): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    // Analyze user's current habits and goals
    const habitCategories = this.analyzeHabits(context.habits)
    const goalSignals = this.extractGoalSignals(context)
    const challengeAreas = this.identifyChallenges(context.reflection_signals)

    console.log(`📊 Content analysis:`, {
      habitCategories,
      goalSignals,
      challengeAreas
    })

    // Generate recommendations from real APIs with improved quality
    recommendations.push(...await this.getRealTimeContent(context, habitCategories, goalSignals))

    // Deduplicate by video ID and limit to top 6
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations)
    return uniqueRecommendations.slice(0, 6)
  }

  /**
   * Remove duplicate recommendations based on URL
   */
  private deduplicateRecommendations(recommendations: ContentRecommendation[]): ContentRecommendation[] {
    const seen = new Set<string>()
    return recommendations.filter(rec => {
      if (seen.has(rec.url)) return false
      seen.add(rec.url)
      return true
    })
  }

  /**
   * Get real-time content from APIs based on user context
   * Uses improved YouTube API with quality filtering and fallbacks
   */
  private async getRealTimeContent(context: UserContext, habitCategories: string[], goalSignals: string[]): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    console.log('🎯 Habit categories detected:', habitCategories)
    console.log('🎯 Goal signals detected:', goalSignals)

    // Determine primary content category from user's habits
    const primaryCategory = YouTubeAPI.getContentCategory(context)
    console.log('🎯 Primary content category:', primaryCategory)

    // YouTube content for mindfulness/meditation habits (highest priority for this user's habits)
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

    // YouTube content for creativity/storytelling habits
    if (habitCategories.includes('creativity') || goalSignals.includes('storytelling')) {
      console.log('🎨 Fetching storytelling videos...')
      try {
        const creativityVideos = await this.youtubeAPI.searchWorkoutVideos('storytelling techniques how to tell stories', 2)
        console.log('📺 Storytelling videos found:', creativityVideos.length)
        recommendations.push(...this.transformVideosToRecommendations(
          creativityVideos,
          'Enhances your storytelling and creative writing skills.'
        ))
      } catch (error) {
        console.error('❌ Error fetching storytelling videos:', error)
      }
    }

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
        const workoutQuery = YouTubeAPI.generatePersonalizedQuery(context)
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

    // Add curated podcast content for mindfulness (real Spotify show)
    if (habitCategories.includes('mindfulness') || goalSignals.includes('stress_management')) {
      console.log('🎙️ Adding mindfulness podcast...')
      recommendations.push({
        type: 'podcast' as const,
        title: 'Ten Percent Happier with Dan Harris',
        url: 'https://open.spotify.com/show/1CfW319UkBMVhCXfei8huv',
        brief_description: 'Practical meditation guidance from experts',
        why_this_for_you: 'Supports your mindfulness practice with expert guidance.',
        duration_minutes: 45,
        source: 'Ten Percent Happier',
        thumbnail_url: 'https://i.scdn.co/image/ab6765630000ba8a7a4e4b9b8b9b8b9b8b9b8b9b'
      })
    }

    // Add motivational article content for all users
    console.log('💪 Adding motivational content...')
    const motivationalContent = this.getMotivationalContent(context)
    recommendations.push(motivationalContent)

    console.log('✅ Total recommendations generated:', recommendations.length)
    console.log('📊 Recommendation types:', recommendations.map(r => r.type))

    return recommendations
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
      
      // Creativity & Expression
      if (habitName.includes('story') || habitName.includes('write') || habitName.includes('journal') ||
          habitName.includes('creative') || habitName.includes('art') || habitName.includes('music') ||
          habitName.includes('draw') || habitName.includes('paint') || habitName.includes('craft')) {
        categories.add('creativity')
      }
      
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
   */
  private extractGoalSignals(context: UserContext): string[] {
    const signals = []
    
    if (context.vision?.visionStatement) {
      const vision = context.vision.visionStatement.toLowerCase()
      
      if (vision.includes('energy') || vision.includes('vitality')) {
        signals.push('energy')
      }
      if (vision.includes('family') || vision.includes('children') || vision.includes('parent')) {
        signals.push('family')
      }
      if (vision.includes('health') || vision.includes('wellness')) {
        signals.push('health')
      }
      if (vision.includes('calm') || vision.includes('peace') || vision.includes('stress')) {
        signals.push('stress_management')
      }
      if (vision.includes('focus') || vision.includes('productivity') || vision.includes('deep work')) {
        signals.push('focus')
      }
    }

    return signals
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
