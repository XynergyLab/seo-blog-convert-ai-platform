// Import statements removed as they were TypeScript type imports

// API response type - converted from TypeScript interface to JSDoc
/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the API call was successful
 * @property {*} [data] - The response data
 * @property {string} [error] - Error message if any
 * @property {string} [message] - Additional message
 */

// Get the API URL from environment
const API_URL = process.env.VUE_APP_API_ENDPOINT || '/api';

/**
 * Helper function for API calls with proper typing
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options
 * @returns {Promise<ApiResponse>} Response from API
 */
async function apiCall(endpoint, options = {}) {
  // Ensure endpoint starts with / and has proper prefix
  const normalizedEndpoint = endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;
  
  const url = `${API_URL}${normalizedEndpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    // Return success and the data payload separately to avoid potential overwrites
    return { success: true, data: data }; 
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if an error is an API error
 * @param {*} error - The error to check
 * @returns {boolean} Whether it's an API error
 */
function isApiError(error) {
  return typeof error === 'object' && 
    error !== null &&
    'message' in error;
}

/**
 * Standardized API error handler
 * @param {*} error - The error to handle
 * @returns {string} Error message
 */
export function handleApiError(error) {
  if (isApiError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Promise wrapper for API calls with better error handling
 * @param {Function} requestFn - Function that returns an API call promise
 * @param {string} errorMessage - Default error message
 * @returns {Promise<*>} Response data
 */
export async function apiRequest(
  requestFn,
  errorMessage = 'API request failed'
) {
  try {
    const response = await requestFn();
    if (!response.success) {
      throw new Error(response.error || errorMessage);
    }
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error) || errorMessage);
  }
}
// ==== Blog API ====
/**
 * Get list of blog posts
 * @returns {Promise<ApiResponse>} Blog posts list
 */
export async function getBlogList() {
  return apiCall('/blog/list');
}

/**
 * Get a specific blog post
 * @param {string} id - Blog post ID
 * @returns {Promise<ApiResponse>} Blog post
 */
export async function getBlog(id) {
  return apiCall(`/blog/${id}`);
}

/**
 * Create a new blog post
 * @param {Object} data - Blog post data
 * @returns {Promise<ApiResponse>} Created blog post
 */
export async function createBlog(data) {
  return apiCall('/blog/create', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Edit an existing blog post
 * @param {string} id - Blog post ID
 * @param {Object} data - Blog post update data
 * @returns {Promise<ApiResponse>} Updated blog post
 */
export async function editBlog(id, data) {
  return apiCall(`/blog/edit/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Publish a blog post
 * @param {string} id - Blog post ID
 * @returns {Promise<ApiResponse>} Published blog post
 */
export async function publishBlog(id) {
  return apiCall(`/blog/publish/${id}`, {
    method: 'POST'
  });
}

/**
 * Delete a blog post
 * @param {string} id - Blog post ID
 * @returns {Promise<ApiResponse>} Empty response
 */
export async function deleteBlog(id) {
  return apiCall(`/blog/delete/${id}`, {
    method: 'POST'
  });
}

/**
 * Generate a blog post outline
 * @param {Object} data - Generation parameters
 * @returns {Promise<ApiResponse>} Generated outline
 */
export async function generateBlogOutline(data) {
  return apiCall('/blog/generate-outline', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Generate a blog post section
 * @param {Object} data - Generation parameters
 * @returns {Promise<ApiResponse>} Generated section
 */
export async function generateBlogSection(data) {
  return apiCall('/blog/generate-section', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Get versions history of a blog post
 * @param {string} id - Blog post ID
 * @returns {Promise<ApiResponse>} Blog post versions
 */
export async function getBlogVersions(id) {
  return apiCall(`/blog/${id}/history`);
}

/**
 * Restore a specific version of a blog post
 * @param {string} postId - Blog post ID
 * @param {string} versionId - Version ID to restore
 * @returns {Promise<ApiResponse>} Restored blog post
 */
export async function restoreVersion(postId, versionId) {
  return apiCall(`/blog/${postId}/restore/${versionId}`, {
    method: 'POST'
  });
}

// ==== Social Media API ====
/**
 * Get list of social media posts
 * @param {Object} params - Query parameters
 * @returns {Promise<ApiResponse>} Social media posts list
 */
export async function getSocialList(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiCall('/social/list' + (q ? `?${q}` : ''));
}

/**
 * Get a specific social media post
 * @param {string} id - Social post ID
 * @returns {Promise<ApiResponse>} Social media post
 */
export async function getSocial(id) {
  return apiCall(`/social/${id}`);
}

/**
 * Create a new social media post
 * @param {Object} data - Social post data
 * @returns {Promise<ApiResponse>} Created social post
 */
export async function createSocial(data) {
  return apiCall('/social/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Edit an existing social media post
 * @param {string} id - Social post ID
 * @param {Object} data - Social post update data
 * @returns {Promise<ApiResponse>} Updated social post
 */
export async function editSocial(id, data) {
  return apiCall(`/social/edit/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Schedule a social media post
 * @param {string} id - Social post ID
 * @param {Object} data - Scheduling data
 * @returns {Promise<ApiResponse>} Scheduled social post
 */
export async function scheduleSocial(id, data) {
  return apiCall(`/social/schedule/${id}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Publish a social media post
 * @param {string} id - Social post ID
 * @returns {Promise<ApiResponse>} Published social post
 */
export async function publishSocial(id) {
  return apiCall(`/social/publish/${id}`, {
    method: 'POST'
  });
}

/**
 * Delete a social media post
 * @param {string} id - Social post ID
 * @returns {Promise<ApiResponse>} Empty response
 */
export async function deleteSocial(id) {
  return apiCall(`/social/delete/${id}`, {
    method: 'POST'
  });
}

// ==== Analytics API ====
/**
 * Get analytics data for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<ApiResponse>} Analytics data
 */
export async function getAnalyticsData(startDate, endDate) {
  // Validate input dates
  if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
      !(endDate instanceof Date) || isNaN(endDate.getTime())) {
    console.error('Invalid date range provided to getAnalyticsData:', startDate, endDate);
    // Return an error structure consistent with apiCall failures
    return { success: false, error: 'Invalid date range provided' };
  }

  // Format dates to YYYY-MM-DD expected by the backend
  const formatISODate = (date) => {
    // No need for extra checks here as validation is done above
    return date.toISOString().split('T')[0];
  };
  
  const startStr = formatISODate(startDate);
  const endStr = formatISODate(endDate);

  // Construct query parameters
  const params = new URLSearchParams({
    start_date: startStr,
    end_date: endStr
  }).toString();

  // Call the combined dashboard endpoint
  return apiCall(`/analytics/dashboard?${params}`);
}

// Export a default API object that can be consumed by other services
export default {
  call: apiCall,
  request: apiRequest,
  
  // Blog
  getBlogList,
  getBlog,
  createBlog,
  editBlog,
  publishBlog,
  deleteBlog,
  generateBlogOutline,
  generateBlogSection,
  getBlogVersions,
  restoreVersion,
  
  // Social
  getSocialList,
  getSocial,
  createSocial,
  editSocial,
  scheduleSocial,
  publishSocial,
  deleteSocial,
  
  // Analytics
  getAnalyticsData
};
