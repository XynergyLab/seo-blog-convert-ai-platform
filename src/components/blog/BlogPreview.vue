<template>
  <div class="blog-preview">
    <div v-if="loading" class="loading">
      <div class="loader"></div>
      <p>Loading post...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <button @click="fetchPost" class="retry-button">Try Again</button>
    </div>
    
    <div v-else-if="!post" class="not-found">
      <h3>Post Not Found</h3>
      <p>This blog post doesn't exist or has been removed.</p>
      <button @click="router.push('/blog')" class="back-button">Back to Posts</button>
    </div>
    
    <div v-else class="post-container">
      <!-- Version History Sidebar (when open) -->
      <div v-if="showVersions" class="version-sidebar">
        <div class="sidebar-header">
          <h3>Version History</h3>
          <button @click="showVersions = false" class="close-button">×</button>
        </div>
        
        <div v-if="versionsLoading" class="sidebar-loading">
          <div class="loader"></div>
          <p>Loading versions...</p>
        </div>
        
        <div v-else-if="versionsError" class="sidebar-error">
          {{ versionsError }}
        </div>
        
        <div v-else-if="!versions.length" class="sidebar-empty">
          <p>No previous versions found.</p>
        </div>
        
        <ul v-else class="version-list">
          <li v-for="version in versions" :key="version.id" class="version-item">
            <div class="version-info">
              <div class="version-date">{{ formatDate(version.created_at) }}</div>
              <div class="version-title">{{ version.title }}</div>
            </div>
            
            <div class="version-actions">
              <button 
                @click="previewVersion(version)" 
                class="preview-version-button" 
                :class="{ 'active': previewingVersion && previewingVersion.id === version.id }"
              >
                Preview
              </button>
              <button 
                @click="restoreVersion(version.id)" 
                class="restore-button"
                :disabled="restoringVersion"
              >
                Restore
              </button>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- Main Post Content -->
      <div class="post-content" :class="{ 'with-sidebar': showVersions }">
        <!-- Post Header -->
        <div class="post-header">
          <h1>{{ displayPost.title }}</h1>
          
          <div class="post-meta">
            <span class="meta-item">
              <i class="icon-calendar"></i>
              {{ formatDate(displayPost.created_at) }}
            </span>
            
            <span v-if="displayPost.published" class="meta-item status published">
              <i class="icon-check"></i> Published
            </span>
            
            <span v-else class="meta-item status draft">
              <i class="icon-edit"></i> Draft
            </span>
            
            <span v-if="previewingVersion" class="meta-item version-tag">
              Previewing Past Version
            </span>
          </div>
          
          <div class="post-tags">
            <div class="tag-group">
              <strong>Topic:</strong>
              <span class="tag">{{ displayPost.topic }}</span>
            </div>
            
            <div class="tag-group">
              <strong>Keywords:</strong>
              <span 
                v-for="(keyword, index) in displayKeywords" 
                :key="index" 
                class="tag keyword"
              >
                {{ keyword }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Post Body -->
        <div class="post-body">
          <!-- Render markdown content -->
          <div class="markdown-content" v-html="renderedContent"></div>
        </div>
        
        <!-- Action Buttons -->
        <div class="post-actions">
          <div class="primary-actions">
            <button @click="goToEdit" :disabled="loading" class="edit-button">
              <i class="icon-edit"></i> Edit
            </button>
            
            <button 
              v-if="!displayPost.published" 
              @click="publishPost" 
              :disabled="loading || publishing" 
              class="publish-button"
            >
              <i class="icon-publish"></i> Publish
            </button>
            
            <button 
              @click="showVersions = !showVersions" 
              :disabled="loading || versionsLoading" 
              class="versions-button"
              :class="{ 'active': showVersions }"
            >
              <i class="icon-history"></i> 
              {{ showVersions ? 'Hide History' : 'Version History' }}
            </button>
          </div>
          
          <div class="secondary-actions">
            <button 
              @click="handleDelete" 
              :disabled="loading || deleting" 
              class="delete-button"
            >
              <i class="icon-trash"></i> Delete
            </button>
          </div>
        </div>
        
        <!-- Status Messages -->
        <div v-if="successMsg" class="success-message">
          <i class="icon-check-circle"></i> {{ successMsg }}
        </div>
      </div>
    </div>
    
    <!-- Version Restoration Confirmation Dialog -->
    <div v-if="showRestoreConfirm" class="modal-overlay">
      <div class="modal-dialog">
        <h3>Restore Version</h3>
        <p>Are you sure you want to restore this version? This will create a new version with your current content.</p>
        <div class="modal-actions">
          <button @click="showRestoreConfirm = false" class="cancel-button">Cancel</button>
          <button @click="confirmRestore" class="confirm-button">Restore</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  getBlog, 
  deleteBlog, 
  publishBlog, 
  getBlogVersions, 
  restoreVersion 
} from '../../services/api'
import { marked } from 'marked'

export default {
  name: 'BlogPreview',
  props: {
    id: {
      type: String,
      default: null
    },
    showVersionHistory: {
      type: Boolean,
      default: false
    },
    versionId: {
      type: String,
      default: null
    }
  },
  setup(props) {
    // Router
    const route = useRoute()
    const router = useRouter()

    // Post data
    const loading = ref(true)
    const error = ref(null)
    const post = ref(null)
    const successMsg = ref(null)

    // Version history
    const showVersions = ref(props.showVersionHistory || false)
    const versions = ref([])
    const versionsLoading = ref(false)
    const versionsError = ref(null)
    const previewingVersion = ref(null)
    const showRestoreConfirm = ref(false)
    const versionToRestore = ref(null)
    const restoringVersion = ref(false)

    // Action states
    const publishing = ref(false)
    const deleting = ref(false)

    // Computed properties
    const displayPost = computed(() => {
      return previewingVersion.value || post.value
    })

    const displayKeywords = computed(() => {
      if (!displayPost.value) return []
      
      // Handle both formats - string and array
      if (Array.isArray(displayPost.value.keywords)) {
        return displayPost.value.keywords
      }
      
      const keywordsStr = displayPost.value.keywords || ''
      return keywordsStr.split(',').map(k => k.trim()).filter(k => k)
    })

    const renderedContent = computed(() => {
      if (!displayPost.value?.content) return ''
      
      // Convert the markdown content to HTML
      try {
        return marked(displayPost.value.content)
      } catch (e) {
        console.error('Error rendering markdown:', e)
        return `<div class="error">Error rendering content</div>
                <pre>${displayPost.value.content}</pre>`
      }
    })

    // Get post ID from props or route
    const getPostId = () => {
      return props.id || route.params.id
    }

    // Fetch main post data
    async function fetchPost() {
      const postId = getPostId()
      if (!postId) return
      
      loading.value = true
      error.value = null
      
      try {
        const result = await getBlog(postId)
        
        if (result.success && result.post) {
          post.value = result.post
          // Clear any version preview when fetching the main post
          if (!props.versionId) {
            previewingVersion.value = null
          }
          
          // Load versions if needed
          if (showVersions.value) {
            fetchVersions()
          }
          
          // Load specific version if versionId provided
          if (props.versionId) {
            loadSpecificVersion(props.versionId)
          }
        } else {
          error.value = result.error || 'Blog post not found'
        }
      } catch (e) {
        error.value = e.message || 'Failed to load blog post'
      } finally {
        loading.value = false
      }
    }

    // Fetch version history
    async function fetchVersions() {
      const postId = getPostId()
      if (!postId) return
      
      versionsLoading.value = true
      versionsError.value = null
      
      try {
        const result = await getBlogVersions(postId)
        
        if (result.success && result.versions) {
          versions.value = result.versions
          
          // If specific version requested, load it
          if (props.versionId && versions.value.length > 0) {
            loadSpecificVersion(props.versionId)
          }
        } else {
          versionsError.value = result.error || 'Failed to load version history'
          versions.value = []
        }
      } catch (e) {
        versionsError.value = e.message || 'Failed to load version history'
        versions.value = []
      } finally {
        versionsLoading.value = false
      }
    }

    // Load a specific version
    function loadSpecificVersion(versionId) {
      if (!versionId || !versions.value || versions.value.length === 0) return
      
      const version = versions.value.find(v => v.id === versionId)
      if (version) {
        previewingVersion.value = version
      }
    }

    // Preview a specific version
    function previewVersion(version) {
      // If we're already previewing this version, go back to current version
      if (previewingVersion.value?.id === version.id) {
        previewingVersion.value = null
        return
      }
      
      // Set the previewing version
      previewingVersion.value = version
    }

    // Restore version
    function restoreVersion(versionId) {
      versionToRestore.value = versionId
      showRestoreConfirm.value = true
    }

    // Confirm restore action
    async function confirmRestore() {
      if (!post.value?.id || !versionToRestore.value) return
      
      showRestoreConfirm.value = false
      restoringVersion.value = true
      
      try {
        const result = await restoreVersion(post.value.id, versionToRestore.value)
        
        if (result.success) {
          // Update the displayed post with restored version
          post.value = result.post
          previewingVersion.value = null
          
          // Refresh the version history
          fetchVersions()
          
          // Show success message
          successMsg.value = 'Version restored successfully'
          setTimeout(() => {
            successMsg.value = null
          }, 3000)
        } else {
          error.value = result.error || 'Failed to restore version'
        }
      } catch (e) {
        error.value = e.message || 'Failed to restore version'
      } finally {
        restoringVersion.value = false
      }
    }

    // Navigation - go to edit page
    function goToEdit() {
      if (!post.value?.id) return
      router.push(`/blog/${post.value.id}/edit`)
    }

    // Publish post
    async function publishPost() {
      if (!post.value?.id) return
      
      publishing.value = true
      error.value = null
      
      try {
        const result = await publishBlog(post.value.id)
        
        if (result.success) {
          post.value = result.post
          successMsg.value = 'Blog post published successfully!'
          setTimeout(() => {
            successMsg.value = null
          }, 3000)
        } else {
          error.value = result.error || 'Failed to publish blog post'
        }
      } catch (e) {
        error.value = e.message || 'Failed to publish blog post'
      } finally {
        publishing.value = false
      }
    }

    // Delete post
    async function handleDelete() {
      if (!post.value?.id) return
      
      if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
        return
      }
      
      deleting.value = true
      error.value = null
      
      try {
        const result = await deleteBlog(post.value.id)
        
        if (result.success) {
          successMsg.value = 'Blog post deleted successfully'
          setTimeout(() => {
            router.push('/blog')
          }, 1500)
        } else {
          error.value = result.error || 'Failed to delete blog post'
        }
      } catch (e) {
        error.value = e.message || 'Failed to delete blog post'
      } finally {
        deleting.value = false
      }
    }

    // Format date for display
    function formatDate(dateString) {
      if (!dateString) return 'Unknown date'
      
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    }

    // Watch for route changes to reload data
    watch(() => route.params.id, (newId) => {
      if (newId) {
        fetchPost()
      }
    })

    // Watch for version history toggle
    watch(showVersions, (newValue) => {
      if (newValue && versions.value.length === 0) {
        fetchVersions()
      }
    })

    // Load data on mount
    onMounted(() => {
      fetchPost()
      if (showVersions.value) {
        fetchVersions()
      }
    })

    return {
      // State
      loading,
      error,
      post,
      successMsg,
      showVersions,
      versions,
      versionsLoading,
      versionsError,
      previewingVersion,
      showRestoreConfirm,
      restoringVersion,
      publishing,
      deleting,
      
      // Computed
      displayPost,
      displayKeywords,
      renderedContent,
      
      // Methods
      fetchPost,
      fetchVersions,
      previewVersion,
      restoreVersion,
      confirmRestore,
      goToEdit,
      publishPost,
      handleDelete,
      formatDate,
      
      // Router
      router
    }
  }
}
</script>

<style scoped>
.blog-preview {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Loading state */
.loading, .not-found, .error-message {
  text-align: center;
  padding: 3rem 1rem;
}

.loader {
  display: inline-block;
  width: 50px;
  height: 50px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #2196f3;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-button, .back-button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

/* Post container layout */
.post-container {
  display: flex;
  position: relative;
}

.version-sidebar {
  width: 300px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  height: calc(100vh - 100px);
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-loading, .sidebar-error, .sidebar-empty {
  padding: 1rem;
  text-align: center;
}

.version-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.version-item {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.version-info {
  margin-bottom: 0.5rem;
}

.version-date {
  font-size: 0.8rem;
  color: #666;
}

.version-title {
  font-weight: bold;
}

.version-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-version-button, .restore-button {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.preview-version-button.active {
  background-color: #2196f3;
  color: white;
  border-color: #2196f3;
}

.post-content {
  flex: 1;
  padding: 2rem;
}

.post-content.with-sidebar {
  margin-left: 300px;
}

/* Post header */
.post-header {
  margin-bottom: 2rem;
}

.post-header h1 {
  margin-bottom: 1rem;
}

.post-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status.published {
  color: #4caf50;
}

.status.draft {
  color: #ff9800;
}

.version-tag {
  background-color: #e91e63;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.tag-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag {
  background-color: #f1f1f1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.tag.keyword {
  background-color: #e3f2fd;
  color: #1565c0;
}

/* Post body */
.post-body {
  margin-bottom: 2rem;
}

.markdown-content {
  line-height: 1.6;
}

.markdown-content h1, 
.markdown-content h2, 
.markdown-content h3, 
.markdown-content h4, 
.markdown-content h5, 
.markdown-content h6 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.markdown-content p {
  margin-bottom: 1rem;
}

.markdown-content ul, 
.markdown-content ol {
  padding-left: 2rem;
  margin-bottom: 1rem;
}

.markdown-content blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1rem;
  margin-left: 0;
  color: #666;
}

.markdown-content pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-content code {
  background-color: #f5f5f5;
  padding: 0.25rem;
  border-radius: 4px;
}

/* Post actions */
.post-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.primary-actions, .secondary-actions {
  display: flex;
  gap: 1rem;
}

.edit-button, .publish-button, .versions-button, .delete-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-button {
  background-color: #2196f3;
  color: white;
  border: none;
}

.publish-button {
  background-color: #4caf50;
  color: white;
  border: none;
}

.versions-button {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

.versions-button.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #2196f3;
}

.delete-button {
  background-color: white;
  border: 1px solid #f44336;
  color: #f44336;
}

/* Status messages */
.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-dialog {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-button {
  background-color: white;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .post-container {
    flex-direction: column;
  }
  
  .version-sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }
  
  .post-content.with-sidebar {
    margin-left: 0;
  }
  
  .post-actions {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>


