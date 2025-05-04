<template>
  <Dialog
    v-model:visible="dialogVisible"
    :modal="true"
    :closable="false"
    :header="dialogHeader"
    class="auth-dialog"
  >
    <div class="dialog-content">
      <i :class="dialogIcon" />
      <div class="message-container">
        <h3>{{ dialogTitle }}</h3>
        <p>{{ dialogMessage }}</p>
      </div>
      <div class="dialog-actions">
        <Button 
          label="Sign In" 
          icon="pi pi-sign-in" 
          @click="handleLogin" 
          :loading="loading"
          severity="primary"
        />
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="handleCancel" 
          text
          :disabled="loading"
        />
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue';
import { useAuthStore } from '../../store/auth';
import { useAuth0 } from '../../auth.plugin';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

export type AuthDialogMode = 'required' | 'expired';

export default defineComponent({
  name: 'AuthDialog',
  components: {
    Dialog,
    Button
  },
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    mode: {
      type: String as () => AuthDialogMode,
      default: 'required',
      validator: (value: string): boolean => 
        ['required', 'expired'].includes(value)
    },
    returnUrl: {
      type: String,
      default: '/'
    }
  },
  emits: ['update:visible', 'cancel'],
  
  setup(props, { emit }) {
    const authStore = useAuthStore();
    const auth0 = useAuth0();

    const loading = computed(() => authStore.isLoading);

    const dialogVisible = computed({
      get: () => props.visible,
      set: (value) => emit('update:visible', value)
    });

    const dialogHeader = computed(() => 
      props.mode === 'expired' ? 'Session Expired' : 'Authentication Required'
    );

    const dialogTitle = computed(() => 
      props.mode === 'expired' 
        ? 'Your Session Has Expired'
        : 'Please Sign In to Continue'
    );

    const dialogMessage = computed(() => 
      props.mode === 'expired'
        ? 'For your security, your session has expired. Please sign in again to continue.'
        : 'This section requires authentication. Please sign in to access the requested content.'
    );

    const dialogIcon = computed(() => 
      props.mode === 'expired' 
        ? 'pi pi-exclamation-triangle text-yellow-500'
        : 'pi pi-lock text-primary'
    );

    const handleLogin = async () => {
      try {
        await auth0.loginWithRedirect({
          appState: {
            targetUrl: props.returnUrl || window.location.pathname
          }
        });
      } catch (error) {
        console.error('Login failed:', error);
        // Error will be handled by auth store via events
      }
    };

    const handleCancel = () => {
      dialogVisible.value = false;
      emit('cancel');
    };

    // Close dialog if user becomes authenticated
    watch(() => authStore.authenticated, (isAuthenticated) => {
      if (isAuthenticated) {
        dialogVisible.value = false;
      }
    });

    return {
      loading,
      dialogVisible,
      dialogHeader,
      dialogTitle,
      dialogMessage,
      dialogIcon,
      handleLogin,
      handleCancel
    };
  }
});
</script>

<style scoped>
.auth-dialog {
  max-width: 400px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
  text-align: center;
}

.dialog-content i {
  font-size: 2rem;
}

.message-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-container h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 600;
}

.message-container p {
  margin: 0;
  color: var(--text-secondary-color);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
}

:deep(.p-dialog-header) {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-dialog-content) {
  padding: 1.5rem;
}

/* Icon colors */
.text-yellow-500 {
  color: var(--yellow-500);
}

.text-primary {
  color: var(--primary-color);
}
</style>

