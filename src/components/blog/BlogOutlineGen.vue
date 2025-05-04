<template>
  <div>
    <h2>Generate Blog Outline</h2>
    <form @submit.prevent="handleSubmit">
      <div>
        <label>Title</label>
        <input v-model="title" required placeholder="Blog title" />
      </div>
      <div>
        <label>Topic</label>
        <input v-model="topic" required placeholder="Blog topic" />
      </div>
      <div>
        <label>Purpose</label>
        <input v-model="purpose" required placeholder="Purpose (e.g. informative)" />
      </div>
      <div>
        <label>Audience</label>
        <input v-model="audience" required placeholder="Target audience" />
      </div>
      <div>
        <label>Tone</label>
        <select v-model="tone">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="persuasive">Persuasive</option>
        </select>
      </div>
      <button type="submit" :disabled="loading">Generate Outline</button>
    </form>
    <div v-if="loading">Generating outline...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-if="outline && outline.length">
      <h3>Generated Outline</h3>
      <ol>
        <li v-for="section in outline" :key="section.id">
          <strong>{{ section.title }}</strong>
          <div style="margin-left:1em;">{{ section.content }}</div>
        </li>
      </ol>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { generateBlogOutline } from '../../services/api'

const title = ref('')
const topic = ref('')
const purpose = ref('')
const audience = ref('')
const tone = ref('professional')
const loading = ref(false)
const error = ref(null)
const outline = ref([])

async function handleSubmit() {
  loading.value = true
  error.value = null
  outline.value = []
  try {
    const payload = { title: title.value, topic: topic.value, purpose: purpose.value, audience: audience.value, tone: tone.value }
    const result = await generateBlogOutline(payload)
    if (result.success && result.outline) {
      outline.value = Array.isArray(result.outline) ? result.outline : []
      if (outline.value.length === 0) error.value = "No outline returned."
    } else {
      error.value = result.error || 'Failed to generate outline'
    }
  } catch (e) {
    error.value = e.message || 'Failed to generate outline'
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.error { color: red; margin: 10px 0; }
form > div { margin: 10px 0; }
</style>

