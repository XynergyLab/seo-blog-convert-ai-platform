/**
 * Store index file
 * 
 * Exports Redis-backed store implementations for state management.
 * These stores replace the previous Pinia implementation while maintaining
 * the same interface to minimize changes to existing components.
 */

// Import Redis service for verification
import redisService from '../services/redisService';

// Import Redis-backed stores
import { useAuthStore, getAuthStore } from './redisAuth';
import { useSettingsStore, getSettingsStore } from './redisSettings';

// Re-export original blog, social and keywords stores
// These stores are still using Pinia and will be migrated in future phases
// TODO: Uncomment these exports once the modules are available
// export * from './blog';
// export * from './social';
// export * from './keywords';

// Export Redis store implementations
export { useAuthStore, getAuthStore };
export { useSettingsStore, getSettingsStore };

// Get singleton instances of Redis stores
const authStore = getAuthStore();
const settingsStore = getSettingsStore();

/**
 * Initialize all Redis-backed stores
 * This should be called during application startup
 * 
 * @returns {Promise<boolean>} True if initialization was successful
 */
export const initializeRedisStores = async (): Promise<boolean> => {
  try {
    // Check if Redis is available first
    const isRedisAvailable = await redisService.healthCheck().catch(() => ({ healthy: false }));
    
    if (!isRedisAvailable.healthy) {
      console.warn('Redis service unavailable, falling back to local storage');
      // Dispatch event for Redis connection failure
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('redis:connection:failed'));
      }
      return false;
    }
    
    // Make sure store instances exist
    if (!getAuthStore() || !getSettingsStore()) {
      console.error('Store singletons not properly initialized');
      return false;
    }
    
    // Force initialization of stores
    await Promise.all([
      authStore.initialize(),
      settingsStore.initialize()
    ]);
    
    console.log('Redis-backed stores initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Redis-backed stores:', error);
    
    // Dispatch event for Redis connection failure
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('redis:connection:failed'));
    }
    
    return false;
  }
};

/**
 * Safely get Redis connection status with error handling
 * 
 * @returns {boolean} True if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  try {
    return redisService.isConnected();
  } catch (error) {
    console.error('Error checking Redis connection:', error);
    return false;
  }
};

// Export an empty default for compatibility with import statements
export default {
  // This object is intentionally empty to provide compatibility with
  // code that might import this module using the default import syntax
};
