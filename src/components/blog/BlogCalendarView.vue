<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h2>Blog Calendar</h2>
      <div class="calendar-controls">
        <div class="view-toggle">
          <SelectButton v-model="calendarView" :options="viewOptions" optionLabel="name" />
        </div>
        <div class="date-navigation">
          <Button icon="pi pi-chevron-left" @click="prevPeriod" class="p-button-outlined p-button-sm" />
          <h3 class="current-period">{{ currentPeriodLabel }}</h3>
          <Button icon="pi pi-chevron-right" @click="nextPeriod" class="p-button-outlined p-button-sm" />
          <Button label="Today" @click="goToToday" class="p-button-sm" />
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-indicator">
      <ProgressSpinner />
      <p>Loading blog calendar...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <div v-else class="calendar-wrapper">
      <FullCalendar 
        ref="fullCalendar"
        :options="calendarOptions" 
      />
    </div>

    <!-- Blog details dialog when clicking an event -->
    <Dialog 
      v-model:visible="dialogVisible" 
      :header="selectedBlog ? selectedBlog.title : 'Blog Details'" 
      :style="{ width: '500px' }" 
      :modal="true"
      :closable="true"
      :dismissableMask="true"
    >
      <div v-if="selectedBlog" class="blog-details">
        <div class="blog-detail-row">
          <span class="detail-label">Status:</span>
          <Tag :value="selectedBlog.status" :severity="getStatusSeverity(selectedBlog.status)" />
        </div>
        <div class="blog-detail-row">
          <span class="detail-label">Created:</span>
          <span>{{ formatDate(selectedBlog.created_at) }}</span>
        </div>
        <div class="blog-detail-row">
          <span class="detail-label">Available:</span>
          <span>{{ formatDate(selectedBlog.available_date) }}</span>
        </div>
        <div class="blog-detail-row">
          <span class="detail-label">Published:</span>
          <span>{{ formatDate(selectedBlog.published_date) }}</span>
        </div>
        <div class="blog-detail-row" v-if="selectedBlog.keywords && selectedBlog.keywords.length">
          <span class="detail-label">Keywords:</span>
          <div class="keyword-container">
            <Chip v-for="keyword in selectedBlog.keywords" 
              :key="keyword.id" 
              :label="keyword.name" 
              class="keyword-chip" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Edit" icon="pi pi-pencil" @click="editBlog" />
        <Button label="View Details" icon="pi pi-eye" @click="viewBlogDetails" class="p-button-outlined" />
        <Button label="Close" icon="pi pi-times" @click="closeDialog" class="p-button-text" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

// FullCalendar core and plugins
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// PrimeVue components
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// API service (using same API as BlogListView)
import { getBlogList } from '../../services/api'

// Enum for blog status (same as in BlogListView)
const BlogStatus = {
  SCHEDULED: 'scheduled',
  PLANNED: 'planned',
  EDITING: 'editing',
  PUBLISHED: 'published',
  DRAFT: 'draft'
}

// Component state
const router = useRouter()
const fullCalendar = ref(null)
const loading = ref(true)
const error = ref(null)
const blogs = ref([])
const calendarEvents = ref([])
const selectedBlog = ref(null)
const dialogVisible = ref(false)

// Calendar view options
const viewOptions = [
  { name: 'Month', value: 'dayGridMonth' },
  { name: 'Week', value: 'timeGridWeek' }
]
const calendarView = ref(viewOptions[0].value)

// Computed property for the current period label
const currentPeriodLabel = computed(() => {
  if (!fullCalendar.value) return ''
  const calendarApi = fullCalendar.value.getApi()
  if (!calendarApi) return ''
  
  const view = calendarApi.view
  const start = dayjs(view.currentStart)
  
  if (calendarView.value === 'dayGridMonth') {
    return start.format('MMMM YYYY')
  } else {
    const end = dayjs(view.currentEnd).subtract(1, 'day')
    return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
  }
})

// Calendar navigation methods
const prevPeriod = () => {
  if (fullCalendar.value) {
    const calendarApi = fullCalendar.value.getApi()
    calendarApi.prev()
  }
}

const nextPeriod = () => {
  if (fullCalendar.value) {
    const calendarApi = fullCalendar.value.getApi()
    calendarApi.next()
  }
}

const goToToday = () => {
  if (fullCalendar.value) {
    const calendarApi = fullCalendar.value.getApi()
    calendarApi.today()
  }
}

// Dialog methods
const closeDialog = () => {
  dialogVisible.value = false
  selectedBlog.value = null
}

const editBlog = () => {
  if (selectedBlog.value) {
    router.push(`/blog/${selectedBlog.value.id}/edit`)
  }
}

const viewBlogDetails = () => {
  if (selectedBlog.value) {
    router.push(`/blog/${selectedBlog.value.id}`)
  }
}

// Function to get event color based on blog status
const getEventColor = (status) => {
  switch (status) {
    case BlogStatus.PUBLISHED:
      return '#4caf50' // green
    case BlogStatus.SCHEDULED:
      return '#2196f3' // blue
    case BlogStatus.PLANNED:
      return '#ff9800' // orange
    case BlogStatus.EDITING:
      return '#ff5722' // deep orange
    case BlogStatus.DRAFT:
    default:
      return '#9e9e9e' // gray
  }
}

// Get severity for status tag (same as in BlogListView)
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

// Format date using dayjs (same as in BlogListView)
function formatDate(dateString) {
  if (!dateString) return '-'
  return dayjs(dateString).format('MMM D, YYYY')
}

// Convert blogs to calendar events
const convertBlogsToEvents = () => {
  calendarEvents.value = blogs.value.map(blog => {
    // Determine which date to use as the event date
    const eventDate = blog.available_date || blog.published_date || blog.created_at
    
    return {
      id: blog.id,
      title: blog.title,
      start: eventDate,
      backgroundColor: getEventColor(blog.status),
      borderColor: getEventColor(blog.status),
      extendedProps: {
        blog: blog
      }
    }
  })
}

// Calendar options
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: calendarView.value,
  headerToolbar: false, // We're using our own custom header
  events: calendarEvents.value,
  editable: true, // Enable drag and drop
  eventClick: (info) => {
    // Handle event click to show blog details
    selectedBlog.value = info.event.extendedProps.blog
    dialogVisible.value = true
  },
  eventDrop: (info) => {
    // Handle drag and drop to reschedule
    const droppedBlog = info.event.extendedProps.blog
    const newDate = dayjs(info.event.start).format('YYYY-MM-DD')
    
    // This would connect to backend API in a real implementation
    console.log(`Rescheduled blog ${droppedBlog.id} to ${newDate}`)
    
    // For now, update the local data only (UI demo)
    const blogToUpdate = blogs.value.find(b => b.id === droppedBlog.id)
    if (blogToUpdate) {
      blogToUpdate.available_date = newDate
      // If this is a published blog, we would also need to update the status
      if (blogToUpdate.status === BlogStatus.PUBLISHED) {
        blogToUpdate.status = BlogStatus.SCHEDULED
      }
    }
  },
  dayMaxEvents: true, // Allow "more" link when too many events
  height: 'auto'
}))

// Watch for changes in the calendar view
watch(calendarView, (newView) => {
  if (fullCalendar.value) {
    const calendarApi = fullCalendar.value.getApi()
    calendarApi.changeView(newView)
  }
})

// Fetch blog data
onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const result = await getBlogList()
    if (result.success) {
      // Process the data to ensure all required fields are present
      blogs.value = result.posts.map(post => ({
        ...post,
        keywords: post.keywords || [],
        status: post.status || BlogStatus.DRAFT,
        available_date: post.available_date || null,
        published_date: post.published_date || null
      }))
      
      // Convert the blogs to calendar events
      convertBlogsToEvents()
    } else {
      error.value = result.error || 'Failed to load blog posts'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load blog posts'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.calendar-container {
  width: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.calendar-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.date-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-period {
  margin: 0;
  min-width: 150px;
  text-align: center;
}

.calendar-wrapper {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
}

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

/* Blog details dialog styling */
.blog-details {
  padding: 1rem 0;
}

.blog-detail-row {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
}

.detail-label {
  font-weight: 600;
  width: 100px;
  display: inline-block;
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

/* Responsive styles */
@media screen and (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .date-navigation {
    width: 100%;
    justify-content: space-between;
  }
  
  .calendar-controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .view-toggle {
    width: 100%;
  }
  
  .current-period {
    flex: 1;
  }
}
</style>

