<template>
  <Tag :value="statusText" :severity="statusSeverity" rounded />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useAuthStore } from '../../store/auth';
import Tag from 'primevue/tag';

export default defineComponent({
  name: 'AuthStatus',
  components: { Tag },
  setup() {
    const authStore = useAuthStore();

    const statusText = computed(() => 
      authStore.authenticated ? 'Authenticated' : 'Guest'
    );

    const statusSeverity = computed(() => 
      authStore.authenticated ? 'success' : 'info'
    );

    return {
      statusText,
      statusSeverity
    };
  }
});
</script>

