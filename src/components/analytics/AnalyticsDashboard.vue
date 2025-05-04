<template>
  <div class="analytics-container">
    <div class="analytics-header">
      <div class="header-title">
        <h2>Website Analytics Dashboard</h2>
        <span class="last-updated">Last updated: {{ formatDateTime(lastUpdated) }}</span>
      </div>
      <div class="date-filters">
        <Button icon="pi pi-calendar" @click="toggleDateRangePicker" class="p-button-outlined" />
        <span class="date-range-display">{{ formatDateRange(dateRange) }}</span>
        <div class="predefined-ranges">
          <Button label="Today" @click="setDateRange('today')" :class="getRangeButtonClass('today')" class="p-button-sm" />
          <Button label="7 Days" @click="setDateRange('week')" :class="getRangeButtonClass('week')" class="p-button-sm" />
          <Button label="30 Days" @click="setDateRange('month')" :class="getRangeButtonClass('month')" class="p-button-sm" />
          <Button label="90 Days" @click="setDateRange('quarter')" :class="getRangeButtonClass('quarter')" class="p-button-sm" />
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-indicator">
      <ProgressSpinner />
      <p>Loading analytics data...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <div v-else class="analytics-content">
      <!-- Metrics Overview Cards -->
      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <div class="metric-card">
            <div class="metric-icon" style="background-color: #BBDEFB">
              <i class="pi pi-eye"></i>
            </div>
            <div class="metric-content">
              <h3 class="metric-label">Impressions</h3>
              <div class="metric-value">{{ formatNumber(metrics.impressions) }}</div>
              <div :class="getTrendClass(metrics.impressionsTrend)" class="metric-trend">
                <i :class="getTrendIcon(metrics.impressionsTrend)"></i>
                <span>{{ formatPercentage(metrics.impressionsTrend) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <div class="metric-card">
            <div class="metric-icon" style="background-color: #C8E6C9">
              <i class="pi pi-external-link"></i>
            </div>
            <div class="metric-content">
              <h3 class="metric-label">Clicks</h3>
              <div class="metric-value">{{ formatNumber(metrics.clicks) }}</div>
              <div :class="getTrendClass(metrics.clicksTrend)" class="metric-trend">
                <i :class="getTrendIcon(metrics.clicksTrend)"></i>
                <span>{{ formatPercentage(metrics.clicksTrend) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <div class="metric-card">
            <div class="metric-icon" style="background-color: #FFE0B2">
              <i class="pi pi-percentage"></i>
            </div>
            <div class="metric-content">
              <h3 class="metric-label">CTR</h3>
              <div class="metric-value">{{ formatPercentage(metrics.ctr) }}</div>
              <div :class="getTrendClass(metrics.ctrTrend)" class="metric-trend">
                <i :class="getTrendIcon(metrics.ctrTrend)"></i>
                <span>{{ formatPercentage(metrics.ctrTrend) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-12 md:col-6 lg:col-3">
          <div class="metric-card">
            <div class="metric-icon" style="background-color: #E1BEE7">
              <i class="pi pi-key"></i>
            </div>
            <div class="metric-content">
              <h3 class="metric-label">Unique Keywords</h3>
              <div class="metric-value">{{ formatNumber(metrics.uniqueKeywords) }}</div>
              <div :class="getTrendClass(metrics.uniqueKeywordsTrend)" class="metric-trend">
                <i :class="getTrendIcon(metrics.uniqueKeywordsTrend)"></i>
                <span>{{ formatPercentage(metrics.uniqueKeywordsTrend) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Traffic Charts -->
      <div class="grid">
        <div class="col-12 lg:col-6">
          <div class="chart-card">
            <div class="chart-header">
              <h3>Impressions Over Time</h3>
              <Button icon="pi pi-download" @click="exportImpressionData" class="p-button-text p-button-sm" title="Export data" />
            </div>
            <div class="chart-container">
              <LineChart 
                :chartData="impressionsChartData" 
                :options="getChartOptions('Impressions')" 
              />
            </div>
          </div>
        </div>
        
        <div class="col-12 lg:col-6">
          <div class="chart-card">
            <div class="chart-header">
              <h3>Clicks Over Time</h3>
              <Button icon="pi pi-download" @click="exportClickData" class="p-button-text p-button-sm" title="Export data" />
            </div>
            <div class="chart-container">
              <LineChart 
                :chartData="clicksChartData" 
                :options="getChartOptions('Clicks')" 
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Top Performing Content -->
      <div class="grid">
        <div class="col-12 lg:col-6">
          <div class="table-card">
            <div class="table-header">
              <h3>Top Performing Keywords</h3>
              <div class="table-actions">
                <Dropdown v-model="keywordMetricFilter" :options="keywordMetricOptions" optionLabel="label" placeholder="Sort by" class="p-inputtext-sm" />
                <Button icon="pi pi-download" @click="exportTopKeywordsData" class="p-button-text p-button-sm" title="Export data" />
              </div>
            </div>
            <DataTable 
              :value="topKeywords" 
              :loading="loading"
              class="p-datatable-sm" 
              dataKey="keyword"
              :rows="5"
              :rowHover="true"
              responsiveLayout="scroll"
              stripedRows
            >
              <Column field="keyword" header="Keyword">
                <template #body="{ data }">
                  <span class="keyword-link" @click="navigateToKeyword(data)">{{ data.keyword }}</span>
                </template>
              </Column>
              <Column field="position" header="Position" :sortable="true">
                <template #body="{ data }">
                  <div class="position-indicator">
                    <span class="position-value">{{ data.position }}</span>
                    <i :class="getPositionTrendIcon(data)" class="position-trend"></i>
                  </div>
                </template>
              </Column>
              <Column field="impressions" header="Impressions" :sortable="true">
                <template #body="{ data }">
                  {{ formatNumber(data.impressions) }}
                </template>
              </Column>
              <Column field="clicks" header="Clicks" :sortable="true">
                <template #body="{ data }">
                  {{ formatNumber(data.clicks) }}
                </template>
              </Column>
              <Column field="ctr" header="CTR" :sortable="true">
                <template #body="{ data }">
                  {{ formatPercentage(data.ctr) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
        
        <div class="col-12 lg:col-6">
          <div class="table-card">
            <div class="table-header">
              <h3>Top Performing Pages</h3>
              <div class="table-actions">
                <Dropdown v-model="pageMetricFilter" :options="pageMetricOptions" optionLabel="label" placeholder="Sort by" class="p-inputtext-sm" />
                <Button icon="pi pi-download" @click="exportTopPagesData" class="p-button-text p-button-sm" title="Export data" />
              </div>
            </div>
            <DataTable 
              :value="topPages" 
              :loading="loading"
              class="p-datatable-sm" 
              dataKey="url"
              :rows="5"
              :rowHover="true"
              responsiveLayout="scroll"
              stripedRows
            >
              <Column field="title" header="Page Title">
                <template #body="{ data }">
                  <div class="page-title-container">
                    <span class="page-title" @click="navigateToPage(data)">{{ data.title }}</span>
                    <span class="page-path">{{ truncatePath(data.path) }}</span>
                  </div>
                </template>
              </Column>
              <Column field="impressions" header="Impressions" :sortable="true">
                <template #body="{ data }">
                  {{ formatNumber(data.impressions) }}
                </template>
              </Column>
              <Column field="clicks" header="Clicks" :sortable="true">
                <template #body="{ data }">
                  {{ formatNumber(data.clicks) }}
                </template>
              </Column>
              <Column field="ctr" header="CTR" :sortable="true">
                <template #body="{ data }">
                  {{ formatPercentage(data.ctr) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Date Range Picker Dialog -->
    <Dialog v-model:visible="dateRangePickerVisible" header="Select Date Range" :style="{width: '450px'}">
      <div class="date-range-picker">
        <div class="date-field">
          <label for="startDate">Start Date</label>
          <Calendar id="startDate" v-model="tempDateRange.start" dateFormat="mm/dd/yy" :showIcon="true" />
        </div>
        <div class="date-field">
          <label for="endDate">End Date</label>
          <Calendar id="endDate" v-model="tempDateRange.end" dateFormat="mm/dd/yy" :showIcon="true" :minDate="tempDateRange.start" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="closeDateRangePicker" class="p-button-text" />
        <Button label="Apply" icon="pi pi-check" @click="applyDateRange" autofocus />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

// Chart.js components
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// PrimeVue Components
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// API service (mock for now)
import { getAnalyticsData } from '../../services/api'

// Component state
const router = useRouter()
const loading = ref(true)
const error = ref(null)
const lastUpdated = ref(new Date())
const currentRange = ref('month')

// Date range state
const dateRange = reactive({
  start: dayjs().subtract(30, 'day').toDate(),
  end: dayjs().toDate()
})
const tempDateRange = reactive({
  start: dayjs().subtract(30, 'day').toDate(),
  end: dayjs().toDate()
})
const dateRangePickerVisible = ref(false)

// Metrics filters
const keywordMetricFilter = ref({ value: 'clicks', label: 'Clicks' })
const pageMetricFilter = ref({ value: 'clicks', label: 'Clicks' })

// Filter options
const keywordMetricOptions = [
  { value: 'clicks', label: 'Clicks' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'ctr', label: 'CTR' },
  { value: 'position', label: 'Position' }
]
const pageMetricOptions = [
  { value: 'clicks', label: 'Clicks' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'ctr', label: 'CTR' }
]

// Analytics data
const metrics = ref({
  impressions: 0,
  impressionsTrend: 0,
  clicks: 0,
  clicksTrend: 0,
  ctr: 0,
  ctrTrend: 0,
  uniqueKeywords: 0,
  uniqueKeywordsTrend: 0
})
const topKeywords = ref([])
const topPages = ref([])
const timeSeriesData = ref({
  labels: [],
  impressions: [],
  clicks: []
})

// LineChart component wrapper
const LineChart = {
  extends: Line,
  props: ['chartData', 'options']
}

// Get chart data for impressions and clicks
const impressionsChartData = computed(() => {
  return {
    labels: timeSeriesData.value.labels,
    datasets: [
      {
        label: 'Impressions',
        data: timeSeriesData.value.impressions,
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  }
})

const clicksChartData = computed(() => {
  return {
    labels: timeSeriesData.value.labels,
    datasets: [
      {
        label: 'Clicks',
        data: timeSeriesData.value.clicks,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  }
})

// Chart options
const getChartOptions = (title) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += formatNumber(context.parsed.y);
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatNumber(value);
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }
}

// Date range functions
const toggleDateRangePicker = () => {
  tempDateRange.start = dateRange.start
  tempDateRange.end = dateRange.end
  dateRangePickerVisible.value = true
}

const closeDateRangePicker = () => {
  dateRangePickerVisible.value = false
}

const applyDateRange = () => {
  dateRange.start = tempDateRange.start
  dateRange.end = tempDateRange.end
  dateRangePickerVisible.value = false
  currentRange.value = 'custom'
  refreshData()
}

const formatDateRange = (range) => {
  const start = dayjs(range.start)
  const end = dayjs(range.end)
  return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`
}

const setDateRange = (range) => {
  currentRange.value = range
  const end = dayjs()
  
  switch (range) {
    case 'today':
      dateRange.start = end.startOf('day').toDate()
      break
    case 'week':
      dateRange.start = end.subtract(6, 'day').startOf('day').toDate()
      break
    case 'month':
      dateRange.start = end.subtract(29, 'day').startOf('day').toDate()
      break
    case 'quarter':
      dateRange.start = end.subtract(89, 'day').startOf('day').toDate()
      break
  }
  
  dateRange.end = end.toDate()
  refreshData()
}

const getRangeButtonClass = (range) => {
  return currentRange.value === range ? 'p-button-outlined p-button-primary' : 'p-button-text'
}

// Format utilities
const formatNumber = (value) => {
  if (value === null || value === undefined) return '-'
  
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  
  return new Intl.NumberFormat().format(Math.round(value))
}

const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-'
  return value.toFixed(2) + '%'
}

const formatDateTime = (date) => {
  return dayjs(date).format('MMM D, YYYY h:mm A')
}

const truncatePath = (path) => {
  if (!path) return ''
  if (path.length <= 30) return path
  return path.substring(0, 30) + '...'
}

// Navigation functions
const navigateToKeyword = (keyword) => {
  // This would navigate to keyword details page in a real app
  router.push({ 
    path: '/keywords',
    query: { search: keyword.keyword }
  })
}

const navigateToPage = (page) => {
  // This would navigate to page details in a real app
  if (page.blogId) {
    router.push(`/blog/${page.blogId}`)
  } else {
    window.open(page.url, '_blank')
  }
}

// Export functionality
const exportImpressionData = () => {
  const data = {
    labels: timeSeriesData.value.labels,
    impressions: timeSeriesData.value.impressions
  }
  downloadCSV(data, 'impressions-data')
}

const exportClickData = () => {
  const data = {
    labels: timeSeriesData.value.labels,
    clicks: timeSeriesData.value.clicks
  }
  downloadCSV(data, 'clicks-data')
}

const exportTopKeywordsData = () => {
  downloadCSV(topKeywords.value, 'top-keywords')
}

const exportTopPagesData = () => {
  downloadCSV(topPages.value, 'top-pages')
}

const downloadCSV = (data, filename) => {
  // Simple CSV export implementation
  // In a real app, you might use a library for this
  let csvContent = "data:text/csv;charset=utf-8,"
  
  // Create header row based on first object keys
  if (Array.isArray(data)) {
    if (data.length > 0) {
      const headers = Object.keys(data[0])
      csvContent += headers.join(",") + "\r\n"
      
      // Add data rows
      data.forEach(item => {
        const row = headers.map(header => {
          const value = item[header]
          // Handle strings with commas by wrapping in quotes
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        })
        csvContent += row.join(",") + "\r\n"
      })
    }
  } else {
    // Handle non-array data (like chart data)
    const headers = Object.keys(data)
    csvContent += headers.join(",") + "\r\n"
    
    // Determine number of rows
    const rowCount = Array.isArray(data[headers[0]]) ? data[headers[0]].length : 0
    
    // Add data rows
    for (let i = 0; i < rowCount; i++) {
      const row = headers.map(header => data[header][i])
      csvContent += row.join(",") + "\r\n"
    }
  }
  
  // Create download link
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${filename}-${dayjs().format('YYYY-MM-DD')}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Trend indicators
const getTrendClass = (trend) => {
  if (trend > 0) return 'trend-up'
  if (trend < 0) return 'trend-down'
  return 'trend-neutral'
}

const getTrendIcon = (trend) => {
  if (trend > 0) return 'pi pi-arrow-up'
  if (trend < 0) return 'pi pi-arrow-down'
  return 'pi pi-minus'
}

const getPositionTrendIcon = (data) => {
  if (!data.positionChange) return 'pi pi-minus'
  // For position, lower is better, so the logic is reversed
  if (data.positionChange < 0) return 'pi pi-arrow-up position-improved'
  if (data.positionChange > 0) return 'pi pi-arrow-down position-dropped'
  return 'pi pi-minus'
}

// Data fetching
const refreshData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const result = await getAnalyticsData(dateRange.start, dateRange.end)
    
    if (result.success) {
      // Update all data at once to avoid UI flicker
      metrics.value = result.metrics
      topKeywords.value = sortTopKeywords(result.topKeywords || [])
      topPages.value = sortTopPages(result.topPages || [])
      timeSeriesData.value = result.timeSeriesData || generateMockTimeSeriesData()
      lastUpdated.value = new Date()
    } else {
      error.value = result.error || 'Failed to load analytics data'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load analytics data'
    console.error('Error loading analytics data:', e)
    
    // For demo purposes, load mock data if API fails
    const mockData = generateMockData()
    metrics.value = mockData.metrics
    topKeywords.value = mockData.topKeywords
    topPages.value = mockData.topPages
    timeSeriesData.value = mockData.timeSeriesData
  } finally {
    loading.value = false
  }
}

// Sort functions for top tables
const sortTopKeywords = (keywords) => {
  const field = keywordMetricFilter.value.value
  return [...keywords].sort((a, b) => {
    // For position, lower is better
    if (field === 'position') {
      return a[field] - b[field]
    }
    return b[field] - a[field]
  })
}

const sortTopPages = (pages) => {
  const field = pageMetricFilter.value.value
  return [...pages].sort((a, b) => b[field] - a[field])
}

// Watch for metric filter changes
watch(keywordMetricFilter, () => {
  topKeywords.value = sortTopKeywords(topKeywords.value)
})

watch(pageMetricFilter, () => {
  topPages.value = sortTopPages(topPages.value)
})

// Mock data generation - for demonstration only
const generateMockData = () => {
  // Generate mock metrics
  const mockTopKeywords = keywordTerms.map(term => {
    const impressions = Math.floor(Math.random() * 5000) + 500
    const clicks = Math.floor(impressions * (Math.random() * 0.3 + 0.05))
    return {
      keyword: term,
      impressions: impressions,
      clicks: clicks,
      ctr: (clicks / impressions) * 100,
      position: Math.floor(Math.random() * 30) + 1,
      positionChange: Math.floor(Math.random() * 7) - 3
    }
  })
  
  // Generate mock top pages
  const pageNames = [
    'Homepage', 'About Us', 'Contact', 'Blog Home', 
    'Top 10 SEO Strategies', 'How to Do Keyword Research',
    'Content Marketing Guide', 'Digital Marketing Trends',
    'Social Media Strategy', 'Email Marketing Tips'
  ]
  
  const mockTopPages = pageNames.map((name, index) => {
    const impressions = Math.floor(Math.random() * 10000) + 1000
    const clicks = Math.floor(impressions * (Math.random() * 0.4 + 0.1))
    const path = index === 0 ? '/' : `/${name.toLowerCase().replace(/\s+/g, '-')}`
    
    return {
      id: `page-${index + 1}`,
      title: name,
      path: path,
      url: `https://example.com${path}`,
      blogId: index > 3 ? `blog-${index - 3}` : null, // First 4 are not blog posts
      impressions: impressions,
      clicks: clicks,
      ctr: (clicks / impressions) * 100
    }
  })
  
  // Generate time series data for charts
  const mockTimeSeriesData = generateMockTimeSeriesData()
  
  return {
    metrics: mockMetrics,
    topKeywords: mockTopKeywords,
    topPages: mockTopPages,
    timeSeriesData: mockTimeSeriesData
  }
}

// Generate mock time series data based on selected date range
const generateMockTimeSeriesData = () => {
  const start = dayjs(dateRange.start)
  const end = dayjs(dateRange.end)
  const daysDiff = end.diff(start, 'day') + 1
  
  const labels = []
  const impressions = []
  const clicks = []
  
  // Generate label for each day in the range
  for (let i = 0; i < daysDiff; i++) {
    const currentDate = start.add(i, 'day')
    labels.push(currentDate.format('MMM D'))
    
    // Generate random data with some trending to make it look realistic
    const baseImpressions = Math.floor(Math.random() * 2000) + 1000
    const trendFactor = 1 + (i / daysDiff) * (Math.random() * 0.5 + 0.1)
    const dayImpressions = Math.floor(baseImpressions * trendFactor)
    
    impressions.push(dayImpressions)
    
    // Clicks typically 5-20% of impressions
    const ctrRatio = Math.random() * 0.15 + 0.05
    clicks.push(Math.floor(dayImpressions * ctrRatio))
  }
  
  return { labels, impressions, clicks }
}

// Initial data fetch on mount
onMounted(async () => {
  try {
    await refreshData()
  } catch (e) {
    console.error('Error in initial data load:', e)
  }
})
</script>

<style scoped>
.analytics-container {
  width: 100%;
  padding: 1rem;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-title {
  display: flex;
  flex-direction: column;
}

.last-updated {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.date-range-display {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.predefined-ranges {
  display: flex;
  gap: 0.25rem;
}

/* Metrics cards */
.metric-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.metric-content {
  flex: 1;
}

.metric-label {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.trend-up {
  color: #4caf50;
}

.trend-down {
  color: #f44336;
}

.trend-neutral {
  color: #9e9e9e;
}

/* Chart cards */
.chart-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.chart-container {
  flex: 1;
  position: relative;
  height: 300px;
  min-height: 250px;
}

/* Table cards */
.table-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.table-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Keyword-related styles */
.keyword-link {
  color: var(--primary-color, #3B82F6);
  cursor: pointer;
  font-weight: 500;
}

.keyword-link:hover {
  text-decoration: underline;
}

.position-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.position-value {
  font-weight: 600;
}

.position-improved {
  color: #4caf50;
}

.position-dropped {
  color: #f44336;
}

/* Page-related styles */
.page-title-container {
  display: flex;
  flex-direction: column;
}

.page-title {
  color: var(--primary-color, #3B82F6);
  cursor: pointer;
  font-weight: 500;
}

.page-title:hover {
  text-decoration: underline;
}

.page-path {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}

/* Date range picker */
.date-range-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-field label {
  font-weight: 600;
}

/* Loading and error states */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-message {
  margin: 1.5rem 0;
}

/* Responsive styles */
@media screen and (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .date-filters {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .predefined-ranges {
    width: 100%;
    overflow-x: auto;
    padding: 0.25rem 0;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .metric-card {
    margin-bottom: 1rem;
  }
  
  .date-range-picker {
    width: 100%;
  }
}
</style>
    clicks: Math.floor(Math.random() * 20000) + 5000,
    clicksTrend: (Math.random() * 30) - 15,
    uniqueKeywords: Math.floor(Math.random() * 1000) + 500,
    uniqueKeywordsTrend: (Math.random() * 20) - 10
  }
  
  // Calculate CTR
  mockMetrics.ctr = (mockMetrics.clicks / mockMetrics.impressions) * 100
  mockMetrics.ctrTrend = (Math.random() * 10) - 5
  
  // Generate mock top keywords
  const keywordTerms = [
    'content marketing', 'SEO tools', 'digital marketing', 'keyword research',
    'search engine optimization', 'blog writing', 'backlinks strategy',
    'content strategy', 'long-tail keywords', 'SERP analysis'
  ]
  
  const mockTopKeywords = keywordTerms.map(term => {
    const
