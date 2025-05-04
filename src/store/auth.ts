import { defineStore } from 'pinia'
import { AuthResponse, User, ServerConnection } from '@/types/authTypes'
import { login, logout, refreshToken } from '@/services/authService'

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
        const response: AuthResponse = await login(credentials)
        this.user = response.user
        this.token = response.accessToken
        this.refreshToken = response.refreshToken
      } catch (error) {
        this.error = error.message || 'Login failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async addServerConnection(connection: ServerConnection) {
      this.serverConnections.push(connection)
      this.currentServer = connection
    },

    async refreshAuthToken() {
      if (!this.refreshToken) throw new Error('No refresh token available')
      const response = await refreshToken(this.refreshToken)
      this.token = response.accessToken
      return response.accessToken
    },

    async logout() {
      await logout()
      this.$reset()
    }
  },

  persist: true
})

