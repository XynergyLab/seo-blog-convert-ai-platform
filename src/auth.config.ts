import { Auth0Config } from './types/auth.types';

/**
 * Auth0 Configuration
 * Uses environment variables for sensitive values
 */
export const auth0Config: Auth0Config = {
  // Auth0 domain from environment
  domain: process.env.VUE_APP_AUTH0_DOMAIN || '',
  
  // Auth0 client ID from environment
  clientId: process.env.VUE_APP_AUTH0_CLIENT_ID || '',
  
  // API audience (if using a custom API)
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  
  // Redirect URI for authentication callback
  redirectUri: `${window.location.origin}/auth/callback`,
  
  // Enable refresh tokens for silent authentication
  useRefreshTokens: true,
  
  // Store tokens in memory only for security
  cacheLocation: 'memory',
};

// Validation to ensure required config is present
if (!auth0Config.domain || !auth0Config.clientId) {
  console.error(
    'Auth0 configuration is incomplete. Please check your environment variables:\n' +
    '- VUE_APP_AUTH0_DOMAIN\n' +
    '- VUE_APP_AUTH0_CLIENT_ID'
  );
}

export default auth0Config;

