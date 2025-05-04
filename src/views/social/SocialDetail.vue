<template>
  <div class="social-detail">
    <div class="header">
      <button class="back-button" @click="goBack">← Back to List</button>
      <div class="action-buttons">
        <button 
          class="edit-button"
          @click="editPost"
        >
          Edit Post
        </button>
        <button 
          class="delete-button"
          @click="confirmDelete"
        >
          Delete Post
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <p>Loading post...</p>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else class="post-content">
      <SocialPreview 
        :post="currentPost"
        detailed-view
      />

      <div class="post-stats">
        <h3>Post Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ currentPost.stats?.likes ?? 0 }}</span>
            <span class="stat-label">Likes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ currentPost.stats?.shares ?? 0 }}</span>
            <span class="stat-label">Shares</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ currentPost.stats?.comments ?? 0 }}</span>
            <span class="stat-label">Comments</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ currentPost.stats?.reach ?? 0 }}</span>
            <span class="stat-label">Reach</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialPreview from '@/components/social/SocialPreview.vue'
import type { SocialPost } from '@/types/socialTypes'

export default defineComponent({
  name: 'SocialDetail',
  components: {
    SocialPreview
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const error = ref<string | null>(null)
    const currentPost = ref<SocialPost>({
      id: '',
      content: '',
      platform: 'twitter',
      status: 'published',
      stats: {
        likes: 0,
        shares: 0,
        comments: 0,
        reach: 0
      }
    })

    // TODO: Replace with actual API call
    const fetchPost = async (id: string) => {
      loading.value = true
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        currentPost.value = {
          id,
          content: `This is detailed content for post ${id}`,
          platform: id === '1' ? 'twitter' : 'facebook',
          scheduledAt: id === '2' ? new Date(Date.now() + 86400000) : new Date(),
          status: id === '2' ? 'scheduled' : 'published',
          stats: {
            likes: Math.floor(Math.random() * 1000),
            shares: Math.floor(Math.random() * 500),
            comments: Math.floor(Math.random() * 200),
            reach: Math.floor(Math.random() * 10000)
          }
        }
      } catch (err) {
        error.value = 'Failed to load post details'
      } finally {
        loading.value = false
      }
    }

    const editPost = () => {
      if (currentPost.value.id) {
        router.push({ 
          name: 'SocialEdit', 
          params: { id: currentPost.value.id } 
        })
      }
    }

    const confirmDelete = () => {
      if (confirm('Are you sure you want to delete this post?')) {
        deletePost()
      }
    }

    const deletePost = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        router.push({ name: 'Social' })
      } catch (err) {
        error.value = 'Failed to delete post'
      }
    }

    const goBack = () => {
      router.push({ name: 'Social' })
    }

    onMounted(() => {
      const postId = route.params.id as string
      if (postId) {
        fetchPost(postId)
      }
    })

    return {
      loading,
      error,
      currentPost,
      editPost,
      confirmDelete,
      goBack
    }
  }
})
</script>

<style scoped>
.social-detail {
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button {
  padding: 0.5rem 1rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.edit-button {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button {
  padding: 0.5rem 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.post-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.post-stats {
  margin-top: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.error-message {
  color: #e74c3c;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #fadbd8;
}
</style>

