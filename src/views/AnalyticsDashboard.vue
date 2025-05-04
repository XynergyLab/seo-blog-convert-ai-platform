<template>
  <div class="analytics-dashboard">
    <h2>Analytics Dashboard</h2>
    <div class="dashboard-content">
      <AnalyticsDashboard />
    </div>
  </div>
</template>

<script>
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard.vue'

export default {
  name: 'AnalyticsDashboardPage',
  components: {
    AnalyticsDashboard
  }
}
</script>

<style lang="scss" scoped>
.analytics-dashboard {
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

