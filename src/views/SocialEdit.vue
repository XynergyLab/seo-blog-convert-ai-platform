<template>
  <div class="social-edit">
    <h2>{{ isNewPost ? 'Create New Social Post' : 'Edit Social Post' }}</h2>
    <div class="edit-container">
      <SocialEditor :postId="postId" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import SocialEditor from '../components/social/SocialEditor.vue'

export default defineComponent({
  name: 'SocialEdit',
  components: {
    SocialEditor
  },
  props: {
    id: {
      type: String as () => string | null,
      default: null
    }
  },
  computed: {
    postId(): string | null {
      return this.id
    },
    isNewPost(): boolean {
      return !this.id
    }
  }
})
</script>

<style lang="scss" scoped>
.social-edit {
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

