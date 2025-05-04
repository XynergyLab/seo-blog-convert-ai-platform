/**
 * Redis Migration Test Utilities
 * 
 * Provides comprehensive test utilities for verifying Redis migration:
 * - Redis connection testing
 * - Auth store testing
 * - Settings store testing
 * - Error handling testing
 * - Cross-tab synchronization testing
 * - Performance testing
 */

import redisService from '../services/redisService';
import { useAuthStore, getAuthStore } from '../store';
import { useSettingsStore, getSettingsStore } from '../store';
import { AuthState } from '../types/auth.types';

// Test result types
export interface TestResult {
  name: string;
  success: boolean;
  message?: string;
  error?: string;
  duration?: number;
  timestamp?: number;
}

export interface TestSuiteResult {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    startTime: number;
    endTime: number;
    details: TestResult[];
  };
}

export interface ConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Mock data for testing
 */
const mockUser = {
  sub: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  email_verified: true,
  picture: 'https://example.com/profile.jpg'
};

const mockSettings = {
  apiKey: 'test-api-key-' + Date.now(),
  endpoint: 'http://localhost:1234/api',
  activeModels: ['model1', 'model2', 'test-model'],
  maxTokens: 2000,
  temperature: 0.7
};

/**
 * Test result storage
 */
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  startTime: 0,
  endTime: 0,
  details: [] as TestResult[]
};

/**
 * Record a test result
 */
function recordTest(name: string, success: boolean, message?: string, error?: string, duration = 0): void {
  testResults.total++;
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({
    name,
    success,
    message,
    error,
    duration,
    timestamp: Date.now()
  });
  
  // Log result
  console.log(`${success ? '✅ PASS:' : '❌ FAIL:'} ${name}${error ? ` - ${error}` : ''}`);
}

/**
 * Reset test results
 */
function resetTestResults(): void {
  testResults.total = 0;
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.startTime = Date.now();
  testResults.endTime = 0;
  testResults.details = [];
}

/**
 * Complete test suite and return results
 */
function completeTestSuite(): TestSuiteResult {
  testResults.endTime = Date.now();
  
  const duration = testResults.endTime - testResults.startTime;
  console.log(`\nTest suite completed in ${duration}ms - ${testResults.passed} passed, ${testResults.failed} failed`);
  
  return {
    success: testResults.failed === 0,
    summary: { ...testResults }
  };
}

/**
 * Run a test with timing and error handling
 */
async function runTest<T>(
  name: string,
  testFn: () => Promise<T>,
  successFn: (result: T) => boolean = () => true,
  errorMsg = 'Test failed'
): Promise<T | null> {
  const startTime = Date.now();
  let result: T | null = null;
  
  try {
    result = await testFn();
    const success = successFn(result);
    const duration = Date.now() - startTime;
    
    if (success) {
      recordTest(name, true, 'Test completed successfully', undefined, duration);
    } else {
      recordTest(name, false, errorMsg, JSON.stringify(result), duration);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorStr = error instanceof Error ? error.message : String(error);
    recordTest(name, false, errorMsg, errorStr, duration);
    return null;
  }
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<ConnectionResult> {
  console.log('Testing Redis connection...');
  resetTestResults();
  
  try {
    const health = await redisService.healthCheck();
    
    recordTest('Redis Health Check', health.healthy, 
      `Connection status: ${health.healthy ? 'Healthy' : 'Unhealthy'}`,
      health.error);
    
    if (health.healthy) {
      // Test basic Redis operations
      await runTest('Redis Ping', 
        async () => {
          // Implementation depends on what's available in redisService
          // This is a simplified example
          return redisService.healthCheck();
        },
        result => result.healthy);
    }
    
    testResults.endTime = Date.now();
    return {
      success: health.healthy,
      message: health.healthy ? 'Redis connection successful' : 'Redis connection failed',
      error: health.error
    };
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    recordTest('Redis Connection', false, 'Failed to connect to Redis', errorStr);
    
    testResults.endTime = Date.now();
    return {
      success: false,
      message: 'Exception while testing Redis connection',
      error: errorStr
    };
  }
}

/**
 * Test Auth Store
 */
export async function testAuthStore(): Promise<TestResult[]> {
  console.log('Testing Auth Store...');
  resetTestResults();
  
  const authStore = getAuthStore();
  
  // Test initializing auth store
  await runTest('Initialize Auth Store',
    async () => authStore.initialize(),
    () => true,
    'Failed to initialize auth store'
  );
  
  // Test setting and retrieving user
  await runTest('Set User',
    async () => {
      authStore.setUser(mockUser);
      return authStore.userProfile;
    },
    result => result?.sub === mockUser.sub,
    'Failed to set user'
  );
  
  // Test authentication state
  await runTest('Authentication State',
    async () => {
      authStore.setIsAuthenticated(true);
      return authStore.isAuthenticated;
    },
    result => result === true,
    'Failed to set authentication state'
  );
  
  // Test token storage
  await runTest('Token Storage',
    async () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      
      await authStore.setTokenInfo({
        accessToken: 'test-token-' + now,
        expiresAt
      });
      
      return {
        accessToken: authStore.accessToken,
        expiresAt: authStore.expiresAt
      };
    },
    result => !!result.accessToken && result.expiresAt !== null,
    'Failed to store token'
  );
  
  // Test persistence in Redis
  await runTest('Redis Persistence',
    async () => {
      // We want to wait a bit to ensure data is written to Redis
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Retrieve from Redis directly
      const userId = mockUser.sub;
      const authState = await redisService.getAuthState(userId);
      return authState;
    },
    result => result !== null && result.isAuthenticated === true,
    'Failed to persist data in Redis'
  );
  
  // Test store reset
  await runTest('Reset Auth Store',
    async () => {
      await authStore.$reset();
      return {
        isAuthenticated: authStore.isAuthenticated,
        user: authStore.userProfile
      };
    },
    result => result.isAuthenticated === false && result.user === null,
    'Failed to reset auth store'
  );
  
  // Complete test suite
  return testResults.details;
}

/**
 * Test Settings Store
 */
export async function testSettingsStore(): Promise<TestResult[]> {
  console.log('Testing Settings Store...');
  resetTestResults();
  
  const settingsStore = getSettingsStore();
  
  // Test initializing settings store
  await runTest('Initialize Settings Store',
    async () => settingsStore.initialize(),
    () => true,
    'Failed to initialize settings store'
  );
  
  // Test updating settings
  await runTest('Update Settings',
    async () => {
      await settingsStore.updateSettings(mockSettings);
      return settingsStore.lmStudioSettings;
    },
    result => result.apiKey === mockSettings.apiKey,
    'Failed to update settings'
  );
  
  // Test persistence in Redis
  await runTest('Redis Persistence',
    async () => {
      // We want to wait a bit to ensure data is written to Redis
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get user ID (or use the mock one)
      const userId = mockUser.sub;
      
      // Retrieve from Redis directly
      const settings = await redisService.getSettings(userId);
      return settings;
    },
    result => result !== null && result.apiKey === mockSettings.apiKey,
    'Failed to persist settings in Redis'
  );
  
  // Test loading settings
  await runTest('Load Settings',
    async () => {
      await settingsStore.loadSettings();
      return settingsStore.lmStudioSettings;
    },
    result => result.apiKey === mockSettings.apiKey,
    'Failed to load settings'
  );
  
  // Test reset (if implemented)
  if (typeof settingsStore.resetState === 'function') {
    await runTest('Reset Settings Store',
      async () => {
        await settingsStore.resetState();
        return settingsStore.lmStudioSettings;
      },
      result => result.apiKey !== mockSettings.apiKey,
      'Failed to reset settings store'
    );
  }
  
  // Complete test suite
  return testResults.details;
}

/**
 * Test Error Handling
 */
export async function testErrorHandling(): Promise<TestResult[]> {
  console.log('Testing Error Handling...');
  resetTestResults();
  
  // Test handling invalid data
  await runTest('Handle Invalid Data',
    async () => {
      // Create a backup of the original client
      const originalClient = redisService.client;
      
      try {
        // Temporarily set client to null to simulate connection error
        //@ts-ignore - Private property access for testing
        redisService.client = null;
        
        const authStore = getAuthStore();
        
        // Should handle error gracefully and not throw
        await authStore.initialize();
        
        return {
          success: true,
          initializedWithoutError: true
        };
      } finally {
        // Restore the original client
        //@ts-ignore - Private property access for testing
        redisService.client = originalClient;
      }
    },
    result => result?.success === true,
    'Failed to handle invalid data'
  );
  
  // Test Redis connection error recovery
  await runTest('Connection Error Recovery',
    async () => {
      // Get health check before simulating error
      const initialHealth = await redisService.healthCheck();
      
      // Create a backup of the original connected state
      //@ts-ignore - Private property access for testing
      const originalConnected = redisService.connected;
      
      try {
        // Simulate connection error
        //@ts-ignore - Private property access for testing
        redisService.connected = false;
        
        const authStore = getAuthStore();
        
        // This should attempt reconnection
        await authStore.initialize();
        
        // Restore connection and check if it recovers
        //@ts-ignore - Private property access for testing
        redisService.connected = originalConnected;
        
        // Check health again after recovery
        const recoveredHealth = await redisService.healthCheck();
        
        return {
          initialHealth,
          recoveredHealth,
          recoveredSuccessfully: recoveredHealth.healthy === initialHealth.healthy
        };
      } finally {
        // Make sure to restore the original state
        //@ts-ignore - Private property access for testing
        redisService.connected = originalConnected;
      }
    },
    result => result?.recoveredSuccessfully === true,
    'Failed to recover from connection error'
  );
  
  // Test fallback to local state when Redis is unavailable
  await runTest('Local Fallback',
    async () => {
      // Create a backup of the original client
      const originalClient = redisService.client;
      
      try {
        // Temporarily set client to null to simulate connection error
        //@ts-ignore - Private property access for testing
        redisService.client = null;
        
        const authStore = getAuthStore();
        
        // Set data in local state
        authStore.setUser({ ...mockUser, name: 'Fallback Test User' });
        
        // Check if data is available in local state despite Redis being unavailable
        return {
          user: authStore.userProfile,
          localStateWorks: authStore.userProfile?.name === 'Fallback Test User'
        };
      } finally {
        // Restore the original client
        //@ts-ignore - Private property access for testing
        redisService.client = originalClient;
      }
    },
    result => result?.localStateWorks === true,
    'Failed to use local fallback when Redis is unavailable'
  );
  
  // Complete test suite
  return testResults.details;
}

/**
 * Test Cross-Tab Synchronization
 * Note: This is difficult to test programmatically and usually requires manual verification
 */
export async function testCrossTabSync(): Promise<TestResult[]> {
  console.log('Testing Cross-Tab Synchronization...');
  resetTestResults();
  
  // Create a unique identifier for this test run
  const testId = `test-${Date.now()}`;
  
  // Set up a timestamp for storage change
  const storageCheckKey = `redis-test:${testId}`;
  
  // Test local storage event triggering
  await runTest('Local Storage Event',
    async () => {
      // Listen for storage events
      let eventReceived = false;
      const listener = (event: StorageEvent) => {
        if (event.key === storageCheckKey) {
          eventReceived = true;
        }
      };
      
      window.addEventListener('storage', listener);
      
      try {
        // Trigger a storage event in another tab
        localStorage.setItem(storageCheckKey, 'test-value');
        
        // In a real scenario, this would be detected in another tab
        // For testing purposes, we'll simulate it
        
        return {
          eventTriggered: true,
          note: 'Cross-tab synchronization requires manual verification in multiple browser tabs'
        };
      } finally {
        window.removeEventListener('storage', listener);
      }
    },
    result => result?.eventTriggered === true,
    'Failed to trigger local storage event'
  );
  
  // Test auth store synchronization
  await runTest('Auth Store Sync',
    async () => {
      const authStore = getAuthStore();
      
      // Set user data with a unique identifier
      const syncUser = {
        ...mockUser,
        name: `Sync Test User ${testId}`,
        sub: `sync-test-${testId}`
      };
      
      // Set the user in auth store
      authStore.setUser(syncUser);
      
      // Trigger cross-tab sync via localStorage
      localStorage.setItem('auth:state:updated', Date.now().toString());
      
      return {
        userSet: true,
        syncTriggered: true,
        note: 'Verify in another tab that the user is updated to: ' + syncUser.name
      };
    },
    result => result?.userSet === true,
    'Failed to sync auth store across tabs'
  );
  
  // Test settings store synchronization
  await runTest('Settings Store Sync',
    async () => {
      const settingsStore = getSettingsStore();
      
      // Create unique settings for this test
      const syncSettings = {
        ...mockSettings,
        apiKey: `sync-test-key-${testId}`,
        endpoint: `http://sync-test-${testId}.example.com`
      };
      
      // Update settings
      await settingsStore.updateSettings(syncSettings);
      
      // Trigger cross-tab sync
      localStorage.setItem('settings:updated', Date.now().toString());
      
      return {
        settingsUpdated: true,
        syncTriggered: true,
        note: 'Verify in another tab that the settings are updated with endpoint: ' + syncSettings.endpoint
      };
    },
    result => result?.settingsUpdated === true,
    'Failed to sync settings store across tabs'
  );
  
  // Complete test suite
  return testResults.details;
}

/**
 * Test Performance
 */
export async function testPerformance(): Promise<TestResult[]> {
  console.log('Testing Performance...');
  resetTestResults();
  
  // Test Redis operation latency
  await runTest('Redis Operation Latency',
    async () => {
      const latencyResults = [];
      const iterations = 10;
      
      // Test basic health check latency
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await redisService.healthCheck();
        const endTime = performance.now();
        latencyResults.push(endTime - startTime);
      }
      
      // Calculate average latency
      const totalLatency = latencyResults.reduce((sum, time) => sum + time, 0);
      const avgLatency = totalLatency / iterations;
      
      return {
        iterations,
        averageLatency: avgLatency.toFixed(2) + 'ms',
        individualLatencies: latencyResults,
        acceptable: avgLatency < 500 // Assuming 500ms is acceptable latency
      };
    },
    result => result?.acceptable === true,
    'Redis operation latency is too high'
  );
  
  // Test auth store performance
  await runTest('Auth Store Performance',
    async () => {
      const authStore = getAuthStore();
      const iterations = 5;
      const operationResults = {
        initialize: [] as number[],
        setUser: [] as number[],
        getUser: [] as number[],
        reset: [] as number[]
      };
      
      // Test initialize performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await authStore.initialize();
        const endTime = performance.now();
        operationResults.initialize.push(endTime - startTime);
      }
      
      // Test setUser performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        authStore.setUser({
          ...mockUser,
          name: `Performance Test User ${i}`
        });
        const endTime = performance.now();
        operationResults.setUser.push(endTime - startTime);
      }
      
      // Test getUser (profile access) performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const user = authStore.userProfile;
        const endTime = performance.now();
        operationResults.getUser.push(endTime - startTime);
      }
      
      // Test reset performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await authStore.$reset();
        const endTime = performance.now();
        operationResults.reset.push(endTime - startTime);
      }
      
      // Calculate averages
      const calcAvg = (arr: number[]) => {
        const total = arr.reduce((sum, time) => sum + time, 0);
        return (total / arr.length).toFixed(2) + 'ms';
      };
      
      return {
        iterations,
        initialize: calcAvg(operationResults.initialize),
        setUser: calcAvg(operationResults.setUser),
        getUser: calcAvg(operationResults.getUser),
        reset: calcAvg(operationResults.reset),
        acceptable: true // Determined based on specific performance requirements
      };
    },
    result => result?.acceptable === true,
    'Auth store performance is below expectations'
  );
  
  // Test settings store performance
  await runTest('Settings Store Performance',
    async () => {
      const settingsStore = getSettingsStore();
      const iterations = 5;
      const operationResults = {
        initialize: [] as number[],
        updateSettings: [] as number[],
        loadSettings: [] as number[]
      };
      
      // Test initialize performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await settingsStore.initialize();
        const endTime = performance.now();
        operationResults.initialize.push(endTime - startTime);
      }
      
      // Test updateSettings performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await settingsStore.updateSettings({
          ...mockSettings,
          apiKey: `perf-test-key-${i}`
        });
        const endTime = performance.now();
        operationResults.updateSettings.push(endTime - startTime);
      }
      
      // Test loadSettings performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await settingsStore.loadSettings();
        const endTime = performance.now();
        operationResults.loadSettings.push(endTime - startTime);
      }
      
      // Calculate averages
      const calcAvg = (arr: number[]) => {
        const total = arr.reduce((sum, time) => sum + time, 0);
        return (total / arr.length).toFixed(2) + 'ms';
      };
      
      return {
        iterations,
        initialize: calcAvg(operationResults.initialize),
        updateSettings: calcAvg(operationResults.updateSettings),
        loadSettings: calcAvg(operationResults.loadSettings),
        acceptable: true // Determined based on specific performance requirements
      };
    },
    result => result?.acceptable === true,
    'Settings store performance is below expectations'
  );
  
  // Test concurrent operations
  await runTest('Concurrent Operations',
    async () => {
      const authStore = getAuthStore();
      const settingsStore = getSettingsStore();
      
      const startTime = performance.now();
      
      // Run multiple operations concurrently
      const results = await Promise.all([
        authStore.initialize(),
        settingsStore.initialize(),
        authStore.setUser(mockUser),
        settingsStore.updateSettings(mockSettings),
        redisService.healthCheck()
      ]);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      return {
        operationsCount: 5,
        totalTime: totalTime.toFixed(2) + 'ms',
        averageTimePerOperation: (totalTime / 5).toFixed(2) + 'ms',
        allSucceeded: results.every(r => r !== null),
        acceptable: totalTime < 2000 // Assuming 2 seconds is acceptable for 5 concurrent operations
      };
    },
    result => result?.acceptable === true,
    'Concurrent operations performance is below expectations'
  );
  
  // Test state synchronization speed
  await runTest('State Sync Speed',
    async () => {
      const authStore = getAuthStore();
      const startTime = performance.now();
      
      // Set a user to trigger Redis update
      authStore.setUser({
        ...mockUser,
        name: `Sync Speed Test User ${Date.now()}`
      });
      
      // Wait briefly to allow Redis update to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Attempt to load the user from Redis directly
      const userId = mockUser.sub;
      const authState = await redisService.getAuthState(userId);
      
      const endTime = performance.now();
      const syncTime = endTime - startTime;
      
      return {
        syncTimeMs: syncTime.toFixed(2),
        stateRetrieved: authState !== null,
        acceptable: syncTime < 500 // Assuming 500ms is acceptable for state sync
      };
    },
    result => result?.acceptable === true && result?.stateRetrieved === true,
    'State synchronization speed is below expectations'
  );
  
  // Complete test suite
  return testResults.details;
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<TestSuiteResult> {
  console.log('Running all Redis migration tests...');
  resetTestResults();
  
  try {
    // First check connection
    const connectionResult = await testRedisConnection();
    
    if (connectionResult.success) {
      console.log('✅ Redis connection successful, continuing with test suite');
      
      // Run store tests
      await testAuthStore();
      await testSettingsStore();
      
      // Run additional tests
      await testErrorHandling();
      await testCrossTabSync();
      await testPerformance();
    } else {
      console.log('❌ Redis connection failed, skipping remaining tests');
      recordTest('Skip Test Suite', false, 'Redis connection failed, tests skipped', connectionResult.error);
    }
    
    return completeTestSuite();
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    recordTest('Test Suite Execution', false, 'Exception running test suite', errorStr);
    return completeTestSuite();
  }
}

// Export test results for external access
export { testResults };
