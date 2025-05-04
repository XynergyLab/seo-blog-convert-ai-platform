<template>
  <Button
    :label="buttonLabel"
    :icon="buttonIcon"
    :loading="loading"
    :disabled="loading"
    @click="handleLogin"
    severity="primary"
    class="login-button"
  >
    <template #loading>
      <i class="pi pi-spin pi-spinner" />
    </template>
  </Button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useAuthStore } from '../../store/auth';
import { useAuth0 } from '../../auth.plugin';
import Button from 'primevue/button';

export default defineComponent({
  name: 'LoginButton',
  components: { Button },
  
  setup() {
    const authStore = useAuthStore();
    const auth0 = useAuth0();

    const loading = computed(() => authStore.isLoading);
    
    const buttonLabel = computed(() => 
      loading.value ? 'Signing in...' : 'Sign In'
    );
    
    const buttonIcon = computed(() => 
      loading.value ? undefined : 'pi pi-sign-in'
    );

    const handleLogin = async () => {
      if (loading.value) return;
      
      try {
        await auth0.loginWithRedirect({
          appState: {
            targetUrl: window.location.pathname
          }
        });
      } catch (error) {
        console.error('Login failed:', error);
        // Error will be handled by auth store via events
      }
    };

    return {
      loading,
      buttonLabel,
      buttonIcon,
      handleLogin
    };
  }
});
</script>

<style scoped>
.login-button {
  min-width: 100px;
}

.login-button :deep(.p-button-label) {
  font-weight: 500;
}

/* Ensure icon alignment */
.login-button :deep(.p-button-icon) {
  font-size: 1rem;
}

/* Loading state styling */
.login-button :deep(.p-button-loading-icon) {
  font-size: 1rem;
  margin-right: 0.5rem;
}
</style>

