import api from './api'
import type {
  AuthResponse,
  LoginParams,
  RefreshTokenParams,
  ServerConnection,
  UserProfile
} from '@/types/authTypes'

/**
 * Authentication API service
 * Handles all user authentication and server connection operations
 */
export const authService = {
  /**
   * Log in a user with email and password
   */
  async login(params: LoginParams): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', params)
      return response.data
    } catch (error) {
      throw new Error(handleApiError(error))
    }
  },

  /**
   * Log out the current user 
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout failed:', handleApiError(error))
    }
  },

  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const response = await api.post('/auth/refresh-token', { refreshToken })
      return response.data
    } catch (error) {
      throw new Error(handleApiError(error))
    }
  },

  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get('/auth/profile')
      return response.data
    } catch (error) {
      throw new Error(handleApiError(error))
    }
  },

  /**
   * Add a new LM Studio server connection
   */
  async addServerConnection(connection: ServerConnection): Promise<ServerConnection> {
    try {
      const response = await api.post('/servers', connection)
      return response.data
    } catch (error) {
      throw new Error(handleApiError(error))
    }
  },

  /**
   * Test server connection
   */
  async testServerConnection(url: string): Promise<boolean> {
    try {
      await api.get('/health', { baseURL: url })
      return true
    } catch {
      return false
    }
  }
}

export default authService

