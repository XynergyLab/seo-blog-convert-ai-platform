/**
 * Redis Configuration
 * 
 * Centralizes Redis-related configuration settings, handles environment
 * variables, and provides type safety and validation for Redis connection
 * and data management settings.
 */

/**
 * Redis connection configuration
 */
export interface RedisConnectionConfig {
  url: string;
  username?: string;
  password?: string;
  tls: boolean;
  family?: number; // IP family (4 or 6)
  database?: number; // Redis database index
}

/**
 * Redis retry policy configuration
 */
export interface RedisRetryConfig {
  maxRetries: number;
  initialBackoff: number; // in ms
  maxBackoff: number; // in ms
  retryFactor: number; // exponential factor
}

/**
 * Redis key configuration
 */
export interface RedisKeyConfig {
  prefix: string;
  auth: string;
  settings: string;
  token: string;
}

/**
 * Redis TTL configuration (in seconds)
 */
export interface RedisTTLConfig {
  auth: number;
  token: number;
  settings: number;
  tempData: number;
}

/**
 * Redis pub/sub channel configuration
 */
export interface RedisPubSubConfig {
  authChannel: string;
  settingsChannel: string;
}

/**
 * Redis encryption configuration
 */
export interface RedisEncryptionConfig {
  enabled: boolean;
  algorithm: string;
  encryptSensitiveData: boolean;
  // Secret key is handled via environment variables, not stored here
}

/**
 * Complete Redis configuration
 */
export interface RedisConfig {
  connection: RedisConnectionConfig;
  retry: RedisRetryConfig;
  keys: RedisKeyConfig;
  ttl: RedisTTLConfig;
  pubsub: RedisPubSubConfig;
  encryption: RedisEncryptionConfig;
  isDevelopment: boolean;
}

// Environment variable handling with defaults
const getEnv = (key: string, defaultValue: string = ''): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  
  // For browser environment, try to get from window.ENV if it exists
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV[key] || defaultValue;
  }
  
  return defaultValue;
};

// Determine environment
const isDevelopment = getEnv('NODE_ENV', 'development') !== 'production';

// Redis connection settings
const redisConnectionConfig: RedisConnectionConfig = {
  url: getEnv('VUE_APP_REDIS_URL', 'redis://localhost:6379'),
  username: getEnv('VUE_APP_REDIS_USERNAME', ''),
  password: getEnv('VUE_APP_REDIS_PASSWORD', ''),
  tls: getEnv('VUE_APP_REDIS_TLS', 'false') === 'true',
  database: parseInt(getEnv('VUE_APP_REDIS_DATABASE', '0'), 10)
};

// Redis retry settings
const redisRetryConfig: RedisRetryConfig = {
  maxRetries: parseInt(getEnv('VUE_APP_REDIS_MAX_RETRIES', '5'), 10),
  initialBackoff: parseInt(getEnv('VUE_APP_REDIS_INITIAL_BACKOFF', '1000'), 10),
  maxBackoff: parseInt(getEnv('VUE_APP_REDIS_MAX_BACKOFF', '30000'), 10),
  retryFactor: parseFloat(getEnv('VUE_APP_REDIS_RETRY_FACTOR', '2'))
};

// Default key prefix
const keyPrefix = 'lm-studio-agents:';

// Redis key configuration
const redisKeyConfig: RedisKeyConfig = {
  prefix: getEnv('VUE_APP_REDIS_KEY_PREFIX', keyPrefix),
  auth: `${keyPrefix}auth:`,
  settings: `${keyPrefix}settings:`,
  token: `${keyPrefix}token:`
};

// Redis TTL configuration
const redisTTLConfig: RedisTTLConfig = {
  auth: parseInt(getEnv('VUE_APP_REDIS_AUTH_TTL', '86400'), 10), // 24 hours
  token: parseInt(getEnv('VUE_APP_REDIS_TOKEN_TTL', '3600'), 10), // 1 hour
  settings: parseInt(getEnv('VUE_APP_REDIS_SETTINGS_TTL', '604800'), 10), // 7 days
  tempData: parseInt(getEnv('VUE_APP_REDIS_TEMP_TTL', '300'), 10) // 5 minutes
};

// Redis pub/sub configuration
const redisPubSubConfig: RedisPubSubConfig = {
  authChannel: `${keyPrefix}auth-updates`,
  settingsChannel: `${keyPrefix}settings-updates`
};

// Redis encryption configuration
const redisEncryptionConfig: RedisEncryptionConfig = {
  enabled: getEnv('VUE_APP_REDIS_ENCRYPTION_ENABLED', 'true') === 'true',
  algorithm: getEnv('VUE_APP_REDIS_ENCRYPTION_ALGORITHM', 'aes-256-gcm'),
  encryptSensitiveData: getEnv('VUE_APP_REDIS_ENCRYPT_SENSITIVE', 'true') === 'true'
};

// Validate Redis URL
if (!redisConnectionConfig.url) {
  console.error(
    'Redis URL is not configured. Please set VUE_APP_REDIS_URL environment variable.'
  );
  
  if (!isDevelopment) {
    throw new Error('Redis URL is required in production environment');
  }
}

// Assemble complete Redis configuration
export const redisConfig: RedisConfig = {
  connection: redisConnectionConfig,
  retry: redisRetryConfig,
  keys: redisKeyConfig,
  ttl: redisTTLConfig,
  pubsub: redisPubSubConfig,
  encryption: redisEncryptionConfig,
  isDevelopment
};

// Export constants for use in services
export const REDIS_URL = redisConnectionConfig.url;
export const REDIS_USERNAME = redisConnectionConfig.username;
export const REDIS_PASSWORD = redisConnectionConfig.password;
export const REDIS_TLS = redisConnectionConfig.tls;

export const AUTH_TTL = redisTTLConfig.auth;
export const TOKEN_TTL = redisTTLConfig.token;
export const SETTINGS_TTL = redisTTLConfig.settings;

export const KEY_PREFIX = redisKeyConfig.prefix;
export const AUTH_PREFIX = redisKeyConfig.auth;
export const SETTINGS_PREFIX = redisKeyConfig.settings;
export const TOKEN_PREFIX = redisKeyConfig.token;

export const AUTH_CHANNEL = redisPubSubConfig.authChannel;
export const SETTINGS_CHANNEL = redisPubSubConfig.settingsChannel;

export const MAX_RETRIES = redisRetryConfig.maxRetries;
export const INITIAL_BACKOFF = redisRetryConfig.initialBackoff;
export const MAX_BACKOFF = redisRetryConfig.maxBackoff;
export const RETRY_FACTOR = redisRetryConfig.retryFactor;

export default redisConfig;

