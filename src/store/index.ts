import { defineStore, createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia

// Export all store modules
export * from './auth'
export * from './settings'
export * from './blog'
export * from './social'
export * from './keywords'

