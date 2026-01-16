/**
 * Spotify Podcast API Integration
 * Fetches latest podcast episodes for mindfulness and personal development
 */

export interface SpotifyEpisode {
  id: string
  name: string
  description: string
  durationMs: number
  releaseDate: string
  audioPreviewUrl?: string
  images: {
    url?: string
  }
  externalUrls: {
    spotify?: string
  }
}

export interface SpotifyShow {
  id: string
  name: string
  description: string
  publisher: string
  totalEpisodes: number
  images: {
    url?: string
  }
}

export interface SpotifySearchResponse {
  shows: {
    items: SpotifyShow[]
    href: string
    limit: number
    next?: string
    previous?: string
    total: number
  }
}

export class SpotifyAPI {
  private readonly accessToken: string
  private readonly baseUrl = 'https://api.spotify.com/v1'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Search for podcasts based on user preferences
   */
  async searchPodcasts(query: string = 'mindfulness meditation', limit: number = 5): Promise<SpotifyShow[]> {
    console.log(`Searching Spotify for podcasts: ${query}`)
    
    const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&type=show&limit=${limit}&market=US`
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Spotify API search failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('Spotify API error:', data.error)
        throw new Error(`Spotify API error: ${data.error.message}`)
      }
      
      return data.shows.items
      
    } catch (error) {
      console.error('Error searching Spotify podcasts:', error)
      return []
    }
  }

  /**
   * Get latest episodes from a specific podcast
   */
  async getLatestEpisodes(showId: string, limit: number = 3): Promise<SpotifyEpisode[]> {
    console.log(`Getting latest episodes from show: ${showId}`)
    
    const episodesUrl = `${this.baseUrl}/shows/${showId}/episodes?limit=${limit}&market=US`
    
    try {
      const response = await fetch(episodesUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Spotify episodes API failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('Spotify episodes API error:', data.error)
        return []
      }
      
      return data.items
      
    } catch (error) {
      console.error('Error getting Spotify episodes:', error)
      return []
    }
  }

  /**
   * Get popular mindfulness and personal development podcasts
   */
  async getPopularMindfulnessPodcasts(limit: number = 5): Promise<SpotifyShow[]> {
    console.log('Getting popular mindfulness podcasts')
    
    // Search for multiple mindfulness-related terms
    const queries = [
      'mindfulness meditation',
      'personal development',
      'stress management',
      'sleep meditation',
      'breathing exercises'
    ]
    
    const allShows: SpotifyShow[] = []
    
    for (const query of queries) {
      const shows = await this.searchPodcasts(query, Math.ceil(limit / queries.length))
      allShows.push(...shows)
    }
    
    // Remove duplicates and limit results
    const uniqueShows = this.removeDuplicateShows(allShows).slice(0, limit)
    
    return uniqueShows
  }

  /**
   * Get curated list of high-quality wellness podcasts
   */
  async getCuratedWellnessPodcasts(): Promise<SpotifyShow[]> {
    console.log('Getting curated wellness podcasts')
    
    // These are high-quality, consistently updated podcasts in wellness space
    const curatedShowIds = [
      '5Cjcwvffj2eBdD7l9t', // The Mindful Minute
      '4rOoJ6EielfzKwTJ2ZyA', // Ten Percent Happier
      '2rIMQgVgOcOcIuEWyW', // The Daily Meditation Podcast
      '6XGPYlj3hLpLhY4pV', // On Purpose with Jay Shetty
      '7x8lRZlTy0P2a2bY', // The Tim Ferriss Show
    ]
    
    const shows: SpotifyShow[] = []
    
    for (const showId of curatedShowIds) {
      try {
        const showUrl = `${this.baseUrl}/shows/${showId}?market=US`
        const response = await fetch(showUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (!data.error) {
            shows.push(data)
          }
        }
      } catch (error) {
        console.error(`Error fetching show ${showId}:`, error)
      }
    }
    
    return shows
  }

  /**
   * Transform Spotify episodes to our content format
   */
  static transformEpisodeToContent(episode: SpotifyEpisode, showName: string): any {
    const durationMinutes = Math.round(episode.durationMs / 60000) // Convert ms to minutes
    
    return {
      type: 'podcast',
      title: episode.name,
      url: episode.externalUrls.spotify || `https://open.spotify.com/episode/${episode.id}`,
      brief_description: episode.description ? episode.description.substring(0, 150) + '...' : `Episode of ${showName}`,
      why_this_for_you: `Provides mindfulness guidance from trusted wellness podcast ${showName}.`,
      duration_minutes: durationMinutes,
      source: showName,
      thumbnail_url: episode.images?.url
    }
  }

  /**
   * Transform Spotify shows to our content format
   */
  static transformShowToContent(show: SpotifyShow): any {
    return {
      type: 'podcast',
      title: show.name,
      url: show.externalUrls.spotify || `https://open.spotify.com/show/${show.id}`,
      brief_description: show.description ? show.description.substring(0, 150) + '...' : `Wellness podcast: ${show.name}`,
      why_this_for_you: `Popular wellness podcast for mindfulness and personal development.`,
      duration_minutes: 45, // Average episode length
      source: show.publisher,
      thumbnail_url: show.images?.url
    }
  }

  /**
   * Remove duplicate shows based on ID
   */
  private removeDuplicateShows(shows: SpotifyShow[]): SpotifyShow[] {
    const seen = new Set<string>()
    return shows.filter(show => {
      if (seen.has(show.id)) {
        return false
      }
      seen.add(show.id)
      return true
    })
  }

  /**
   * Generate personalized search queries based on user context
   */
  static generatePersonalizedQuery(userContext: any): string {
    const { habits, vision } = userContext
    
    // Base query from habits
    let baseQuery = 'mindfulness meditation'
    
    if (habits && habits.length > 0) {
      const mindfulnessHabits = habits.filter((h: any) => 
        h.habit_name.toLowerCase().includes('meditate') || 
        h.habit_name.toLowerCase().includes('mindful') ||
        h.habit_name.toLowerCase().includes('breathe')
      )
      
      if (mindfulnessHabits.length > 0) {
        baseQuery = 'guided meditation breathing'
      }
      
      const focusHabits = habits.filter((h: any) => 
        h.habit_name.toLowerCase().includes('focus') || 
        h.habit_name.toLowerCase().includes('deep work')
      )
      
      if (focusHabits.length > 0) {
        baseQuery = 'focus productivity'
      }
    }
    
    // Add vision-based modifiers
    if (vision?.visionStatement) {
      const vision = vision.visionStatement.toLowerCase()
      if (vision.includes('stress') || vision.includes('calm')) {
        baseQuery += ' stress relief'
      }
      if (vision.includes('energy') || vision.includes('vitality')) {
        baseQuery += ' energy management'
      }
      if (vision.includes('family') || vision.includes('parent')) {
        baseQuery += ' work life balance'
      }
    }
    
    return baseQuery
  }

  /**
   * Format duration for display
   */
  static formatDuration(durationMs: number): string {
    const minutes = Math.round(durationMs / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours > 0) {
      return `${hours}h${remainingMinutes}m`
    }
    return `${minutes}m`
  }
}
