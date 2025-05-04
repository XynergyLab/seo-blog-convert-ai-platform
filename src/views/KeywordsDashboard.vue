<template>
  <div class="keywords-dashboard">
    <h2>Keywords Management</h2>
    <div class="dashboard-content">
      <KeywordsTable />
    </div>
  </div>
</template>

<script>
import KeywordsTable from '../components/keywords/KeywordsTable.vue'

export default {
  name: 'KeywordsDashboard',
  components: {
    KeywordsTable
  }
}
</script>

<style lang="scss" scoped>
.keywords-dashboard {
  padding: 16px;
  
  .dashboard-content {
    margin-top: 16px;
    background-color: white;
    border-radius: 4px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>

