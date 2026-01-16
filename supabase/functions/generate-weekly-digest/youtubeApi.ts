/**
 * YouTube Data API Integration
 * Fetches latest workout and fitness videos based on user preferences
 *
 * Uses a two-step process:
 * 1. Search API to find video IDs
 * 2. Videos API to get full details (duration, stats)
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

// Curated fitness channels with quality content
const CURATED_CHANNELS = {
  meditation: [
    { id: 'UC-cF-RuGLRYpZKPdqpgashg', name: 'Headspace' },
    { id: 'UCN4vyryy6O4GlIXcXTIuZQQ', name: 'The Honest Guys' },
    { id: 'UCjfYgr2vU_vSix3qdqY2aQQ', name: 'Michael Sealey' },
  ],
  fitness: [
    { id: 'UCIJwWYOfsCfz6PjxbONYXSg', name: 'Blogilates' },
    { id: 'UCVQJZE_on7It_pEv6tn-jdA', name: 'THENX' },
    { id: 'UCaBqRxHEMomgFU-AkSfodCw', name: 'Sydney Cummings' },
  ],
  wellness: [
    { id: 'UCbR6jJpva9VIIAHTse4C3hw', name: 'Therapy in a Nutshell' },
    { id: 'UCDAvTJuPyBDCx0nBXe9YVLQ', name: 'Sadhguru' },
  ],
  storytelling: [
    { id: 'UCvjgEDvShRsAP-qJ4wE5h9g', name: 'TED-Ed' },
    { id: 'UCsXVk37bltHxD1rDPwtNM8Q', name: 'Kurzgesagt' },
  ]
}

// Fallback curated videos when API fails (verified working video IDs)
const FALLBACK_VIDEOS: Record<string, YouTubeVideo[]> = {
  meditation: [
    {
      videoId: 'inpok4MWVW4',
      title: '5-Minute Meditation You Can Do Anywhere',
      description: 'A simple breathing meditation perfect for beginners or daily practice.',
      thumbnailUrl: 'https://i.ytimg.com/vi/inpok4MWVW4/hqdefault.jpg',
      duration: 'PT6M',
      publishedAt: '2020-01-01',
      channelTitle: 'Goodful',
      viewCount: 15000000,
      tags: ['meditation', 'mindfulness', 'breathing']
    },
    {
      videoId: 'O-6f5wQXSu8',
      title: '10-Minute Guided Meditation for Anxiety',
      description: 'A calming guided meditation to help reduce anxiety and stress.',
      thumbnailUrl: 'https://i.ytimg.com/vi/O-6f5wQXSu8/hqdefault.jpg',
      duration: 'PT10M',
      publishedAt: '2019-01-01',
      channelTitle: 'Great Meditation',
      viewCount: 8000000,
      tags: ['meditation', 'anxiety', 'calm']
    }
  ],
  fitness: [
    {
      videoId: 'UItWltVZZmE',
      title: '20 Min Full Body Workout - No Equipment',
      description: 'Complete home workout requiring no equipment. Perfect for all fitness levels.',
      thumbnailUrl: 'https://i.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg',
      duration: 'PT20M',
      publishedAt: '2021-01-01',
      channelTitle: 'MadFit',
      viewCount: 25000000,
      tags: ['workout', 'home', 'bodyweight']
    },
    {
      videoId: 'cbKkB3POqaY',
      title: '10 Minute Morning Yoga Stretch',
      description: 'Start your day with this energizing yoga routine.',
      thumbnailUrl: 'https://i.ytimg.com/vi/cbKkB3POqaY/hqdefault.jpg',
      duration: 'PT11M',
      publishedAt: '2020-01-01',
      channelTitle: 'Yoga With Adriene',
      viewCount: 12000000,
      tags: ['yoga', 'morning', 'stretch']
    }
  ],
  gratitude: [
    {
      videoId: 'WPPPFqsECz0',
      title: 'The Science of Gratitude',
      description: 'How gratitude practice rewires your brain for happiness.',
      thumbnailUrl: 'https://i.ytimg.com/vi/WPPPFqsECz0/hqdefault.jpg',
      duration: 'PT8M',
      publishedAt: '2020-01-01',
      channelTitle: 'SoulPancake',
      viewCount: 3000000,
      tags: ['gratitude', 'science', 'happiness']
    }
  ],
  storytelling: [
    {
      videoId: 'Nj-hdQMa3uA',
      title: 'The Clues to a Great Story',
      description: 'Andrew Stanton shares what makes stories resonate.',
      thumbnailUrl: 'https://i.ytimg.com/vi/Nj-hdQMa3uA/hqdefault.jpg',
      duration: 'PT19M',
      publishedAt: '2012-01-01',
      channelTitle: 'TED',
      viewCount: 4500000,
      tags: ['storytelling', 'writing', 'creativity']
    }
  ]
}

export class YouTubeAPI {
  private readonly apiKey: string
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search for videos with a two-step process:
   * 1. Search API to get video IDs
   * 2. Videos API to get full details
   */
  async searchWorkoutVideos(query: string = 'bodyweight strength workout', maxResults: number = 5): Promise<YouTubeVideo[]> {
    console.log(`🔍 Searching YouTube for: "${query}"`)

    try {
      // Step 1: Search to get video IDs (search API only supports snippet)
      const searchUrl = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults * 2}&order=relevance&videoDefinition=high&safeSearch=strict&key=${this.apiKey}`

      const searchResponse = await fetch(searchUrl)
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error('YouTube search API failed:', searchResponse.status, errorText)
        throw new Error(`YouTube API search failed: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()

      if (searchData.error) {
        console.error('YouTube API error:', searchData.error)
        throw new Error(`YouTube API error: ${searchData.error.message}`)
      }

      if (!searchData.items || searchData.items.length === 0) {
        console.log('⚠️ No search results found')
        return this.getFallbackVideos(query)
      }

      // Extract video IDs
      const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter((id: string) => id)

      if (videoIds.length === 0) {
        console.log('⚠️ No valid video IDs found')
        return this.getFallbackVideos(query)
      }

      console.log(`📺 Found ${videoIds.length} video IDs, fetching details...`)

      // Step 2: Get full video details (duration, stats)
      const videosUrl = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${this.apiKey}`

      const videosResponse = await fetch(videosUrl)
      if (!videosResponse.ok) {
        console.error('YouTube videos API failed:', videosResponse.statusText)
        throw new Error(`YouTube videos API failed: ${videosResponse.statusText}`)
      }

      const videosData = await videosResponse.json()

      if (videosData.error) {
        console.error('YouTube videos API error:', videosData.error)
        throw new Error(`YouTube videos API error: ${videosData.error.message}`)
      }

      // Transform and filter for quality
      const videos = this.transformVideoResults(videosData.items)
      const filteredVideos = this.filterForQuality(videos, maxResults)

      console.log(`✅ Returning ${filteredVideos.length} quality videos`)
      return filteredVideos

    } catch (error) {
      console.error('❌ Error searching YouTube videos:', error)
      return this.getFallbackVideos(query)
    }
  }

  /**
   * Get curated channel IDs for a category
   */
  getCuratedChannels(category: string): { id: string; name: string }[] {
    return CURATED_CHANNELS[category as keyof typeof CURATED_CHANNELS] || []
  }

  /**
   * Search within curated channels for better quality results
   */
  async searchCuratedChannels(category: string, query: string, maxResults: number = 3): Promise<YouTubeVideo[]> {
    console.log(`🎯 Searching curated ${category} channels for: "${query}"`)

    const channels = this.getCuratedChannels(category)
    if (channels.length === 0) {
      return this.searchWorkoutVideos(query, maxResults)
    }

    // Search across curated channels
    const channelIds = channels.map(c => c.id).join('|')
    const searchQuery = `${query}`

    try {
      const searchUrl = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults * 2}&order=relevance&safeSearch=strict&key=${this.apiKey}`

      const searchResponse = await fetch(searchUrl)
      if (!searchResponse.ok) {
        throw new Error(`YouTube search failed: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()

      if (!searchData.items || searchData.items.length === 0) {
        return this.getFallbackVideos(category)
      }

      const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter((id: string) => id)

      if (videoIds.length === 0) {
        return this.getFallbackVideos(category)
      }

      const videosUrl = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${this.apiKey}`
      const videosResponse = await fetch(videosUrl)

      if (!videosResponse.ok) {
        throw new Error(`YouTube videos API failed: ${videosResponse.statusText}`)
      }

      const videosData = await videosResponse.json()
      const videos = this.transformVideoResults(videosData.items)
      return this.filterForQuality(videos, maxResults)

    } catch (error) {
      console.error(`❌ Error searching curated channels:`, error)
      return this.getFallbackVideos(category)
    }
  }

  /**
   * Get videos from a specific channel
   */
  async getChannelVideos(channelId: string, maxResults: number = 3): Promise<YouTubeVideo[]> {
    console.log(`📺 Getting videos from channel: ${channelId}`)

    try {
      // Step 1: Search for videos from this channel
      const searchUrl = `${this.baseUrl}/search?part=snippet&channelId=${channelId}&type=video&maxResults=${maxResults * 2}&order=date&key=${this.apiKey}`

      const searchResponse = await fetch(searchUrl)
      if (!searchResponse.ok) {
        throw new Error(`YouTube channel search failed: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()

      if (!searchData.items || searchData.items.length === 0) {
        return []
      }

      const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter((id: string) => id)

      if (videoIds.length === 0) {
        return []
      }

      // Step 2: Get full video details
      const videosUrl = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${this.apiKey}`
      const videosResponse = await fetch(videosUrl)

      if (!videosResponse.ok) {
        throw new Error(`YouTube videos API failed: ${videosResponse.statusText}`)
      }

      const videosData = await videosResponse.json()
      return this.transformVideoResults(videosData.items).slice(0, maxResults)

    } catch (error) {
      console.error('❌ Error getting channel videos:', error)
      return []
    }
  }

  /**
   * Transform YouTube Videos API response to our format
   */
  private transformVideoResults(items: any[]): YouTubeVideo[] {
    if (!items || !Array.isArray(items)) {
      return []
    }

    return items.map(item => {
      const videoId = item.id || ''
      const snippet = item.snippet || {}
      const contentDetails = item.contentDetails || {}
      const statistics = item.statistics || {}

      return {
        videoId,
        title: snippet.title || '',
        description: snippet.description || '',
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        duration: contentDetails.duration || 'PT10M',
        publishedAt: snippet.publishedAt || '',
        channelTitle: snippet.channelTitle || '',
        viewCount: parseInt(statistics.viewCount) || 0,
        tags: snippet.tags || []
      }
    }).filter(video => video.videoId && video.title)
  }

  /**
   * Filter videos for quality based on view count, duration, and content
   */
  private filterForQuality(videos: YouTubeVideo[], maxResults: number): YouTubeVideo[] {
    return videos
      .filter(video => {
        // Filter out very short videos (likely clips) or very long ones
        const minutes = this.parseDurationToMinutes(video.duration)
        if (minutes < 3 || minutes > 60) return false

        // Filter out low-quality content by title keywords
        const lowQualityKeywords = ['#shorts', 'tiktok', 'compilation', 'reaction', 'exposed', 'drama', 'beef', 'prank']
        const titleLower = video.title.toLowerCase()
        if (lowQualityKeywords.some(kw => titleLower.includes(kw))) return false

        // Prefer videos with decent view counts (at least 10k)
        if (video.viewCount < 10000) return false

        return true
      })
      .sort((a, b) => {
        // Sort by relevance score: balance of views and recency
        const aScore = Math.log10(a.viewCount + 1)
        const bScore = Math.log10(b.viewCount + 1)
        return bScore - aScore
      })
      .slice(0, maxResults)
  }

  /**
   * Get fallback videos when API fails
   */
  private getFallbackVideos(queryOrCategory: string): YouTubeVideo[] {
    const query = queryOrCategory.toLowerCase()

    // Match query to fallback category
    if (query.includes('meditation') || query.includes('mindful') || query.includes('calm')) {
      console.log('📦 Using fallback meditation videos')
      return FALLBACK_VIDEOS.meditation
    }
    if (query.includes('gratitude') || query.includes('grateful') || query.includes('wellness')) {
      console.log('📦 Using fallback gratitude videos')
      return FALLBACK_VIDEOS.gratitude
    }
    if (query.includes('story') || query.includes('creative') || query.includes('writing')) {
      console.log('📦 Using fallback storytelling videos')
      return FALLBACK_VIDEOS.storytelling
    }
    if (query.includes('workout') || query.includes('fitness') || query.includes('exercise') || query.includes('strength')) {
      console.log('📦 Using fallback fitness videos')
      return FALLBACK_VIDEOS.fitness
    }

    // Default to meditation (most universally applicable)
    console.log('📦 Using default fallback videos')
    return FALLBACK_VIDEOS.meditation
  }

  /**
   * Parse YouTube duration to minutes (handles all formats)
   */
  private parseDurationToMinutes(duration: string): number {
    if (!duration) return 10

    // YouTube format: PT1H30M45S, PT5M, PT30S, etc.
    const hoursMatch = duration.match(/(\d+)H/)
    const minutesMatch = duration.match(/(\d+)M/)
    const secondsMatch = duration.match(/(\d+)S/)

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
    const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0

    return hours * 60 + minutes + (seconds > 30 ? 1 : 0)
  }

  /**
   * Format duration for display
   */
  static formatDuration(duration: string): string {
    if (!duration) return '10m'

    const hoursMatch = duration.match(/(\d+)H/)
    const minutesMatch = duration.match(/(\d+)M/)
    const secondsMatch = duration.match(/(\d+)S/)

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
    const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0

    if (hours > 0) {
      return `${hours}h${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m${seconds > 0 ? seconds + 's' : ''}`
    }
    return `${seconds}s`
  }

  /**
   * Parse duration to minutes (static version for external use)
   */
  static parseDurationMinutes(duration: string): number {
    if (!duration) return 10

    const hoursMatch = duration.match(/(\d+)H/)
    const minutesMatch = duration.match(/(\d+)M/)
    const secondsMatch = duration.match(/(\d+)S/)

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
    const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0

    return hours * 60 + minutes + (seconds > 30 ? 1 : 0)
  }

  /**
   * Generate personalized search queries based on user context
   */
  static generatePersonalizedQuery(userContext: any): string {
    const { habits, vision } = userContext

    // Analyze habits to determine the best search query
    if (habits && habits.length > 0) {
      const habitNames = habits.map((h: any) => h.habit_name.toLowerCase()).join(' ')

      // Meditation/mindfulness habits
      if (habitNames.includes('meditat') || habitNames.includes('mindful') ||
          habitNames.includes('breathe') || habitNames.includes('calm')) {
        return 'guided meditation for beginners relaxation'
      }

      // Gratitude/journaling habits
      if (habitNames.includes('gratitude') || habitNames.includes('grateful') ||
          habitNames.includes('journal')) {
        return 'gratitude practice benefits motivation'
      }

      // Storytelling/writing habits
      if (habitNames.includes('story') || habitNames.includes('write') ||
          habitNames.includes('creative')) {
        return 'storytelling techniques personal narrative'
      }

      // Fitness/workout habits
      if (habitNames.includes('strength') || habitNames.includes('workout') ||
          habitNames.includes('exercise') || habitNames.includes('gym')) {
        return 'home workout no equipment full body'
      }

      // Yoga/stretching habits
      if (habitNames.includes('yoga') || habitNames.includes('stretch')) {
        return 'morning yoga routine stretching'
      }
    }

    // Fallback to vision-based query
    if (vision?.visionStatement) {
      const visionText = vision.visionStatement.toLowerCase()
      if (visionText.includes('calm') || visionText.includes('anxiety') || visionText.includes('stress')) {
        return 'stress relief meditation calming'
      }
      if (visionText.includes('energy') || visionText.includes('vitality')) {
        return 'energy boosting morning routine'
      }
    }

    return 'personal development motivation wellness'
  }

  /**
   * Get the content category based on user habits
   */
  static getContentCategory(userContext: any): string {
    const { habits } = userContext

    if (habits && habits.length > 0) {
      const habitNames = habits.map((h: any) => h.habit_name.toLowerCase()).join(' ')

      if (habitNames.includes('meditat') || habitNames.includes('mindful') || habitNames.includes('calm')) {
        return 'meditation'
      }
      if (habitNames.includes('story') || habitNames.includes('write') || habitNames.includes('creative')) {
        return 'storytelling'
      }
      if (habitNames.includes('workout') || habitNames.includes('exercise') || habitNames.includes('strength')) {
        return 'fitness'
      }
      if (habitNames.includes('gratitude') || habitNames.includes('wellness')) {
        return 'wellness'
      }
    }

    return 'wellness'
  }
}
