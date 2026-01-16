import { UserContext, ReflectionSignals, ContentRecommendation } from './types.ts'
import { YouTubeAPI } from './youtubeApi.ts'

/**
 * Content Recommendation Engine
 * Generates personalized content based on user context, goals, and reflection signals
 * Now integrates real-time APIs for YouTube content (Spotify disabled for now)
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
    
    console.log(`Content analysis:`, {
      habitCategories,
      goalSignals,
      challengeAreas
    })

    // Generate recommendations from real APIs
    recommendations.push(...await this.getRealTimeContent(context, habitCategories, goalSignals))
    
    // Limit to top 6 recommendations
    return recommendations.slice(0, 6)
  }

  /**
   * Get real-time content from APIs based on user context
   */
  private async getRealTimeContent(context: UserContext, habitCategories: string[], goalSignals: string[]): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []
    
    console.log('🎯 Habit categories detected:', habitCategories)
    console.log('🎯 Goal signals detected:', goalSignals)
    
    // YouTube content for exercise habits
    if (habitCategories.includes('strengthTraining') || goalSignals.includes('health')) {
      console.log('🏋️ Fetching strength training videos...')
      try {
        const workoutQuery = YouTubeAPI.generatePersonalizedQuery(context)
        console.log('🔍 Workout query:', workoutQuery)
        const youtubeVideos = await this.youtubeAPI.searchWorkoutVideos(workoutQuery, 3)
        console.log('📺 YouTube videos found:', youtubeVideos.length)
        recommendations.push(...youtubeVideos.map(video => ({
          type: 'youtube' as const,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          brief_description: video.description.substring(0, 150) + '...',
          why_this_for_you: `Supports your strength training with current workout techniques.`,
          duration_minutes: this.parseYouTubeDuration(video.duration),
          source: video.channelTitle,
          thumbnail_url: video.thumbnailUrl
        })))
      } catch (error) {
        console.error('❌ Error fetching strength training videos:', error)
      }
    }
    
    // YouTube content for mindfulness habits
    if (habitCategories.includes('mindfulness') || goalSignals.includes('stress_management')) {
      console.log('🧘 Fetching mindfulness videos...')
      try {
        const mindfulnessVideos = await this.youtubeAPI.searchWorkoutVideos('guided meditation mindfulness', 2)
        console.log('📺 Mindfulness videos found:', mindfulnessVideos.length)
        recommendations.push(...mindfulnessVideos.map(video => ({
          type: 'youtube' as const,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          brief_description: video.description.substring(0, 150) + '...',
          why_this_for_you: `Supports your meditation practice with guided sessions.`,
          duration_minutes: this.parseYouTubeDuration(video.duration),
          source: video.channelTitle,
          thumbnail_url: video.thumbnailUrl
        })))
      } catch (error) {
        console.error('❌ Error fetching mindfulness videos:', error)
        // Add fallback mindfulness video
        recommendations.push({
          type: 'youtube' as const,
          title: '5-Minute Guided Meditation for Beginners',
          url: 'https://www.youtube.com/watch?v=inpok4MWVW4',
          brief_description: 'Simple breathing meditation perfect for daily practice',
          why_this_for_you: `Supports your meditation practice with guided sessions.`,
          duration_minutes: 5,
          source: 'Headspace',
          thumbnail_url: 'https://i.ytimg.com/vi/inpok4MWVW4/hqdefault.jpg'
        })
      }
    }
    
    // YouTube content for creativity/storytelling habits
    if (habitCategories.includes('creativity') || goalSignals.includes('storytelling')) {
      console.log('🎨 Fetching creativity videos...')
      try {
        const creativityVideos = await this.youtubeAPI.searchWorkoutVideos('storytelling personal development', 2)
        console.log('📺 Creativity videos found:', creativityVideos.length)
        recommendations.push(...creativityVideos.map(video => ({
          type: 'youtube' as const,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          brief_description: video.description.substring(0, 150) + '...',
          why_this_for_you: `Enhances your storytelling and creative writing skills.`,
          duration_minutes: this.parseYouTubeDuration(video.duration),
          source: video.channelTitle,
          thumbnail_url: video.thumbnailUrl
        })))
      } catch (error) {
        console.error('❌ Error fetching creativity videos:', error)
      }
    }
    
    // YouTube content for wellness/gratitude habits
    if (habitCategories.includes('wellness') || goalSignals.includes('gratitude')) {
      console.log('🙏 Fetching wellness videos...')
      try {
        const wellnessVideos = await this.youtubeAPI.searchWorkoutVideos('gratitude practice wellness', 2)
        console.log('📺 Wellness videos found:', wellnessVideos.length)
        recommendations.push(...wellnessVideos.map(video => ({
          type: 'youtube' as const,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          brief_description: video.description.substring(0, 150) + '...',
          why_this_for_you: `Supports your gratitude and wellness practices.`,
          duration_minutes: this.parseYouTubeDuration(video.duration),
          source: video.channelTitle,
          thumbnail_url: video.thumbnailUrl
        })))
      } catch (error) {
        console.error('❌ Error fetching wellness videos:', error)
      }
    }
    
    // Fallback podcast content for mindfulness
    if (habitCategories.includes('mindfulness') || goalSignals.includes('stress_management')) {
      console.log('🎙️ Adding fallback podcast content...')
      recommendations.push({
        type: 'podcast' as const,
        title: 'Daily Meditation Podcast',
        url: 'https://open.spotify.com/show/mindfulness-daily',
        brief_description: 'Short daily meditations for busy people',
        why_this_for_you: `Supports your mindfulness practice with guided meditation.`,
        duration_minutes: 10,
        source: 'Mindfulness Daily',
        thumbnail_url: 'https://via.placeholder.com/300x300'
      })
    }
    
    // YouTube content for productivity habits
    if (habitCategories.includes('productivity') || goalSignals.includes('focus')) {
      console.log('⚡ Fetching productivity videos...')
      try {
        const productivityVideos = await this.youtubeAPI.getTrendingWorkoutVideos('fitness', 2)
        console.log('📺 Productivity videos found:', productivityVideos.length)
        recommendations.push(...productivityVideos.map(video => ({
          type: 'youtube' as const,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          brief_description: video.description.substring(0, 150) + '...',
          why_this_for_you: `Enhances your focus and productivity strategies.`,
          duration_minutes: this.parseYouTubeDuration(video.duration),
          source: video.channelTitle,
          thumbnail_url: video.thumbnailUrl
        })))
      } catch (error) {
        console.error('❌ Error fetching productivity videos:', error)
      }
    }
    
    // Add motivational content for all users
    console.log('💪 Adding motivational content...')
    const motivationalContent = this.getMotivationalContent(context)
    recommendations.push(motivationalContent)
    
    console.log('✅ Total recommendations generated:', recommendations.length)
    console.log('📊 Recommendation types:', recommendations.map(r => r.type))
    
    return recommendations
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

  /**
   * Parse YouTube duration string to minutes
   */
  private parseYouTubeDuration(duration: string): number {
    const match = duration.match(/PT(\d+)M(\d+)S/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      return minutes + (seconds > 30 ? 1 : 0) // Round up
    }
    return 10 // Default fallback
  }
}
