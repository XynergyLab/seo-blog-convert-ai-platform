<template>
  <div class="blog-detail">
    <div class="header">
      <button class="back-button" @click="goBack">← Back to List</button>
      <h2>Blog Post Details</h2>
    </div>

    <div class="content-container">
      <div v-if="loading" class="loading-overlay">
        <p>Loading post...</p>
      </div>

      <div v-else class="main-content">
        <BlogPreview :post="currentPost" />
        
        <div class="comments-section">
          <h3>Comments</h3>
          <p class="placeholder">Comments feature coming soon!</p>
        </div>
      </div>

      <div class="sidebar">
        <div class="related-posts">
          <h3>Related Posts</h3>
          <ul>
            <li v-for="post in relatedPosts" :key="post.id" @click="selectPost(post)">
              {{ post.title }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BlogPreview from '@/components/blog/BlogPreview.vue'
import type { BlogPost } from '@/types/blogTypes'

export default defineComponent({
  name: 'BlogDetail',
  components: {
    BlogPreview
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const currentPost = ref<BlogPost | null>(null)
    const relatedPosts = ref<BlogPost[]>([])

    // TODO: Replace with actual API call
    const fetchPost = (id: string) => {
      loading.value = true
      setTimeout(() => {
        currentPost.value = {
          id,
          title: `Sample Post ${id}`,
          content: 'This is the detailed blog post content...',
          createdAt: new Date().toISOString(),
          author: 'Admin',
          tags: ['sample', 'demo']
        }
        
        // Generate some related posts
        relatedPosts.value = Array(3).fill(0).map((_, i) => ({
          id: `${i+1}`,
          title: `Related Post ${i+1}`,
          content: '',
          createdAt: new Date().toISOString(),
          author: 'Admin',
          tags: ['related']
        }))
        loading.value = false
      }, 500)
    }

    onMounted(() => {
      const postId = route.params.id as string
      if (postId) {
        fetchPost(postId)
      }
    })

    const selectPost = (post: BlogPost) => {
      router.push({ name: 'BlogDetail', params: { id: post.id } })
    }

    const goBack = () => {
      router.push({ name: 'Blog' })
    }

    return {
      loading,
      currentPost,
      relatedPosts,
      selectPost,
      goBack
    }
  }
})
</script>

<style scoped>
.blog-detail {
  padding: 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.content-container {
  display: flex;
  gap: 2rem;
}

.main-content {
  flex: 3;
}

.sidebar {
  flex: 1;
}

.comments-section {
  margin-top: 2rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

.placeholder {
  color: #666;
  font-style: italic;
}

.related-posts ul {
  list-style: none;
  padding: 0;
}

.related-posts li {
  padding: 0.5rem;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.related-posts li:hover {
  background: #f5f5f5;
}

.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>

