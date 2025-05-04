import { defineStore } from 'pinia'
import { AuthResponse, User, ServerConnection } from '@/types/authTypes'
import authService from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    refreshToken: null as string | null,
    serverConnections: [] as ServerConnection[],
    currentServer: null as ServerConnection | null,
    isLoading: false,
    error: null as string | null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentServerUrl: (state) => state.currentServer?.apiUrl || null
  },

  actions: {
    async loginUser(credentials: { email: string, password: string }) {
      try {
        this.isLoading = true
        this.error = null
        const response: AuthResponse = await authService.login(credentials)
        this.user = response.user
        this.token = response.accessToken
        this.refreshToken = response.refreshToken
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Login failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async addServerConnection(connection: ServerConnection) {
      try {
        this.isLoading = true
        const savedConnection = await authService.addServerConnection(connection)
        this.serverConnections.push(savedConnection)
        this.currentServer = savedConnection
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to add server connection'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async refreshAuthToken() {
      if (!this.refreshToken) throw new Error('No refresh token available')
      
      try {
        const response = await authService.refreshToken(this.refreshToken)
        this.token = response.accessToken
        return response.accessToken
      } catch (error) {
        // If token refresh fails, we should log out the user
        await this.logout()
        this.error = error instanceof Error ? error.message : 'Session expired'
        throw error
      }
    },

    async logout() {
      try {
        await authService.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        // Make sure we always reset the state even if logout API call fails
        this.user = null
        this.token = null
        this.refreshToken = null
        this.serverConnections = []
        this.currentServer = null
        this.isLoading = false
        this.error = null
      }
    }
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'lm-studio-auth',
        storage: localStorage,
        paths: ['token', 'refreshToken', 'user', 'serverConnections', 'currentServer'],
        beforeRestore: (context) => {
          console.log('Restoring auth state from storage')
        },
        afterRestore: (context) => {
          console.log('Auth state restored')
        }
      }
    ]
  }
})

