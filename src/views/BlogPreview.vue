<template>
  <div class="blog-preview">
    <h2>Blog Preview</h2>
    <div class="preview-container">
      <BlogPreview :blogId="blogId" />
    </div>
  </div>
</template>

<script>
import BlogPreview from '../components/blog/BlogPreview.vue'

export default {
  name: 'BlogPreviewPage',
  components: {
    BlogPreview
  },
  props: {
    id: {
      type: String,
      required: true
    }
  },
  computed: {
    blogId() {
      return this.id
    }
  }
}
</script>

<style lang="scss" scoped>
.blog-preview {
  padding: 16px;
  
  .preview-container {
    margin-top: 16px;
    background-color: white;
    border-radius: 4px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>

