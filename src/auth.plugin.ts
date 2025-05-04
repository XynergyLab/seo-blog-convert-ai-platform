import { App, Plugin } from 'vue';
import createAuth0Client, {
  Auth0Client,
  GetTokenSilentlyOptions,
  RedirectLoginOptions,
  PopupLoginOptions,
} from '@auth0/auth0-spa-js';
import { useAuthStore } from './store/auth';
import auth0Config from './auth.config';
import { User, AuthError, AUTH_EVENTS } from './types/auth.types';

// Create a single Auth0 client instance
let auth0Client: Auth0Client;

/**
 * Auth0 Plugin that handles authentication functionality
 */
class Auth0Plugin {
  private isLoading = false;
  private popupOpen = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates and initializes the Auth0 client
   */
  async createClient(): Promise<void> {
    try {
      auth0Client = await createAuth0Client(auth0Config);
    } catch (error) {
      console.error('Error initializing Auth0 client:', error);
      throw error;
    }
  }

  /**
   * Handles the authentication callback
   */
  async handleCallback(): Promise<void> {
    const authStore = useAuthStore();
    const query = window.location.search;

    try {
      if (query.includes('code=') || query.includes('error=')) {
        const { appState } = await auth0Client.handleRedirectCallback();
        authStore.setRedirectPath(appState?.targetUrl);
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_SUCCESS));
      }
    } catch (error) {
      console.error('Error handling callback:', error);
      authStore.setError(error as AuthError);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_ERROR, { 
        detail: error 
      }));
    } finally {
      // Update authentication state
      await this.checkAuth();
    }
  }

  /**
   * Authenticates the user using Auth0's Universal Login Page
   */
  async loginWithRedirect(options?: RedirectLoginOptions): Promise<void> {
    const authStore = useAuthStore();
    
    try {
      authStore.setLoading(true);
      await auth0Client.loginWithRedirect({
        ...options,
        appState: {
          ...options?.appState,
          targetUrl: window.location.pathname
        }
      });
    } catch (error) {
      console.error('Login redirect failed:', error);
      authStore.setError(error as AuthError);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_ERROR, { 
        detail: error 
      }));
      throw error;
    } finally {
      authStore.setLoading(false);
    }
  }

  /**
   * Authenticates the user using a popup window
   */
  async loginWithPopup(options?: PopupLoginOptions): Promise<void> {
    const authStore = useAuthStore();

    try {
      authStore.setLoading(true);
      authStore.setPopupOpen(true);
      await auth0Client.loginWithPopup(options);
      
      // Update authentication state after successful login
      await this.checkAuth();
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_SUCCESS));
    } catch (error) {
      console.error('Popup login failed:', error);
      authStore.setError(error as AuthError);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_ERROR, { 
        detail: error 
      }));
    } finally {
      authStore.setPopupOpen(false);
      authStore.setLoading(false);
    }
  }

  /**
   * Logs the user out
   */
  async logout(options?: { returnTo?: string }): Promise<void> {
    const authStore = useAuthStore();

    try {
      await auth0Client.logout({
        ...options,
        returnTo: options?.returnTo || window.location.origin
      });
      
      // Clear auth store
      authStore.$reset();
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
    } catch (error) {
      console.error('Logout failed:', error);
      authStore.setError(error as AuthError);
      throw error;
    }
  }

  /**
   * Gets a new access token silently
   */
  async getTokenSilently(options?: GetTokenSilentlyOptions): Promise<string> {
    const authStore = useAuthStore();
    
    try {
      const token = await auth0Client.getTokenSilently(options);
      const claims = await auth0Client.getIdTokenClaims();
      const expiresAt = claims?.exp ? claims.exp * 1000 : null;
      
      authStore.setTokenInfo({
        accessToken: token,
        expiresAt: expiresAt || null
      });
      
      // Schedule token refresh if we have an expiration time
      if (expiresAt) {
        this.scheduleTokenRefresh(expiresAt);
      }
      
      return token;
    } catch (error) {
      console.error('Error getting token silently:', error);
      // Check if token is expired
      if ((error as Error).message?.includes('expired')) {
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_EXPIRED));
      } else {
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SILENT_AUTH_ERROR, { 
          detail: error 
        }));
      }
      authStore.setError(error as AuthError);
      throw error;
    }
  }

  /**
   * Checks if the user is authenticated and updates the store
   */
  async checkAuth(): Promise<boolean> {
    const authStore = useAuthStore();

    try {
      authStore.setLoading(true);
      
      // Check if authenticated
      const isAuthenticated = await auth0Client.isAuthenticated();
      authStore.setIsAuthenticated(isAuthenticated);

      if (isAuthenticated) {
        // Get user profile
        const user = await auth0Client.getUser<User>();
        authStore.setUser(user);

        // Get token and expiration
        const token = await this.getTokenSilently();
        const claims = await auth0Client.getIdTokenClaims();
        const expiresAt = claims?.exp ? claims.exp * 1000 : null;

        authStore.setTokenInfo({
          accessToken: token,
          expiresAt
        });

        // Set up token refresh
        if (expiresAt) {
          this.scheduleTokenRefresh(expiresAt);
        }
      }

      return isAuthenticated;
    } catch (error) {
      console.error('Error checking auth state:', error);
      authStore.setError(error as AuthError);
      return false;
    } finally {
      authStore.setLoading(false);
    }
  }

  /**
   * Schedules token refresh before expiration
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Calculate delay (refresh 5 minutes before expiration)
    const delay = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (delay > 0) {
      this.timeoutId = setTimeout(async () => {
        try {
          await this.getTokenSilently();
        } catch (error) {
          console.error('Token refresh failed:', error);
          const authStore = useAuthStore();
          authStore.setError(error as AuthError);
          
          // If token refresh fails, user may need to reauthenticate
          window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED));
        }
      }, delay);
    } else {
      // Token already expired or about to expire
      console.warn('Token is already expired or will expire very soon');
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_EXPIRED));
    }
  }
}

// Create plugin instance
const auth0Plugin = new Auth0Plugin();

// Vue plugin installation
export const auth0 = {
  install: async (app: App) => {
    try {
      // Initialize Auth0 client
      await auth0Plugin.createClient();
      
      // Make auth0Plugin available globally
      app.config.globalProperties.$auth0 = auth0Plugin;
      
      // Initialize authentication state
      await auth0Plugin.checkAuth();
    } catch (error) {
      console.error('Auth0 plugin installation failed:', error);
    }
  }
} as Plugin;

// Export plugin instance for composable usage
export const useAuth0 = () => auth0Plugin;

export default auth0;

