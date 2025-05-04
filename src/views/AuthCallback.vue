<template>
  <div class="auth-callback">
    <div class="callback-container">
      <ProgressSpinner v-if="loading" />
      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>
      <div class="callback-message">
        <h2>{{ message }}</h2>
        <p v-if="!error && !loading">
          You will be redirected to your requested page momentarily...
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { useAuth0 } from '../auth.plugin';
import { AUTH_EVENTS } from '../types/auth.types';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';

export default defineComponent({
  name: 'AuthCallback',
  components: {
    ProgressSpinner,
    Message
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const auth0 = useAuth0();
    
    const loading = ref(true);
    const error = ref<string | null>(null);
    const message = ref('Processing your login...');

    onMounted(async () => {
      try {
        // Handle the authentication callback
        await auth0.handleCallback();
        
        // Update message
        message.value = 'Login successful!';
        
        // Get redirect path from store or default to home
        const redirectPath = authStore.getRedirectPath || '/';
        
        // Clear the redirect path
        authStore.clearRedirectPath();
        
        // Redirect to the saved path after a brief delay to show success
        setTimeout(() => {
          router.replace(redirectPath);
        }, 1000);
        
      } catch (err) {
        // Handle authentication error
        console.error('Authentication callback error:', err);
        message.value = 'Authentication Failed';
        error.value = 'There was a problem processing your login. Please try again.';
        
        // Redirect to home after error
        setTimeout(() => {
          router.replace('/');
        }, 3000);
      } finally {
        loading.value = false;
      }
    });

    // Listen for auth events
    window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, () => {
      message.value = 'Login successful!';
      error.value = null;
    });
    
    window.addEventListener(AUTH_EVENTS.LOGIN_ERROR, (event) => {
      const customEvent = event as CustomEvent;
      message.value = 'Authentication Failed';
      error.value = customEvent.detail?.message || 'Login failed. Please try again.';
    });

    return {
      loading,
      error,
      message
    };
  }
});
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  text-align: center;
}

.callback-container {
  max-width: 500px;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.callback-message {
  margin-top: 1.5rem;
}

h2 {
  margin-bottom: 1rem;
  color: var(--primary-color, #4318FF);
}

.p-progress-spinner {
  margin: 0 auto;
  width: 50px;
  height: 50px;
}
</style>

