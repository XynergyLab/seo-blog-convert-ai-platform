<template>
  <div>
    <h2>Create Blog Post</h2>
    <form @submit.prevent="handleSubmit">
      <div>
        <label>Title</label>
        <input v-model="title" type="text" required placeholder="Blog title" />
      </div>
      <div>
        <label>Topic</label>
        <input v-model="topic" type="text" required placeholder="Blog topic" />
      </div>
      <div>
        <label>Keywords</label>
        <input v-model="keywords" type="text" placeholder="Keywords (comma separated)" />
      </div>
      <div>
        <label>Tone</label>
        <select v-model="tone">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="persuasive">Persuasive</option>
          <option value="friendly">Friendly</option>
          <option value="authoritative">Authoritative</option>
        </select>
      </div>
      <div>
        <label>Length</label>
        <select v-model="length">
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>
      <button type="submit" :disabled="loading">Generate Blog</button>
    </form>
    <div v-if="loading">Generating blog post...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-if="successMsg" class="success">{{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createBlog } from '../../services/api'

const router = useRouter()
const title = ref('')
const topic = ref('')
const keywords = ref('')
const tone = ref('professional')
const length = ref('medium')
const loading = ref(false)
const error = ref(null)
const successMsg = ref(null)

async function handleSubmit() {
  loading.value = true
  error.value = null
  successMsg.value = null
  try {
    const payload = {
      title: title.value,
      topic: topic.value,
      keywords: keywords.value,
      tone: tone.value,
      length: length.value,
    }
    const result = await createBlog(payload)
    if (result.success && result.post) {
      successMsg.value = 'Blog post generated!'
      // Optional: you could clear the form here if you don't route away
      router.push(`/blog/${result.post.id}`)
    } else {
      error.value = result.error || 'Failed to create blog post'
    }
  } catch (e) {
    error.value = e.message || 'Failed to create blog post'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
form > div {
  margin: 10px 0;
}
.error {
  color: red;
  margin: 10px 0;
}
.success {
  color: green;
  margin: 10px 0;
}
button[disabled] {
  background: #ddd;
  cursor: not-allowed;
}
</style>

