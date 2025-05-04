<template>
  <div class="blog-list-container">
    <div class="blog-list-header">
      <h2>Blog Posts</h2>
      <div class="blog-filters">
        <Dropdown v-model="statusFilter" :options="statusOptions" optionLabel="name" placeholder="Filter by Status" class="p-mr-2" />
        <span class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText v-model="globalFilterValue" placeholder="Search" />
        </span>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <ProgressSpinner />
      <p>Loading blog posts...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <div v-else class="blog-table-container">
      <DataTable
        :value="posts"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        v-model:filters="filters"
        filterDisplay="menu"
        :globalFilterFields="['title', 'keywords', 'status']"
        responsiveLayout="scroll"
        :loading="loading"
        dataKey="id"
        class="p-datatable-sm"
        removableSort
        :sortField="sortField"
        :sortOrder="sortOrder"
        @sort="onSort"
      >
        <template #empty>
          <div class="p-d-flex p-ai-center p-jc-center">
            <p>No blog posts found.</p>
          </div>
        </template>
        
        <template #header>
          <div class="p-d-flex p-jc-between p-ai-center">
            <h3 class="p-m-0">Blog Posts</h3>
            <Button icon="pi pi-plus" label="New Blog" class="p-button-success" />
          </div>
        </template>
        
        <Column field="title" header="Title" :sortable="true">
          <template #body="{ data }">
            <router-link :to="`/blog/${data.id}`" class="blog-title-link">
              {{ data.title }}
            </router-link>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @keydown.enter="filterCallback()" placeholder="Search by title" class="p-column-filter" />
          </template>
        </Column>
        
        <Column field="keywords" header="Keywords">
          <template #body="{ data }">
            <div class="keyword-container">
              <Chip v-for="keyword in data.keywords" 
                :key="keyword.id" 
                :label="keyword.name" 
                class="keyword-chip" />
            </div>
          </template>
        </Column>
        
        <Column field="created_at" header="Created Date" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>
        
        <Column field="available_date" header="Available Date" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.available_date) }}
          </template>
        </Column>
        
        <Column field="published_date" header="Published Date" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.published_date) }}
          </template>
        </Column>
        
        <Column field="status" header="Status" :sortable="true">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Dropdown v-model="filterModel.value" :options="statusOptions" optionLabel="name" optionValue="value" 
              placeholder="Select Status" @change="filterCallback()" class="p-column-filter" />
          </template>
        </Column>
        
        <Column headerStyle="width: 5rem; text-align: center">
          <template #body="{ data }">
            <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-rounded" @click="toggleMenu($event, data)" />
            <Menu :model="actionItems" :popup="true" ref="menu" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive } from 'vue'
import { getBlogList } from '../../services/api'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

// PrimeVue Components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// Enum for blog status
const BlogStatus = {
  SCHEDULED: 'scheduled',
  PLANNED: 'planned',
  EDITING: 'editing',
  PUBLISHED: 'published',
  DRAFT: 'draft'
}

// Status options for dropdown
const statusOptions = [
  { name: 'All', value: null },
  { name: 'Scheduled', value: BlogStatus.SCHEDULED },
  { name: 'Planned', value: BlogStatus.PLANNED },
  { name: 'Editing', value: BlogStatus.EDITING },
  { name: 'Published', value: BlogStatus.PUBLISHED },
  { name: 'Draft', value: BlogStatus.DRAFT }
]

const router = useRouter()
const posts = ref([])
const loading = ref(true)
const error = ref(null)
const menu = ref()
const statusFilter = ref(null)
const globalFilterValue = ref('')
const sortField = ref('created_at')
const sortOrder = ref(-1) // Descending by default

// Filter configuration
const filters = ref({
  global: { value: null, matchMode: 'contains' },
  title: { value: null, matchMode: 'contains' },
  status: { value: null, matchMode: 'equals' }
})

// Watch for global filter changes
const onGlobalFilterChange = (e) => {
  const value = e.target.value
  filters.value.global.value = value
}

// Sort handler
const onSort = (event) => {
  sortField.value = event.sortField
  sortOrder.value = event.sortOrder
}

// Actions menu for each row
const actionItems = [
  {
    label: 'Edit',
    icon: 'pi pi-pencil',
    command: (event) => {
      router.push(`/blog/${event.item.data.id}/edit`)
    }
  },
  {
    label: 'Preview',
    icon: 'pi pi-eye',
    command: (event) => {
      router.push(`/blog/${event.item.data.id}/preview`)
    }
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: (event) => {
      // Handle delete - would show confirmation dialog in a real implementation
      console.log('Delete requested for:', event.item.data.id)
    }
  }
]

const toggleMenu = (event, item) => {
  menu.value.toggle(event)
  // Set the current item for the menu actions
  actionItems.forEach(i => i.item = { data: item })
}

// Get severity for status tag
const getStatusSeverity = (status) => {
  switch (status) {
    case BlogStatus.PUBLISHED:
      return 'success'
    case BlogStatus.SCHEDULED:
      return 'info'
    case BlogStatus.PLANNED:
      return 'warning'
    case BlogStatus.EDITING:
      return 'warning'
    case BlogStatus.DRAFT:
      return 'secondary'
    default:
      return null
  }
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const result = await getBlogList()
    if (result.success) {
      // Process the data to ensure all required fields are present
      posts.value = result.posts.map(post => ({
        ...post,
        keywords: post.keywords || [],
        status: post.status || BlogStatus.DRAFT,
        available_date: post.available_date || null,
        published_date: post.published_date || null
      }))
    } else {
      error.value = result.error || 'Failed to load blog posts'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load blog posts'
  } finally {
    loading.value = false
  }
})

// Format date using dayjs
function formatDate(dateString) {
  if (!dateString) return '-'
  return dayjs(dateString).format('MMM D, YYYY')
}
</script>
<style scoped>
.blog-list-container {
  width: 100%;
  padding: 1rem;
}

.blog-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.blog-filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.error-message {
  margin: 1rem 0;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.blog-table-container {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.blog-title-link {
  color: var(--primary-color, #3B82F6);
  text-decoration: none;
  font-weight: 500;
}

.blog-title-link:hover {
  text-decoration: underline;
}

.keyword-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.keyword-chip {
  font-size: 0.75rem;
  background-color: #EDF2F7;
  color: #2D3748;
}

/* Table responsive styles */
@media screen and (max-width: 960px) {
  .blog-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .blog-filters {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
