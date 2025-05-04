<template>
  <div class="blog-edit">
    <h2>{{ isNewBlog ? 'Create New Blog Post' : 'Edit Blog Post' }}</h2>
    <div class="edit-container">
      <BlogEditor :blogId="blogId" />
    </div>
  </div>
</template>

<script>
import BlogEditor from '../components/blog/BlogEditor.vue'

export default {
  name: 'BlogEdit',
  components: {
    BlogEditor
  },
  props: {
    id: {
      type: String,
      default: null
    }
  },
  computed: {
    blogId() {
      return this.id
    },
    isNewBlog() {
      return !this.id
    }
  }
}
</script>

<style lang="scss" scoped>
.blog-edit {
  padding: 16px;
  
  .edit-container {
    margin-top: 16px;
    background-color: white;
    border-radius: 4px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>

