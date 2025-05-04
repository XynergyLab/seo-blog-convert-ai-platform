<template>
  <div class="user-menu">
    <Button 
      v-if="loading" 
      icon="pi pi-spin pi-spinner" 
      disabled 
      text 
    />
    <template v-else>
      <Button
        v-if="!authenticated"
        icon="pi pi-user"
        text
        disabled
      />
      <Dropdown
        v-else
        v-model="selectedOption"
        :options="menuOptions"
        optionLabel="label"
        class="user-dropdown"
        @change="handleOptionSelect"
      >
        <template #value="{ value }">
          <div class="user-header">
            <Avatar 
              :image="userProfile?.picture" 
              :label="userInitials" 
              size="normal" 
              shape="circle" 
              class="user-avatar"
            />
            <span class="user-name">{{ userName }}</span>
          </div>
        </template>
        
        <template #option="{ option }">
          <div class="menu-item">
            <i :class="option.icon" />
            <span>{{ option.label }}</span>
          </div>
        </template>
      </Dropdown>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';
import { useAuth0 } from '../../auth.plugin';
import type { User } from '../../types/auth.types';
import Dropdown from 'primevue/dropdown';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';

interface MenuOption {
  label: string;
  value: string;
  icon: string;
}

export default defineComponent({
  name: 'UserMenu',
  components: {
    Dropdown,
    Avatar,
    Button
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const auth0 = useAuth0();
    
    const selectedOption = ref<MenuOption | null>(null);

    const authenticated = computed(() => authStore.authenticated);
    const loading = computed(() => authStore.isLoading);
    const userProfile = computed(() => authStore.userProfile);

    const userName = computed(() => 
      userProfile.value?.name || 
      userProfile.value?.nickname || 
      userProfile.value?.email?.split('@')[0] ||
      'User'
    );

    const userInitials = computed(() => {
      const name = userName.value;
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    });

    const menuOptions = [
      { 
        label: 'Profile', 
        value: 'profile', 
        icon: 'pi pi-user' 
      },
      { 
        label: 'Settings', 
        value: 'settings', 
        icon: 'pi pi-cog' 
      },
      { 
        label: 'Logout', 
        value: 'logout',

        icon: 'pi pi-power-off' 
      }
    ];

    const handleOptionSelect = async (event: { value: MenuOption }) => {
      switch (event.value.value) {
        case 'profile':
          router.push('/settings?tab=profile');
          break;
        case 'settings':
          router.push('/settings');
          break;
        case 'logout':
          try {
            await auth0.logout();
          } catch (error) {
            console.error('Logout failed:', error);
          }
          break;
      }
      selectedOption.value = null;
    };

    return {
      authenticated,
      loading,
      userProfile,
      userName,
      userInitials,
      selectedOption,
      menuOptions,
      handleOptionSelect
    };
  }
});
</script>

<style scoped>
.user-menu {
  display: flex;
  align-items: center;
}

.user-dropdown {
  min-width: 200px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.user-avatar {
  flex-shrink: 0;
}

.user-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.menu-item i {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

:deep(.p-dropdown-panel) {
  min-width: 200px;
}

:deep(.p-dropdown-items) {
  padding: 0.5rem 0;
}

:deep(.p-dropdown-item) {
  margin: 0;
  padding: 0;
}
</style>

