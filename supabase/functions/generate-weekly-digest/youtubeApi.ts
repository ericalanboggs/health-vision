/**
 * YouTube Data API Integration
 * Fetches latest workout and fitness videos based on user preferences
 */

export interface YouTubeVideo {
  videoId: string
  title: string
  description: string
  thumbnailUrl: string
  duration: string
  publishedAt: string
  channelTitle: string
  viewCount: number
  tags: string[]
}

export interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string
    }
    snippet: {
      title: string
      description: string
      thumbnails: {
        high: {
          url: string
        }
      }
      contentDetails: {
        duration: string
      }
    }
    statistics: {
      viewCount: string
    }
  }>
}

export class YouTubeAPI {
  private readonly apiKey: string
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search for workout videos based on user preferences
   */
  async searchWorkoutVideos(query: string = 'bodyweight strength workout', maxResults: number = 5): Promise<YouTubeVideo[]> {
    console.log(`Searching YouTube for: ${query}`)
    
    const searchUrl = `${this.baseUrl}/search?part=snippet,contentDetails,statistics&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=relevance&videoDefinition=high&key=${this.apiKey}`
    
    try {
      const response = await fetch(searchUrl)
      if (!response.ok) {
        throw new Error(`YouTube API search failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('YouTube API error:', data.error)
        throw new Error(`YouTube API error: ${data.error.message}`)
      }
      
      return this.transformSearchResults(data.items)
      
    } catch (error) {
      console.error('Error searching YouTube videos:', error)
      return []
    }
  }

  /**
   * Get popular fitness channels for content discovery
   */
  async getFitnessChannels(): Promise<string[]> {
    const channelIds = [
      'UCrlmzZmkS3LWsVaVb0Kf2', // FitnessBlender
      'UC8-Tha3f2tQhJrC9rA0', // AthleanX
      'UCDQKQr1grv9g_6M9FgC', // Calisthenics Movement
    ]
    
    return channelIds
  }

  /**
   * Get trending workout videos for specific categories
   */
  async getTrendingWorkoutVideos(category: string = 'fitness', maxResults: number = 3): Promise<YouTubeVideo[]> {
    console.log(`Getting trending YouTube videos for category: ${category}`)
    
    const url = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=${this.getCategoryId(category)}&maxResults=${maxResults}&key=${this.apiKey}`
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`YouTube trending videos failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('YouTube trending API error:', data.error)
        return []
      }
      
      return this.transformSearchResults(data.items)
      
    } catch (error) {
      console.error('Error getting trending YouTube videos:', error)
      return []
    }
  }

  /**
   * Get videos from specific channels (curated content)
   */
  async getChannelVideos(channelId: string, maxResults: number = 3): Promise<YouTubeVideo[]> {
    console.log(`Getting videos from channel: ${channelId}`)
    
    const url = `${this.baseUrl}/search?part=snippet,contentDetails,statistics&channelId=${channelId}&type=video&maxResults=${maxResults}&order=date&key=${this.apiKey}`
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`YouTube channel videos failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('YouTube channel API error:', data.error)
        return []
      }
      
      return this.transformSearchResults(data.items)
      
    } catch (error) {
      console.error('Error getting channel videos:', error)
      return []
    }
  }

  /**
   * Transform YouTube API response to our format
   */
  private transformSearchResults(items: any[]): YouTubeVideo[] {
    return items.map(item => {
      // Handle different YouTube API response formats
      const videoId = item.id?.videoId || item.videoId || ''
      const snippet = item.snippet || {}
      const statistics = item.statistics || {}
      
      return {
        videoId,
        title: snippet.title || '',
        description: snippet.description || '',
        thumbnailUrl: snippet.thumbnails?.high?.url || '',
        duration: snippet.contentDetails?.duration || '',
        publishedAt: snippet.publishedAt || '',
        channelTitle: snippet.channelTitle || '',
        viewCount: parseInt(statistics.viewCount) || 0,
        tags: snippet.tags || []
      }
    })
  }

  /**
   * Get YouTube category ID for fitness content
   */
  private getCategoryId(category: string): string {
    const categories = {
      fitness: '17',
      sports: '17',
      education: '27'
    }
    return categories[category as keyof typeof categories] || '17'
  }

  /**
   * Format duration for display
   */
  static formatDuration(duration: string): string {
    // YouTube format: PT4M30S -> 4m30s
    const match = duration.match(/PT(\d+)M(\d+)S/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      return `${minutes}m${seconds}s`
    }
    return duration
  }

  /**
   * Generate personalized search queries based on user context
   */
  static generatePersonalizedQuery(userContext: any): string {
    const { habits, vision } = userContext
    
    // Base query from habits
    let baseQuery = 'bodyweight workout'
    
    if (habits && habits.length > 0) {
      const strengthHabits = habits.filter((h: any) => 
        h.habit_name.toLowerCase().includes('strength') || 
        h.habit_name.toLowerCase().includes('workout') ||
        h.habit_name.toLowerCase().includes('exercise')
      )
      
      if (strengthHabits.length > 0) {
        baseQuery = 'bodyweight strength training'
      }
      
      const mindfulnessHabits = habits.filter((h: any) => 
        h.habit_name.toLowerCase().includes('meditate') || 
        h.habit_name.toLowerCase().includes('mindful') ||
        h.habit_name.toLowerCase().includes('breathe')
      )
      
      if (mindfulnessHabits.length > 0) {
        baseQuery = 'mindfulness meditation'
      }
    }
    
    // Add vision-based modifiers
    if (vision?.visionStatement) {
      const vision = vision.visionStatement.toLowerCase()
      if (vision.includes('energy') || vision.includes('vitality')) {
        baseQuery += ' energy boost'
      }
      if (vision.includes('family') || vision.includes('parent')) {
        baseQuery += ' quick home workout'
      }
    }
    
    return baseQuery
  }
}
