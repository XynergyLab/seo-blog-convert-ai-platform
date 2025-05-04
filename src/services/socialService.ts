import api from './api'
import lmStudioService from './lmStudioService'
import type {
  SocialPost,
  SocialPostCreate,
  SocialPostUpdate,
  SocialPlatform,
  SocialAnalytics,
  EngagementMetrics,
  PostVariation,
  Pagination,
  GenerationParameters,
  ScheduleParameters
} from '@/types/socialTypes'

/**
 * Social Media API Service
 * Handles all social media post operations including scheduling and AI generation
 */
export const socialService = {
  // Post Management //
  
  /**
   * Get paginated list of social posts with filters
   */
  async getPosts(
    filters: {
      platform?: string
      status?: 'draft'|'scheduled'|'published'|'failed'
      fromDate?: string
      toDate?: string
    } = {},
    page = 1,
    perPage = 20
  ): Promise<Pagination<SocialPost>> {
    try {
      const response = await api.get('/social/posts', {
        params: { ...filters, page, per_page: perPage }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch posts: ${handleApiError(error)}`)
    }
  },

  /**
   * Get single social post with details
   */
  async getPost(postId: string): Promise<SocialPost> {
    try {
      const response = await api.get(`/social/posts/${postId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch post: ${handleApiError(error)}`)
    }
  },

  /**
   * Create new social media post
   */
  async createPost(post: SocialPostCreate): Promise<SocialPost> {
    try {
      const response = await api.post('/social/posts', post)
      return response.data
    } catch (error) {
      throw new Error(`Failed to create post: ${handleApiError(error)}`)
    }
  },

  /**
   * Update existing social post
   */
  async updatePost(postId: string, update: SocialPostUpdate): Promise<SocialPost> {
    try {
      const response = await api.patch(`/social/posts/${postId}`, update)
      return response.data
    } catch (error) {
      throw new Error(`Failed to update post: ${handleApiError(error)}`)
    }
  },

  /**
   * Delete a social post
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await api.delete(`/social/posts/${postId}`)
    } catch (error) {
      throw new Error(`Failed to delete post: ${handleApiError(error)}`)
    }
  },

  // Scheduling & Publishing //

  /**
   * Schedule a post for future publication
   */
  async schedulePost(
    postId: string,
    schedule: ScheduleParameters
  ): Promise<SocialPost> {
    try {
      const response = await api.post(
        `/social/posts/${postId}/schedule`,
        schedule
      )
      return response.data
    } catch (error) {
      throw new Error(`Failed to schedule post: ${handleApiError(error)}`)
    }
  },

  /**
   * Publish a post immediately
   */
  async publishNow(postId: string): Promise<SocialPost> {
    try {
      const response = await api.post(`/social/posts/${postId}/publish`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to publish post: ${handleApiError(error)}`)
    }
  },

  /**
   * Cancel a scheduled post
   */
  async cancelSchedule(postId: string): Promise<SocialPost> {
    try {
      const response = await api.delete(`/social/posts/${postId}/schedule`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to cancel schedule: ${handleApiError(error)}`)
    }
  },

  /**
   * Get queue of scheduled posts
   */
  async getQueue(platform?: string): Promise<SocialPost[]> {
    try {
      const response = await api.get('/social/queue', {
        params: { platform }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to get queue: ${handleApiError(error)}`)
    }
  },

  // AI Integration //

  /**
   * Generate social media post content using AI
   */
  async generatePost(
    prompt: string,
    platform: string,
    params?: Partial<GenerationParameters>
  ): Promise<{ content: string; hashtags: string[] }> {
    try {
      const instruction = `Write a ${platform} post about: ${prompt}. Include relevant hashtags.`
      const result = await lmStudioService.generateContent(instruction, {
        max_tokens: 500,
        temperature: 0.7,
        ...params
      })

      return {
        content: result.text,
        hashtags: result.text.match(/#\w+/g) || []
      }
    } catch (error) {
      throw new Error(`Failed to generate post: ${handleApiError(error)}`)
    }
  },

  /**
   * Generate multiple variations of a post
   */
  async generateVariations(
    basePrompt: string,
    platform: string,
    count = 3
  ): Promise<PostVariation[]> {
    try {
      const batchPrompt = Array(count).fill(
        `Generate a unique ${platform} post variation about: ${basePrompt}`
      )

      const results = await lmStudioService.startBatchJob(batchPrompt, {
        max_tokens: 300,
        temperature: 0.8
      })

      return results.map((text, i) => ({
        id: `var-${i}`,
        content: text,
        score: 0
      }))
    } catch (error) {
      throw new Error(`Failed to generate variations: ${handleApiError(error)}`)
    }
  },

  /**
   * Optimize post for specific platform
   */
  async optimizePost(
    postId: string,
    platform: string
  ): Promise<{ original: string; optimized: string }> {
    try {
      const post = await this.getPost(postId)
      const instruction = `Optimize this post for ${platform}:\n${post.content}`

      const result = await lmStudioService.generateContent(instruction, {
        max_tokens: 500,
        temperature: 0.5
      })

      return {
        original: post.content,
        optimized: result.text
      }
    } catch (error) {
      throw new Error(`Failed to optimize post: ${handleApiError(error)}`)
    }
  },

  // Analytics //

  /**
   * Get analytics for a specific post
   */
  async getPostAnalytics(postId: string): Promise<SocialAnalytics> {
    try {
      const response = await api.get(`/social/analytics/posts/${postId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get post analytics: ${handleApiError(error)}`)
    }
  },

  /**
   * Get platform-wide analytics
   */
  async getPlatformAnalytics(
    platform: string,
    days = 30
  ): Promise<SocialAnalytics> {
    try {
      const response = await api.get(`/social/analytics/platforms/${platform}`, {
        params: { days }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to get platform analytics: ${handleApiError(error)}`)
    }
  },

  /**
   * Get engagement metrics over time
   */
  async getEngagement(
    postId: string,
    period: 'day'|'week'|'month' = 'week'
  ): Promise<EngagementMetrics[]> {
    try {
      const response = await api.get(`/social/analytics/engagement/${postId}`, {
        params: { period }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to get engagement data: ${handleApiError(error)}`)
    }
  },

  /**
   * List available social platforms
   */
  async getPlatforms(): Promise<SocialPlatform[]> {
    try {
      const response = await api.get('/social/platforms')
      return response.data
    } catch (error) {
      throw new Error(`Failed to get platforms: ${handleApiError(error)}`)
    }
  }
}

export default socialService

