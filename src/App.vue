<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <img src="@/assets/logo.png" alt="LM Studio Agents" class="app-logo" />
        </div>

        <div class="auth-controls">
          <AuthStatus v-if="authenticated" />
          <template v-if="!authenticated">
            <LoginButton />
          </template>
          <template v-else>
            <UserMenu />
          </template>
        </div>

        <Navigation class="header-nav" />
      </div>
    </header>

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <AuthDialog
      v-model:visible="showAuthDialog"
      :mode="authDialogMode"
      :returnUrl="authReturnUrl"
      @cancel="handleAuthCancel"
    />

    <Toast position="top-right" />

    <footer class="app-footer">
      <div class="footer-content">
        <p>&copy; {{ new Date().getFullYear() }} LM Studio Agents</p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './store/auth';
import { AUTH_EVENTS } from './types/auth.types';
import { AuthStatus, UserMenu, LoginButton, AuthDialog } from './components/auth';
import Navigation from './components/Navigation.vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

export default defineComponent({
  name: 'App',
  components: {
    AuthStatus,
    UserMenu,
    LoginButton,
    AuthDialog,
    Navigation,
    Toast
  },

  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const toast = useToast();

    // Auth dialog state
    const showAuthDialog = ref(false);
    const authDialogMode = ref<'required' | 'expired'>('required');
    const authReturnUrl = ref('/');

    // Computed properties
    const authenticated = computed(() => authStore.authenticated);

    // Auth event handlers
    const handleLoginSuccess = () => {
      toast.add({
        severity: 'success',
        summary: 'Welcome Back',
        detail: 'You have successfully signed in',
        life: 3000
      });
    };

    const handleLoginError = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: customEvent.detail?.message || 'Failed to sign in',
        life: 5000
      });
    };

    const handleLogout = () => {
      toast.add({
        severity: 'info',
        summary: 'Signed Out',
        detail: 'You have been signed out successfully',
        life: 3000
      });
    };

    const handleTokenExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
      
      toast.add({
        severity: 'warn',
        summary: 'Session Expired',
        detail: 'Your session has expired. Please sign in again.',
        life: 5000
      });
    };

    const handleSessionExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
    };

    // Handle auth dialog cancel
    const handleAuthCancel = () => {
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push('/');
      }
    };

    // Setup and cleanup event listeners
    onMounted(() => {
      window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.addEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.addEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    onUnmounted(() => {
      window.removeEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.removeEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.removeEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.removeEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    return {
      authenticated,
      showAuthDialog,
      authDialogMode,
      authReturnUrl,
      handleAuthCancel
    };
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  padding: 0;
  height: 64px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-logo {
  height: 40px;
  margin-right: 2rem;
}

.auth-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 2rem;
}

.header-nav {
  margin-left: auto;
}

.app-content {
  flex: 1;
  padding: 2rem;
  background-color: var(--surface-ground);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background-color: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  padding: 1rem 0;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
  color: var(--text-color-secondary);
}

/* Toast customization */
:deep(.p-toast) {
  font-size: 0.875rem;
}

:deep(.p-toast-message) {
  border-radius: 8px;
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <img src="@/assets/logo.png" alt="LM Studio Agents" class="app-logo" />
        </div>

        <div class="auth-controls">
          <AuthStatus v-if="authenticated" />
          <template v-if="!authenticated">
            <LoginButton />
          </template>
          <template v-else>
            <UserMenu />
          </template>
        </div>

        <nav class="header-nav">
          <router-link to="/blog" class="p-button p-button-text">
            <i class="pi pi-file-edit"></i>
            <span>Blog</span>
          </router-link>
          <router-link to="/keywords" class="p-button p-button-text">
            <i class="pi pi-tags"></i>
            <span>Keywords</span>
          </router-link>
          <router-link to="/social" class="p-button p-button-text">
            <i class="pi pi-share-alt"></i>
            <span>Social</span>
          </router-link>
          <router-link to="/analytics" class="p-button p-button-text">
            <i class="pi pi-chart-line"></i>
            <span>Analytics</span>
          </router-link>
          <router-link to="/settings" class="p-button p-button-text">
            <i class="pi pi-cog"></i>
            <span>Settings</span>
          </router-link>
        </nav>
      </div>
    </header>

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <AuthDialog
      v-model:visible="showAuthDialog"
      :mode="authDialogMode"
      :returnUrl="authReturnUrl"
      @cancel="handleAuthCancel"
    />

    <Toast position="top-right" />

    <footer class="app-footer">
      <div class="footer-content">
        <p>&copy; {{ new Date().getFullYear() }} LM Studio Agents</p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './store/auth';
import { AUTH_EVENTS } from './types/auth.types';
import { AuthStatus, UserMenu, LoginButton, AuthDialog } from './components/auth';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

export default defineComponent({
  name: 'App',
  components: {
    AuthStatus,
    UserMenu,
    LoginButton,
    AuthDialog,
    Toast
  },

  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const toast = useToast();

    // Auth dialog state
    const showAuthDialog = ref(false);
    const authDialogMode = ref<'required' | 'expired'>('required');
    const authReturnUrl = ref('/');

    // Computed properties
    const authenticated = computed(() => authStore.authenticated);

    // Auth event handlers
    const handleLoginSuccess = () => {
      toast.add({
        severity: 'success',
        summary: 'Welcome Back',
        detail: 'You have successfully signed in',
        life: 3000
      });
    };

    const handleLoginError = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: customEvent.detail?.message || 'Failed to sign in',
        life: 5000
      });
    };

    const handleLogout = () => {
      toast.add({
        severity: 'info',
        summary: 'Signed Out',
        detail: 'You have been signed out successfully',
        life: 3000
      });
    };

    const handleTokenExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
      
      toast.add({
        severity: 'warn',
        summary: 'Session Expired',
        detail: 'Your session has expired. Please sign in again.',
        life: 5000
      });
    };

    const handleSessionExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
    };

    // Handle auth dialog cancel
    const handleAuthCancel = () => {
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push('/');
      }
    };

    // Setup and cleanup event listeners
    onMounted(() => {
      window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.addEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.addEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    onUnmounted(() => {
      window.removeEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.removeEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.removeEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.removeEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    return {
      authenticated,
      showAuthDialog,
      authDialogMode,
      authReturnUrl,
      handleAuthCancel
    };
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  padding: 0;
  height: 64px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-logo {
  height: 40px;
  margin-right: 2rem;
}

.auth-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 2rem;
}

.header-nav {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.header-nav .p-button-text {
  color: var(--text-color);
  padding: 0.5rem 1rem;
}

.header-nav .p-button-text:hover {
  background-color: var(--surface-hover);
}

.header-nav .p-button-text.router-link-active {
  color: var(--primary-color);
  background-color: var(--surface-hover);
}

.header-nav .pi {
  margin-right: 0.5rem;
}

.app-content {
  flex: 1;
  padding: 2rem;
  background-color: var(--surface-ground);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background-color: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  padding: 1rem 0;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
  color: var(--text-color-secondary);
}

/* Toast customization */
:deep(.p-toast) {
  font-size: 0.875rem;
}

:deep(.p-toast-message) {
  border-radius: 8px;
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <img src="@/assets/logo.png" alt="LM Studio Agents" class="app-logo" />
        </div>

        <div class="auth-controls">
          <AuthStatus v-if="authenticated" />
          <template v-if="!authenticated">
            <LoginButton />
          </template>
          <template v-else>
            <UserMenu />
          </template>
        </div>

        <Navigation class="header-nav" />
      </div>
    </header>

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <AuthDialog
      v-model:visible="showAuthDialog"
      :mode="authDialogMode"
      :returnUrl="authReturnUrl"
      @cancel="handleAuthCancel"
    />

    <Toast position="top-right" />

    <footer class="app-footer">
      <div class="footer-content">
        <p>&copy; {{ new Date().getFullYear() }} LM Studio Agents</p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './store/auth';
import { AUTH_EVENTS } from './types/auth.types';
import { AuthStatus, UserMenu, LoginButton, AuthDialog } from './components/auth';
import Navigation from './components/Navigation.vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

export default defineComponent({
  name: 'App',
  components: {
    AuthStatus,
    UserMenu,
    LoginButton,
    AuthDialog,
    Navigation,
    Toast
  },

  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const toast = useToast();

    // Auth dialog state
    const showAuthDialog = ref(false);
    const authDialogMode = ref<'required' | 'expired'>('required');
    const authReturnUrl = ref('/');

    // Computed properties
    const authenticated = computed(() => authStore.authenticated);

    // Auth event handlers
    const handleLoginSuccess = () => {
      toast.add({
        severity: 'success',
        summary: 'Welcome Back',
        detail: 'You have successfully signed in',
        life: 3000
      });
    };

    const handleLoginError = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: customEvent.detail?.message || 'Failed to sign in',
        life: 5000
      });
    };

    const handleLogout = () => {
      toast.add({
        severity: 'info',
        summary: 'Signed Out',
        detail: 'You have been signed out successfully',
        life: 3000
      });
    };

    const handleTokenExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
      
      toast.add({
        severity: 'warn',
        summary: 'Session Expired',
        detail: 'Your session has expired. Please sign in again.',
        life: 5000
      });
    };

    const handleSessionExpired = () => {
      authDialogMode.value = 'expired';
      authReturnUrl.value = router.currentRoute.value.fullPath;
      showAuthDialog.value = true;
    };

    // Handle auth dialog cancel
    const handleAuthCancel = () => {
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push('/');
      }
    };

    // Setup and cleanup event listeners
    onMounted(() => {
      window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.addEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.addEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    onUnmounted(() => {
      window.removeEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.removeEventListener(AUTH_EVENTS.LOGIN_ERROR, handleLoginError);
      window.removeEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
      window.removeEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    });

    return {
      authenticated,
      showAuthDialog,
      authDialogMode,
      authReturnUrl,
      handleAuthCancel
    };
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  padding: 0;
  height: 64px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-logo {
  height: 40px;
  margin-right: 2rem;
}

.auth-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 2rem;
}

.header-nav {
  margin-left: auto;
}

.app-content {
  flex: 1;
  padding: 2rem;
  background-color: var(--surface-ground);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background-color: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  padding: ;
}

/* Toast customization */
:deep(.p-toast) {
  font-size: 0.875rem;
}

:deep(.p-toast-message) {
  border-radius: 8px;
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
    
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
