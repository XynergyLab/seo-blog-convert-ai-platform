import { defineStore } from 'pinia'
import { getLMSettings, updateLMSettings } from '@/services/lmStudioService'
import type { LMServerConfig } from '@/types/lmStudioTypes'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    lmStudioSettings: {
      apiKey: '',
      endpoint: 'http://localhost:1234',
      activeModels: [] as string[],
      lastConnected: null as Date | null,
      maxTokens: 2000,
      temperature: 0.7
    } as LMServerConfig,
    isLoading: false,
    error: null as string | null,
    isConnected: false,
    connectionStatus: 'disconnected' as 'connected' | 'disconnected' | 'connecting'
  }),

  actions: {
    async loadSettings() {
      try {
        this.isLoading = true
        this.connectionStatus = 'connecting'
        const settings = await getLMSettings()
        this.lmStudioSettings = settings
        this.isConnected = true
        this.connectionStatus = 'connected'
      } catch (error) {
        this.error = error.message || 'Failed to load settings'
        this.connectionStatus = 'disconnected'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async updateSettings(newSettings: Partial<LMServerConfig>) {
      try {
        this.isLoading = true
        const updated = await updateLMSettings(newSettings)
        this.lmStudioSettings = { ...this.lmStudioSettings, ...updated }
        return updated
      } catch (error) {
        this.error = error.message || 'Failed to update settings'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async testConnection() {
      try {
        this.connectionStatus = 'connecting'
        await getLMSettings()
        this.isConnected = true
        this.connectionStatus = 'connected'
        return true
      } catch {
        this.isConnected = false
        this.connectionStatus = 'disconnected'
        return false
      }
    }
  },

  persist: true
})

