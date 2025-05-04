import { User as Auth0User } from '@auth0/auth0-spa-js';

/**
 * Extended Auth0 user profile interface.
 * Extends the base Auth0User with additional properties.
 */
export interface User extends Auth0User {
  email_verified?: boolean;
  updated_at?: string;
  picture?: string;
  name?: string;
  nickname?: string;
  sub?: string;
}

/**
 * Authentication state interface for Pinia store
 */
export interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  
  // User profile information
  user: User | null;
  
  // Loading state for async operations
  loading: boolean;
  
  // Authentication errors
  error: AuthError | null;
  
  // JWT token for API requests
  accessToken: string | null;
  
  // Token expiration timestamp
  expiresAt: number | null;
  
  // Flag for popup window state
  popupOpen: boolean;
  
  // Redirect path to return to after login
  redirectPath: string | null;
}

/**
 * Auth0 authentication error interface
 */
export interface AuthError {
  error: string;
  error_description?: string;
  message?: string;
  // Additional fields that might come from Auth0
  errorCode?: string;
  statusCode?: number;
  date?: string;
}

/**
 * Token response from Auth0
 */
export interface TokenResponse {
  accessToken: string;
  idToken?: string;
  expiresIn: number;
  expiresAt: number;
  scope?: string;
  tokenType: string;
}

/**
 * Auth0 Configuration interface
 */
export interface Auth0Config {
  domain: string;
  clientId: string;
  audience?: string;
  redirectUri: string;
  useRefreshTokens: boolean;
  cacheLocation: 'memory' | 'localstorage';
}

/**
 * Authentication events constants
 */
export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'auth:login:success',
  LOGIN_ERROR: 'auth:login:error',
  LOGOUT: 'auth:logout',
  TOKEN_EXPIRED: 'auth:token:expired',
  SESSION_EXPIRED: 'auth:session:expired',
  SILENT_AUTH_ERROR: 'auth:silent:error'
} as const;

export type AuthEvent = typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS];

/**
 * Navigation guard types
 */
export interface AuthGuardNext {
  (to?: string | false | void | Location): void;
}

export type AuthMiddleware = (next: AuthGuardNext) => Promise<void>;

