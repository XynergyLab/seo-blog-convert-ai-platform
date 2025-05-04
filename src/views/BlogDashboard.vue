<template>
  <div class="blog-dashboard">
    <div class="dashboard-header">
      <h1>Blog Management</h1>
      <div class="header-actions">
        <Button 
          label="Create New Post" 
          icon="pi pi-plus" 
          class="p-button-success" 
          @click="navigateToCreate"
        />
      </div>
    </div>

    <TabView class="blog-tabs">
      <!-- Posts List Tab -->
      <TabPanel header="Posts">
        <BlogListView />
      </TabPanel>

      <!-- Calendar View Tab -->
      <TabPanel header="Calendar">
        <BlogCalendarView />
      </TabPanel>

      <!-- Create Post Tab -->
      <TabPanel header="Create">
        <BlogCreateForm />
      </TabPanel>

      <!-- Content Generation Tools -->
      <TabPanel header="Content Tools">
        <div class="tools-grid">
          <!-- Outline Generator -->
          <Card>
            <template #header>
              <div class="tool-header">
                <i class="pi pi-file-edit"></i>
                <h3>Blog Outline Generator</h3>
              </div>
            </template>
            <template #content>
              <BlogOutlineGen />
            </template>
          </Card>

          <!-- Section Generator -->
          <Card>
            <template #header>
              <div class="tool-header">
                <i class="pi pi-list"></i>
                <h3>Section Generator</h3>
              </div>
            </template>
            <template #content>
              <BlogSectionGen />
            </template>
          </Card>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Card from 'primevue/card'

// Import blog components
import BlogListView from '../components/blog/BlogListView.vue'
import BlogCalendarView from '../components/blog/BlogCalendarView.vue'
import BlogCreateForm from '../components/blog/BlogCreateForm.vue'
import BlogOutlineGen from '../components/blog/BlogOutlineGen.vue'
import BlogSectionGen from '../components/blog/BlogSectionGen.vue'

const router = useRouter()

const navigateToCreate = () => {
  router.push('/blog/create')
}
</script>

<style lang="scss" scoped>
.blog-dashboard {
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h1 {
      margin: 0;
      color: var(--text-color);
    }
  }

  .blog-tabs {
    background: var(--surface-card);
    border-radius: var(--border-radius);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
    padding: 1rem;

    .tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;

      i {
        font-size: 1.5rem;
        color: var(--primary-color);
      }

      h3 {
        margin: 0;
        font-size: 1.2rem;
      }
    }
  }

  ::v-deep .p-tabview {
    .p-tabview-nav {
      border-bottom: 2px solid var(--surface-border);
    }

    .p-tabview-nav-link {
      padding: 1rem 1.5rem;

      &:focus {
        box-shadow: none;
      }
    }

    .p-tabview-selected .p-tabview-nav-link {
      border-bottom-color: var(--primary-color);
    }

    .p-tabview-panels {
      padding: 1.5rem;
    }
  }

  ::v-deep .p-card {
    height: 100%;
    
    .p-card-content {
      padding: 1.5rem;
    }
  }
}

// Responsive adjustments
@media screen and (max-width: 768px) {
  .blog-dashboard {
    .tools-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
}
</style>
