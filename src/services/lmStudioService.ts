import api from './api'
import {
  type LMServerConfig,
  type LMModel,
  type GenerationParameters,
  type GenerationResult,
  type ModelLoadingProgress,
  type BatchJobStatus
} from '@/types/lmStudioTypes'

/**
 * LM Studio API Service
 * Handles all interactions with LM Studio servers including:
 * - Server configuration and connection
 * - Model management
 * - Content generation
 * - Batch processing
 */
export const lmStudioService = {
  // Server Configuration //
  
  /**
   * Get current server configuration
   */
  async getLMSettings(): Promise<LMServerConfig> {
    try {
      const response = await api.get('/lm/config')
      return response.data
    } catch (error) {
      throw new Error(`Failed to get settings: ${handleApiError(error)}`)
    }
  },

  /**
   * Update server configuration
   */
  async updateLMSettings(config: Partial<LMServerConfig>): Promise<LMServerConfig> {
    try {
      const response = await api.patch('/lm/config', config)
      return response.data
    } catch (error) {
      throw new Error(`Failed to update settings: ${handleApiError(error)}`)
    }
  },

  /**
   * Verify LM Studio API key
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      await api.post('/lm/verify-key', { apiKey })
      return true
    } catch {
      return false
    }
  },

  /**
   * Test LM Studio server connection
   */
  async testConnection(): Promise<{ success: boolean; latency: number }> {
    const start = Date.now()
    try {
      await api.get('/lm/health')
      return {
        success: true,
        latency: Date.now() - start
      }
    } catch {
      return {
        success: false,
        latency: Date.now() - start
      }
    }
  },

  // Model Management //

  /**
   * List available models
   */
  async listModels(): Promise<LMModel[]> {
    try {
      const response = await api.get('/lm/models')
      return response.data.models
    } catch (error) {
      throw new Error(`Failed to list models: ${handleApiError(error)}`)
    }
  },

  /**
   * Load a model into memory
   */
  async loadModel(modelId: string, onProgress?: (progress: ModelLoadingProgress) => void): Promise<void> {
    try {
      const response = await api.post('/lm/models/load', { modelId }, {
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            })
          }
        }
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to load model: ${handleApiError(error)}`)
    }
  },

  /**
   * Unload current model
   */
  async unloadModel(): Promise<void> {
    try {
      await api.post('/lm/models/unload')
    } catch (error) {
      throw new Error(`Failed to unload model: ${handleApiError(error)}`)
    }
  },

  /**
   * Get details about currently loaded model
   */
  async getModelDetails(): Promise<LMModel> {
    try {
      const response = await api.get('/lm/models/current')
      return response.data
    } catch (error) {
      throw new Error(`Failed to get model details: ${handleApiError(error)}`)
    }
  },

  // Content Generation //

  /**
   * Generate content using current model
   */
  async generateContent(
    prompt: string,
    parameters: Partial<GenerationParameters> = {}
  ): Promise<GenerationResult> {
    const defaultParams = {
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop_sequences: []
    }

    try {
      const response = await api.post('/lm/generate', {
        prompt,
        parameters: { ...defaultParams, ...parameters }
      })
      return response.data
    } catch (error) {
      throw new Error(`Generation failed: ${handleApiError(error)}`)
    }
  },

  /**
   * Start a batch generation job
   */
  async startBatchJob(
    prompts: string[],
    parameters: Partial<GenerationParameters> = {}
  ): Promise<{ jobId: string }> {
    try {
      const response = await api.post('/lm/batch', { prompts, parameters })
      return response.data
    } catch (error) {
      throw new Error(`Failed to start batch job: ${handleApiError(error)}`)
    }
  },

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId: string): Promise<BatchJobStatus> {
    try {
      const response = await api.get(`/lm/batch/${jobId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get job status: ${handleApiError(error)}`)
    }
  },

  /**
   * Cancel a running batch job
   */
  async cancelBatchJob(jobId: string): Promise<void> {
    try {
      await api.delete(`/lm/batch/${jobId}`)
    } catch (error) {
      throw new Error(`Failed to cancel job: ${handleApiError(error)}`)
    }
  },

  /**
   * Stream generation output (SSE)
   */
  async streamGeneration(
    prompt: string,
    parameters: Partial<GenerationParameters>,
    onData: (data: string) => void
  ) {
    try {
      const response = await fetch(`${api.defaults.baseURL}/lm/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': api.defaults.headers.Authorization
        },
        body: JSON.stringify({ prompt, parameters })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No reader available')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value)
        onData(text)
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export default lmStudioService

