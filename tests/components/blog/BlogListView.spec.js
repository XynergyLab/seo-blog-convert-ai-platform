import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import BlogListView from '@/components/blog/BlogListView.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  getBlogList: vi.fn()
}))

// Mock sample data
const mockPosts = [
  {
    id: 'post-1',
    title: 'Test Blog Post 1',
    topic: 'Testing',
    created_at: '2025-05-01T10:00:00Z',
    published: false
  },
  {
    id: 'post-2',
    title: 'Test Blog Post 2',
    topic: 'Vue',
    created_at: '2025-05-02T11:00:00Z',
    published: true
  }
]

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/blog/:id', name: 'BlogDetail', component: { template: '<div></div>' } }
  ]
})

describe('BlogListView.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
  })
  
  // 1. Test component rendering
  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      // Setup API to return pending promise
      apiService.getBlogList.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Check loading state is visible
      expect(wrapper.text()).toContain('Loading')
      // List items should not be present
      expect(wrapper.findAll('li').length).toBe(0)
    })
    
    it('renders empty state when no posts are found', async () => {
      // Setup API to return empty list
      apiService.getBlogList.mockResolvedValue({
        success: true,
        posts: []
      })
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check for empty state message
      expect(wrapper.text()).toContain('No blog posts found')
      expect(wrapper.findAll('li').length).toBe(1) // This is the "no posts" li
    })
    
    it('renders error state when API fails', async () => {
      // Setup API to return error
      apiService.getBlogList.mockResolvedValue({
        success: false,
        error: 'Failed to load blog posts'
      })
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check for error message
      expect(wrapper.text()).toContain('Failed to load blog posts')
      expect(wrapper.find('.error').exists()).toBe(true)
    })
    
    it('renders list of blog posts when data is available', async () => {
      // Setup API to return mock posts
      apiService.getBlogList.mockResolvedValue({
        success: true,
        posts: mockPosts
      })
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check that blog posts are rendered
      const listItems = wrapper.findAll('li')
      expect(listItems.length).toBe(2)
      expect(wrapper.text()).toContain('Test Blog Post 1')
      expect(wrapper.text()).toContain('Test Blog Post 2')
      
      // Check that router links are present with correct URLs
      const links = wrapper.findAll('router-link')
      expect(links.length).toBe(2)
      expect(links[0].attributes('to')).toBe('/blog/post-1')
      expect(links[1].attributes('to')).toBe('/blog/post-2')
    })
  })
  
  // 2. Test API integration
  describe('API Integration', () => {
    it('calls getBlogList on mount', () => {
      apiService.getBlogList.mockResolvedValue({ success: true, posts: [] })
      
      mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Verify API was called
      expect(apiService.getBlogList).toHaveBeenCalledTimes(1)
    })
    
    it('displays dates in correct format', async () => {
      // Setup API mock
      apiService.getBlogList.mockResolvedValue({
        success: true,
        posts: mockPosts
      })
      
      // Mock formatDate to test its behavior
      const mockFormatDate = vi.fn().mockReturnValue('May 1, 2025')
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Replace the formatDate method
      wrapper.vm.formatDate = mockFormatDate
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Verify formatDate was called with correct dates
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-01T10:00:00Z')
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-02T11:00:00Z')
    })
    
    it('handles fetch errors gracefully', async () => {
      // Setup API to throw error
      apiService.getBlogList.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to reject
      await flushPromises()
      
      // Check error is displayed
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Network error')
    })
  })
  
  // 3. Test navigation/routing
  describe('Navigation', () => {
    it('navigates to correct URL when blog post link is clicked', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API mock
      apiService.getBlogList.mockResolvedValue({
        success: true,
        posts: mockPosts
      })
      
      const wrapper = mount(BlogListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click first blog link
      const firstBlogLink = wrapper.findAll('router-link')[0]
      await firstBlogLink.trigger('click')
      
      // Verify router navigation
      expect(routerPushSpy).toHaveBeenCalledWith(expect.objectContaining({
        path: '/blog/post-1'
      }))
    })
  })
})

