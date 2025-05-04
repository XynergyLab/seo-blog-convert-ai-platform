<template>
  <nav class="main-nav">
    <!-- Blog Section -->
    <Button
      v-tooltip.bottom="authenticated ? '' : 'Sign in to access blogs'"
      :disabled="!authenticated"
      class="p-button-text"
      @click="navigateTo('/blog')"
      :class="{ 'router-link-active': isRouteActive('/blog') }"
    >
      <template #icon>
        <i class="pi pi-file-edit"></i>
      </template>
      <span>Blog</span>
    </Button>

    <!-- Keywords Section -->
    <Button
      v-tooltip.bottom="authenticated ? '' : 'Sign in to access keywords'"
      :disabled="!authenticated"
      class="p-button-text"
      @click="navigateTo('/keywords')"
      :class="{ 'router-link-active': isRouteActive('/keywords') }"
    >
      <template #icon>
        <i class="pi pi-tags"></i>
      </template>
      <span>Keywords</span>
    </Button>

    <!-- Social Section -->
    <Button
      v-tooltip.bottom="authenticated ? '' : 'Sign in to access social media'"
      :disabled="!authenticated"
      class="p-button-text"
      @click="navigateTo('/social')"
      :class="{ 'router-link-active': isRouteActive('/social') }"
    >
      <template #icon>
        <i class="pi pi-share-alt"></i>
      </template>
      <span>Social</span>
    </Button>

    <!-- Analytics Section -->
    <Button
      v-tooltip.bottom="authenticated ? '' : 'Sign in to access analytics'"
      :disabled="!authenticated"
      class="p-button-text"
      @click="navigateTo('/analytics')"
      :class="{ 'router-link-active': isRouteActive('/analytics') }"
    >
      <template #icon>
        <i class="pi pi-chart-line"></i>
      </template>
      <span>Analytics</span>
    </Button>

    <!-- Settings -->
    <Button
      v-tooltip.bottom="authenticated ? '' : 'Sign in to access settings'"
      :disabled="!authenticated"
      class="p-button-text"
      @click="navigateTo('/settings')"
      :class="{ 'router-link-active': isRouteActive('/settings') }"
    >
      <template #icon>
        <i class="pi pi-cog"></i>
      </template>
      <span>Settings</span>
    </Button>
  </nav>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth';
import Button from 'primevue/button';

export default defineComponent({
  name: 'Navigation',
  components: {
    Button
  },

  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const authenticated = computed(() => authStore.authenticated);

    const isRouteActive = (path: string): boolean => {
      return route.path.startsWith(path);
    };

    const navigateTo = async (path: string): Promise<void> => {
      if (!authenticated.value) {
        // Let the router guard handle the redirect
        router.push(path);
        return;
      }

      // Navigate to the requested path
      router.push(path);
    };

    return {
      authenticated,
      isRouteActive,
      navigateTo
    };
  }
});
</script>

<style scoped>
.main-nav {
  display: flex;
  gap: 0.5rem;
}

.main-nav .p-button {
  padding: 0.5rem 1rem;
}

.main-nav .p-button:not(.p-disabled) {
  color: var(--text-color);
}

.main-nav .p-button:not(.p-disabled):hover {
  background-color: var(--surface-hover);
  color: var(--text-color);
}

.main-nav .p-button.router-link-active:not(.p-disabled) {
  color: var(--primary-color);
  background-color: var(--surface-hover);
}

.main-nav .p-button .pi {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.main-nav .p-button.p-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Ensure text and icons stay aligned */
.main-nav .p-button-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Tooltip customization */
:deep(.p-tooltip) {
  font-size: 0.875rem;
}

/* Responsive adjustments */
@media screen and (max-width: 768px) {
  .main-nav {
    gap: 0.25rem;
  }

  .main-nav .p-button {
    padding: 0.5rem;
  }

  .main-nav .p-button span {
    display: none;
  }

  .main-nav .p-button .pi {
    margin-right: 0;
    font-size: 1.25rem;
  }
}
</style>
