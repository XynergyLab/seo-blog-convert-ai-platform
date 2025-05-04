import api from './api'
import lmStudioService from './lmStudioService'
import type {
  BlogPost,
  BlogPostContent,
  BlogPostCreate,
  BlogPostUpdate,
  BlogPostVersion,
  Pagination,
  GenerationParameters
} from '@/types/blogTypes'

/**
 * Blog Content API Service
 * Handles all blog post operations including AI content generation
 */
export const blogService = {
  /**
   * Get paginated list of blog posts
   */
  async getPosts(page = 1, perPage = 10): Promise<Pagination<BlogPost>> {
    try {
      const response = await api.get('/blog/posts', {
        params: { page, per_page: perPage }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch posts: ${handleApiError(error)}`)
    }
  },

  /**
   * Get single post with full content
   */
  async getPost(postId: string): Promise<BlogPost> {
    try {
      const response = await api.get(`/blog/posts/${postId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch post: ${handleApiError(error)}`)
    }
  },

  /**
   * Create new blog post
   */
  async createPost(
    post: BlogPostCreate,
    generateContent = false
  ): Promise<BlogPost> {
    try {
      const postData = { ...post }
      
      if (generateContent) {
        const generated = await this.generateContent(post.title, {
          max_tokens: 2000,
          temperature: 0.7
        })
        postData.content = generated.content
      }

      const response = await api.post('/blog/posts', postData)
      return response.data
    } catch (error) {
      throw new Error(`Failed to create post: ${handleApiError(error)}`)
    }
  },

  /**
   * Update existing blog post
   */
  async updatePost(postId: string, update: BlogPostUpdate): Promise<BlogPost> {
    try {
      const response = await api.patch(`/blog/posts/${postId}`, update)
      return response.data
    } catch (error) {
      throw new Error(`Failed to update post: ${handleApiError(error)}`)
    }
  },

  /**
   * Delete a blog post
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await api.delete(`/blog/posts/${postId}`)
    } catch (error) {
      throw new Error(`Failed to delete post: ${handleApiError(error)}`)
    }
  },

  /**
   * Generate blog content using AI
   */
  async generateContent(
    prompt: string, 
    params?: Partial<GenerationParameters>
  ): Promise<BlogPostContent> {
    try {
      const result = await lmStudioService.generateContent(
        `Write a comprehensive blog post about: ${prompt}`,
        params
      )
      return {
        title: prompt,
        content: result.text,
        outline: result.outline || []
      }
    } catch (error) {
      throw new Error(`Content generation failed: ${handleApiError(error)}`)
    }
  },

  /**
   * Get version history for a post
   */
  async getPostHistory(postId: string): Promise<BlogPostVersion[]> {
    try {
      const response = await api.get(`/blog/posts/${postId}/history`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get history: ${handleApiError(error)}`)
    }
  },

  /**
   * Restore a previous version of a post
   */
  async restoreVersion(postId: string, versionId: string): Promise<BlogPost> {
    try {
      const response = await api.post(
        `/blog/posts/${postId}/restore/${versionId}`
      )
      return response.data
    } catch (error) {
      throw new Error(`Failed to restore version: ${handleApiError(error)}`)
    }
  }
}

export default blogService

