/**
 * Minimal Tavily Search client for sourcing REAL article URLs.
 *
 * Tavily is an LLM-oriented search API: given a query it returns ranked,
 * already-crawled results (title + url + content snippet + relevance score).
 * We never let the model invent article URLs — every link we ship comes back
 * from this index, which sidesteps the hallucinated-dead-link problem that
 * kept articles out of the Motivation Mode MVP.
 *
 * Docs: https://docs.tavily.com/  (POST https://api.tavily.com/search)
 */

export interface ArticleResult {
  url: string
  title: string
  content: string // short snippet Tavily extracts from the page
  score: number // 0..1 relevance
}

export class TavilyAPI {
  constructor(private apiKey: string) {}

  /**
   * Search the open web for articles. Returns [] on any failure so callers can
   * degrade gracefully (fall back to a quote) rather than throw.
   */
  async searchArticles(query: string, maxResults = 6): Promise<ArticleResult[]> {
    if (!this.apiKey) {
      console.warn('Tavily: no API key set — skipping article search')
      return []
    }
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
          search_depth: 'basic',
          topic: 'general',
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
      })
      if (!res.ok) {
        console.error('Tavily API error:', res.status, await res.text())
        return []
      }
      const data = await res.json()
      return (data.results || [])
        .map((r: any) => ({
          url: r.url || '',
          title: (r.title || '').trim(),
          content: (r.content || '').trim(),
          score: typeof r.score === 'number' ? r.score : 0,
        }))
        .filter((r: ArticleResult) => r.url && r.title)
    } catch (e) {
      console.error('Tavily fetch failed:', e)
      return []
    }
  }
}
