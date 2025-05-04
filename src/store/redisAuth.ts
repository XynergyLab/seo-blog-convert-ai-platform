import { AuthState, User, AuthError, AUTH_EVENTS, TokenResponse } from '../types/auth.types';
import redisService from '../services/redisService';
import { reactive, computed, readonly } from 'vue';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  accessToken: null,
  expiresAt: null,
  popupOpen: false,
  redirectPath: null
};

/**
 * Create a local reactive state that will be synchronized with Redis
 */
const state = reactive<AuthState>({ ...initialState });

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
 * Timeout handler for token refresh
 */
let tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Local fallback storage for offline scenarios
 */
let localFallbackActive = false;

/**
 * Redis Authentication Store
 * 
 * Provides an interface compatible with the previous Pinia store,
 * but uses Redis for persistence and real-time synchronization.
 */
export const useAuthStore = () => {
  /**
   * Get user ID for Redis keys
   * Falls back to session ID if user is not authenticated
   */
  const getUserId = (): string => {
    return state.user?.sub || sessionId;
  };

  /**
   * Initialize the store and load state from Redis
   */
  const initialize = async (): Promise<void> => {
    try {
      state.loading = true;
      
      // Try to load state from Redis
      const storedState = await redisService.getAuthState(getUserId());
      
      if (storedState) {
        // Don't trigger synchronization while we're loading initial state
        isSynchronizing = true;
        
        // Update local state with stored state
        Object.assign(state, storedState);
        
        isSynchronizing = false;
        
        // If we have a token, schedule refresh
        if (state.accessToken && state.expiresAt) {
          scheduleTokenRefresh(state.expiresAt);
        }
      }
      
      // Set up event listeners for real-time updates
      setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize auth store from Redis:', error);
      state.error = {
        error: 'init_failed',
        error_description: 'Failed to initialize authentication state',
        message: 'Authentication service currently unavailable'
      };
      
      // Enable local fallback
      localFallbackActive = true;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Synchronize local state to Redis
   */
  const syncStateToRedis = async (): Promise<void> => {
    if (isSynchronizing || localFallbackActive) return;
    
    try {
      // Store in Redis with TTL
      // Use a longer TTL if user is authenticated
      const ttl = state.isAuthenticated ? (24 * 60 * 60) : (60 * 60);
      await redisService.setAuthState(getUserId(), { ...state }, ttl);
    } catch (error) {
      console.error('Failed to sync auth state to Redis:', error);
      
      // Enable local fallback
      localFallbackActive = true;
      
      // Set error state
      state.error = {
        error: 'sync_failed',
        error_description: 'Failed to synchronize authentication state',
        message: 'Authentication service currently unavailable'
      };
    }
  };

  /**
   * Set up event listeners for Auth0 events and Redis pub/sub
   */
  const setupEventListeners = (): void => {
    if (typeof window === 'undefined') return;

    // Listen for auth events
    window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, () => {
      clearError();
    });

    window.addEventListener(AUTH_EVENTS.LOGIN_ERROR, (event: Event) => {
      const customEvent = event as CustomEvent;
      setError(customEvent.detail as AuthError);
    });

    window.addEventListener(AUTH_EVENTS.LOGOUT, () => {
      resetState();
    });

    window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, () => {
      setError({
        error: 'token_expired',
        error_description: 'Your session has expired. Please log in again.',
        message: 'Session expired'
      });
    });

    window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, () => {
      setError({
        error: 'session_expired',
        error_description: 'Your session has expired. Please log in again.',
        message: 'Session expired'
      });
      setIsAuthenticated(false);
    });

    window.addEventListener(AUTH_EVENTS.SILENT_AUTH_ERROR, (event: Event) => {
      const customEvent = event as CustomEvent;
      setError(customEvent.detail as AuthError);
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
      if (event.key === 'auth:state:updated') {
        // Another tab has updated auth state, refresh from Redis
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
      const storedState = await redisService.getAuthState(getUserId());
      
      if (storedState) {
        isSynchronizing = true;
        Object.assign(state, storedState);
        isSynchronizing = false;
      }
    } catch (error) {
      console.error('Failed to refresh state from Redis:', error);
    }
  };

  /**
   * Schedule token refresh before expiration
   */
  const scheduleTokenRefresh = (expiresAt: number): void => {
    // Clear any existing timeout
    if (tokenRefreshTimeout) {
      clearTimeout(tokenRefreshTimeout);
      tokenRefreshTimeout = null;
    }

    // Calculate delay (refresh 5 minutes before expiration)
    const delay = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (delay > 0) {
      tokenRefreshTimeout = setTimeout(() => {
        // This will be implemented by Auth0 plugin
        // We just dispatch the event here for consistency
        if (state.accessToken) {
          window.dispatchEvent(new CustomEvent('auth:refresh:token'));
        }
      }, delay);
    } else {
      // Token already expired or about to expire
      console.warn('Token is already expired or will expire very soon');
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_EXPIRED));
    }
  };

  /**
   * Reset store to initial state
   */
  const resetState = async (): Promise<void> => {
    Object.assign(state, initialState);
    
    if (!localFallbackActive) {
      try {
        await redisService.clearAuthState(getUserId());
      } catch (error) {
        console.error('Failed to clear auth state in Redis:', error);
      }
    }
    
    // Notify other tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth:state:updated', Date.now().toString());
    }
  };

  // GETTERS (compatible with Pinia store)

  /**
   * Check if user is authenticated and token is valid
   */
  const authenticated = computed((): boolean => {
    return state.isAuthenticated && !!state.accessToken && !isTokenExpired.value;
  });

  /**
   * Get user profile
   */
  const userProfile = computed((): User | null => {
    return state.user;
  });

  /**
   * Check if authentication is in progress
   */
  const isLoading = computed((): boolean => {
    return state.loading;
  });

  /**
   * Get current error
   */
  const currentError = computed((): AuthError | null => {
    return state.error;
  });

  /**
   * Check if token is expired
   */
  const isTokenExpired = computed((): boolean => {
    if (!state.expiresAt) return true;
    return Date.now() >= state.expiresAt;
  });

  /**
   * Get redirect path after login
   */
  const getRedirectPath = computed((): string | null => {
    return state.redirectPath;
  });

  // ACTIONS (compatible with Pinia store)

  /**
   * Set authentication status
   */
  const setIsAuthenticated = (status: boolean): void => {
    state.isAuthenticated = status;
    
    // Clear user data when logged out
    if (!status) {
      state.user = null;
      state.accessToken = null;
      state.expiresAt = null;
    }
    
    syncStateToRedis();
  };

  /**
   * Set user profile
   */
  const setUser = (user: User | null): void => {
    state.user = user;
    syncStateToRedis();
  };

  /**
   * Set loading state
   */
  const setLoading = (status: boolean): void => {
    state.loading = status;
  };

  /**
   * Set error state
   */
  const setError = (error: AuthError | null): void => {
    state.error = error;
  };

  /**
   * Clear current error
   */
  const clearError = (): void => {
    state.error = null;
  };

  /**
   * Set popup state
   */
  const setPopupOpen = (isOpen: boolean): void => {
    state.popupOpen = isOpen;
  };

  /**
   * Set token information
   */
  const setTokenInfo = async ({ accessToken, expiresAt }: { accessToken: string | null; expiresAt: number | null }): Promise<void> => {
    state.accessToken = accessToken;
    state.expiresAt = expiresAt;
    
    // Store token in Redis
    if (accessToken && expiresAt) {
      const tokenData: TokenResponse = {
        accessToken,
        expiresAt,
        expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
        tokenType: 'Bearer'
      };
      
      if (!localFallbackActive) {
        try {
          await redisService.storeToken(getUserId(), tokenData);
        } catch (error) {
          console.error('Failed to store token in Redis:', error);
        }
      }
      
      // Schedule token refresh
      scheduleTokenRefresh(expiresAt);
    }
    
    syncStateToRedis();
  };

  /**
   * Set redirect path
   */
  const setRedirectPath = (path: string | null): void => {
    state.redirectPath = path;
    syncStateToRedis();
  };

  /**
   * Clear redirect path
   */
  const clearRedirectPath = (): void => {
    state.redirectPath = null;
    syncStateToRedis();
  };

  /**
   * Reset store to initial state (compatible with Pinia $reset)
   */
  const $reset = async (): Promise<void> => {
    await resetState();
  };

  // Initialize store
  initialize();

  // Return store interface (compatible with Pinia)
  return {
    // Expose state as readonly to prevent direct mutations
    ...readonly(state),
    
    // Getters
    authenticated,
    userProfile,
    isLoading,
    currentError,
    isTokenExpired,
    getRedirectPath,
    
    // Actions
    setIsAuthenticated,
    setUser,
    setLoading,
    setError,
    clearError,
    setPopupOpen,
    setTokenInfo,
    setRedirectPath,
    clearRedirectPath,
    $reset,
    
    // Additional methods for Redis store
    initialize,
    refreshStateFromRedis
  };
};

// Create a singleton instance
let authStore: ReturnType<typeof useAuthStore> | null = null;

/**
 * Get the auth store instance (singleton pattern)
 */
export const getAuthStore = () => {
  if (!authStore) {
    authStore = useAuthStore();
  }
  return authStore;
};

export default useAuthStore;

