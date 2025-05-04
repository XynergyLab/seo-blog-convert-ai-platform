import { AuthState, TokenResponse, User, AUTH_EVENTS } from '../types/auth.types';
import { LMServerConfig } from '../types/lmStudioTypes';
import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { encrypt, decrypt } from './encryptionService';
import { v4 as uuidv4 } from 'uuid';
import {
  redisConfig,
  REDIS_URL,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_TLS,
  AUTH_TTL,
  TOKEN_TTL,
  SETTINGS_TTL,
  KEY_PREFIX,
  AUTH_PREFIX,
  SETTINGS_PREFIX,
  TOKEN_PREFIX,
  AUTH_CHANNEL,
  SETTINGS_CHANNEL,
  MAX_RETRIES,
  INITIAL_BACKOFF,
  MAX_BACKOFF,
  RETRY_FACTOR
} from '../config/redis.config';

/**
 * Class for managing Redis connections and operations
 */
/**
 * Result type for Redis operations
 */
export interface RedisResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Redis Service class for managing Redis connections and operations
 */
class RedisService {
  private client: RedisClientType | null = null;
  private pubSubClient: RedisClientType | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private connected = false;
  private connecting = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxReconnectAttempts = MAX_RETRIES;
  private reconnectAttempts = 0;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initializes the Redis client with connection configuration
   */
  private async initializeClient(): Promise<void> {
    if (this.connecting) return;

    this.connecting = true;

    try {
      // Create Redis client configuration
      const clientOptions: RedisClientOptions = {
        url: REDIS_URL,
        socket: {
          tls: REDIS_TLS,
          reconnectStrategy: (retries) => {
            // Use exponential backoff with jitter for reconnection
            const delay = Math.min(
              INITIAL_BACKOFF * Math.pow(RETRY_FACTOR, retries), 
              MAX_BACKOFF
            );
            // Add jitter to prevent all clients reconnecting at once
            const jitter = Math.random() * 100;
            return delay + jitter;
          }
        }
      };
      
      // Add credentials if provided
      if (REDIS_USERNAME) {
        clientOptions.username = REDIS_USERNAME;
      }
      
      if (REDIS_PASSWORD) {
        clientOptions.password = REDIS_PASSWORD;
      }
      
      // Add database selection if provided
      if (redisConfig.connection.database !== undefined) {
        clientOptions.database = redisConfig.connection.database;
      }

      // Create the main Redis client
      this.client = createClient(clientOptions);

      // Create separate client for pub/sub to avoid blocking
      this.pubSubClient = this.client.duplicate();

      // Set up event handlers
      this.client.on('error', this.handleError.bind(this));
      this.client.on('ready', this.handleReady.bind(this));
      this.client.on('end', this.handleDisconnect.bind(this));

      this.pubSubClient.on('error', this.handleError.bind(this));
      this.pubSubClient.on('message', this.handleMessage.bind(this));

      // Connect to Redis
      await this.client.connect();
      await this.pubSubClient.connect();

      // Subscribe to channels
      await this.pubSubClient.subscribe(AUTH_CHANNEL, this.handleAuthUpdate.bind(this));
      await this.pubSubClient.subscribe(SETTINGS_CHANNEL, this.handleSettingsUpdate.bind(this));

      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;

      console.log('Redis service connected successfully');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.connected = false;
      this.connecting = false;
      this.handleDisconnect();
    }
  }

  /**
   * Handles Redis client errors
   */
  private handleError(error: Error): void {
    console.error('Redis client error:', error);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connection closed')) {
      this.handleDisconnect();
    }
  }

  /**
   * Handles Redis client ready state
   */
  private handleReady(): void {
    console.log('Redis client ready');
    this.connected = true;
    this.reconnectAttempts = 0;
  }

  /**
   * Handles Redis client disconnections
   */
  private handleDisconnect(): void {
    console.log('Redis client disconnected');
    this.connected = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Calculate delay using our config values
      const delay = Math.min(
        INITIAL_BACKOFF * Math.pow(RETRY_FACTOR, this.reconnectAttempts),
        MAX_BACKOFF
      );
      // Add jitter to prevent all clients reconnecting at once
      const jitter = Math.random() * 100;
      const reconnectDelay = delay + jitter;
      
      console.log(`Attempting to reconnect in ${reconnectDelay}ms...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.initializeClient();
      }, reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Please check Redis server.');
      // Dispatch event for UI notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('redis:connection:failed', {
            detail: { error: 'Failed to connect to Redis server' }
          })
        );
      }
    }
  }

  /**
   * Handles incoming pub/sub messages
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      if (channel === AUTH_CHANNEL) {
        this.handleAuthUpdate(data);
      } else if (channel === SETTINGS_CHANNEL) {
        this.handleSettingsUpdate(data);
      }
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  }

  /**
   * Handles auth updates from pub/sub
   */
  private handleAuthUpdate(data: any): void {
    if (typeof window !== 'undefined' && data.userId && data.event) {
      // Trigger appropriate auth event
      window.dispatchEvent(
        new CustomEvent(data.event, {
          detail: data.payload
        })
      );
    }
  }

  /**
   * Handles settings updates from pub/sub
   */
  private handleSettingsUpdate(data: any): void {
    if (typeof window !== 'undefined' && data.userId && data.settings) {
      // Trigger settings update event
      window.dispatchEvent(
        new CustomEvent('settings:updated', {
          detail: data.settings
        })
      );
    }
  }

  /**
   * Publishes a message to a Redis channel
   */
  private async publish(channel: string, message: any): Promise<void> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (this.client) {
        await this.client.publish(channel, JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error publishing to Redis:', error);
    }
  }

  /**
  /**
   * Encrypts sensitive data before storing in Redis
   * Uses configuration to determine if encryption is enabled
   */
  private encryptSensitiveData(data: any): any {
    if (!data) return data;
    
    // Skip encryption if disabled in config
    if (!redisConfig.encryption.enabled) {
      return data;
    }

    const encryptedData = { ...data };

    // Encrypt tokens and sensitive fields
    if (encryptedData.accessToken) {
      encryptedData.accessToken = encrypt(encryptedData.accessToken);
    }
    
    if (encryptedData.idToken) {
      encryptedData.idToken = encrypt(encryptedData.idToken);
    }
    
    if (encryptedData.refreshToken) {
      encryptedData.refreshToken = encrypt(encryptedData.refreshToken);
    }

    // For settings data, encrypt API keys
    if (encryptedData.apiKey) {
      encryptedData.apiKey = encrypt(encryptedData.apiKey);
    }
    
    // Encrypt additional sensitive fields that might be in user profile
    if (encryptedData.user && redisConfig.encryption.encryptSensitiveData) {
      if (encryptedData.user.email) {
        encryptedData.user.email = encrypt(encryptedData.user.email);
      }
      
      if (encryptedData.user.phone_number) {
        encryptedData.user.phone_number = encrypt(encryptedData.user.phone_number);
      }
    }

    return encryptedData;
  }
  /**
  /**
   * Decrypts sensitive data after retrieving from Redis
   * Uses configuration to determine if encryption is enabled
   */
  private decryptSensitiveData(data: any): any {
    if (!data) return data;
    
    // Skip decryption if encryption is disabled in config
    if (!redisConfig.encryption.enabled) {
      return data;
    }

    const decryptedData = { ...data };

    // Decrypt tokens and sensitive fields
    if (decryptedData.accessToken) {
      try {
        decryptedData.accessToken = decrypt(decryptedData.accessToken);
      } catch (error) {
        console.error('Failed to decrypt access token:', error);
        // If decryption fails, return the original encrypted data
        // This avoids returning partial decrypted data
      }
    }
    
    if (decryptedData.idToken) {
      try {
        decryptedData.idToken = decrypt(decryptedData.idToken);
      } catch (error) {
        console.error('Failed to decrypt ID token:', error);
      }
    }
    
    if (decryptedData.refreshToken) {
      try {
        decryptedData.refreshToken = decrypt(decryptedData.refreshToken);
      } catch (error) {
        console.error('Failed to decrypt refresh token:', error);
      }
    }

    // For settings data, decrypt API keys
    if (decryptedData.apiKey) {
      try {
        decryptedData.apiKey = decrypt(decryptedData.apiKey);
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
      }
    }
    
    // Decrypt additional sensitive fields that might be in user profile
    if (decryptedData.user && redisConfig.encryption.encryptSensitiveData) {
      if (decryptedData.user.email) {
        try {
          decryptedData.user.email = decrypt(decryptedData.user.email);
        } catch (error) {
          console.error('Failed to decrypt user email:', error);
        }
      }
      
      if (decryptedData.user.phone_number) {
        try {
          decryptedData.user.phone_number = decrypt(decryptedData.user.phone_number);
        } catch (error) {
          console.error('Failed to decrypt user phone:', error);
        }
      }
    }

    return decryptedData;
  }
  /**
   * Generates a Redis key with proper namespace
   */
  private getKey(prefix: string, userId: string, subKey?: string): string {
    return subKey 
      ? `${prefix}${userId}:${subKey}` 
      : `${prefix}${userId}`;
  }

    /**
     * Retrieves authentication state for a user
     */
    async getAuthState(userId: string): Promise<AuthState | null> {
      if (!this.client || !this.connected) {
        await this.initializeClient();
      }

      try {
        if (!this.client) return null;

        const key = this.getKey(AUTH_PREFIX, userId);
        const data = await this.client.get(key);
        
        if (!data) return null;
        
        const authState = JSON.parse(data);
        return this.decryptSensitiveData(authState);
      } catch (error) {
        console.error('Error retrieving auth state from Redis:', error);
        return null;
      }
    }
  }

  /**
   * Stores authentication state for a user
   */
  async setAuthState(userId: string, state: AuthState, ttl = AUTH_TTL): Promise<boolean> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return false;

      const key = this.getKey(AUTH_PREFIX, userId);
      const encryptedState = this.encryptSensitiveData(state);
      
      await this.client.set(key, JSON.stringify(encryptedState), {
        EX: ttl
      });

      // Publish update for real-time sync
      await this.publish(AUTH_CHANNEL, {
        userId,
        event: AUTH_EVENTS.LOGIN_SUCCESS,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error storing auth state in Redis:', error);
      return false;
    }
  }

  /**
   * Clears authentication state for a user
   */
  async clearAuthState(userId: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return false;

      const authKey = this.getKey(AUTH_PREFIX, userId);
      const tokenKey = this.getKey(TOKEN_PREFIX, userId);
      
      await this.client.del(authKey);
      await this.client.del(tokenKey);

      // Publish logout event for real-time sync
      await this.publish(AUTH_CHANNEL, {
        userId,
        event: AUTH_EVENTS.LOGOUT,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error clearing auth state from Redis:', error);
      return false;
    }
  }

  /**
   * Stores token data with encryption
   */
  async storeToken(userId: string, tokenData: TokenResponse): Promise<boolean> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return false;

      const key = this.getKey(TOKEN_PREFIX, userId);
      const encryptedTokenData = this.encryptSensitiveData(tokenData);
      
      // Store token with expiration
      await this.client.set(key, JSON.stringify(encryptedTokenData), {
        EX: TOKEN_TTL
      });

      return true;
    } catch (error) {
      console.error('Error storing token in Redis:', error);
      return false;
    }
  }

  /**
   * Retrieves and decrypts token data
   */
  async getToken(userId: string): Promise<TokenResponse | null> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return null;

      const key = this.getKey(TOKEN_PREFIX, userId);
      const data = await this.client.get(key);
      
      if (!data) return null;
      
      const tokenData = JSON.parse(data);
      return this.decryptSensitiveData(tokenData);
    } catch (error) {
      console.error('Error retrieving token from Redis:', error);
      return null;
    }
  }

  /**
   * Updates token TTL to prevent expiration
   */
  async refreshTokenTTL(userId: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return false;

      const key = this.getKey(TOKEN_PREFIX, userId);
      await this.client.expire(key, TOKEN_TTL);
      return true;
    } catch (error) {
      console.error('Error refreshing token TTL in Redis:', error);
      return false;
    }
  }

  /**
   * Retrieves user settings
   */
  async getSettings(userId: string): Promise<LMServerConfig | null> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return null;

      const key = this.getKey(SETTINGS_PREFIX, userId);
      const data = await this.client.get(key);
      
      if (!data) return null;
      
      const settings = JSON.parse(data);
      return this.decryptSensitiveData(settings);
    } catch (error) {
      console.error('Error retrieving settings from Redis:', error);
      return null;
    }
  }

  /**
   * Updates user settings
   */
  async updateSettings(userId: string, settings: Partial<LMServerConfig>): Promise<boolean> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }

    try {
      if (!this.client) return false;

      const key = this.getKey(SETTINGS_PREFIX, userId);
      
      // Get existing settings or create new
      const existingData = await this.client.get(key);
      const existingData = await this.client.get(key);
      const existingSettings = existingData ? JSON.parse(existingData) : {};
      
      // Merge settings
      const updatedSettings = {
        ...existingSettings,
        ...settings
      };
      
      // Encrypt sensitive data
      const encryptedSettings = this.encryptSensitiveData(updatedSettings);
      
      // Store settings with expiration
      await this.client.set(key, JSON.stringify(encryptedSettings), {
        EX: SETTINGS_TTL
      });
      
      // Publish update for real-time sync
      await this.publish(SETTINGS_CHANNEL, {
        userId,
        settings: updatedSettings,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating settings in Redis:', error);
      return false;
    }
  }
  
  /**
   * Perform batch operations to improve performance
   * @param operations List of operations to perform in a batch
   */
  async batch<T>(operations: (() => Promise<T>)[]): Promise<RedisResult<T[]>> {
    if (!this.client || !this.connected) {
      await this.initializeClient();
    }
    
    try {
      if (!this.client) {
        return {
          success: false,
          error: new Error('Redis client not available')
        };
      }
      
      // Execute all operations in parallel
      const results = await Promise.all(operations.map(op => {
        try {
          return op();
        } catch (error) {
          console.error('Error in batch operation:', error);
          return null;
        }
      }));
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error performing batch operations:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error in batch operation')
      };
    }
  }
  
  /**
   * Checks Redis connection health
   * @returns Object with health status and connection details
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    connected: boolean;
    connectionAttempts: number;
    error?: string;
  }> {
    try {
      if (!this.client) {
        return {
          healthy: false,
          connected: false,
          connectionAttempts: this.reconnectAttempts,
          error: 'Redis client not initialized'
        };
      }
      
      // Check connection by executing a simple Redis command
      await this.client.ping();
      
      return {
        healthy: true,
        connected: this.connected,
        connectionAttempts: this.reconnectAttempts
      };
    } catch (error) {
      return {
        healthy: false,
        connected: this.connected,
        connectionAttempts: this.reconnectAttempts,
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }
  
  /**
   * Properly clean up all Redis connections
   */
  async cleanup(): Promise<void> {
    try {
      // Clear any reconnect timers
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Close pub/sub client
      if (this.pubSubClient) {
        try {
          await this.pubSubClient.quit();
        } catch (error) {
          console.error('Error closing pub/sub client:', error);
        }
      }
      
      // Close main client
      if (this.client) {
        try {
          await this.client.quit();
        } catch (error) {
          console.error('Error closing Redis client:', error);
        }
      }
      
      this.connected = false;
      this.connecting = false;
      this.client = null;
      this.pubSubClient = null;
      
      console.log('Redis connections closed successfully');
    } catch (error) {
      console.error('Error during Redis cleanup:', error);
    }
  }
}

// Create a singleton instance
const redisService = new RedisService();

// Setup cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    redisService.cleanup().catch(error => {
      console.error('Error cleaning up Redis connections:', error);
    });
  });
}

export default redisService;
