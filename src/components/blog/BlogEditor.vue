<template>
  <div class="blog-editor">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="error" class="error">{{ error }}</div>
    
    <form v-if="!loading" @submit.prevent="handleSubmit">
      <div>
        <label for="title">Title</label>
        <input id="title" v-model="title" type="text" required placeholder="Blog title" />
      </div>
      
      <div>
        <label for="topic">Topic</label>
        <input id="topic" v-model="topic" type="text" required placeholder="Blog topic" />
      </div>
      
      <div>
        <label for="keywords">Keywords</label>
        <input id="keywords" v-model="keywords" type="text" placeholder="Keywords (comma separated)" />
      </div>
      
      <div>
        <label for="content">Content</label>
        <textarea id="content" v-model="content" rows="10" required placeholder="Blog content" />
      </div>
      
      <button type="submit" :disabled="saving">Save Changes</button>
      <button @click.prevent="goToPreview" :disabled="saving" style="margin-left:1em;">Cancel</button>
      <div v-if="saving" class="info">Saving...</div>
      <div v-if="successMsg" class="success">{{ successMsg }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBlog, editBlog } from '../../services/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const successMsg = ref(null)

const title = ref('')
const topic = ref('')
const keywords = ref('')
const content = ref('')

async function fetchPost() {
  loading.value = true
  error.value = null
  try {
    const result = await getBlog(route.params.id)
    if (result.success && result.post) {
      title.value = result.post.title
      topic.value = result.post.topic
      keywords.value = result.post.keywords
      content.value = result.post.content
    } else {
      error.value = result.error || 'Blog post not found.'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load blog post.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  error.value = null
  successMsg.value = null
  try {
    const payload = {
      title: title.value,
      topic: topic.value,
      keywords: keywords.value,
      content: content.value
    }
    const result = await editBlog(route.params.id, payload)
    if (result.success && result.post) {
      successMsg.value = 'Blog post updated!'
      setTimeout(() => {
        router.push(`/blog/${route.params.id}`)
      }, 1200)
    } else {
      error.value = result.error || 'Failed to update blog post'
    }
  } catch (e) {
    error.value = e.message || 'Failed to update blog post'
  } finally {
    saving.value = false
  }
}

function goToPreview() {
  router.push(`/blog/${route.params.id}`)
}

onMounted(fetchPost)
</script>

<style scoped>
.blog-editor {
  max-width: 800px;
  margin: 0 auto;
}

form > div {
  margin: 10px 0;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.error {
  color: red;
  margin: 10px 0;
}

.success {
  color: green;
  margin: 10px 0;
}

.info {
  color: #555;
}

.loading {
  color: #555;
  margin: 20px 0;
}

button {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #0b7dda;
}

button[disabled] {
  background: #ddd;
  cursor: not-allowed;
}
</style>

