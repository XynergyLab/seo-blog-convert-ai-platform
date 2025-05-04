// Get the API URL from environment
const API_URL = process.env.VUE_APP_API_ENDPOINT || 'http://172.22.178.90:5000/api'

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'API request failed')
    }
    return { success: true, ...data }
  } catch (error) {
    console.error('API call failed:', error)
    return { success: false, error: error.message }
  }
}

// Blog API
export async function getBlogList() {
  return apiCall('/blog/list')
}

export async function getBlog(id) {
  return apiCall(`/blog/${id}`)
}

export async function createBlog(data) {
  return apiCall('/blog/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
export async function editBlog(id, data) {
  return apiCall(`/blog/edit/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function publishBlog(id) {
  return apiCall(`/blog/publish/${id}`, {
    method: 'POST'
  })
}

export async function deleteBlog(id) {
  return apiCall(`/blog/delete/${id}`, {
    method: 'POST'
  })
}
// Blog outline/section (already JSON-ready)
export async function generateBlogOutline(data) {
  return apiCall('/blog/generate-outline', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function generateBlogSection(data) {
  return apiCall('/blog/generate-section', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Social API
export async function getSocialList(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiCall('/social/list' + (q ? '?' + q : ''))
}

export async function getSocial(id) {
  return apiCall(`/social/${id}`)
}

export async function createSocial(data) {
  return apiCall('/social/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
export async function editSocial(id, data) {
  return apiCall(`/social/edit/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function scheduleSocial(id, data) {
  return apiCall(`/social/schedule/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function publishSocial(id) {
  return apiCall(`/social/publish/${id}`, {
    method: 'POST'
  })
}

export async function deleteSocial(id) {
  return apiCall(`/social/delete/${id}`, {
    method: 'POST'
  })
}

// Analytics API
export async function getAnalyticsData(startDate, endDate) {
  // Format dates to YYYY-MM-DD expected by the backend
  // Ensure input dates are valid Date objects before formatting
  const formatISODate = (date) => {
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (e) {
      console.error("Invalid date provided to getAnalyticsData:", date);
      // Return today's date as a fallback, or handle error as appropriate
      return new Date().toISOString().split('T')[0];
    }
  };

  const startStr = formatISODate(startDate);
  const endStr = formatISODate(endDate);

  // Construct query parameters
  const params = new URLSearchParams({
    start_date: startStr,
    end_date: endStr
    // You could add 'period' here too if needed by the frontend logic
  }).toString();

  // Call the combined dashboard endpoint
  return apiCall(`/analytics/dashboard?${params}`);
}
