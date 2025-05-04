<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!post">No post found.</div>
    <div v-else>
      <h2>{{ post.title }}</h2>
      <div style="color:#888;font-size:0.95em;">
        <span v-if="post.created_at">Created: {{ formatDate(post.created_at) }}</span>
        <span v-if="post.published"> • <b>PUBLISHED</b></span>
      </div>
      <div style="margin:1em 0;">
        <strong>Topic:</strong> {{ post.topic }}<br>
        <strong>Keywords:</strong> {{ post.keywords }}
      </div>
      <div style="white-space: pre-line; margin:1em 0;">
        {{ post.content }}
      </div>
      <div>
        <button @click="goToEdit" :disabled="loading">Edit</button>
        <button @click="handleDelete" :disabled="loading" style="margin-left:1em;">Delete</button>
      </div>
      <div v-if="successMsg" class="success">{{ successMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBlog, deleteBlog } from '../../services/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref(null)
const post = ref(null)
const successMsg = ref(null)

async function fetchPost() {
  loading.value = true
  error.value = null
  try {
    const result = await getBlog(route.params.id)
    if (result.success && result.post) {
      post.value = result.post
    } else {
      error.value = result.error || 'Blog post not found'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load blog post'
  } finally {
    loading.value = false
  }
}

function goToEdit() {
  // You could use a query param to toggle edit mode, or route to a dedicated editor view/component
  router.push({ path: `/blog/${post.value.id}`, query: { edit: 'true' } })
}

async function handleDelete() {
  if (!post.value) return
  if (!confirm('Are you sure you want to delete this blog post?')) return
  loading.value = true
  error.value = null
  try {
    const result = await deleteBlog(post.value.id)
    if (result.success) {
      successMsg.value = 'Blog post deleted.'
      setTimeout(() => {
        router.push('/blog')
      }, 1200)
    } else {
      error.value = result.error || 'Failed to delete blog post.'
    }
  } catch (e) {
    error.value = e.message || 'Failed to delete blog post.'
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
button {
  margin-top: 1em;
}
</style>

