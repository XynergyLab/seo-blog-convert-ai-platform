<template>
  <div class="blog-calendar-view">
    <h2>Blog Calendar</h2>
    <div class="calendar-container">
      <BlogCalendarView />
    </div>
  </div>
</template>

<script>
import BlogCalendarView from '../components/blog/BlogCalendarView.vue'

export default {
  name: 'BlogCalendarViewPage',
  components: {
    BlogCalendarView
  }
}
</script>

<style lang="scss" scoped>
.blog-calendar-view {
  padding: 16px;
  
  .calendar-container {
    margin-top: 16px;
    background-color: white;
    border-radius: 4px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>

