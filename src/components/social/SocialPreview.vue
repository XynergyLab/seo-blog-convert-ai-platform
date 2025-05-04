<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!post">No social post found.</div>
    <div v-else class="social-preview">
      <!-- Header with platform and status -->
      <div class="post-header">
        <div class="platform-badge" :class="post.platform">{{ post.platform.toUpperCase() }}</div>
        <div class="status-badge" :class="post.status">{{ post.status }}</div>
      </div>
      
      <!-- Content preview styled by platform -->
      <div class="post-content" :class="`${post.platform}-style`">
        <p>{{ post.content }}</p>
        
        <!-- Hashtags -->
        <div v-if="post.hashtags && post.hashtags.length > 0" class="hashtags">
          <span v-for="tag in post.hashtags" :key="tag" class="hashtag">#{{ tag }}</span>
        </div>
      </div>
      
      <!-- Character count and limits -->
      <div class="char-info">
        <span>Characters: {{ post.content ? post.content.length : 0 }} 
          <span v-if="charLimit">/ {{ charLimit }}</span>
        </span>
      </div>
      
      <!-- Meta information -->
      <div class="post-meta">
        <div v-if="post.created_at">Created: {{ formatDate(post.created_at) }}</div>
        <div v-if="post.scheduled_at">Scheduled: {{ formatDate(post.scheduled_at) }}</div>
        <div v-if="post.published_at">Published: {{ formatDate(post.published_at) }}</div>
      </div>
      
      <!-- Action buttons -->
      <div class="action-buttons">
        <button @click="goToEdit" :disabled="loading">Edit</button>
        
        <button 
          v-if="!isScheduled && !isPublished" 
          @click="showScheduleForm = !showScheduleForm"
          :disabled="loading"
        >
          Schedule
        </button>
        
        <button 
          v-if="!isPublished" 
          @click="handlePublish" 
          :disabled="loading || isPublishing"
        >
          Publish Now
        </button>
        
        <button @click="handleDelete" :disabled="loading || isDeleting" class="delete-btn">
          Delete
        </button>
      </div>
      
      <div v-if="isPublishing" class="status-message">Publishing...</div>
      <div v-if="isDeleting" class="status-message">Deleting...</div>
      <div v-if="successMsg" class="success">{{ successMsg }}</div>
      
      <!-- Schedule form (toggleable) -->
      <div v-if="showScheduleForm" class="schedule-form">
        <h3>Schedule Post</h3>
        <label>
          Schedule Date:
          <input type="date" v-model="scheduleDate" min="{{ todayDate }}" required />
        </label>
        <label>
          Schedule Time:
          <input type="time" v-model="scheduleTime" required />
        </label>
        <div>
          <button @click="handleSchedule" :disabled="!scheduleDate || !scheduleTime || isScheduling">
            Confirm Schedule
          </button>
          <button @click="showScheduleForm = false" class="cancel-btn">
            Cancel
          </button>
        </div>
        <div v-if="isScheduling" class="status-message">Scheduling...</div>
        <div v-if="scheduleError" class="error">{{ scheduleError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocial, publishSocial, deleteSocial, scheduleSocial } from '../../services/api'

const route = useRoute()
const router = useRouter()

// Platform constraints - duplicating backend values
const PLATFORM_CONSTRAINTS = {
  twitter: { charLimit: 280 },
  facebook: { charLimit: 63206 },
  instagram: { charLimit: 2200 },
  linkedin: { charLimit: 3000 }
}

// State management
const post = ref(null)
const loading = ref(true)
const error = ref(null)
const successMsg = ref(null)

// Action state
const isPublishing = ref(false)
const isDeleting = ref(false)
const isScheduling = ref(false)
const showScheduleForm = ref(false)
const scheduleDate = ref('')
const scheduleTime = ref('')
const scheduleError = ref(null)

// Computed properties for post status
const isScheduled = computed(() => post.value?.status === 'scheduled')
const isPublished = computed(() => post.value?.status === 'published')
const charLimit = computed(() => {
  if (!post.value?.platform) return null
  return PLATFORM_CONSTRAINTS[post.value.platform]?.charLimit
})
const todayDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

// Fetch post data
async function fetchPost() {
  loading.value = true
  error.value = null
  try {
    const result = await getSocial(route.params.id)
    if (result.success && result.post) {
      post.value = result.post
    } else {
      error.value = result.error || 'Social post not found'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load social post'
  } finally {
    loading.value = false
  }
}

// Navigation to edit
function goToEdit() {
  router.push({ path: `/social/${post.value.id}`, query: { edit: 'true' } })
}

// Publish the post
async function handlePublish() {
  if (!post.value || isPublished.value) return
  if (!confirm('Are you sure you want to publish this post now?')) return
  
  isPublishing.value = true
  error.value = null
  try {
    const result = await publishSocial(post.value.id)
    if (result.success) {
      successMsg.value = 'Post published successfully!'
      post.value = result.post // Update with new status
    } else {
      error.value = result.error || 'Failed to publish post'
    }
  } catch (e) {
    error.value = e.message || 'Failed to publish post'
  } finally {
    isPublishing.value = false
  }
}

// Delete the post
async function handleDelete() {
  if (!post.value) return
  if (!confirm('Are you sure you want to delete this social post?')) return
  
  isDeleting.value = true
  error.value = null
  try {
    const result = await deleteSocial(post.value.id)
    if (result.success) {
      successMsg.value = 'Social post deleted.'
      setTimeout(() => {
        router.push('/social')
      }, 1200)
    } else {
      error.value = result.error || 'Failed to delete post.'
    }
  } catch (e) {
    error.value = e.message || 'Failed to delete post.'
  } finally {
    isDeleting.value = false
  }
}

// Schedule the post
async function handleSchedule() {
  if (!post.value || !scheduleDate.value || !scheduleTime.value) return
  
  isScheduling.value = true
  scheduleError.value = null
  
  try {
    const scheduledAt = `${scheduleDate.value}T${scheduleTime.value}:00`
    const result = await scheduleSocial(post.value.id, { scheduled_at: scheduledAt })
    if (result.success) {
      post.value = result.post // Update with new status
      successMsg.value = `Post scheduled for ${formatDate(scheduledAt)}`
      showScheduleForm.value = false
    } else {
      scheduleError.value = result.error || 'Failed to schedule post'
    }
  } catch (e) {
    scheduleError.value = e.message || 'Failed to schedule post'
  } finally {
    isScheduling.value = false
  }
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d)) return dateString
  return d.toLocaleString()
}

onMounted(fetchPost)
</script>

<style scoped>
.error {
  color: red;
  margin: 10px 0;
}
.success {
  color: green;
  margin: 10px 0;
}
.status-message {
  font-style: italic;
  color: #666;
  margin: 5px 0;
}
.social-preview {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1em;
  max-width: 600px;
  margin: 0 auto;
}
.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
}
.platform-badge {
  font-weight: bold;
  border-radius: 4px;
  padding: 4px 8px;
  margin-right: 10px;
  color: white;
}
.platform-badge.twitter {
  background-color: #1DA1F2;
}
.platform-badge.facebook {
  background-color: #4267B2;
}
.platform-badge.instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
}
.platform-badge.linkedin {
  background-color: #0077B5;
}
.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8em;
}
.status-badge.draft {
  background-color: #f0f0f0;
}
.status-badge.scheduled {
  background-color: #fff8e6;
}
.status-badge.published {
  background-color: #e6f7e6;
}
.status-badge.failed {
  background-color: #ffeeee;
}
.post-content {
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 1em;
  white-space: pre-line;
}
.twitter-style {
  background-color: #f8f8f8;
  border: 1px solid #e1e8ed;
}
.facebook-style {
  background-color: #f5f6f7;
  border: 1px solid #dddfe2;
}
.instagram-style {
  background-color: #ffffff;
  border: 1px solid #efefef;
}
.linkedin-style {
  background-color: #f3f6f8;
  border: 1px solid #e6e9ec;
}
.hashtags {
  margin-top: 10px;
}
.hashtag {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 5px;
  font-size: 0.9em;
  color: #666;
}
.char-info {
  font-size: 0.8em;
  color: #666;
  text-align: right;
  margin-bottom: 10px;
}
.post-meta {
  border-top: 1px solid #eee;
  margin-top: 15px;
  padding-top: 10px;
  font-size: 0.9em;
  color: #666;
}
.action-buttons {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}
.delete-btn {
  background-color: #ffeeee;
}
.schedule-form {
  margin-top: 20px;
  padding: 15px;
  border: 1px dashed #ccc;
  border-radius: 4px;
}
.schedule-form label {
  display: block;
  margin-bottom: 10px;
}
.schedule-form input {
  margin-left: 10px;
}
.cancel-btn {
  background-color: #f0f0f0;
}
</style>

