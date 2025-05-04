<template>
  <div>
    <h2>Social Media Posts</h2>
    
    <!-- Filter controls -->
    <div class="filters">
      <div>
        <label>Platform:</label>
        <select v-model="platformFilter" @change="fetchPosts">
          <option value="all">All Platforms</option>
          <option value="twitter">Twitter</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>
      <div>
        <label>Status:</label>
        <select v-model="statusFilter" @change="fetchPosts">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
      </div>
    </div>
    
    <!-- Posts list -->
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="posts.length === 0" style="margin-top:1em;">No social posts found.</div>
    <ul v-else class="post-list">
      <li v-for="post in posts" :key="post.id" class="post-item">
        <div class="post-header">
          <router-link :to="`/social/${post.id}`" class="post-link">
            <span class="platform">{{ post.platform.toUpperCase() }}</span>
            <span class="status" :class="post.status">{{ post.status }}</span>
          </router-link>
        </div>
        <div class="post-content">{{ truncateText(post.content, 100) }}</div>
        <div class="post-meta">
          <span v-if="post.created_at">Created: {{ formatDate(post.created_at) }}</span>
          <span v-if="post.scheduled_at">• Scheduled: {{ formatDate(post.scheduled_at) }}</span>
          <span v-if="post.published_at">• Published: {{ formatDate(post.published_at) }}</span>
        </div>
        <div v-if="post.hashtags && post.hashtags.length > 0" class="hashtags">
          <span v-for="tag in post.hashtags" :key="tag" class="hashtag">#{{ tag }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSocialList } from '../../services/api'

const posts = ref([])
const loading = ref(true)
const error = ref(null)
const platformFilter = ref('all')
const statusFilter = ref('all')

async function fetchPosts() {
  loading.value = true
  error.value = null
  try {
    // Prepare query parameters for filtering
    const params = {}
    if (platformFilter.value !== 'all') {
      params.platform = platformFilter.value
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    // Call the API with filters
    const result = await getSocialList(params)
    if (result.success) {
      posts.value = result.posts || []
    } else {
      error.value = result.error || 'Failed to load social posts'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load social posts'
  } finally {
    loading.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d)) return dateString
  return d.toLocaleString()
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

onMounted(fetchPosts)
</script>

<style scoped>
.error {
  color: red;
  margin: 10px 0;
}

.filters {
  display: flex;
  margin-bottom: 1em;
}

.filters > div {
  margin-right: 1em;
}

.post-list {
  list-style: none;
  padding: 0;
}

.post-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.8em;
  margin-bottom: 1em;
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
}

.post-link {
  color: inherit;
  text-decoration: none;
  display: flex;
  align-items: center;
}

.platform {
  font-weight: bold;
  margin-right: 0.5em;
}

.status {
  font-size: 0.8em;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  margin-left: 0.5em;
}

.status.draft {
  background-color: #f0f0f0;
}

.status.scheduled {
  background-color: #fff8e6;
}

.status.published {
  background-color: #e6f7e6;
}

.status.failed {
  background-color: #ffeeee;
}

.post-content {
  margin-bottom: 0.5em;
}

.post-meta {
  font-size: 0.85em;
  color: #666;
}

.hashtags {
  margin-top: 0.5em;
}

.hashtag {
  font-size: 0.85em;
  background-color: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  margin-right: 0.3em;
}
</style>

