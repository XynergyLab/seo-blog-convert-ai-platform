<template>
  <div class="redis-test-page">
    <h1>Redis Migration Test Dashboard</h1>
    
    <div class="status-panel">
      <div class="status-item" :class="{ 'connected': connectionStatus.connected, 'disconnected': !connectionStatus.connected }">
        <div class="status-label">Redis Connection:</div>
        <div class="status-value">{{ connectionStatus.connected ? 'Connected' : 'Disconnected' }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Tests Run:</div>
        <div class="status-value">{{ testResults.total || 0 }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Tests Passed:</div>
        <div class="status-value success">{{ testResults.passed || 0 }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Tests Failed:</div>
        <div class="status-value error">{{ testResults.failed || 0 }}</div>
      </div>
    </div>
    
    <div class="redis-test-controls">
      <h2>Test Controls</h2>
      <div class="control-buttons">
        <Button @click="runAllTests" :disabled="isRunning" class="p-button-primary">
          <i class="pi pi-play"></i> Run All Tests
        </Button>
        <Button @click="testRedisConnection" :disabled="isRunning" class="p-button-secondary">
          <i class="pi pi-server"></i> Test Connection
        </Button>
        <Button @click="testAuthStore" :disabled="isRunning" class="p-button-secondary">
          <i class="pi pi-user"></i> Test Auth Store
        </Button>
        <Button @click="testSettingsStore" :disabled="isRunning" class="p-button-secondary">
          <i class="pi pi-cog"></i> Test Settings Store
        </Button>
        <Button @click="testCrossTabSync" :disabled="isRunning" class="p-button-secondary">
          <i class="pi pi-clone"></i> Test Cross-Tab Sync
        </Button>
        <Button @click="testErrorHandling" :disabled="isRunning" class="p-button-secondary">
          <i class="pi pi-exclamation-triangle"></i> Test Error Handling
        </Button>
        <Button @click="clearResults" :disabled="isRunning" class="p-button-text">
          <i class="pi pi-trash"></i> Clear Results
        </Button>
      </div>
    </div>
    
    <ProgressBar v-if="isRunning" mode="indeterminate" style="height: 6px; margin: 1rem 0;" />
    
    <div v-if="testResults.total > 0" class="redis-test-results">
      <h2>Test Results</h2>
      <DataTable :value="testDetails" 
                 :paginator="testDetails.length > 10" 
                 :rows="10" 
                 sortField="timestamp" 
                 :sortOrder="-1"
                 class="p-datatable-sm">
        <Column field="testName" header="Test" sortable style="width: 25%"></Column>
        <Column field="status" header="Status" sortable style="width: 10%">
          <template #body="slotProps">
            <Tag :severity="slotProps.data.status === 'PASS' ? 'success' : 'danger'" rounded>
              {{ slotProps.data.status }}
            </Tag>
          </template>
        </Column>
        <Column field="timestamp" header="Time" sortable style="width: 15%">
          <template #body="slotProps">
            {{ new Date(slotProps.data.timestamp).toLocaleTimeString() }}
          </template>
        </Column>
        <Column field="duration" header="Duration" style="width: 10%">
          <template #body="slotProps">
            {{ slotProps.data.duration }}ms
          </template>
        </Column>
        <Column field="message" header="Details" style="width: 40%">
          <template #body="slotProps">
            <div v-if="slotProps.data.error" class="error-message">
              {{ slotProps.data.error }}
            </div>
            <div v-else>{{ slotProps.data.message || '-' }}</div>
          </template>
        </Column>
      </DataTable>
    </div>
    
    <div v-if="logs.length > 0" class="redis-test-logs">
      <h2>Test Logs</h2>
      <div class="log-controls">
        <Button @click="clearLogs" class="p-button-text p-button-sm">
          <i class="pi pi-trash"></i> Clear Logs
        </Button>
        <div class="log-filter">
          <label>
            <input type="checkbox" v-model="showInfo" /> Info
          </label>
          <label>
            <input type="checkbox" v-model="showError" /> Errors
          </label>
          <label>
            <input type="checkbox" v-model="showDebug" /> Debug
          </label>
        </div>
      </div>
      <div class="log-container">
        <div v-for="(log, index) in filteredLogs" :key="index" 
             :class="['log-entry', log.level]">
          <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
    
    <div class="cross-tab-test" v-if="showCrossTabInfo">
      <h2>Cross-Tab Synchronization Test</h2>
      <p>To test cross-tab synchronization:</p>
      <ol>
        <li>Open this application in two browser tabs</li>
        <li>Run tests in the first tab</li>
        <li>Observe state changes synchronized to the second tab</li>
      </ol>
      <Button @click="generateCrossTabEvent" class="p-button-secondary">
        Generate Cross-Tab Event
      </Button>
      <div v-if="crossTabResult" class="cross-tab-result">
        <Message severity="info">
          <div>Cross-tab event generated at {{ new Date().toLocaleTimeString() }}</div>
          <div>Check other tabs to verify synchronization</div>
        </Message>
      </div>
    </div>
    
    <Dialog v-model:visible="showCrossTabDialog" header="Cross-Tab Sync Test" :style="{ width: '500px' }">
      <div class="cross-tab-test">
        <p>To test cross-tab synchronization:</p>
        <ol>
          <li>Open another browser tab at <a href="/dev/redis-test" target="_blank">/dev/redis-test</a></li>
          <li>Click "Generate Event" below</li>
          <li>Switch to the other tab and check if the state was updated</li>
        </ol>
        
        <div class="cross-tab-buttons">
          <Button @click="generateCrossTabEvent" class="p-button-primary">
            Generate Event
          </Button>
          <Button @click="closeCrossTabDialog" class="p-button-text">
            Close
          </Button>
        </div>
        
        <div v-if="crossTabEventGenerated" class="cross-tab-event-info">
          <Message severity="info">
            Event generated at {{ new Date().toLocaleTimeString() }}
            <div>Data: {{ crossTabEventData }}</div>
          </Message>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import { useAuthStore, getAuthStore } from '../store';
import { useSettingsStore, getSettingsStore } from '../store';
import * as RedisTests from '../utils/redis-tests';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  timestamp: number;
  duration: number;
  message?: string;
  error?: string;
}

interface LogEntry {
  level: 'info' | 'error' | 'debug';
  message: string;
  timestamp: number;
}

export default defineComponent({
  name: 'RedisTestPage',
  components: {
    DataTable,
    Column,
    Button,
    ProgressBar,
    Dialog,
    Tag,
    Message
  },
  setup() {
    // Test state
    const isRunning = ref(false);
    const testDetails = ref<TestResult[]>([]);
    const testResults = reactive({
      total: 0,
      passed: 0,
      failed: 0
    });
    
    // Log state
    const logs = ref<LogEntry[]>([]);
    const showInfo = ref(true);
    const showError = ref(true);
    const showDebug = ref(false);
    
    // Connection state
    const connectionStatus = reactive({
      connected: false,
      lastChecked: 0
    });
    
    // Cross-tab test state
    const showCrossTabDialog = ref(false);
    const showCrossTabInfo = ref(false);
    const crossTabResult = ref(false);
    const crossTabEventGenerated = ref(false);
    const crossTabEventData = ref<any>(null);
    
    // Custom console to capture log messages
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Filtered logs based on user selection
    const filteredLogs = computed(() => {
      return logs.value.filter(log => {
        if (log.level === 'info' && !showInfo.value) return false;
        if (log.level === 'error' && !showError.value) return false;
        if (log.level === 'debug' && !showDebug.value) return false;
        return true;
      });
    });
    
    // Log a message to the test log
    const logMessage = (level: 'info' | 'error' | 'debug', message: string) => {
      logs.value.push({
        level,
        message,
        timestamp: Date.now()
      });
    };
    
    // Add a test result
    const addTestResult = (result: TestResult) => {
      testDetails.value.push(result);
      testResults.total++;
      
      if (result.status === 'PASS') {
        testResults.passed++;
      } else {
        testResults.failed++;
        logMessage('error', `Test failed: ${result.testName} - ${result.error || 'No error details'}`);
      }
    };
    
    // Clear test results
    const clearResults = () => {
      testDetails.value = [];
      testResults.total = 0;
      testResults.passed = 0;
      testResults.failed = 0;
    };
    
    // Clear logs
    const clearLogs = () => {
      logs.value = [];
    };
    
    // Override console methods to capture logs
    const setupConsoleCapture = () => {
      console.log = (...args) => {
        originalConsoleLog(...args);
        logMessage('info', args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' '));
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        logMessage('error', args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' '));
      };
    };
    
    // Restore original console methods
    const restoreConsole = () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
    
    // Run all tests
    const runAllTests = async () => {
      try {
        isRunning.value = true;
        clearResults();
        setupConsoleCapture();
        logMessage('info', 'Starting all tests...');
        
        // First test connection
        await testRedisConnection();
        
        // Run store tests
        await testAuthStore();
        await testSettingsStore();
        
        // Run advanced tests
        await testErrorHandling();
        await testCrossTabSync();
        
        logMessage('info', 'All tests completed');
      } catch (error) {
        logMessage('error', `Error running tests: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        restoreConsole();
        isRunning.value = false;
      }
    };
    
    // Test Redis connection
    const testRedisConnection = async () => {
      if (isRunning.value) return;
      
      try {
        isRunning.value = true;
        setupConsoleCapture();
        logMessage('info', 'Testing Redis connection...');
        
        const startTime = Date.now();
        const result = await RedisTests.testRedisConnection();
        const duration = Date.now() - startTime;
        
        connectionStatus.connected = result.success;
        connectionStatus.lastChecked = Date.now();
        
        addTestResult({
          testName: 'Redis Connection',
          status: result.success ? 'PASS' : 'FAIL',
          timestamp: Date.now(),
          duration,
          message: result.message,
          error: result.error
        });
        
        if (result.success) {
          logMessage('info', 'Redis connection successful');
        } else {
          logMessage('error', `Redis connection failed: ${result.error}`);
        }
      } catch (error) {
        addTestResult({
          testName: 'Redis Connection',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        logMessage('error', `Exception testing Redis connection: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        restoreConsole();
        isRunning.value = false;
      }
    };
    
    // Test Auth Store
    const testAuthStore = async () => {
      if (isRunning.value && !runAllTests) return;
      
      try {
        if (!runAllTests) {
          isRunning.value = true;
          setupConsoleCapture();
        }
        logMessage('info', 'Testing Auth store...');
        
        const startTime = Date.now();
        const results = await RedisTests.testAuthStore();
        const duration = Date.now() - startTime;
        
        // Process test results
        for (const result of results) {
          addTestResult({
            testName: `Auth Store: ${result.name}`,
            status: result.success ? 'PASS' : 'FAIL',
            timestamp: Date.now(),
            duration: result.duration || 0,
            message: result.message,
            error: result.error
          });
        }
        
        const failedTests = results.filter(r => !r.success).length;
        if (failedTests === 0) {
          logMessage('info', `Auth store tests completed successfully (${results.length} tests)`);
        } else {
          logMessage('error', `Auth store tests completed with ${failedTests} failures`);
        }
      } catch (error) {
        addTestResult({
          testName: 'Auth Store',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        logMessage('error', `Exception testing Auth store: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (!runAllTests) {
          restoreConsole();
          isRunning.value = false;
        }
      }
    };
    
    // Test Settings Store
    const testSettingsStore = async () => {
      if (isRunning.value && !runAllTests) return;
      
      try {
        if (!runAllTests) {
          isRunning.value = true;
          setupConsoleCapture();
        }
        logMessage('info', 'Testing Settings store...');
        
        const startTime = Date.now();
        const results = await RedisTests.testSettingsStore();
        const duration = Date.now() - startTime;
        
        // Process test results
        for (const result of results) {
          addTestResult({
            testName: `Settings Store: ${result.name}`,
            status: result.success ? 'PASS' : 'FAIL',
            timestamp: Date.now(),
            duration: result.duration || 0,
            message: result.message,
            error: result.error
          });
        }
        
        const failedTests = results.filter(r => !r.success).length;
        if (failedTests === 0) {
          logMessage('info', `Settings store tests completed successfully (${results.length} tests)`);
        } else {
          logMessage('error', `Settings store tests completed with ${failedTests} failures`);
        }
      } catch (error) {
        addTestResult({
          testName: 'Settings Store',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        logMessage('error', `Exception testing Settings store: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (!runAllTests) {
          restoreConsole();
          isRunning.value = false;
        }
      }
    };
    
    // Test Error Handling
    const testErrorHandling = async () => {
      if (isRunning.value && !runAllTests) return;
      
      try {
        if (!runAllTests) {
          isRunning.value = true;
          setupConsoleCapture();
        }
        logMessage('info', 'Testing error handling...');
        
        const startTime = Date.now();
        const results = await RedisTests.testErrorHandling();
        const duration = Date.now() - startTime;
        
        // Process test results
        for (const result of results) {
          addTestResult({
            testName: `Error Handling: ${result.name}`,
            status: result.success ? 'PASS' : 'FAIL',
            timestamp: Date.now(),
            duration: result.duration || 0,
            message: result.message,
            error: result.error
          });
        }
        
        const failedTests = results.filter(r => !r.success).length;
        if (failedTests === 0) {
          logMessage('info', `Error handling tests completed successfully (${results.length} tests)`);
        } else {
          logMessage('error', `Error handling tests completed with ${failedTests} failures`);
        }
      } catch (error) {
        addTestResult({
          testName: 'Error Handling',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        logMessage('error', `Exception testing error handling: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (!runAllTests) {
          restoreConsole();
          isRunning.value = false;
        }
      }
    };
    
    // Test Cross-Tab Sync
    const testCrossTabSync = async () => {
      if (isRunning.value && !runAllTests) return;
      
      try {
        if (!runAllTests) {
          isRunning.value = true;
          setupConsoleCapture();
        }
        logMessage('info', 'Testing cross-tab synchronization...');
        
        showCrossTabInfo.value = true;
        
        const startTime = Date.now();
        const results = await RedisTests.testCrossTabSync();
        const duration = Date.now() - startTime;
        
        // Process test results
        for (const result of results) {
          addTestResult({
            testName: `Cross-Tab Sync: ${result.name}`,
            status: result.success ? 'PASS' : 'FAIL',
            timestamp: Date.now(),
            duration: result.duration || 0,
            message: result.message,
            error: result.error
          });
        }
        
        const failedTests = results.filter(r => !r.success).length;
        if (failedTests === 0) {
          logMessage('info', `Cross-tab sync tests completed successfully (${results.length} tests)`);
        } else {
          logMessage('error', `Cross-tab sync tests completed with ${failedTests} failures`);
        }
        
        showCrossTabDialog.value = true;
      } catch (error) {
        addTestResult({
          testName: 'Cross-Tab Sync',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
        logMessage('error', `Exception testing cross-tab sync: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (!runAllTests) {
          restoreConsole();
          isRunning.value = false;
        }
      }
    };
    
    // Generate event for cross-tab testing
    const generateCrossTabEvent = async () => {
      try {
        crossTabEventGenerated.value = true;
        const authStore = getAuthStore();
        const userData = {
          sub: 'test-user-' + Date.now(),
          name: 'Cross Tab Test User',
          email: 'crossTabTest@example.com',
          email_verified: true
        };
        
        await authStore.setUser(userData);
        crossTabEventData.value = userData;
        
        // Show confirmation
        crossTabResult.value = true;
        setTimeout(() => {
          crossTabResult.value = false;
          crossTabEventGenerated.value = false;
        }, 5000);
        
      } catch (error) {
        logMessage('error', `Cross-tab test error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Close cross-tab dialog
    const closeCrossTabDialog = () => {
      showCrossTabDialog.value = false;
    };
    
    // Load scripts on mount
    onMounted(() => {
      // Check Redis connection
      testRedisConnection();
    });
    
    // Cleanup on unmount
    onUnmounted(() => {
      restoreConsole();
    });
    
    return {
      // State
      isRunning,
      testDetails,
      testResults,
      logs,
      showInfo,
      showError,
      showDebug,
      connectionStatus,
      showCrossTabDialog,
      showCrossTabInfo,
      crossTabResult,
      crossTabEventGenerated,
      crossTabEventData,
      filteredLogs,
      
      // Methods
      logMessage,
      addTestResult,
      clearResults,
      clearLogs,
      runAllTests,
      testRedisConnection,
      testAuthStore,
      testSettingsStore,
      testErrorHandling,
      testCrossTabSync,
      generateCrossTabEvent,
      closeCrossTabDialog
    };
  }
});
</script>

<style scoped>
.redis-test-page {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 1rem;
}

h1 {
  margin-bottom: 2rem;
  color: #2196f3;
}

.status-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}

.status-item {
  flex: 1;
  min-width: 150px;
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-item.connected .status-value {
  color: #4caf50;
  font-weight: bold;
}

.status-item.disconnected .status-value {
  color: #f44336;
  font-weight: bold;
}

.status-label {
  color: #666;
  margin-bottom: 0.5rem;
}

.status-value {
  font-size: 1.25rem;
}

.status-value.success {
  color: #4caf50;
}

.status-value.error {
  color: #f44336;
}

.redis-test-controls {
  margin-bottom: 2rem;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.redis-test-results {
  margin-top: 2rem;
}

.error-message {
  color: #f44336;
}

.redis-test-logs {
  margin-top: 2rem;
}

.log-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.log-filter {
  display: flex;
  gap: 1rem;
}

.log-container {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  font-family: monospace;
  padding: 0.25rem 0;
}

.log-entry.info {
  color: #2196f3;
}

.log-entry.error {
  color: #f44336;
}

.log-entry.debug {
  color: #9e9e9e;
}

.log-time {
  color: #666;
  margin-right: 0.5rem;
}

.log-level {
  font-weight: bold;
  margin-right: 0.5rem;
}

.cross-tab-test {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 4px;
}

.cross-tab-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.cross-tab-event-info {
  margin-top: 1rem;
}

.cross-tab-result {
  margin-top: 1rem;
}
</style>
