import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import BlogPreview from '@/components/blog/BlogPreview.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  getBlog: vi.fn(),
  deleteBlog: vi.fn(),
  publishBlog: vi.fn()
}))

// Mock sample data
const mockBlogPost = {
  id: 'post-1',
  title: 'Test Blog Post',
  content: 'This is a test blog post content.',
  topic: 'Testing',
  keywords: 'test, blog, preview',
  created_at: '2025-05-01T10:00:00Z',
  published: false,
  published_at: null
}

const mockPublishedBlogPost = {
  ...mockBlogPost,
  published: true,
  published_at: '2025-05-02T14:30:00Z'
}

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/blog/:id', 
      name: 'BlogDetail', 
      component: BlogPreview 
    },
    {
      path: '/blog',
      name: 'BlogList',
      component: { template: '<div></div>' }
    }
  ]
})

// Mock confirm dialog
vi.stubGlobal('confirm', vi.fn())

describe('BlogPreview.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers() // For setTimeout testing
    
    // Default mock for confirm dialog (approve by default)
    window.confirm.mockReturnValue(true)
  })
  
  // 1. Test content display
  describe('Content Display', () => {
    it('shows loading state initially', () => {
      // Setup API to return pending promise
      apiService.getBlog.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Check loading state is visible
      expect(wrapper.text()).toContain('Loading')
      expect(wrapper.find('h2').exists()).toBe(false)
    })
    
    it('shows error state when API fails', async () => {
      // Setup API to return error
      apiService.getBlog.mockResolvedValue({
        success: false,
        error: 'Blog post not found'
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check error state
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Blog post not found')
    })
    
    it('handles API exceptions gracefully', async () => {
      // Setup API to throw error
      apiService.getBlog.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to reject
      await flushPromises()
      
      // Check error state
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Network error')
    })
    
    it('displays blog post content correctly', async () => {
      // Setup API to return post
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check blog post content
      expect(wrapper.find('h2').text()).toBe('Test Blog Post')
      expect(wrapper.text()).toContain('This is a test blog post content.')
      expect(wrapper.text()).toContain('Topic: Testing')
      expect(wrapper.text()).toContain('Keywords: test, blog, preview')
    })
    
    it('formats dates correctly', async () => {
      // Setup API mock
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      // Mock formatDate to test its behavior
      const mockFormatDate = vi.fn().mockReturnValue('May 1, 2025, 10:00:00 AM')
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Replace the formatDate method
      wrapper.vm.formatDate = mockFormatDate
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Verify formatDate was called with correct date
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-01T10:00:00Z')
    })
    
    it('shows published status when post is published', async () => {
      // Setup API to return published post
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockPublishedBlogPost
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check published badge is visible
      expect(wrapper.text()).toContain('PUBLISHED')
    })
  })
  
  // 2. Test actions and API integration
  describe('Actions and API Integration', () => {
    it('calls edit navigation when Edit button is clicked', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return post
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Edit button
      const editButton = wrapper.findAll('button')[0] // First button should be Edit
      await editButton.trigger('click')
      
      // Verify router navigation
      expect(routerPushSpy).toHaveBeenCalledWith({
        path: '/blog/post-1',
        query: { edit: 'true' }
      })
    })
    
    it('calls publishBlog API when Publish button is clicked', async () => {
      // Setup API to return post and publish success
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      apiService.publishBlog.mockResolvedValue({
        success: true,
        post: mockPublishedBlogPost
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Publish button
      const publishButton = wrapper.findAll('button')[1] // Second button should be Publish
      await publishButton.trigger('click')
      
      // Verify API call
      expect(apiService.publishBlog).toHaveBeenCalledWith('post-1')
      
      // Wait for publish API to resolve
      await flushPromises()
      
      // Verify success message
      expect(wrapper.find('.success').exists()).toBe(true)
      
      // Check that post data is updated
      expect(wrapper.text()).toContain('PUBLISHED')
    })
    
    it('shows error when publish API fails', async () => {
      // Setup API for post and publish error
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      apiService.publishBlog.mockResolvedValue({
        success: false,
        error: 'Failed to publish post'
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Publish button
      const publishButton = wrapper.findAll('button')[1]
      await publishButton.trigger('click')
      
      // Wait for publish API to resolve
      await flushPromises()
      
      // Verify error message
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to publish post')
    })
    
    it('shows confirmation dialog before deleting post', async () => {
      // Setup API for post and delete success
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      apiService.deleteBlog.mockResolvedValue({
        success: true
      })
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[2] // Last button should be Delete
      await deleteButton.trigger('click')
      
      // Verify confirm was called
      expect(window.confirm).toHaveBeenCalled()
      expect(window.confirm.mock.calls[0][0]).toContain('Are you sure')
    })
    
    it('does not delete when confirmation is canceled', async () => {
      // Setup API for post
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      // Set confirm to return false (cancel)
      window.confirm.mockReturnValueOnce(false)
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[2]
      await deleteButton.trigger('click')
      
      // Verify delete API was not called
      expect(apiService.deleteBlog).not.toHaveBeenCalled()
    })
    
    it('calls deleteBlog and navigates when confirmed', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API for post and delete success
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      apiService.deleteBlog.mockResolvedValue({
        success: true
      })
      
      // Set confirm to return true (confirm)
      window.confirm.mockReturnValueOnce(true)
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[2]
      await deleteButton.trigger('click')
      
      // Verify delete API was called
      expect(apiService.deleteBlog).toHaveBeenCalledWith('post-1')
      
      // Wait for delete API to resolve
      await flushPromises()
      
      // Verify success message
      expect(wrapper.find('.success').exists()).toBe(true)
      
      // Advance timers for the setTimeout
      vi.advanceTimersByTime(1300)
      
      // Verify navigation to list page
      expect(routerPushSpy).toHaveBeenCalledWith('/blog')
    })
  })
  
  // 3. Test UI state management
  describe('UI State Management', () => {
    it('disables buttons during loading state', async () => {
      // Setup API to return pending promise
      apiService.getBlog.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // No buttons should be rendered during loading
      expect(wrapper.find('button').exists()).toBe(false)
    })
    
    it('disables buttons during delete operation', async () => {
      // Setup API for post
      apiService.getBlog.mockResolvedValue({
        success: true,
        post: mockBlogPost
      })
      
      // Setup delete API to never resolve (pending state)
      apiService.deleteBlog.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(BlogPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'post-1' }
            }
          }
        }
      })
      
      // Wait for get API to resolve
      await flushPromises()
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[2]
      await deleteButton.trigger('click')
      
      // All buttons should be disabled
      const buttons = wrapper.findAll('button')
      for (let i = 0; i < buttons.length; i++) {
        expect(buttons[i].attributes('disabled')).toBeDefined()
      }
      
      // Loading indicator for delete should be visible
      expect(wrapper.text()).toContain('Deleting')
    })
  })

