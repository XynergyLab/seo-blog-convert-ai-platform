<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <form v-else @submit.prevent="handleSubmit" class="edit-form">
      <h2>Edit Social Post</h2>
      
      <!-- Platform badge (non-editable) -->
      <div class="platform-info">
        <div class="platform-badge" :class="platform">{{ platform.toUpperCase() }}</div>
        <div class="char-counter" :class="{ 'over-limit': contentLength > charLimit }">
          {{ contentLength }} / {{ charLimit }} characters
        </div>
      </div>
      
      <!-- Content area -->
      <div>
        <label>Content</label>
        <textarea
          v-model="content"
          rows="5"
          required
          :maxlength="charLimit + 5"
          @input="validateContent"
          :class="{ 'input-error': contentLength > charLimit }"
        ></textarea>
        <div v-if="contentLength > charLimit" class="limit-warning">
          Content exceeds platform limit by {{ contentLength - charLimit }} characters
        </div>
      </div>
      
      <!-- Hashtags editor -->
      <div>
        <label>Hashtags</label>
        <input
          v-model="hashtagsInput"
          placeholder="Enter hashtags separated by spaces or commas (without # prefix)"
        />
        <div class="hashtag-preview">
          <span
            v-for="tag in parsedHashtags"
            :key="tag"
            class="hashtag"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
      
      <!-- Topic (for context) -->
      <div>
        <label>Topic</label>
        <input v-model="topic" type="text" required />
      </div>
      
      <!-- Action buttons -->
      <div class="button-group">
        <button
          type="submit"
          :disabled="saving || contentLength > charLimit"
        >
          Save Changes
        </button>
        <button
          type="button"
          @click="goToPreview"
          :disabled="saving"
          class="cancel-btn"
        >
          Cancel
        </button>
      </div>
      
      <div v-if="saving" class="status-message">Saving changes...</div>
      <div v-if="successMsg" class="success">{{ successMsg }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocial, editSocial } from '../../services/api'

const route = useRoute()
const router = useRouter()

// Platform constraints
const PLATFORM_CONSTRAINTS = {
  twitter: { charLimit: 280 },
  facebook: { charLimit: 63206 },
  instagram: { charLimit: 2200 },
  linkedin: { charLimit: 3000 }
}

// Form state
const content = ref('')
const hashtagsInput = ref('')
const topic = ref('')
const platform = ref('')

// Component state
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const successMsg = ref(null)
const validationError = ref(null)

// Computed properties
const charLimit = computed(() => {
  return PLATFORM_CONSTRAINTS[platform.value]?.charLimit || 1000
})

const contentLength = computed(() => {
  return content.value.length
})

const parsedHashtags = computed(() => {
  if (!hashtagsInput.value) return []
  
  // Split by spaces and commas, clean up
  return hashtagsInput.value
    .replace(/,/g, ' ')
    .split(' ')
    .map(tag => tag.trim().replace(/^#/, '')) // Remove # prefix if present
    .filter(tag => tag && tag.length > 0)
})

// Fetch post data
async function fetchPost() {
  loading.value = true
  error.value = null
  try {
    const result = await getSocial(route.params.id)
    if (result.success && result.post) {
      content.value = result.post.content
      topic.value = result.post.topic
      platform.value = result.post.platform
      
      // Format hashtags for input
      if (result.post.hashtags && Array.isArray(result.post.hashtags)) {
        hashtagsInput.value = result.post.hashtags.join(' ')
      }
    } else {
      error.value = result.error || 'Social post not found'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load social post'
  } finally {
    loading.value = false
  }
}

// Validate content against platform limits
function validateContent() {
  if (contentLength.value > charLimit.value) {
    validationError.value = `Content exceeds ${platform.value} character limit`
  } else {
    validationError.value = null
  }
}

// Submit changes
async function handleSubmit() {
  // Final validation
  if (contentLength.value > charLimit.value) {
    error.value = `Content exceeds the ${platform.value} character limit (${charLimit.value})`
    return
  }
  
  saving.value = true
  error.value = null
  successMsg.value = null
  
  try {
    const payload = {
      content: content.value,
      topic: topic.value,
      hashtags: parsedHashtags.value
    }
    
    const result = await editSocial(route.params.id, payload)
    if (result.success) {
      successMsg.value = 'Social post updated successfully!'
      // Navigate back to preview after a short delay
      setTimeout(() => {
        router.push(`/social/${route.params.id}`)
      }, 1200)
    } else {
      error.value = result.error || 'Failed to update social post'
    }
  } catch (e) {
    error.value = e.message || 'Failed to update social post'
  } finally {
    saving.value = false
  }
}

// Return to preview
function goToPreview() {
  router.push(`/social/${route.params.id}`)
}

// Watch for character limit issues
watch(content, validateContent)

// Initialize component
onMounted(fetchPost)
</script>

<style scoped>
.edit-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 1em;
}

.platform-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}

.platform-badge {
  font-weight: bold;
  border-radius: 4px;
  padding: 4px 8px;
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

.char-counter {
  font-size: 0.85em;
  color: #666;
}

.over-limit {
  color: red;
  font-weight: bold;
}

textarea {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
}

.input-error {
  border: 1px solid red;
  background-color: #fff8f8;
}

.limit-warning {
  color: red;
  font-size: 0.85em;
  margin-top: 4px;
}

.hashtag-preview {
  margin-top: 8px;
}

.hashtag {
  background-color: #f0f0f0;
  padding: 3px 6px;
  border-radius: 3px;
  margin-right: 5px;
  font-size: 0.9em;
}

.button-group {
  margin-top: 1.5em;
  display: flex;
  gap: 10px;
}

.cancel-btn {
  background-color: #f0f0f0;
}

label {
  display: block;
  margin-top: 1em;
  margin-bottom: 0.3em;
  font-weight: bold;
}

input, textarea {
  width: 100%;
  padding: 8px;
}

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
</style>

