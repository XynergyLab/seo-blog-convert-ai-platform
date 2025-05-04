<template>
  <div class="schedule-component">
    <h3 v-if="showTitle">Schedule Post</h3>
    
    <!-- Schedule form inputs -->
    <div class="schedule-form">
      <div class="form-group">
        <label for="schedule-date">Date</label>
        <input 
          id="schedule-date"
          type="date" 
          v-model="scheduleDate" 
          :min="minDate"
          :disabled="loading" 
          required
        />
      </div>
      
      <div class="form-group">
        <label for="schedule-time">Time</label>
        <input 
          id="schedule-time"
          type="time" 
          v-model="scheduleTime" 
          :disabled="loading" 
          required
        />
      </div>
      
      <!-- Date-time preview -->
      <div v-if="scheduleDate && scheduleTime" class="date-preview">
        Will be scheduled for: {{ formatDateTime }}
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="error">{{ error }}</div>
      
      <!-- Action buttons -->
      <div class="button-group">
        <button 
          type="button"
          @click="handleSchedule" 
          :disabled="!isValid || loading"
          class="primary-btn"
        >
          {{ loading ? 'Scheduling...' : 'Schedule Post' }}
        </button>
        
        <button 
          v-if="showCancel"
          type="button"
          @click="cancel" 
          :disabled="loading"
          class="cancel-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { scheduleSocial } from '../../services/api'

// Props
const props = defineProps({
  postId: {
    type: String,
    required: true
  },
  showTitle: {
    type: Boolean,
    default: true
  },
  showCancel: {
    type: Boolean,
    default: true
  },
})

// Emits for parent component communication
const emit = defineEmits(['scheduled', 'canceled', 'error'])

// Component state
const scheduleDate = ref('')
const scheduleTime = ref('')
const loading = ref(false)
const error = ref(null)

// Get min date (today)
const minDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

// Format date and time for display
const formatDateTime = computed(() => {
  if (!scheduleDate.value || !scheduleTime.value) return ''
  try {
    const dateTime = new Date(`${scheduleDate.value}T${scheduleTime.value}:00`)
    return dateTime.toLocaleString()
  } catch (e) {
    return 'Invalid date/time'
  }
})

// Validation
const isValid = computed(() => {
  if (!scheduleDate.value || !scheduleTime.value) return false
  
  try {
    // Validate date is not in the past
    const scheduledDateTime = new Date(`${scheduleDate.value}T${scheduleTime.value}:00`)
    const now = new Date()
    
    // Date must be in the future (with a small buffer)
    if (scheduledDateTime.getTime() <= now.getTime()) {
      error.value = 'Schedule time must be in the future'
      return false
    }
    
    return true
  } catch (e) {
    error.value = 'Invalid date or time format'
    return false
  }
})

// Clear error when inputs change
watch([scheduleDate, scheduleTime], () => {
  error.value = null
})

// Schedule the post
async function handleSchedule() {
  if (!isValid.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const scheduledAt = `${scheduleDate.value}T${scheduleTime.value}:00`
    const result = await scheduleSocial(props.postId, { scheduled_at: scheduledAt })
    
    if (result.success) {
      // Emit success with the updated post
      emit('scheduled', result.post)
    } else {
      error.value = result.error || 'Failed to schedule post'
      emit('error', error.value)
    }
  } catch (e) {
    error.value = e.message || 'Failed to schedule post'
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

// Cancel scheduling
function cancel() {
  emit('canceled')
}

// Expose methods to parent
defineExpose({
  reset() {
    scheduleDate.value = ''
    scheduleTime.value = ''
    error.value = null
  }
})
</script>

<style scoped>
.schedule-component {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1em;
  margin: 1em 0;
  background-color: #f9f9f9;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: bold;
  margin-bottom: 0.3em;
}

input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.date-preview {
  font-size: 0.9em;
  color: #666;
  margin-top: 0.5em;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 0.5em;
}

.primary-btn {
  background-color: #4c7daf;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.primary-btn:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  color: #e74c3c;
  font-size: 0.9em;
}
</style>

