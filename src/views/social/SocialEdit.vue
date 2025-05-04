<template>
  <div class="social-edit">
    <div class="header">
      <button class="back-button" @click="goBack">← Back</button>
      <h2>{{ postId ? 'Edit Post' : 'Create New Post' }}</h2>
    </div>

    <div class="edit-controls">
      <button 
        class="save-button"
        :disabled="saving"
        @click="handleSave"
      >
        {{ saving ? 'Saving...' : 'Save Post' }}
      </button>
      <button class="cancel-button" @click="goBack">Cancel</button>
      <span v-if="lastSaved" class="save-status">
        {{ lastSaved.toLocaleTimeString() }}
      </span>
    </div>

    <div class="content-container">
      <div class="editor-section">
        <SocialEditor
          ref="editor"
          :initial-post="currentPost"
          @change="handleContentChange"
        />
      </div>

      <div class="sidebar">
        <SocialSchedule
          :initial-date="currentPost.scheduledAt"
          @schedule-updated="handleScheduleUpdate"
        />
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialEditor from '@/components/social/SocialEditor.vue'
import SocialSchedule from '@/components/social/SocialSchedule.vue'
import type { SocialPost, SocialPostCreate } from '@/types/socialTypes'

export default defineComponent({
  name: 'SocialEdit',
  components: {
    SocialEditor,
    SocialSchedule
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const editor = ref()
    const saving = ref(false)
    const error = ref<string | null>(null)
    const lastSaved = ref<Date | null>(null)
    const currentPost = ref<SocialPost | SocialPostCreate>({
      content: '',
      platform: 'twitter',
      scheduledAt: null
    })

    const postId = computed(() => route.params.id as string | undefined)

    // TODO: Replace with actual API call
    const loadPost = async (id: string) => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        currentPost.value = {
          id,
          content: `Existing post content ${id}`,
          platform: id === '1' ? 'twitter' : 'facebook',
          scheduledAt: id === '2' ? new Date(Date.now() + 86400000) : new Date(),
          status: id === '2' ? 'scheduled' : 'published'
        }
      } catch (err) {
        error.value = 'Failed to load post'
      }
    }

    const savePost = async () => {
      saving.value = true
      error.value = null
      
      try {
        const postData = await editor.value?.getPostData()
        if (!postData) {
          throw new Error('Invalid post data')
        }

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        lastSaved.value = new Date()
        
        return { success: true, postId: postId.value || Date.now().toString() }
      } catch (err) {
        error.value = 'Failed to save post'
        return { success: false }
      } finally {
        saving.value = false
      }
    }

    const handleSave = async () => {
      const { success, postId: newId } = await savePost()
      if (success) {
        router.push({ 
          name: 'SocialDetail', 
          params: { id: postId.value || newId } 
        })
      }
    }

    const handleContentChange = () => {
      // Handle auto-save or validation if needed
    }

    const handleScheduleUpdate = (date: Date | null) => {
      currentPost.value.scheduledAt = date
      if (editor.value) {
        editor.value.updateSchedule(date)
      }
    }

    const goBack = () => {
      router.go(-1)
    }

    onMounted(() => {
      if (postId.value) {
        loadPost(postId.value)
      }
    })

    return {
      editor,
      saving,
      error,
      lastSaved,
      currentPost,
      postId,
      handleSave,
      handleContentChange,
      handleScheduleUpdate,
      goBack
    }
  }
})
</script>

<style scoped>
.social-edit {
  padding: 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.edit-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.content-container {
  display: flex;
  gap: 2rem;
}

.editor-section {
  flex: 3;
}

.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.save-button {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cancel-button {
  padding: 0.5rem 1rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-status {
  margin-left: auto;
  color: #666;
  font-size: 0.9rem;
}

.error-message {
  color: #e74c3c;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #fadbd8;
}
</style>

