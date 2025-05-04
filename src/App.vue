<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <h1>LM Studio Agents</h1>
      </div>
      <nav class="main-nav">
        <router-link to="/blog">Blog</router-link>
        <router-link to="/keywords">Keywords</router-link>
        <router-link to="/social">Social</router-link>
        <router-link to="/analytics">Analytics</router-link>
        <router-link to="/settings">Settings</router-link>
      </nav>
    </header>
    
    <!-- Global Notifications -->
    <div class="notifications-container">
      <!-- Notifications component will go here when created -->
    </div>
    
    <!-- Main Content Area -->
    <main class="app-main">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2025 LM Studio Agents</p>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App'
})
</script>

<style lang="scss">
// Variables are globally available from vue.config.js
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: $font-family;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-unit * 2;
  background-color: $primary-color;
  color: white;
  
  .logo h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .main-nav {
    display: flex;
    gap: $spacing-unit * 2;
    
    a {
      color: white;
      text-decoration: none;
      padding: $spacing-unit;
      border-radius: $border-radius;
      
      &.router-link-active {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.notifications-container {
  padding: $spacing-unit;
  background-color: lighten($primary-color, 45%);
}

.app-main {
  flex: 1;
  padding: $spacing-unit * 3;
}

.app-footer {
  padding: $spacing-unit * 2;
  background-color: $secondary-color;
  color: white;
  text-align: center;
}
</style>
