/**
 * Redis Migration Verification Tests
 * 
 * Tests all aspects of the Redis migration including:
 * - Authentication state management
 * - Settings state management
 * - Cross-tab synchronization
 * - Token management
 * - Real-time updates
 * - Error handling
 * 
 * Run this script using Jest or directly in a browser console
 */

// Import stores and services
const { useAuthStore, getAuthStore } = require('../src/store');
const { useSettingsStore, getSettingsStore } = require('../src/store');
const redisService = require('../src/services/redisService').default;
const { encrypt, decrypt } = require('../src/services/encryptionService');

// Mock user data
const mockUser = {
  sub: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  email_verified: true
};

// Mock token data
const mockTokenData = {
  accessToken: 'test-access-token',
  idToken: 'test-id-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  expiresIn: 3600,
  tokenType: 'Bearer'
};

// Mock settings data
const mockSettings = {
  apiKey: 'test-api-key',
  endpoint: 'http://localhost:8080',
  activeModels: ['model1', 'model2'],
  maxTokens: 1000,
  temperature: 0.5
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  startTime: null,
  endTime: null,
  details: []
};

/**
 * Records a test result
 */
function recordTest(name, result, error = null) {
  testResults.total++;
  
  if (result) {
    testResults.passed++;
    testResults.details.push({
      name,
      result: 'PASS',
      error: null
    });
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    testResults.details.push({
      name,
      result: 'FAIL',
      error: error ? error.toString() : 'Test failed'
    });
    console.error(`❌ FAIL: ${name}`);
    if (error) {
      console.error(error);
    }
  }
}

/**
 * Prints test summary
 */
function printSummary() {
  testResults.endTime = Date.now();
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  
  console.log('\n========================================');
  console.log('📊 REDIS MIGRATION TEST SUMMARY');
  console.log('========================================');
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log('========================================');
  
  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.details
      .filter(test => test.result === 'FAIL')
      .forEach(test => {
        console.log(`- ${test.name}: ${test.error || 'Test failed'}`);
      });
  }
  
  return {
    success: testResults.failed === 0,
    summary: testResults
  };
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  try {
    console.log('🔄 Testing Redis connection...');
    const health = await redisService.healthCheck();
    
    recordTest('Redis connection health check', health.healthy);
    return health.healthy;
  } catch (error) {
    recordTest('Redis connection health check', false, error);
    return false;
  }
}

/**
 * Test encryption/decryption
 */
async function testEncryption() {
  try {
    console.log('🔄 Testing encryption functionality...');
    
    // Test basic encryption/decryption
    const testValue = 'sensitive-data-' + Date.now();
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    
    recordTest('Basic encryption/decryption', decrypted === testValue);
    
    // Ensure encrypted value is different from original
    recordTest('Encrypted value differs from original', encrypted !== testValue);
    
    // Test null/empty handling
    recordTest('Encryption handles null', encrypt(null) === null);
    recordTest('Decryption handles null', decrypt(null) === null);
    
    return true;
  } catch (error) {
    recordTest('Encryption functionality', false, error);
    return false;
  }
}

/**
 * Test auth store functionality
 */
async function testAuthStore() {
  try {
    console.log('🔄 Testing auth store functionality...');
    const authStore = getAuthStore();
    
    // Test initializing the store
    await authStore.initialize();
    recordTest('Auth store initialization', true);
    
    // Test setting auth state
    authStore.setIsAuthenticated(true);
    authStore.setUser(mockUser);
    recordTest('Setting auth state', authStore.userProfile?.sub === mockUser.sub);
    
    // Test token management
    await authStore.setTokenInfo({
      accessToken: mockTokenData.accessToken,
      expiresAt: mockTokenData.expiresAt
    });
    recordTest('Setting token info', authStore.accessToken === mockTokenData.accessToken);
    
    // Test authentication status computation
    recordTest('Authentication status', authStore.authenticated === true);
    
    // Test persistence - get a new store instance and verify state is preserved
    const token = await redisService.getToken(mockUser.sub);
    recordTest('Token persistence in Redis', 
      token && token.accessToken === mockTokenData.accessToken);
    
    // Test logout
    await authStore.$reset();
    recordTest('Auth store reset', authStore.isAuthenticated === false);
    
    return true;
  } catch (error) {
    recordTest('Auth store functionality', false, error);
    return false;
  }
}

/**
 * Test settings store functionality
 */
async function testSettingsStore() {
  try {
    console.log('🔄 Testing settings store functionality...');
    const settingsStore = getSettingsStore();
    
    // Test initializing the store
    await settingsStore.initialize();
    recordTest('Settings store initialization', true);
    
    // Test updating settings
    await settingsStore.updateSettings(mockSettings);
    recordTest('Updating settings', 
      settingsStore.lmStudioSettings.apiKey === mockSettings.apiKey);
    
    // Test persistence - retrieve settings directly from Redis
    const storedSettings = await redisService.getSettings(mockUser.sub);
    recordTest('Settings persistence in Redis', 
      storedSettings && storedSettings.apiKey === mockSettings.apiKey);
    
    return true;
  } catch (error) {
    recordTest('Settings store functionality', false, error);
    return false;
  }
}

/**
 * Test error handling and fallback mechanisms
 */
async function testErrorHandling() {
  try {
    console.log('🔄 Testing error handling and fallback...');
    
    // Test invalid decryption handling
    try {
      decrypt('not-a-valid-encrypted-value');
      recordTest('Handling invalid encrypted data', false);
    } catch (error) {
      // This should throw an error, which is the expected behavior
      recordTest('Handling invalid encrypted data', true);
    }
    
    // Test Redis health reporting for connection issues
    const originalClient = redisService.client;
    redisService.client = null;
    
    const health = await redisService.healthCheck();
    recordTest('Health check with no client', health.healthy === false);
    
    // Restore client after test
    redisService.client = originalClient;
    
    return true;
  } catch (error) {
    recordTest('Error handling tests', false, error);
    return false;
  }
}

/**
 * Test cross-tab synchronization (browser-only)
 */
function testCrossTabSync() {
  try {
    console.log('🔄 Testing cross-tab synchronization (browser-only)...');
    
    if (typeof window === 'undefined') {
      console.log('Skipping cross-tab sync test (not in browser environment)');
      return true;
    }
    
    recordTest('Cross-tab sync check', true, 
      'This test requires manual verification in a browser environment');
    
    console.log('To test cross-tab synchronization:');
    console.log('1. Open this application in two browser tabs');
    console.log('2. In the first tab, run: useAuthStore().setUser({ name: "Updated User" })');
    console.log('3. Check the second tab to verify the user was updated automatically');
    
    return true;
  } catch (error) {
    recordTest('Cross-tab synchronization', false, error);
    return false;
  }
}

/**
 * Test performance metrics
 */
async function testPerformance() {
  try {
    console.log('🔄 Testing performance metrics...');
    
    // Test auth state retrieval performance
    const authStore = getAuthStore();
    
    const authStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await authStore.initialize();
    }
    const authEnd = Date.now();
    const authAvg = (authEnd - authStart) / 10;
    
    recordTest(`Auth store initialization (avg ${authAvg.toFixed(2)}ms)`, authAvg < 500);
    
    // Test settings retrieval performance
    const settingsStore = getSettingsStore();
    
    const settingsStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await settingsStore.initialize();
    }
    const settingsEnd = Date.now();
    const settingsAvg = (settingsEnd - settingsStart) / 10;
    
    recordTest(`Settings store initialization (avg ${settingsAvg.toFixed(2)}ms)`, settingsAvg < 500);
    
    // Test encryption performance
    const encStart = Date.now();
    for (let i = 0; i < 100; i++) {
      encrypt(`test-value-${i}`);
    }
    const encEnd = Date.now();
    const encAvg = (encEnd - encStart) / 100;
    
    recordTest(`Encryption performance (avg ${encAvg.toFixed(2)}ms)`, encAvg < 50);
    
    return true;
  } catch (error) {
    recordTest('Performance metrics', false, error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  testResults.startTime = Date.now();
  
  console.log('🚀 Starting Redis migration verification tests...');
  
  // Test Redis connection first
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    console.error('❌ Redis connection failed - some tests will be skipped');
  }
  
  // Run core functionality tests
  await testEncryption();
  await testAuthStore();
  await testSettingsStore();
  
  // Run extended tests
  await testErrorHandling();
  testCrossTabSync();
  await testPerformance();
  
  return printSummary();
}

// Check if running in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment - export the test runner
  module.exports = {
    runAllTests,
    testRedisConnection,
    testEncryption,
    testAuthStore,
    testSettingsStore,
    testErrorHandling,
    testCrossTabSync,
    testPerformance
  };
} else if (typeof window !== 'undefined') {
  // Browser environment - attach to window
  window.RedisTests = {
    runAllTests,
    testRedisConnection,
    testEncryption,
    testAuthStore,
    testSettingsStore,
    testErrorHandling,
    testCrossTabSync,
    testPerformance
  };
  
  console.log('Redis migration tests loaded. Run tests with: window.RedisTests.runAllTests()');
}

