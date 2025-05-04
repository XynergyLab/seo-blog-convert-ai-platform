<template>
  <div class="navigation-wrapper">
    <Menubar :model="menuItems" class="navigation">
      <template #start>
        <div class="logo-container">
          <h1 class="site-title">LM Studio Agents</h1>
        </div>
      </template>
      <template #end>
        <div class="nav-actions">
          <Badge v-if="notificationCount > 0" :value="notificationCount" severity="danger" class="notification-badge"></Badge>
          <Button icon="pi pi-bell" class="p-button-rounded p-button-text p-button-plain" @click="toggleNotifications" />
          <Avatar icon="pi pi-user" class="user-avatar" size="small" shape="circle" />
        </div>
      </template>
    </Menubar>
    
    <!-- Mobile Navigation -->
    <div class="mobile-navigation">
      <div class="mobile-header">
        <h1 class="site-title">LM Studio Agents</h1>
        <Button icon="pi pi-bars" @click="toggleMobileMenu" class="p-button-rounded p-button-text p-button-plain" />
      </div>
      
      <Sidebar v-model:visible="mobileMenuVisible" position="right" class="mobile-menu">
        <h2>Menu</h2>
        <div class="mobile-menu-items">
          <div v-for="item in menuItems" :key="item.label" class="mobile-menu-item">
            <div class="mobile-menu-header" @click="navigateTo(item)">
              <i :class="item.icon" class="mobile-menu-icon"></i>
              <span>{{ item.label }}</span>
              <i v-if="item.items" class="pi pi-chevron-down mobile-submenu-icon" @click.stop="toggleSubmenu(item.label)"></i>
            </div>
            
            <div v-if="item.items && expandedSubmenus.includes(item.label)" class="mobile-submenu">
              <div v-for="subItem in item.items" :key="subItem.label" class="mobile-submenu-item" @click="navigateTo(subItem)">
                <i :class="subItem.icon" class="mobile-submenu-item-icon"></i>
                <span>{{ subItem.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </Sidebar>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// PrimeVue components
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import Sidebar from 'primevue/sidebar'

const router = useRouter()
const route = useRoute()

// Mobile menu state
const mobileMenuVisible = ref(false)
const expandedSubmenus = ref([])

// Notification badge (for demo purposes)
const notificationCount = ref(3)

// Toggle mobile menu
const toggleMobileMenu = () => {
  mobileMenuVisible.value = !mobileMenuVisible.value
}

// Toggle submenu in mobile view
const toggleSubmenu = (label) => {
  if (expandedSubmenus.value.includes(label)) {
    expandedSubmenus.value = expandedSubmenus.value.filter(item => item !== label)
  } else {
    expandedSubmenus.value.push(label)
  }
}

// Handle navigation in mobile view
const navigateTo = (item) => {
  if (item.to) {
    router.push(item.to)
    mobileMenuVisible.value = false
  }
}

// Toggle notifications panel (would be implemented in a real app)
const toggleNotifications = () => {
  // This would open a notifications panel in a real implementation
  console.log('Toggle notifications')
}

// Menu items configuration
const menuItems = [
  {
    label: 'Blog',
    icon: 'pi pi-file-edit',
    items: [
      {
        label: 'List View',
        icon: 'pi pi-list',
        to: '/blog'
      },
      {
        label: 'Calendar',
        icon: 'pi pi-calendar',
        to: '/blog/calendar'
      }
    ]
  },
  {
    label: 'Keywords',
    icon: 'pi pi-key',
    to: '/keywords'
  },
  {
    label: 'Analytics',
    icon: 'pi pi-chart-line',
    to: '/analytics'
  },
  {
    label: 'Social',
    icon: 'pi pi-share-alt',
    to: '/social'
  }
]
</script>

<style scoped>
.navigation-wrapper {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.navigation {
  background-color: #2c3e50 !important;
  color: white !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0.5rem 1rem !important;
}

.navigation :deep(.p-menubar-root-list) {
  margin-left: 1rem;
}

.navigation :deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link) {
  color: white !important;
  padding: 0.75rem 1rem;
  border-radius: 4px;
}

.navigation :deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link:hover) {
  background-color: #34495e !important;
}

.navigation :deep(.p-menubar-root-list > .p-menuitem.p-menuitem-active > .p-menuitem-link) {
  background-color: #34495e !important;
}

.navigation :deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link .p-menuitem-icon) {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.navigation :deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link .p-submenu-icon) {
  margin-left: 0.5rem;
}

.navigation :deep(.p-submenu-list) {
  background-color: #2c3e50 !important;
  border: none !important;
  padding: 0.5rem !important;
  border-radius: 4px !important;
}

.navigation :deep(.p-submenu-list .p-menuitem-link) {
  color: white !important;
  padding: 0.75rem 1rem;
  border-radius: 4px;
}

.navigation :deep(.p-submenu-list .p-menuitem-link:hover) {
  background-color: #34495e !important;
}

.logo-container {
  display: flex;
  align-items: center;
}

.site-title {
  margin: 0;
  font-size: 1.5rem;
  color: white;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 0.75rem;
}

.user-avatar {
  background-color: #34495e;
  color: white;
}

/* Mobile Navigation */
.mobile-navigation {
  display: none;
  background-color: #2c3e50;
  padding: 1rem;
  color: white;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-menu {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
}

.mobile-menu h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-menu-item {
  margin-bottom: 0.5rem;
}

.mobile-menu-header {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.05);
}

.mobile-menu-header:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mobile-menu-icon {
  margin-right: 0.75rem;
}

.mobile-submenu-icon {
  margin-left: auto;
}

.mobile-submenu {
  margin-top: 0.25rem;
  margin-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-submenu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

.mobile-submenu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mobile-submenu-item-icon {
  margin-right: 0.75rem;
}

/* Responsive styles */
@media screen and (max-width: 768px) {
  .navigation {
    display: none !important;
  }
  
  .mobile-navigation {
    display: block;
  }
}
</style>
