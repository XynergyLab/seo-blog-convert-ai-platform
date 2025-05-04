<template>
  <div class="blog-edit">
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
        {{ autoSaveEnabled ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Changes not saved' }}
      </span>
    </div>

    <div class="content-container">
      <div class="editor-section">
        <BlogEditor
          v-model:content="postContent"
          :initial-content="initialContent"
          @change="handleContentChange"
        />
      </div>

      <div class="sidebar">
        <div class="tools-section">
          <BlogOutlineGen 
            @generate="handleOutlineGenerated"
          />

          <BlogSectionGen
            @generate="handleSectionGenerated"
          />
        </div>

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
import BlogEditor from '@/components/blog/BlogEditor.vue'
import BlogOutlineGen from '@/components/blog/BlogOutlineGen.vue'
import BlogSectionGen from '@/components/blog/BlogSectionGen.vue'
import type { BlogContent, BlogPost } from '@/types/blogTypes'

export default defineComponent({
  name: 'BlogEdit',
  components: {
    BlogEditor,
    BlogOutlineGen,
    BlogSectionGen
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const postId = computed(() => route.params.id as string | undefined)
    const saving = ref(false)
    const error = ref<string | null>(null)
    const lastSaved = ref<Date | null>(null)
    const postContent = ref<BlogContent>({ title: '', sections: [] })
    const initialContent = ref<BlogContent | null>(null)
    const autoSaveEnabled = ref(true)

    // TODO: Replace with actual API calls
    const loadPost = async (id: string) => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        initialContent.value = {
          title: `Loaded Post ${id}`,
          sections: [
            { heading: 'Introduction', content: 'Initial content...' }
          ]
        }
      } catch (err) {
        error.value = 'Failed to load post'
      }
    }

    const savePost = async (content: BlogContent) => {
      saving.value = true
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        lastSaved.value = new Date()
        return { success: true }
      } catch (err) {
        error.value = 'Failed to save post'
        return { success: false }
      } finally {
        saving.value = false
      }
    }

    onMounted(async () => {
      if (postId.value) {
        await loadPost(postId.value)
      }
    })

    const handleContentChange = () => {
      if (autoSaveEnabled.value) {
        debouncedSave()
      }
    }

    const debouncedSave = debounce(async () => {
      await savePost(postContent.value)
    }, 3000)

    const handleSave = async () => {
      const { success } = await savePost(postContent.value)
      if (success) {
        router.push({ name: 'BlogDetail', params: { id: postId.value || 'new' } })
      }
    }

    const handleOutlineGenerated = (outline: BlogContent) => {
      postContent.value = outline
    }

    const handleSectionGenerated = (section: { heading: string; content: string }) => {
      postContent.value.sections.push(section)
    }

    const goBack = () => {
      router.go(-1)
    }

    function debounce(fn: Function, delay: number) {
      let timeoutId: number
      return function(...args: any[]) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn.apply(this, args), delay)
      }
    }

    return {
      postId,
      postContent,
      initialContent,
      saving,
      error,
      lastSaved,
      autoSaveEnabled,
      handleContentChange,
      handleSave,
      handleOutlineGenerated,
      handleSectionGenerated,
      goBack
    }
  }
})
</script>

<style scoped>
.blog-edit {
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

.tools-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-message {
  color: #e74c3c;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #fadbd8;
}
</style>

