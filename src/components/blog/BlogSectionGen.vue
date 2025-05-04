<template>
  <div>
    <h2>Generate Blog Section Content</h2>
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
      <div>
        <label>Length</label>
        <select v-model="length">
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
          <option value="comprehensive">Comprehensive</option>
        </select>
      </div>
      <div>
        <label>Section ID</label>
        <input v-model="sectionId" required placeholder="Section ID (e.g. introduction)" />
      </div>
      <div>
        <label>Section Title</label>
        <input v-model="sectionTitle" required placeholder="Section title" />
      </div>
      <div>
        <label>Section Description</label>
        <input v-model="sectionDescription" required placeholder="Section description" />
      </div>
      <div>
        <label>Outline (JSON array)</label>
        <textarea v-model="outline" rows="4" required placeholder='Paste outline as JSON array...'></textarea>
      </div>
      <button type="submit" :disabled="loading">Generate Section</button>
    </form>
    <div v-if="loading">Generating section content...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-if="content">
      <h3>Generated Section Content</h3>
      <div style="white-space: pre-line; border:1px solid #ccc; padding:1em; margin:1em 0;">{{ content }}</div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { generateBlogSection } from '../../services/api'

const title = ref('')
const topic = ref('')
const purpose = ref('')
const audience = ref('')
const tone = ref('professional')
const length = ref('medium')
const sectionId = ref('')
const sectionTitle = ref('')
const sectionDescription = ref('')
const outline = ref('')
const loading = ref(false)
const error = ref(null)
const content = ref('')

async function handleSubmit() {
  loading.value = true
  error.value = null
  content.value = ''
  let parsedOutline
  try {
    parsedOutline = JSON.parse(outline.value)
  } catch (e) {
    error.value = 'Outline must be a valid JSON array.'
    loading.value = false
    return
  }
  try {
    const payload = {
      title: title.value,
      topic: topic.value,
      purpose: purpose.value,
      audience: audience.value,
      tone: tone.value,
      length: length.value,
      sectionId: sectionId.value,
      sectionTitle: sectionTitle.value,
      sectionDescription: sectionDescription.value,
      outline: parsedOutline
    }
    const result = await generateBlogSection(payload)
    if (result.success && result.content) {
      content.value = result.content
    } else {
      error.value = result.error || 'Failed to generate section'
    }
  } catch (e) {
    error.value = e.message || 'Failed to generate section'
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.error { color: red; margin: 10px 0; }
form > div { margin: 10px 0; }
</style>

