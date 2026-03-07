/**
 * Spotify Podcast API Integration
 * Fetches curated podcast episodes using Client Credentials flow.
 * Episodes are quality-filtered and matched to user habit categories.
 */

export interface SpotifyEpisode {
  id: string
  name: string
  description: string
  duration_ms: number
  release_date: string
  audio_preview_url?: string
  images: Array<{ url: string; height: number; width: number }>
  external_urls: { spotify: string }
}

export interface SpotifyShowEpisodesResponse {
  items: SpotifyEpisode[]
  total: number
  limit: number
  offset: number
}

export interface SpotifySearchEpisodesResponse {
  episodes: {
    items: SpotifyEpisode[]
    total: number
    limit: number
    offset: number
  }
}

export type PodcastCategory =
  | 'mindfulness'
  | 'fitness'
  | 'nutrition'
  | 'sleep'
  | 'productivity'
  | 'wellness'

/**
 * Curated shows organized by category.
 * IDs must be verified against the Spotify API before use.
 */
const CURATED_SHOWS: Record<PodcastCategory, { id: string; name: string }[]> = {
  mindfulness: [
    { id: '1CfW319UkBMVhCXfei8huv', name: 'Ten Percent Happier' },
    { id: '3i5TCKhc6GY42pOWkpWveG', name: 'The Happiness Lab' },
    { id: '5oOSHogkdgmFyucYxIjRUy', name: 'Meditation Minis' },
  ],
  fitness: [
    { id: '79CkJF3UJTHFV8Dse3Ez0P', name: 'Huberman Lab' },
    { id: '5jVJlOGcMuKGUTC3ECGO2S', name: 'Mind Pump' },
    { id: '0MkNfWaGBRMmmuoXJ9MVHv', name: 'Found My Fitness' },
  ],
  nutrition: [
    { id: '2IqXAVFR4e0Bmyjsdc8QzF', name: 'ZOE Science & Nutrition' },
    { id: '0R40SPnD33irHJq0jfSJXN', name: "The Doctor's Kitchen" },
  ],
  sleep: [
    { id: '28fFVbIPCXELol7HB8gdEe', name: 'Nothing Much Happens' },
    { id: '1vN2LPdBcHGpaxIJhfYKlP', name: 'The Sleep Doctor' },
  ],
  productivity: [
    { id: '0e9lFr3AdJByoBpM6tAbxD', name: 'Deep Questions with Cal Newport' },
    { id: '5qSUyCrk9KR69lEiXbjwXM', name: 'The Tim Ferriss Show' },
  ],
  wellness: [
    { id: '69su0q4Xfwq3mQdFC0eMjA', name: 'Good Inside with Dr. Becky' },
    { id: '3ik8dOSJcxpc4qBZ3VWxfj', name: 'Feel Better Live More' },
  ],
}

/** Titles containing these words are filtered out */
const BLOCKED_TITLE_WORDS = ['trailer', 'bonus', 'teaser', 'rerun', 'rebroadcast']

/** Hardcoded fallback episodes for when the API is unavailable */
const FALLBACK_EPISODES: Record<string, {
  id: string
  name: string
  description: string
  duration_minutes: number
  url: string
  source: string
}> = {
  mindfulness: {
    id: 'fallback-mindfulness',
    name: 'How Meditation Changes Your Brain',
    description: 'Dan Harris explores the neuroscience of mindfulness and practical ways to build a meditation habit.',
    duration_minutes: 42,
    url: 'https://open.spotify.com/show/1CfW319UkBMVhCXfei8huv',
    source: 'Ten Percent Happier',
  },
  fitness: {
    id: 'fallback-fitness',
    name: 'Science-Based Tools for Everyday Health',
    description: 'Andrew Huberman discusses protocols for optimizing sleep, exercise, and mental clarity.',
    duration_minutes: 90,
    url: 'https://open.spotify.com/show/79CkJF3UJTHFV8Dse3Ez0P',
    source: 'Huberman Lab',
  },
  productivity: {
    id: 'fallback-productivity',
    name: 'The Deep Life Stack',
    description: 'Cal Newport explains his framework for building a deep, focused, and meaningful life.',
    duration_minutes: 55,
    url: 'https://open.spotify.com/show/0e9lFr3AdJByoBpM6tAbxD',
    source: 'Deep Questions',
  },
  nutrition: {
    id: 'fallback-nutrition',
    name: 'What Your Gut Microbiome Needs',
    description: 'The latest research on how food choices affect your gut health and overall wellbeing.',
    duration_minutes: 38,
    url: 'https://open.spotify.com/show/2IqXAVFR4e0Bmyjsdc8QzF',
    source: 'ZOE Science & Nutrition',
  },
  sleep: {
    id: 'fallback-sleep',
    name: 'A Quiet Evening Walk',
    description: 'A calming bedtime story designed to ease you into restful sleep.',
    duration_minutes: 20,
    url: 'https://open.spotify.com/show/28fFVbIPCXELol7HB8gdEe',
    source: 'Nothing Much Happens',
  },
}

export class SpotifyAPI {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseUrl = 'https://api.spotify.com/v1'

  private cachedToken: string | null = null
  private tokenExpiresAt = 0

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  /**
   * Get an access token using Client Credentials flow.
   * Caches the token in memory with a 50-minute expiry buffer (tokens last 60 min).
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken
    }

    console.log('Requesting new Spotify access token...')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Spotify token request failed (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    this.cachedToken = data.access_token
    // Cache for 50 minutes (token lasts 60 min, 10-min safety buffer)
    this.tokenExpiresAt = Date.now() + 50 * 60 * 1000

    console.log('Spotify access token obtained')
    return this.cachedToken!
  }

  /**
   * Search for podcast episodes matching a query.
   */
  async searchEpisodes(query: string, maxResults = 10): Promise<SpotifyEpisode[]> {
    console.log(`Searching Spotify episodes: "${query}"`)

    try {
      const token = await this.getAccessToken()
      const url = `${this.baseUrl}/search?type=episode&q=${encodeURIComponent(query)}&limit=${maxResults}&market=US`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        console.error(`Spotify search failed: ${response.status} ${response.statusText}`)
        return []
      }

      const data: SpotifySearchEpisodesResponse = await response.json()
      const episodes = data.episodes?.items || []

      return this.filterEpisodes(episodes)
    } catch (error) {
      console.error('Error searching Spotify episodes:', error)
      return []
    }
  }

  /**
   * Get recent episodes from curated shows in a given category.
   * Fetches a few episodes from each show, filters for quality, and excludes given IDs.
   */
  async getEpisodesFromCuratedShows(
    category: PodcastCategory,
    maxResults = 2,
    excludeIds: Set<string> = new Set()
  ): Promise<SpotifyEpisode[]> {
    const shows = CURATED_SHOWS[category]
    if (!shows || shows.length === 0) return []

    console.log(`Fetching curated episodes for category: ${category} (${shows.length} shows)`)

    const allEpisodes: SpotifyEpisode[] = []

    for (const show of shows) {
      try {
        const token = await this.getAccessToken()
        const url = `${this.baseUrl}/shows/${show.id}/episodes?limit=5&market=US`

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          console.warn(`Failed to fetch episodes for "${show.name}" (${response.status})`)
          continue
        }

        const data: SpotifyShowEpisodesResponse = await response.json()
        const episodes = (data.items || []).filter(ep => !excludeIds.has(ep.id))
        allEpisodes.push(...episodes)
      } catch (error) {
        console.warn(`Error fetching episodes for "${show.name}":`, error)
      }
    }

    // Apply quality filtering then take top results
    const filtered = this.filterEpisodes(allEpisodes)

    // Prefer recent episodes — sort by release date descending
    filtered.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))

    return filtered.slice(0, maxResults)
  }

  /**
   * Quality filter: duration 5-90 min, block junk titles, prefer last 90 days.
   */
  private filterEpisodes(episodes: SpotifyEpisode[]): SpotifyEpisode[] {
    const now = Date.now()
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000

    return episodes.filter(ep => {
      // Duration filter: 5-90 minutes
      const durationMin = ep.duration_ms / 60_000
      if (durationMin < 5 || durationMin > 90) return false

      // Block junk titles
      const lowerTitle = ep.name.toLowerCase()
      if (BLOCKED_TITLE_WORDS.some(word => lowerTitle.includes(word))) return false

      return true
    }).sort((a, b) => {
      // Prefer episodes from last 90 days
      const aRecent = (now - new Date(a.release_date).getTime()) < ninetyDaysMs ? 1 : 0
      const bRecent = (now - new Date(b.release_date).getTime()) < ninetyDaysMs ? 1 : 0
      return bRecent - aRecent
    })
  }

  /**
   * Transform a Spotify episode into ContentRecommendation shape.
   */
  static toRecommendation(
    episode: SpotifyEpisode,
    showName: string,
    whyThisForYou: string
  ): {
    type: 'podcast'
    title: string
    url: string
    brief_description: string
    why_this_for_you: string
    duration_minutes: number
    source: string
    thumbnail_url?: string
  } {
    const durationMinutes = Math.round(episode.duration_ms / 60_000)
    const description = episode.description
      ? episode.description.substring(0, 150) + (episode.description.length > 150 ? '...' : '')
      : `Episode of ${showName}`

    return {
      type: 'podcast',
      title: episode.name,
      url: episode.external_urls?.spotify || `https://open.spotify.com/episode/${episode.id}`,
      brief_description: description,
      why_this_for_you: whyThisForYou,
      duration_minutes: durationMinutes,
      source: showName,
      thumbnail_url: episode.images?.[0]?.url,
    }
  }

  /**
   * Return a fallback episode for a given category when the API is unavailable.
   */
  static getFallbackEpisode(category: string): {
    type: 'podcast'
    title: string
    url: string
    brief_description: string
    why_this_for_you: string
    duration_minutes: number
    source: string
  } | null {
    const fallback = FALLBACK_EPISODES[category] || FALLBACK_EPISODES['mindfulness']
    if (!fallback) return null

    return {
      type: 'podcast',
      title: fallback.name,
      url: fallback.url,
      brief_description: fallback.description,
      why_this_for_you: `Curated wellness content from ${fallback.source}.`,
      duration_minutes: fallback.duration_minutes,
      source: fallback.source,
    }
  }

  /**
   * Get available podcast categories.
   */
  static getCategories(): PodcastCategory[] {
    return Object.keys(CURATED_SHOWS) as PodcastCategory[]
  }

  /**
   * Look up the show name for a given episode from curated shows.
   */
  static getShowNameForCategory(category: PodcastCategory): string {
    const shows = CURATED_SHOWS[category]
    return shows?.[0]?.name || 'Wellness Podcast'
  }
}
