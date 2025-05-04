<template>
  <div class="settings-page">
    <h2>Settings</h2>
    <div class="settings-container">
      <div class="settings-section">
        <h3>Application Settings</h3>
        <div class="form-group">
          <label for="apiEndpoint">API Endpoint</label>
          <input type="text" id="apiEndpoint" v-model="settings.apiEndpoint" class="form-control" />
        </div>
        
        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" v-model="settings.theme" class="form-control">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Analytics Settings</h3>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="settings.analyticsEnabled" />
            Enable Analytics
          </label>
        </div>
        
        <div class="form-group">
          <label for="dataRetention">Data Retention (days)</label>
          <input type="number" id="dataRetention" v-model.number="settings.dataRetention" min="1" max="365" class="form-control" />
        </div>
      </div>
      
      <div class="button-row">
        <button @click="saveSettings" class="btn-primary">Save Settings</button>
        <button @click="resetSettings" class="btn-secondary">Reset to Defaults</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  data() {
    return {
      settings: {
        apiEndpoint: 'http://localhost:5000/api',
        theme: 'light',
        analyticsEnabled: true,
        dataRetention: 90
      }
    }
  },
  methods: {
    saveSettings() {
      // Save settings logic would go here
      console.log('Settings saved:', this.settings)
    },
    resetSettings() {
      this.settings = {
        apiEndpoint: 'http://localhost:5000/api',
        theme: 'light',
        analyticsEnabled: true,
        dataRetention: 90
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.settings-page {
  padding: 16px;
  
  .settings-container {
    margin-top: 16px;
    background-color: white;
    border-radius: 4px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .settings-section {
    margin-bottom: 24px;
    
    h3 {
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 8px;
    }
  }
  
  .form-group {
    margin-bottom: 16px;
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 1rem;
    }
  }
  
  .button-row {
    display: flex;
    gap: 16px;
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      
      &.btn-primary {
        background-color: #3B82F6;
        color: white;
      }
      
      &.btn-secondary {
        background-color: #64748B;
        color: white;
      }
    }
  }
}
</style>

