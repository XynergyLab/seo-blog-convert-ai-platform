<template>
  <div class="keywords-container">
    <div class="keywords-header">
      <h2>Keywords Management</h2>
      <div class="keywords-actions">
        <span class="p-input-icon-left search-input">
          <i class="pi pi-search" />
          <InputText v-model="globalFilterValue" placeholder="Search keywords" />
        </span>
        <Button icon="pi pi-plus" label="Add Keyword" @click="openNewKeywordDialog" class="p-button-success" />
        <Button icon="pi pi-file-excel" label="Export" @click="exportCSV" class="p-button-outlined" />
      </div>
    </div>

    <div v-if="loading" class="loading-indicator">
      <ProgressSpinner />
      <p>Loading keywords...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <div v-else class="keywords-table-container">
      <DataTable
        :value="keywords"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5, 10, 25, 50]"
        v-model:filters="filters"
        v-model:selection="selectedKeywords"
        filterDisplay="menu"
        :globalFilterFields="['keyword', 'status']"
        responsiveLayout="scroll"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} keywords"
        :loading="loading"
        dataKey="id"
        removableSort
        :sortField="sortField"
        :sortOrder="sortOrder"
        @sort="onSort"
        class="p-datatable-sm"
        exportFilename="keywords-export"
        ref="dt"
      >
        <template #header>
          <div class="batch-actions-container">
            <div class="selected-count" v-if="selectedKeywords.length > 0">
              {{ selectedKeywords.length }} keywords selected
            </div>
            <div class="batch-buttons" v-if="selectedKeywords.length > 0">
              <Button icon="pi pi-trash" label="Delete Selected" @click="confirmDeleteSelected" class="p-button-danger" />
              <Button icon="pi pi-bookmark" label="Update Status" @click="openBatchStatusDialog" class="p-button-outlined" />
            </div>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        
        <Column field="keyword" header="Keyword" :sortable="true" style="min-width: 200px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @keydown.enter="filterCallback()" placeholder="Search by keyword" class="p-column-filter" />
          </template>
        </Column>
        
        <Column field="status" header="Status" :sortable="true" style="min-width: 150px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Dropdown v-model="filterModel.value" :options="keywordStatusOptions" optionLabel="name" optionValue="value" 
              placeholder="Select Status" @change="filterCallback()" class="p-column-filter" />
          </template>
        </Column>
        
        <Column field="searchVolume" header="Search Volume" :sortable="true" style="min-width: 150px">
          <template #body="{ data }">
            {{ formatNumber(data.searchVolume) }}
          </template>
        </Column>
        
        <Column field="keywordDifficulty" header="KD" :sortable="true" style="min-width: 100px">
          <template #body="{ data }">
            <div class="kd-indicator">
              <div class="kd-value">{{ data.keywordDifficulty }}</div>
              <div :class="'kd-bar ' + getKDClass(data.keywordDifficulty)">
                <div class="kd-progress" :style="{ width: data.keywordDifficulty + '%' }"></div>
              </div>
            </div>
          </template>
        </Column>
        
        <Column field="score" header="Score" :sortable="true" style="min-width: 100px">
          <template #body="{ data }">
            <div class="score-badge" :class="getScoreClass(data.score)">
              {{ data.score }}
            </div>
          </template>
        </Column>
        
        <Column field="blogsCount" header="Blogs" :sortable="true" style="min-width: 100px">
          <template #body="{ data }">
            <div class="blogs-badge" v-if="data.blogsCount > 0" @click="showRelatedBlogs(data)">
              {{ data.blogsCount }} <i class="pi pi-external-link" style="font-size: 0.75rem; margin-left: 3px;"></i>
            </div>
            <div v-else>-</div>
          </template>
        </Column>
        
        <Column headerStyle="width: 6rem; text-align: center">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" @click="editKeyword(data)" class="p-button-text p-button-rounded" title="Edit" />
            <Button icon="pi pi-trash" @click="confirmDelete(data)" class="p-button-text p-button-rounded p-button-danger" title="Delete" />
          </template>
        </Column>
        
        <template #empty>
          <div class="p-d-flex p-ai-center p-jc-center">
            <p>No keywords found.</p>
          </div>
        </template>
        
        <template #paginatorstart>
          <Button type="button" icon="pi pi-refresh" @click="refreshKeywords" class="p-button-text" />
        </template>
        
        <template #paginatorend>
          <Dropdown v-model="filters.global.matchMode" :options="matchModeOptions" optionLabel="label" optionValue="value" placeholder="Match Mode" class="match-mode-dropdown" />
        </template>
      </DataTable>
    </div>
    
    <!-- Keyword Dialog for Add/Edit -->
    <Dialog 
      v-model:visible="keywordDialog" 
      :header="editMode ? 'Edit Keyword' : 'Add New Keyword'" 
      :style="{width: '450px'}" 
      :modal="true" 
      class="p-fluid"
    >
      <div class="form-field">
        <label for="keyword">Keyword</label>
        <InputText id="keyword" v-model.trim="keywordForm.keyword" :class="{'p-invalid': submitted && !keywordForm.keyword}" required autofocus />
        <small class="p-error" v-if="submitted && !keywordForm.keyword">Keyword is required.</small>
      </div>
      
      <div class="form-field">
        <label for="status">Status</label>
        <Dropdown id="status" v-model="keywordForm.status" :options="keywordStatusOptions" optionLabel="name" optionValue="value" placeholder="Select Status" :class="{'p-invalid': submitted && !keywordForm.status}" required />
        <small class="p-error" v-if="submitted && !keywordForm.status">Status is required.</small>
      </div>
      
      <div class="form-field">
        <label for="searchVolume">Search Volume</label>
        <InputNumber id="searchVolume" v-model="keywordForm.searchVolume" mode="decimal" :min="0" placeholder="Enter search volume" />
      </div>
      
      <div class="form-field">
        <label for="keywordDifficulty">Keyword Difficulty (KD) %</label>
        <Slider v-model="keywordForm.keywordDifficulty" :min="0" :max="100" />
        <div class="kd-value-display">{{ keywordForm.keywordDifficulty }}</div>
      </div>
      
      <div class="form-field">
        <label for="score">Score (1-10)</label>
        <Rating v-model="keywordForm.score" :stars="10" :cancel="false" />
      </div>
      
      <div class="form-field" v-if="editMode && keywordForm.relatedBlogs && keywordForm.relatedBlogs.length > 0">
        <label>Related Blogs</label>
        <div class="related-blogs-list">
          <Chip 
            v-for="blog in keywordForm.relatedBlogs" 
            :key="blog.id" 
            :label="blog.title" 
            class="blog-chip" 
            removable 
            @remove="removeRelatedBlog(blog)" 
          />
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
        <Button label="Save" icon="pi pi-check" @click="saveKeyword" class="p-button-text" />
      </template>
    </Dialog>
    
    <!-- Delete Confirmation Dialog -->
    <Dialog 
      v-model:visible="deleteDialog" 
      header="Confirm" 
      :style="{width: '450px'}" 
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle p-mr-3" style="font-size: 2rem; color: var(--yellow-500); margin-right: 1rem;" />
        <span v-if="keywordToDelete">Are you sure you want to delete <b>{{ keywordToDelete.keyword }}</b>?</span>
        <span v-else>Are you sure you want to delete the selected keywords?</span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteKeywords" class="p-button-text p-button-danger" />
      </template>
    </Dialog>
    
    <!-- Batch Status Update Dialog -->
    <Dialog 
      v-model:visible="batchStatusDialog" 
      header="Update Status" 
      :style="{width: '450px'}" 
      :modal="true"
    >
      <div class="form-field">
        <label for="batchStatus">New Status</label>
        <Dropdown id="batchStatus" v-model="batchStatusValue" :options="keywordStatusOptions" optionLabel="name" optionValue="value" placeholder="Select Status" required />
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="batchStatusDialog = false" class="p-button-text" />
        <Button label="Update" icon="pi pi-check" @click="updateBatchStatus" class="p-button-text" />
      </template>
    </Dialog>
    
    <!-- Related Blogs Dialog -->
    <Dialog 
      v-model:visible="relatedBlogsDialog" 
      header="Related Blogs" 
      :style="{width: '600px'}" 
      :modal="true"
    >
      <div v-if="selectedKeywordForBlogs">
        <h3>Blogs using keyword: {{ selectedKeywordForBlogs.keyword }}</h3>
        <DataTable :value="selectedKeywordForBlogs.relatedBlogs" class="p-datatable-sm" v-if="selectedKeywordForBlogs.relatedBlogs && selectedKeywordForBlogs.relatedBlogs.length > 0">
          <Column field="title" header="Blog Title">
            <template #body="{ data }">
              <router-link :to="`/blog/${data.id}`">{{ data.title }}</router-link>
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="getBlogStatusSeverity(data.status)" />
            </template>
          </Column>
          <Column field="published_date" header="Published Date">
            <template #body="{ data }">
              {{ formatDate(data.published_date) }}
            </template>
          </Column>
        </DataTable>
        <div v-else class="no-related-blogs">
          <p>No blogs are using this keyword yet.</p>
        </div>
      </div>
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="relatedBlogsDialog = false" class="p-button-text" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

// PrimeVue components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import Slider from 'primevue/slider'
import Rating from 'primevue/rating'
import Chip from 'primevue/chip'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// API service for keywords (mock for now)
import { getKeywordsList } from '../../services/api'

// Enums
const KeywordStatus = {
  ACTIVE: 'active',
  RESEARCH: 'research',
  TARGET: 'target',
  OPTIMIZED: 'optimized',
  INACTIVE: 'inactive'
}

// Blog status (for related blogs)
const BlogStatus = {
  SCHEDULED: 'scheduled',
  PLANNED: 'planned',
  EDITING: 'editing',
  PUBLISHED: 'published',
  DRAFT: 'draft'
}

// Status options for dropdown
const keywordStatusOptions = [
  { name: 'Active', value: KeywordStatus.ACTIVE },
  { name: 'Research', value: KeywordStatus.RESEARCH },
  { name: 'Target', value: KeywordStatus.TARGET },
  { name: 'Optimized', value: KeywordStatus.OPTIMIZED },
  { name: 'Inactive', value: KeywordStatus.INACTIVE }
]

// Match mode options for filtering
const matchModeOptions = [
  { label: 'Contains', value: 'contains' },
  { label: 'Starts With', value: 'startsWith' },
  { label: 'Ends With', value: 'endsWith' },
  { label: 'Equals', value: 'equals' }
]

// Component state
const router = useRouter()
const dt = ref()
const keywords = ref([])
const loading = ref(true)
const error = ref(null)
const selectedKeywords = ref([])
const globalFilterValue = ref('')
const sortField = ref('keyword')
const sortOrder = ref(1) // Ascending by default

// Dialog states
const keywordDialog = ref(false)
const deleteDialog = ref(false)
const batchStatusDialog = ref(false)
const relatedBlogsDialog = ref(false)
const submitted = ref(false)
const editMode = ref(false)
const keywordToDelete = ref(null)
const selectedKeywordForBlogs = ref(null)
const batchStatusValue = ref(null)

// Form for add/edit
const keywordForm = reactive({
  id: null,
  keyword: '',
  status: null,
  searchVolume: 0,
  keywordDifficulty: 50,
  score: 5,
  relatedBlogs: []
})

// Filter configuration
const filters = ref({
  global: { value: null, matchMode: 'contains' },
  keyword: { value: null, matchMode: 'contains' },
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

// Dialog handlers
const openNewKeywordDialog = () => {
  // Reset form for new keyword
  keywordForm.id = null
  keywordForm.keyword = ''
  keywordForm.status = KeywordStatus.RESEARCH
  keywordForm.searchVolume = 0
  keywordForm.keywordDifficulty = 50
  keywordForm.score = 5
  keywordForm.relatedBlogs = []
  
  submitted.value = false
  editMode.value = false
  keywordDialog.value = true
}

const editKeyword = (keyword) => {
  // Clone the keyword data to form
  keywordForm.id = keyword.id
  keywordForm.keyword = keyword.keyword
  keywordForm.status = keyword.status
  keywordForm.searchVolume = keyword.searchVolume
  keywordForm.keywordDifficulty = keyword.keywordDifficulty
  keywordForm.score = keyword.score
  keywordForm.relatedBlogs = keyword.relatedBlogs ? [...keyword.relatedBlogs] : []
  
  submitted.value = false
  editMode.value = true
  keywordDialog.value = true
}

const hideDialog = () => {
  keywordDialog.value = false
  submitted.value = false
}

const saveKeyword = () => {
  submitted.value = true

  if (!keywordForm.keyword || !keywordForm.status) {
    return
  }

  if (keywordForm.id) {
    // Update existing keyword
    const index = keywords.value.findIndex(k => k.id === keywordForm.id)
    if (index !== -1) {
      // In a real app, we'd make an API call here
      keywords.value[index] = { ...keywordForm, blogsCount: keywordForm.relatedBlogs.length }
    }
  } else {
    // Add new keyword
    // In a real app, we'd make an API call here
    const newKeyword = {
      id: Date.now().toString(), // Temporary ID for demo
      keyword: keywordForm.keyword,
      status: keywordForm.status,
      searchVolume: keywordForm.searchVolume,
      keywordDifficulty: keywordForm.keywordDifficulty,
      score: keywordForm.score,
      relatedBlogs: [],
      blogsCount: 0
    }
    keywords.value.push(newKeyword)
  }

  keywordDialog.value = false
  submitted.value = false
}

// Delete handlers
const confirmDelete = (keyword) => {
  keywordToDelete.value = keyword
  deleteDialog.value = true
}

const confirmDeleteSelected = () => {
  if (selectedKeywords.value.length === 0) return
  keywordToDelete.value = null // Null means batch delete
  deleteDialog.value = true
}

const deleteKeywords = () => {
  if (keywordToDelete.value) {
    // Delete single keyword
    // In a real app, we'd make an API call here
    keywords.value = keywords.value.filter(k => k.id !== keywordToDelete.value.id)
  } else {
    // Delete selected keywords
    // In a real app, we'd make an API call here
    const selectedIds = selectedKeywords.value.map(k => k.id)
    keywords.value = keywords.value.filter(k => !selectedIds.includes(k.id))
    selectedKeywords.value = []
  }
  
  deleteDialog.value = false
  keywordToDelete.value = null
}

// Batch status update
const openBatchStatusDialog = () => {
  if (selectedKeywords.value.length === 0) return
  batchStatusValue.value = null
  batchStatusDialog.value = true
}

const updateBatchStatus = () => {
  if (!batchStatusValue.value || selectedKeywords.value.length === 0) {
    batchStatusDialog.value = false
    return
  }

  // In a real app, we'd make an API call here
  const selectedIds = selectedKeywords.value.map(k => k.id)
  keywords.value = keywords.value.map(k => {
    if (selectedIds.includes(k.id)) {
      return { ...k, status: batchStatusValue.value }
    }
    return k
  })

  batchStatusDialog.value = false
  batchStatusValue.value = null
}

// Related blogs
const showRelatedBlogs = (keyword) => {
  selectedKeywordForBlogs.value = keyword
  relatedBlogsDialog.value = true
}

const removeRelatedBlog = (blog) => {
  if (!keywordForm.relatedBlogs) return
  
  // Remove blog from keyword
  keywordForm.relatedBlogs = keywordForm.relatedBlogs.filter(b => b.id !== blog.id)
  
  // In a real app, we'd make an API call here to update the relationship
}

// Export functionality
const exportCSV = () => {
  if (dt.value) {
    dt.value.exportCSV()
  }
}

// Refresh data
const refreshKeywords = async () => {
  loading.value = true
  error.value = null
  try {
    await fetchKeywords()
  } finally {
    loading.value = false
  }
}

// Utility methods
const formatNumber = (value) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat().format(value)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('MMM D, YYYY')
}

const getStatusSeverity = (status) => {
  switch (status) {
    case KeywordStatus.ACTIVE:
      return 'success'
    case KeywordStatus.TARGET:
      return 'info'
    case KeywordStatus.OPTIMIZED:
      return 'success'
    case KeywordStatus.RESEARCH:
      return 'warning'
    case KeywordStatus.INACTIVE:
      return 'secondary'
    default:
      return null
  }
}

const getBlogStatusSeverity = (status) => {
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

const getKDClass = (kd) => {
  if (kd < 30) return 'easy'
  if (kd < 60) return 'moderate'
  return 'difficult'
}

const getScoreClass = (score) => {
  if (score >= 8) return 'high-score'
  if (score >= 5) return 'medium-score'
  return 'low-score'
}

// Fetch keywords data
const fetchKeywords = async () => {
  try {
    // In a real app, this would be an API call
    // For demo, we'll simulate it with mock data
    const result = await getKeywordsList()
    
    if (result.success) {
      keywords.value = result.keywords || generateMockKeywords()
    } else {
      error.value = result.error || 'Failed to load keywords'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load keywords'
  }
}

// Mock data generator - for demonstration only
const generateMockKeywords = () => {
  const statuses = Object.values(KeywordStatus)
  const mockKeywords = []
  
  const keywordTerms = [
    'content marketing', 'SEO tools', 'digital marketing', 'keyword research',
    'search engine optimization', 'blog writing', 'backlinks strategy',
    'content strategy', 'long-tail keywords', 'SERP analysis',
    'social media marketing', 'PPC advertising', 'conversion rate', 
    'technical SEO', 'on-page optimization'
  ]
  
  // Generate mock data
  for (let i = 0; i < keywordTerms.length; i++) {
    const relatedBlogsCount = Math.floor(Math.random() * 5)
    const relatedBlogs = []
    
    for (let j = 0; j < relatedBlogsCount; j++) {
      relatedBlogs.push({
        id: `blog-${i}-${j}`,
        title: `Blog about ${keywordTerms[i]} - ${j + 1}`,
        status: Object.values(BlogStatus)[Math.floor(Math.random() * Object.values(BlogStatus).length)],
        published_date: relatedBlogsCount > 2 ? dayjs().subtract(Math.floor(Math.random() * 60), 'day').format('YYYY-MM-DD') : null
      })
    }
    
    mockKeywords.push({
      id: `keyword-${i + 1}`,
      keyword: keywordTerms[i],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      searchVolume: Math.floor(Math.random() * 10000),
      keywordDifficulty: Math.floor(Math.random() * 100),
      score: Math.floor(Math.random() * 10) + 1,
      relatedBlogs: relatedBlogs,
      blogsCount: relatedBlogs.length
    })
  }
  
  return mockKeywords
}

// Fetch data on mount
onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    await fetchKeywords()
  } catch (e) {
    error.value = e.message || 'Failed to load keywords'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.keywords-container {
  width: 100%;
  padding: 1rem;
}

.keywords-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.keywords-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 250px;
}

.keywords-table-container {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.batch-actions-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.selected-count {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: var(--primary-color, #3B82F6);
  color: white;
}

.batch-buttons {
  display: flex;
  gap: 0.5rem;
}

/* KD Indicator styles */
.kd-indicator {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kd-value {
  font-weight: 600;
  font-size: 0.875rem;
}

.kd-bar {
  height: 0.5rem;
  width: 100%;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.kd-progress {
  height: 100%;
  border-radius: 4px;
}

.kd-bar.easy .kd-progress {
  background-color: #4caf50; /* green */
}

.kd-bar.moderate .kd-progress {
  background-color: #ff9800; /* orange */
}

.kd-bar.difficult .kd-progress {
  background-color: #f44336; /* red */
}

/* Score badges */
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
}

.high-score {
  background-color: #4caf50; /* green */
}

.medium-score {
  background-color: #ff9800; /* orange */
}

.low-score {
  background-color: #f44336; /* red */
}

/* Blogs badge */
.blogs-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background-color: var(--primary-color, #3B82F6);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.blogs-badge:hover {
  background-color: var(--primary-600, #2563EB);
}

/* Form styles */
.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.kd-value-display {
  text-align: center;
  margin-top: 0.5rem;
  font-weight: 600;
  color: #333;
}

.related-blogs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.blog-chip {
  background-color: #e9ecef;
  font-size: 0.875rem;
}

/* Dialog styles */
.confirmation-content {
  display: flex;
  align-items: center;
  padding: 1rem 0;
}

/* Related blogs dialog */
.no-related-blogs {
  padding: 1.5rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

/* Loading and error states */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-message {
  margin: 1rem 0;
}

/* Match mode dropdown */
.match-mode-dropdown {
  width: 150px;
  margin-left: 0.5rem;
}

/* Responsive styles */
@media screen and (max-width: 768px) {
  .keywords-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .keywords-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
  
  .batch-actions-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .batch-buttons {
    width: 100%;
    flex-direction: column;
  }
}
</style>
