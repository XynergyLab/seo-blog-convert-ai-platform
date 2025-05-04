import { reactive, computed, readonly } from 'vue';
import { getLMSettings, updateLMSettings } from '@/services/lmStudioService';
import redisService from '../services/redisService';
import type { LMServerConfig } from '@/types/lmStudioTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initial settings state
 */
const initialState = {
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
};

/**
 * Create a local reactive state that will be synchronized with Redis
 */
const state = reactive({ ...initialState });

/**
 * In-memory session ID to identify current browser session
 * Used for scoping Redis keys and managing multi-tab synchronization
 */
const sessionId = uuidv4();

/**
 * Flag to track if we're currently synchronizing state to avoid loops
 */
let isSynchronizing = false;

/**
 * Local fallback storage for offline scenarios
 */
let localFallbackActive = false;

/**
 * Redis Settings Store
 * 
 * Provides an interface compatible with the previous Pinia store,
 * but uses Redis for persistence and real-time synchronization.
 */
export const useSettingsStore = () => {
  /**
   * Get user ID for Redis keys
   * Uses user ID from auth store if available, otherwise uses session ID
   */
  const getUserId = (): string => {
    // Try to get user ID from auth store if it exists
    try {
      const authUser = localStorage.getItem('auth:user');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user && user.sub) {
          return user.sub;
        }
      }
    } catch (error) {
      console.error('Error getting user ID from auth store:', error);
    }
    
    return sessionId;
  };

  /**
   * Initialize the store and load state from Redis
   */
  const initialize = async (): Promise<void> => {
    try {
      state.isLoading = true;
      state.connectionStatus = 'connecting';
      
      // Try to load settings from Redis
      const storedSettings = await redisService.getSettings(getUserId());
      
      if (storedSettings) {
        // Don't trigger synchronization while we're loading initial state
        isSynchronizing = true;
        
        // Update local state with stored settings
        state.lmStudioSettings = storedSettings;
        
        isSynchronizing = false;
        
        // Test connection to update status
        await testConnection();
      } else {
        // If no settings in Redis, try to load from service and save to Redis
        await loadSettings();
      }
      
      // Set up event listeners for real-time updates
      setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize settings store from Redis:', error);
      state.error = 'Failed to initialize settings';
      state.connectionStatus = 'disconnected';
      
      // Enable local fallback
      localFallbackActive = true;
      
      // Try to load settings from service directly
      try {
        await loadSettings();
      } catch (innerError) {
        console.error('Failed to load settings from service:', innerError);
      }
    } finally {
      state.isLoading = false;
    }
  };

  /**
   * Synchronize local state to Redis
   */
  const syncStateToRedis = async (): Promise<void> => {
    if (isSynchronizing || localFallbackActive) return;
    
    try {
      // Store in Redis with TTL
      await redisService.updateSettings(getUserId(), state.lmStudioSettings);
      
      // Notify other tabs about the update
      if (typeof window !== 'undefined') {
        localStorage.setItem('settings:updated', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to sync settings to Redis:', error);
      
      // Enable local fallback
      localFallbackActive = true;
      
      // Set error state
      state.error = 'Failed to synchronize settings';
    }
  };

  /**
   * Set up event listeners for real-time updates
   */
  const setupEventListeners = (): void => {
    if (typeof window === 'undefined') return;

    // Listen for settings updates from Redis
    window.addEventListener('settings:updated', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        // Update local state with the new settings
        isSynchronizing = true;
        state.lmStudioSettings = customEvent.detail;
        isSynchronizing = false;
      }
    });

    // Listen for Redis connection status
    window.addEventListener('redis:connection:failed', () => {
      localFallbackActive = true;
    });

    // Listen for Redis connection restoration
    window.addEventListener('redis:connection:restored', async () => {
      localFallbackActive = false;
      
      // Re-sync state to Redis
      await syncStateToRedis();
    });

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', (event) => {
      if (event.key === 'settings:updated') {
        // Another tab has updated settings, refresh from Redis
        refreshStateFromRedis();
      }
    });
  };

  /**
   * Refresh state from Redis (for cross-tab synchronization)
   */
  const refreshStateFromRedis = async (): Promise<void> => {
    if (localFallbackActive) return;
    
    try {
      const storedSettings = await redisService.getSettings(getUserId());
      
      if (storedSettings) {
        isSynchronizing = true;
        state.lmStudioSettings = storedSettings;
        isSynchronizing = false;
      }
    } catch (error) {
      console.error('Failed to refresh settings from Redis:', error);
    }
  };

  /**
   * Load settings from LM Studio service
   */
  const loadSettings = async (): Promise<void> => {
    try {
      state.isLoading = true;
      state.connectionStatus = 'connecting';
      
      const settings = await getLMSettings();
      state.lmStudioSettings = settings;
      state.isConnected = true;
      state.connectionStatus = 'connected';
      
      // Sync to Redis if not in fallback mode
      if (!localFallbackActive) {
        await syncStateToRedis();
      }
    } catch (error) {
      console.error('Failed to load settings from service:', error);
      state.error = error.message || 'Failed to load settings';
      state.connectionStatus = 'disconnected';
      throw error;
    } finally {
      state.isLoading = false;
    }
  };

  /**
   * Update settings both in service and Redis
   */
  const updateSettings = async (newSettings: Partial<LMServerConfig>): Promise<LMServerConfig> => {
    try {
      state.isLoading = true;
      
      // Update settings in LM Studio service
      const updated = await updateLMSettings(newSettings);
      
      // Update local state
      state.lmStudioSettings = { ...state.lmStudioSettings, ...updated };
      
      // Sync to Redis if not in fallback mode
      if (!localFallbackActive) {
        await syncStateToRedis();
      }
      
      return updated;
    } catch (error) {
      console.error('Failed to update settings:', error);
      state.error = error.message || 'Failed to update settings';
      throw error;
    } finally {
      state.isLoading = false;
    }
  };

  /**
   * Test connection to LM Studio
   */
  const testConnection = async (): Promise<boolean> => {
    try {
      state.connectionStatus = 'connecting';
      await getLMSettings();
      state.isConnected = true;
      state.connectionStatus = 'connected';
      
      // Update lastConnected timestamp
      const now = new Date();
      state.lmStudioSettings.lastConnected = now;
      
      // Sync to Redis if not in fallback mode
      if (!localFallbackActive) {
        await syncStateToRedis();
      }
      
      return true;
    } catch (error) {
      state.isConnected = false;
      state.connectionStatus = 'disconnected';
      return false;
    }
  };

  /**
   * Reset store to initial state
   */
  const resetState = async (): Promise<void> => {
    // Reset local state
    Object.assign(state, initialState);
    
    // Clear Redis state if not in fallback mode
    if (!localFallbackActive) {
      try {
        // We don't have a clearSettings method in redisService, so we'll update with default settings
        await redisService.updateSettings(getUserId(), initialState.lmStudioSettings);
      } catch (error) {
        console.error('Failed to reset settings in Redis:', error);
      }
    }
    
    // Notify other tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings:updated', Date.now().toString());
    }
  };

  // Initialize store
  initialize();

  // Return store interface (compatible with Pinia)
  return {
    // Expose state as readonly to prevent direct mutations
    ...readonly(state),
    
    // Methods (compatible with Pinia actions)
    loadSettings,
    updateSettings,
    testConnection,
    
    // Additional methods for Redis store
    initialize,
    refreshStateFromRedis,
    resetState
  };
};

// Create a singleton instance
let settingsStore: ReturnType<typeof useSettingsStore> | null = null;

/**
 * Get the settings store instance (singleton pattern)
 */
export const getSettingsStore = () => {
  if (!settingsStore) {
    settingsStore = useSettingsStore();
  }
  return settingsStore;
};

export default useSettingsStore;

