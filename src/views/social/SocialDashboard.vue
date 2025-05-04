<template>
  <div class="social-dashboard">
    <div class="dashboard-header">
      <h2>Social Media Dashboard</h2>
      <div class="action-buttons">
        <button 
          class="create-button"
          @click="showCreateForm = true"
        >
          Create New Post
        </button>
        <button 
          class="refresh-button"
          @click="refreshPosts"
          :disabled="loading"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="main-content">
        <SocialPostListView 
          :posts="posts"
          :loading="loading"
          @post-selected="handlePostSelected"
          @post-deleted="handlePostDeleted"
        />
      </div>
      
      <div class="sidebar">
        <SocialSchedule
          :scheduled-posts="scheduledPosts"
          @date-selected="handleDateSelection"
          @schedule-updated="handleScheduleUpdated"
        />
      </div>
    </div>

    <SocialCreateForm 
      v-if="showCreateForm"
      @submit="handleCreateSubmit"
      @cancel="showCreateForm = false"
    />

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SocialPostListView from '@/components/social/SocialPostListView.vue'
import SocialCreateForm from '@/components/social/SocialCreateForm.vue'
import SocialSchedule from '@/components/social/SocialSchedule.vue'
import type { SocialPost, SocialPostCreate } from '@/types/socialTypes'

export default defineComponent({
  name: 'SocialDashboard',
  components: {
    SocialPostListView,
    SocialCreateForm,
    SocialSchedule
  },
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const showCreateForm = ref(false)
    const posts = ref<SocialPost[]>([])
    const scheduledPosts = ref<SocialPost[]>([])

    // TODO: Replace with actual API calls
    const loadPosts = async () => {
      loading.value = true
      error.value = null
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        posts.value = [
          {
            id: '1',
            content: 'Sample social post',
            platform: 'twitter',
            scheduledAt: new Date(),
            status: 'published'
          },
          {
            id: '2', 
            content: 'Another post',
            platform: 'facebook',
            scheduledAt: new Date(Date.now() + 86400000),
            status: 'scheduled'
          }
        ]
        scheduledPosts.value = posts.value.filter(p => p.status === 'scheduled')
      } catch (err) {
        error.value = 'Failed to load posts'
      } finally {
        loading.value = false
      }
    }

    const refreshPosts = () => {
      loadPosts()
    }

    const handleCreateSubmit = async (newPost: SocialPostCreate) => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        const createdPost = {
          ...newPost,
          id: Date.now().toString(),
          status: newPost.scheduledAt ? 'scheduled' : 'draft'
        }
        posts.value = [createdPost, ...posts.value]
        if (createdPost.status === 'scheduled') {
          scheduledPosts.value = [createdPost, ...scheduledPosts.value]
        }
        showCreateForm.value = false
      } catch (err) {
        error.value = 'Failed to create post'
      }
    }

    const handlePostSelected = (post: SocialPost) => {
      router.push({ name: 'SocialDetail', params: { id: post.id } })
    }

    const handlePostDeleted = (postId: string) => {
      posts.value = posts.value.filter(p => p.id !== postId)
      scheduledPosts.value = scheduledPosts.value.filter(p => p.id !== postId)
    }

    const handleDateSelection = (date: Date) => {
      console.log('Date selected for filtering:', date)
      // Implement date-based filtering if needed
    }

    const handleScheduleUpdated = (updatedPost: SocialPost) => {
      posts.value = posts.value.map(p => 
        p.id === updatedPost.id ? updatedPost : p
      )
      scheduledPosts.value = scheduledPosts.value.map(p =>
        p.id === updatedPost.id ? updatedPost : p
      )
    }

    onMounted(() => {
      loadPosts()
    })

    return {
      loading,
      error,
      showCreateForm,
      posts,
      scheduledPosts,
      refreshPosts,
      handleCreateSubmit,
      handlePostSelected,
      handlePostDeleted,
      handleDateSelection,
      handleScheduleUpdated
    }
  }
})
</script>

<style scoped>
.social-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.dashboard-content {
  display: flex;
  gap: 2rem;
}

.main-content {
  flex: 3;
}

.sidebar {
  flex: 1;
}

.create-button {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.create-button:hover {
  opacity: 0.9;
}

.refresh-button {
  padding: 0.5rem 1rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #fadbd8;
  margin-top: 1rem;
}
</style>

