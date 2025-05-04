import { AuthState, TokenResponse, User, AUTH_EVENTS } from '../types/auth.types';
import { LMServerConfig } from '../types/lmStudioTypes';
import { createClient, RedisClientType } from 'redis'; // Removed RedisClientOptions
import { encrypt, decrypt } from './encryptionService'; // Corrected import path
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

// Restore the class definition
class RedisService {
  private client: RedisClientType | null = null;
  private pubSubClient: RedisClientType | null = null;
  // private subscribers: Map<string, Set<(data: any) => void>> = new Map(); // Removed as direct subscription is used
  private connected = false;
  private connecting = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxReconnectAttempts = MAX_RETRIES;
  private reconnectAttempts = 0;

  constructor() {
    this.initializeClient();
  }

  /**
   * Checks if the Redis client is currently connected.
   * @returns {boolean} True if connected, false otherwise.
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Initializes the Redis client with connection configuration
   */
  private async initializeClient(): Promise<void> {
    if (this.connecting || this.connected) return; // Don't re-init if already connected/connecting

    this.connecting = true;
    console.log("Initializing Redis client..."); // Log start

    try {
      // Create Redis client configuration
      const clientOptions: RedisClientOptions = {
        url: REDIS_URL,
        socket: {
          tls: REDIS_TLS,
          reconnectStrategy: (retries: number) => { // Added type number
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
      if (REDIS_USERNAME) clientOptions.username = REDIS_USERNAME;
      if (REDIS_PASSWORD) clientOptions.password = REDIS_PASSWORD;
      if (redisConfig.connection.database !== undefined) clientOptions.database = redisConfig.connection.database;

      // Create the main Redis client
      this.client = createClient(clientOptions);
      this.pubSubClient = this.client.duplicate(); // Create separate client for pub/sub

      // Set up event handlers
      this.client.on('error', this.handleError.bind(this));
      this.client.on('ready', this.handleReady.bind(this));
      this.client.on('end', this.handleDisconnect.bind(this));

      this.pubSubClient.on('error', this.handleError.bind(this));
      // Note: 'message' event is handled via subscribe callback now

      // Connect to Redis
      console.log("Connecting Redis clients...");
      await Promise.all([this.client.connect(), this.pubSubClient.connect()]);
      console.log("Redis clients connected.");

      // Subscribe to channels using the callback directly
      console.log(`Subscribing to channels: ${AUTH_CHANNEL}, ${SETTINGS_CHANNEL}`);
      await this.pubSubClient.subscribe(AUTH_CHANNEL, this.handleAuthUpdate.bind(this), true); // Pass true for literal subscription
      await this.pubSubClient.subscribe(SETTINGS_CHANNEL, this.handleSettingsUpdate.bind(this), true); // Pass true for literal subscription
      console.log("Subscribed to channels.");

      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('Redis service connected successfully');

    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.connected = false;
      // Ensure connecting is reset even on failure
      this.connecting = false;
      // Attempt reconnect immediately on initial connection failure
      this.handleDisconnect();
    } finally {
       this.connecting = false; // Ensure connecting flag is reset in all cases
    }
  }

  /**
   * Handles Redis client errors
   */
  private handleError(error: Error): void {
    console.error('Redis client error:', error);
    // Consider more specific error handling if needed, e.g., check error codes
  }

  /**
   * Handles Redis client ready state
   */
  private handleReady(): void {
    console.log('Redis client ready');
    this.connected = true;
    this.reconnectAttempts = 0; // Reset attempts on successful connection
    if (this.reconnectTimeout) { // Clear any pending reconnect timeout
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
    }
  }

  /**
   * Handles Redis client disconnections and attempts reconnection
   */
  private handleDisconnect(): void {
     // Prevent multiple concurrent disconnect handlers or handling during initial connect failure race conditions
     if (!this.connected && !this.connecting) {
         // If already disconnected and not in the process of connecting, check if reconnect is pending
         if (this.reconnectTimeout) {
             // console.log("Already disconnected, reconnect pending.");
             return;
         }
     }
     // If currently connecting, let the initializeClient failure handle it.
     if (this.connecting) {
        // console.log("Disconnect event during initial connection attempt.");
        return;
     }


    console.log('Redis client disconnected');
    this.connected = false;
    // this.connecting = false; // Connecting should be false unless initializeClient is running

    // Close existing clients before attempting reconnect to avoid resource leaks
    this.closeClientConnections(); // Ensure clients are properly closed

    // Clear existing timeout if any
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        INITIAL_BACKOFF * Math.pow(RETRY_FACTOR, this.reconnectAttempts),
        MAX_BACKOFF
      );
      const jitter = Math.random() * 100;
      const reconnectDelay = delay + jitter;

      console.log(`Attempting to reconnect in ${reconnectDelay.toFixed(0)}ms (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

      this.reconnectTimeout = setTimeout(async () => {
        this.reconnectTimeout = null; // Clear timeout handle before attempting connection
        this.reconnectAttempts++;
        await this.initializeClient(); // Re-run initialization
      }, reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Giving up. Please check Redis server.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('redis:connection:failed', {
            detail: { error: 'Failed to connect to Redis server after multiple attempts' }
          })
        );
      }
    }
  }

  // Helper to close connections safely and reset client variables
  private async closeClientConnections(): Promise<void> {
      const closePromises: Promise<any>[] = [];
      if (this.pubSubClient) {
          const pubSub = this.pubSubClient;
          this.pubSubClient = null; // Set to null immediately
          console.log("Quitting pubSubClient...");
          closePromises.push(pubSub.quit().catch(e => console.error("Error quitting pubsub client:", e)));
      }
      if (this.client) {
          const mainClient = this.client;
          this.client = null; // Set to null immediately
           console.log("Quitting main client...");
          closePromises.push(mainClient.quit().catch(e => console.error("Error quitting main client:", e)));
      }
      if (closePromises.length > 0) {
        await Promise.all(closePromises);
        console.log("Finished closing client connections.");
      }
  }

  /**
 * Handles auth updates from pub/sub message
 */
private handleAuthUpdate(message: Buffer, channel: string): void { // Changed type to Buffer
    // console.log(`Received message from ${channel}: ${message}`); // Optional: Log received message
  try {
    const data = JSON.parse(message.toString()); // Use toString()
    if (typeof window !== 'undefined' && data.userId && data.event) {
      // console.log(`Dispatching event: ${data.event} for user ${data.userId}`); // Optional log
        window.dispatchEvent(
          new CustomEvent(data.event, { detail: data.payload }) // Pass payload if exists
        );
      }
    } catch (error) {
       console.error(`Error processing message from ${channel}:`, error, "Message:", message);
    }
  }

  /**
 * Handles settings updates from pub/sub message
 */
private handleSettingsUpdate(message: Buffer, channel: string): void { // Changed type to Buffer
    // console.log(`Received message from ${channel}: ${message}`); // Optional: Log received message
  try {
     const data = JSON.parse(message.toString()); // Use toString()
     if (typeof window !== 'undefined' && data.userId && data.settings) {
          // console.log(`Dispatching event: settings:updated for user ${data.userId}`); // Optional log
            window.dispatchEvent(
             new CustomEvent('settings:updated', { detail: data.settings })
          );
       }
    } catch (error) {
        console.error(`Error processing message from ${channel}:`, error, "Message:", message);
    }
  }

  /**
   * Publishes a message to a Redis channel
   */
  private async publish(channel: string, message: any): Promise<void> {
    if (!this.client || !this.connected) {
       console.warn(`Attempted to publish to ${channel} while disconnected. Trying to ensure connection...`);
      // Don't await initializeClient directly here, rely on healthCheck/getters to handle reconnections.
      // Check status again.
       if (!this.connected) {
           console.error(`Cannot publish to ${channel}: Redis client is not connected.`);
           return; // Fail fast if still not connected
       }
    }

    try {
      // Use non-null assertion as connection is checked.
      await this.client!.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`Error publishing to ${channel}:`, error);
      this.handleError(error as Error); // Handle potential connection errors during publish
    }
  }

  /**
   * Encrypts sensitive data before storing in Redis
   */
  private encryptSensitiveData(data: any): any {
    if (!data || !redisConfig.encryption.enabled) return data;

    const encryptedData = { ...data }; // Shallow copy
    // Define fields potentially needing encryption
    const fieldsToEncrypt = ['accessToken', 'idToken', 'refreshToken', 'apiKey'];

    fieldsToEncrypt.forEach(field => {
      if (encryptedData[field] && typeof encryptedData[field] === 'string') {
        try {
          encryptedData[field] = encrypt(encryptedData[field]);
        } catch(e) { console.error(`Error encrypting field ${field}:`, e); }
      }
    });

    // Encrypt sensitive user data if present and configured
    if (encryptedData.user && typeof encryptedData.user === 'object' && redisConfig.encryption.encryptSensitiveData) {
       // Make a deep copy of user object if necessary, or modify in place if acceptable
       // Assuming modifying in place is okay here:
       if (encryptedData.user.email && typeof encryptedData.user.email === 'string') {
            try { encryptedData.user.email = encrypt(encryptedData.user.email); }
            catch(e) { console.error(`Error encrypting user email:`, e); }
       }
       if (encryptedData.user.phone_number && typeof encryptedData.user.phone_number === 'string') {
            try { encryptedData.user.phone_number = encrypt(encryptedData.user.phone_number); }
             catch(e) { console.error(`Error encrypting user phone:`, e); }
       }
       // Add other sensitive user fields if needed
    }
    return encryptedData;
  }

  /**
   * Decrypts sensitive data after retrieving from Redis
   */
  private decryptSensitiveData(data: any): any {
    if (!data || !redisConfig.encryption.enabled) return data;

    const decryptedData = { ...data }; // Shallow copy
    const fieldsToDecrypt = ['accessToken', 'idToken', 'refreshToken', 'apiKey'];

    fieldsToDecrypt.forEach(field => {
        if (decryptedData[field] && typeof decryptedData[field] === 'string') {
            try {
                decryptedData[field] = decrypt(decryptedData[field]);
            } catch (error) {
                console.error(`Failed to decrypt ${field}:`, error);
                // Keep the encrypted value or nullify it based on security policy
                // Keeping encrypted value might be confusing, maybe nullify?
                // decryptedData[field] = null; // Example: Nullify on decryption error
            }
        }
    });

    // Decrypt sensitive user data if present and configured
    if (decryptedData.user && typeof decryptedData.user === 'object' && redisConfig.encryption.encryptSensitiveData) {
      // Assuming modifying in place is okay:
      if (decryptedData.user.email && typeof decryptedData.user.email === 'string') {
          try { decryptedData.user.email = decrypt(decryptedData.user.email); }
          catch (error) { console.error('Failed to decrypt user email:', error); /*decryptedData.user.email = null;*/ }
      }
      if (decryptedData.user.phone_number && typeof decryptedData.user.phone_number === 'string') {
           try { decryptedData.user.phone_number = decrypt(decryptedData.user.phone_number); }
           catch (error) { console.error('Failed to decrypt user phone:', error); /*decryptedData.user.phone_number = null;*/ }
      }
      // Add other sensitive user fields if needed
    }
    return decryptedData;
  }

  /**
   * Generates a Redis key with proper namespace using configured prefix
   */
  private getKey(prefix: string, userId: string, subKey?: string): string {
     // Ensure global prefix is included
    const baseKey = `${KEY_PREFIX}${prefix}:${userId}`;
    return subKey ? `${baseKey}:${subKey}` : baseKey;
  }

  // --- Public Data Access Methods ---

  /**
   * Retrieves authentication state for a user
   */
  async getAuthState(userId: string): Promise<AuthState | null> {
    if (!this.client || !this.connected) {
        console.warn("getAuthState: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
        if (!this.client || !this.connected) {
             console.error("getAuthState: Client unavailable after check.");
             return null;
        }
    }

    try {
      const key = this.getKey(AUTH_PREFIX, userId);
      const data = await this.client.get(key);
      if (!data) return null;
      const authState = JSON.parse(data);
      return this.decryptSensitiveData(authState);
    } catch (error) {
      console.error('Error retrieving auth state from Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return null;
    }
  }

  /**
   * Stores authentication state for a user
   */
  async setAuthState(userId: string, state: AuthState, ttl = AUTH_TTL): Promise<boolean> {
    if (!this.client || !this.connected) {
        console.warn("setAuthState: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
        if (!this.client || !this.connected) {
            console.error("setAuthState: Client unavailable after check.");
            return false;
        }
    }

    try {
      const key = this.getKey(AUTH_PREFIX, userId);
      const encryptedState = this.encryptSensitiveData(state);
      // Use 'SET' command with 'EX' option for atomic set-with-expiration
      const result = await this.client.set(key, JSON.stringify(encryptedState), { EX: ttl });
      if (result === 'OK') {
         await this.publish(AUTH_CHANNEL, { userId, event: AUTH_EVENTS.LOGIN_SUCCESS, timestamp: Date.now() });
         return true;
      } else {
          console.error("Failed to set auth state, SET command did not return OK");
          return false;
      }
    } catch (error) {
      console.error('Error storing auth state in Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return false;
    }
  }

  /**
   * Clears authentication state for a user
   */
  async clearAuthState(userId: string): Promise<boolean> {
    if (!this.client || !this.connected) {
        console.warn("clearAuthState: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
         if (!this.client || !this.connected) {
            console.error("clearAuthState: Client unavailable after check.");
            return false;
         }
    }

    try {
      const authKey = this.getKey(AUTH_PREFIX, userId);
      const tokenKey = this.getKey(TOKEN_PREFIX, userId);
      // Use DEL command which can take multiple keys
      const deletedCount = await this.client.del([authKey, tokenKey]);
      console.log(`Deleted ${deletedCount} keys for user ${userId} during logout.`);
      await this.publish(AUTH_CHANNEL, { userId, event: AUTH_EVENTS.LOGOUT, timestamp: Date.now() });
      return deletedCount > 0; // Return true if at least one key was deleted
    } catch (error) {
      console.error('Error clearing auth state from Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return false;
    }
  }

  /**
   * Stores token data with encryption
   */
  async storeToken(userId: string, tokenData: TokenResponse): Promise<boolean> {
    if (!this.client || !this.connected) {
        console.warn("storeToken: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
        if (!this.client || !this.connected) {
            console.error("storeToken: Client unavailable after check.");
            return false;
        }
    }

    try {
      const key = this.getKey(TOKEN_PREFIX, userId);
      const encryptedTokenData = this.encryptSensitiveData(tokenData);
      const result = await this.client.set(key, JSON.stringify(encryptedTokenData), { EX: TOKEN_TTL });
      return result === 'OK';
    } catch (error) {
      console.error('Error storing token in Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return false;
    }
  }

  /**
   * Retrieves and decrypts token data
   */
  async getToken(userId: string): Promise<TokenResponse | null> {
     if (!this.client || !this.connected) {
        console.warn("getToken: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
         if (!this.client || !this.connected) {
            console.error("getToken: Client unavailable after check.");
            return null;
         }
     }

    try {
      const key = this.getKey(TOKEN_PREFIX, userId);
      const data = await this.client.get(key);
      if (!data) return null;
      const tokenData = JSON.parse(data);
      return this.decryptSensitiveData(tokenData);
    } catch (error) {
      console.error('Error retrieving token from Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return null;
    }
  }

  /**
   * Updates token TTL to prevent expiration
   */
  async refreshTokenTTL(userId: string): Promise<boolean> {
    if (!this.client || !this.connected) {
        console.warn("refreshTokenTTL: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
         if (!this.client || !this.connected) {
            console.error("refreshTokenTTL: Client unavailable after check.");
            return false;
         }
    }

    try {
      const key = this.getKey(TOKEN_PREFIX, userId);
      // Use EXPIRE to update TTL. Returns 1 if key exists and TTL was set, 0 otherwise.
      const result = await this.client.expire(key, TOKEN_TTL);
      return result === 1;
    } catch (error) {
      console.error('Error refreshing token TTL in Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return false;
    }
  }

  /**
   * Retrieves user settings
   */
  async getSettings(userId: string): Promise<LMServerConfig | null> {
    if (!this.client || !this.connected) {
        console.warn("getSettings: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
         if (!this.client || !this.connected) {
            console.error("getSettings: Client unavailable after check.");
            return null;
         }
    }

    try {
      const key = this.getKey(SETTINGS_PREFIX, userId);
      const data = await this.client.get(key);
      if (!data) return null;
      const settings = JSON.parse(data);
      return this.decryptSensitiveData(settings);
    } catch (error) {
      console.error('Error retrieving settings from Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return null;
    }
  }

  /**
   * Updates user settings
   */
  async updateSettings(userId: string, settings: Partial<LMServerConfig>): Promise<boolean> {
    if (!this.client || !this.connected) {
        console.warn("updateSettings: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
        if (!this.client || !this.connected) {
            console.error("updateSettings: Client unavailable after check.");
            return false;
        }
    }

    try {
      const key = this.getKey(SETTINGS_PREFIX, userId);
      // Fetch existing settings first to perform a merge
      const existingSettingsData = await this.client.get(key);
      const existingSettings = existingSettingsData ? this.decryptSensitiveData(JSON.parse(existingSettingsData)) : {};
      // Merge incoming partial settings onto existing settings
      const updatedSettings = { ...existingSettings, ...settings };
      // Encrypt the merged settings before storing
      const encryptedSettings = this.encryptSensitiveData(updatedSettings);

      const result = await this.client.set(key, JSON.stringify(encryptedSettings), { EX: SETTINGS_TTL });

      if (result === 'OK') {
         // Publish the *decrypted* updated settings for UI updates
         await this.publish(SETTINGS_CHANNEL, { userId, settings: updatedSettings, timestamp: Date.now() });
         return true;
      } else {
           console.error("Failed to update settings, SET command did not return OK");
           return false;
      }
    } catch (error) {
      console.error('Error updating settings in Redis:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return false;
    }
  }

  /**
   * Perform batch operations using MULTI/EXEC pipeline
   * Takes a function that receives the pipeline object and adds commands to it.
   */
  async batch<T = any>(operations: (pipeline: ReturnType<RedisClientType['multi']>) => void): Promise<RedisResult<T[]>> {
    if (!this.client || !this.connected) {
        console.warn("batch: Client not ready, attempting health check/reconnect...");
        await this.healthCheck(); // Attempt to ensure connection
         if (!this.client || !this.connected) {
            return { success: false, error: new Error('Redis client not available for batch operation') };
         }
    }

    // Use non-null assertion as connection is checked.
    const pipeline = this.client!.multi();
    try {
      operations(pipeline); // Caller adds commands to the pipeline
      const results = await pipeline.exec() as T[]; // Execute the transaction
      // Note: results array contains null for failed commands within the transaction
      return { success: true, data: results };
    } catch (error) {
      console.error('Error performing Redis batch operation:', error);
      this.handleError(error as Error); // Handle potential connection issues
      return { success: false, error: error instanceof Error ? error : new Error('Unknown error in batch operation') };
    }
  }

  /**
   * Checks Redis connection health by attempting a PING command.
   */
  async healthCheck(): Promise<{ healthy: boolean; connected: boolean; connectionAttempts: number; error?: string; }> {
    // Check if client exists and is connected according to state
    if (this.client && this.connected) {
        try {
            await this.client.ping();
            // Ping successful, connection is live
            if (this.reconnectAttempts > 0) { // Reset attempts if we were reconnecting
                 console.log("Health check successful after reconnection attempts.");
                 this.reconnectAttempts = 0;
            }
             if (this.reconnectTimeout) { // Clear pending reconnect if health check succeeds
                 clearTimeout(this.reconnectTimeout);
                 this.reconnectTimeout = null;
             }
            return { healthy: true, connected: true, connectionAttempts: this.reconnectAttempts };
        } catch (pingError) {
            // Ping failed, connection is likely down
            console.error("Health check ping failed:", pingError);
            this.connected = false; // Update state
            // Trigger disconnect handling which includes reconnection logic
            this.handleDisconnect();
            return { healthy: false, connected: false, connectionAttempts: this.reconnectAttempts, error: pingError instanceof Error ? pingError.message : 'Ping failed' };
        }
    } else {
        // Client doesn't exist or state is already disconnected
        console.warn("Health check: Client not available or already marked disconnected. Attempting reconnect if applicable.");
        // Trigger disconnect handling which might initiate reconnection
        if (!this.connecting && !this.reconnectTimeout) { // Avoid triggering if already trying to connect/reconnect
            this.handleDisconnect();
        }
        return { healthy: false, connected: false, connectionAttempts: this.reconnectAttempts, error: 'Redis client not available or disconnected' };
    }
  }


  /**
   * Properly clean up all Redis connections. Should be called on application shutdown.
   */
  async cleanup(): Promise<void> {
    console.log("Initiating Redis service cleanup...");
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      console.log("Cleared pending reconnect timeout.");
    }
    await this.closeClientConnections(); // Ensure clients are closed
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0; // Reset attempts on cleanup
    console.log('Redis service cleanup completed.');
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
