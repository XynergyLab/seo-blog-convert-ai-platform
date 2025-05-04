<template>
  <div>
    <h2>Create Social Media Post</h2>
    <form @submit.prevent="handleSubmit">
      <div>
        <label>Platform</label>
        <select v-model="platform" required @change="updateCharLimit">
          <option value="">Select Platform</option>
          <option value="twitter">Twitter</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>
      <div>
        <label>Topic</label>
        <input v-model="topic" type="text" required placeholder="Post topic" />
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
        <label>Include Hashtags</label>
        <input type="checkbox" v-model="includeHashtags" />
      </div>
      <div v-if="includeHashtags">
        <label>Number of Hashtags</label>
        <select v-model="hashtagCount">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="8">8</option>
        </select>
      </div>
      
      <div v-if="charLimit > 0" class="char-limit">
        <div class="limit-text">Character limit for {{ platform }}: {{ charLimit }}</div>
        <div class="platform-note" v-if="platform === 'instagram'">
          Note: Instagram requires at least one media attachment (simplified for MVP)
        </div>
      </div>
      
      <button type="submit" :disabled="loading || !platform">Generate Social Post</button>
    </form>
    <div v-if="loading">Generating social media post...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-if="successMsg" class="success">{{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createSocial } from '../../services/api'

const router = useRouter()

// Platform constraints - duplicating backend values for UI
const PLATFORM_CONSTRAINTS = {
  twitter: { charLimit: 280 },
  facebook: { charLimit: 63206 },
  instagram: { charLimit: 2200, requiresMedia: true },
  linkedin: { charLimit: 3000 }
}

// Form state
const platform = ref('')
const topic = ref('')
const tone = ref('professional')
const includeHashtags = ref(true)
const hashtagCount = ref(3)
const loading = ref(false)
const error = ref(null)
const successMsg = ref(null)

// Get character limit based on selected platform
const charLimit = computed(() => {
  if (!platform.value) return 0
  return PLATFORM_CONSTRAINTS[platform.value]?.charLimit || 0
})

function updateCharLimit() {
  // Reset any errors when platform changes
  error.value = null
}

async function handleSubmit() {
  loading.value = true
  error.value = null
  successMsg.value = null
  
  try {
    if (!platform.value) {
      error.value = 'Please select a platform'
      loading.value = false
      return
    }
    
    const payload = {
      platform: platform.value,
      topic: topic.value,
      tone: tone.value,
      include_hashtags: includeHashtags.value,
      hashtag_count: Number(hashtagCount.value)
    }
    
    const result = await createSocial(payload)
    if (result.success && result.post) {
      successMsg.value = 'Social media post generated!'
      // Navigate to preview after short delay
      setTimeout(() => {
        router.push(`/social/${result.post.id}`)
      }, 1200)
    } else {
      error.value = result.error || 'Failed to create social post'
    }
  } catch (e) {
    error.value = e.message || 'Failed to create social post'
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
.char-limit {
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  margin: 15px 0;
}
.limit-text {
  font-weight: bold;
}
.platform-note {
  color: #ff6600;
  margin-top: 5px;
  font-size: 0.9em;
}
button[disabled] {
  background: #ddd;
  cursor: not-allowed;
}
</style>

