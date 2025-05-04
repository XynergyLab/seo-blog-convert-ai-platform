<template>
  <div class="blog-dashboard">
    <div class="dashboard-header">
      <h2>Blog Dashboard</h2>
      <button 
        class="create-button"
        @click="showCreateForm = true"
      >
        Create New Post
      </button>
    </div>

    <div class="dashboard-content">
      <div class="main-content">
        <BlogListView 
          :posts="filteredPosts"
          @post-selected="handlePostSelected"
        />
      </div>
      
      <div class="sidebar">
        <BlogCalendarView 
          @date-selected="handleDateSelection"
          @post-selected="handlePostSelected"
        />
      </div>
    </div>

    <BlogCreateForm 
      v-if="showCreateForm"
      @submit="handleCreateSubmit"
      @cancel="showCreateForm = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import BlogListView from '@/components/blog/BlogListView.vue'
import BlogCalendarView from '@/components/blog/BlogCalendarView.vue'
import BlogCreateForm from '@/components/blog/BlogCreateForm.vue'
import type { BlogPost } from '@/types/blogTypes'

export default defineComponent({
  name: 'BlogDashboard',
  components: {
    BlogListView,
    BlogCalendarView,
    BlogCreateForm
  },
  setup() {
    const showCreateForm = ref(false)
    const selectedDate = ref<Date | null>(null)
    const posts = ref<BlogPost[]>([])

    // TODO: Load blog posts from API
    // onMounted(() => {
    //   loadPosts()
    // })

    const filteredPosts = computed(() => {
      if (!selectedDate.value) return posts.value
      return posts.value.filter(post => 
        new Date(post.createdAt).toDateString() === selectedDate.value?.toDateString()
      )
    })

    const handleDateSelection = (date: Date) => {
      selectedDate.value = date
    }

    const handlePostSelected = (post: BlogPost) => {
      // Navigate to blog detail view
      // router.push({ name: 'BlogDetail', params: { id: post.id } })
    }

    const handleCreateSubmit = (newPost: BlogPost) => {
      posts.value = [newPost, ...posts.value]
      showCreateForm.value = false
    }

    return {
      showCreateForm,
      filteredPosts,
      handleDateSelection,
      handlePostSelected,
      handleCreateSubmit
    }
  }
})
</script>

<style scoped>
.blog-dashboard {
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
</style>

