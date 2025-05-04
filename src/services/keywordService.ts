import api from './api'
import lmStudioService from './lmStudioService'
import type {
  Keyword,
  KeywordCreate,
  KeywordUpdate,
  KeywordMetrics,
  KeywordRanking,
  CompetitorAnalysis,
  KeywordTrend,
  KeywordComparison,
  ContentIdea,
  ContentOptimization,
  Pagination
} from '@/types/keywordTypes'

/**
 * Keyword API Service
 * Handles all keyword research and SEO operations
 */
export const keywordService = {
  // Keyword Management //

  /**
   * Get paginated list of tracked keywords with filters
   */
  async getKeywords(
    filters: {
      query?: string
      category?: string
      minVolume?: number
      maxDifficulty?: number
    } = {},
    page = 1,
    perPage = 20
  ): Promise<Pagination<Keyword>> {
    try {
      const response = await api.get('/keywords', {
        params: { ...filters, page, per_page: perPage }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch keywords: ${handleApiError(error)}`)
    }
  },

  /**
   * Create new keyword to track
   */
  async createKeyword(keyword: KeywordCreate): Promise<Keyword> {
    try {
      const response = await api.post('/keywords', keyword)
      return response.data
    } catch (error) {
      throw new Error(`Failed to create keyword: ${handleApiError(error)}`)
    }
  },

  /**
   * Update keyword properties
   */
  async updateKeyword(
    keywordId: string,
    update: KeywordUpdate
  ): Promise<Keyword> {
    try {
      const response = await api.patch(`/keywords/${keywordId}`, update)
      return response.data
    } catch (error) {
      throw new Error(`Failed to update keyword: ${handleApiError(error)}`)
    }
  },

  /**
   * Delete a keyword
   */
  async deleteKeyword(keywordId: string): Promise<void> {
    try {
      await api.delete(`/keywords/${keywordId}`)
    } catch (error) {
      throw new Error(`Failed to delete keyword: ${handleApiError(error)}`)
    }
  },

  /**
   * Bulk import keywords from file
   */
  async importKeywords(file: File, category?: string): Promise<Keyword[]> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (category) formData.append('category', category)

      const response = await api.post('/keywords/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to import keywords: ${handleApiError(error)}`)
    }
  },

  // SEO Analysis //

  /**
   * Get keyword metrics (difficulty, volume, CPC)
   */
  async analyzeKeyword(keywordId: string): Promise<KeywordMetrics> {
    try {
      const response = await api.get(`/keywords/${keywordId}/metrics`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to analyze keyword: ${handleApiError(error)}`)
    }
  },

  /**
   * Get current search rankings for keyword
   */
  async getRankings(keywordId: string): Promise<KeywordRanking[]> {
    try {
      const response = await api.get(`/keywords/${keywordId}/rankings`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get rankings: ${handleApiError(error)}`)
    }
  },

  /**
   * Get competitors ranking for keyword
   */
  async getCompetitors(keywordId: string): Promise<CompetitorAnalysis> {
    try {
      const response = await api.get(`/keywords/${keywordId}/competitors`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get competitors: ${handleApiError(error)}`)
    }
  },

  /**
   * Get related keyword suggestions
   */
  async getSuggestions(keywordId: string): Promise<string[]> {
    try {
      const response = await api.get(`/keywords/${keywordId}/suggestions`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get suggestions: ${handleApiError(error)}`)
    }
  },

  // Trend Analysis //

  /**
   * Get historical trends for keyword
   */
  async getTrends(
    keywordId: string,
    period: 'month' | 'quarter' | 'year' = 'quarter'
  ): Promise<KeywordTrend> {
    try {
      const response = await api.get(`/keywords/${keywordId}/trends`, {
        params: { period }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to get trends: ${handleApiError(error)}`)
    }
  },

  /**
   * Predict future trends for keyword
   */
  async predictTrends(keywordId: string): Promise<KeywordTrend> {
    try {
      const response = await api.get(`/keywords/${keywordId}/predictions`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to predict trends: ${handleApiError(error)}`)
    }
  },

  /**
   * Compare metrics between multiple keywords
   */
  async compareKeywords(keywordIds: string[]): Promise<KeywordComparison[]> {
    try {
      const response = await api.post('/keywords/compare', { keywordIds })
      return response.data
    } catch (error) {
      throw new Error(`Failed to compare keywords: ${handleApiError(error)}`)
    }
  },

  // AI Integration //

  /**
   * Generate new keyword suggestions using AI
   */
  async generateKeywords(
    seedKeywords: string[],
    count = 10
  ): Promise<{ keyword: string; intent: string }[]> {
    try {
      const prompt = `Generate ${count} highly relevant SEO keywords similar to: ${seedKeywords.join(
        ', '
      )}. For each, describe the search intent. Respond in JSON format.`

      const result = await lmStudioService.generateContent(prompt, {
        max_tokens: 1000,
        temperature: 0.5
      })

      try {
        return JSON.parse(result.text)
      } catch {
        throw new Error('AI response could not be parsed')
      }
    } catch (error) {
      throw new Error(`Failed to generate keywords: ${handleApiError(error)}`)
    }
  },

  /**
   * Generate content ideas based on keywords
   */
  async generateContentIdeas(
    keywords: string[],
    count = 5
  ): Promise<ContentIdea[]> {
    try {
      const prompt = `Generate ${count} blog content ideas that would rank well for these keywords: ${keywords.join(
        ', '
      )}. Include target keywords for each idea.`

      const result = await lmStudioService.generateContent(prompt, {
        max_tokens: 800,
        temperature: 0.6
      })

      try {
        return result.text
          .split('\n')
          .filter(line => line.trim())
          .map((line, i) => ({
            id: `idea-${i}`,
            title: line.split(' - ')[0]?.trim() || '',
            keywords: line
              .match(/\[(.*?)\]/g)
              ?.map(k => k.replace(/[\[\]]/g, '')) || []
          }))
      } catch {
        throw new Error('Failed to parse AI-generated ideas')
      }
    } catch (error) {
      throw new Error(`Failed to generate content ideas: ${handleApiError(error)}`)
    }
  },

  /**
   * Get SEO optimization suggestions for content
   */
  async optimizeContent(
    content: string,
    targetKeywords: string[]
  ): Promise<ContentOptimization> {
    try {
      const prompt = `Analyze this content and provide SEO optimization suggestions for these keywords: ${targetKeywords.join(
        ', '
      )}:\n\n${content}\n\nSuggest improvements.`

      const result = await lmStudioService.generateContent(prompt, {
        max_tokens: 1200,
        temperature: 0.4
      })

      return {
        score: result.text.match(/Score: (\d+)/)?.[1] || 'N/A',
        suggestions: result.text
          .split('\n')
          .filter(line => line.startsWith('-'))
          .map(line => line.substring(1).trim()),
        optimizedVersion: result.text.split('Optimized version:')?.[1]?.trim()
      }
    } catch (error) {
      throw new Error(`Failed to optimize content: ${handleApiError(error)}`)
    }
  }
}

export default keywordService

