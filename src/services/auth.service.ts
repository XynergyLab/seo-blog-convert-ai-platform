import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { useAuth0 } from '../auth.plugin';
import { useAuthStore } from '../store/auth';
import { AUTH_EVENTS } from '../types/auth.types';

/**
 * Axios instance for authenticated API requests
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Auth service for handling authentication in API requests
 */
class AuthService {
  private static instance: AuthService;
  private tokenRefreshPromise: Promise<string> | null = null;

  private constructor() {
    this.setupInterceptors();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Setup axios interceptors for token management
   */
  private setupInterceptors(): void {
    // Request interceptor
    apiClient.interceptors.request.use(
      async (config) => {
        const authStore = useAuthStore();
        
        if (!config.headers.Authorization && authStore.accessToken) {
          config.headers.Authorization = `Bearer ${authStore.accessToken}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const token = await this.refreshToken();
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            // Token refresh failed, redirect to login
            this.handleAuthError(refreshError as Error);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get auth headers for API requests
   */
  public async getAuthHeaders(): Promise<{ Authorization: string }> {
    const authStore = useAuthStore();
    
    if (!authStore.accessToken || authStore.isTokenExpired) {
      try {
        await this.refreshToken();
      } catch (error) {
        throw new Error('Failed to get valid authentication token');
      }
    }

    return {
      Authorization: `Bearer ${authStore.accessToken}`
    };
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    try {
      const auth0 = useAuth0();
      this.tokenRefreshPromise = auth0.getTokenSilently();
      const token = await this.tokenRefreshPromise;
      return token;
    } catch (error) {
      this.handleAuthError(error as Error);
      throw error;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: Error): void {
    console.error('Authentication error:', error);
    
    const authStore = useAuthStore();
    authStore.setError({
      error: 'authentication_error',
      error_description: error.message,
      message: 'Authentication failed'
    });

    // Dispatch auth error event
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_EXPIRED));
  }

  /**
   * Make an authenticated API request
   */
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await apiClient({
        ...config,
        headers: {
          ...config.headers,
          ...headers
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific API errors
        const apiError = error as AxiosError;
        if (apiError.response) {
          throw new Error(apiError.response.data.message || 'API request failed');
        }
      }
      throw error;
    }
  }

  /**
   * Check if current session is valid
   */
  public async validateSession(): Promise<boolean> {
    try {
      const auth0 = useAuth0();
      const authStore = useAuthStore();

      if (!authStore.authenticated) {
        return false;
      }

      await this.getAuthHeaders();
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export API client for use in other services
export const authenticatedApi = apiClient;

