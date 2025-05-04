import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SocialPostListView from '@/components/social/SocialPostListView.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  getSocialList: vi.fn()
}))

// Mock sample data
const mockSocialPosts = [
  {
    id: 'social-1',
    content: 'This is a Twitter post about testing',
    platform: 'twitter',
    topic: 'Testing',
    status: 'draft',
    created_at: '2025-05-01T10:00:00Z',
    hashtags: ['testing', 'twitter']
  },
  {
    id: 'social-2',
    content: 'Facebook announcement about new features',
    platform: 'facebook',
    topic: 'Product',
    status: 'published',
    created_at: '2025-05-02T14:30:00Z',
    published_at: '2025-05-02T15:00:00Z',
    hashtags: ['announcement', 'product', 'features']
  },
  {
    id: 'social-3',
    content: 'Check out our latest Instagram post!',
    platform: 'instagram',
    topic: 'Marketing',
    status: 'scheduled',
    created_at: '2025-05-03T09:00:00Z',
    scheduled_at: '2025-05-05T12:00:00Z',
    hashtags: ['marketing', 'instagram']
  }
]

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/social/:id', name: 'SocialDetail', component: { template: '<div></div>' } }
  ]
})

describe('SocialPostListView.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
  })
  
  // 1. Test filter controls
  describe('Filter Controls', () => {
    it('renders platform and status filter dropdowns', async () => {
      // Setup API to return posts
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: []
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check filter dropdowns exist
      const platformFilter = wrapper.find('select[v-model="platformFilter"]')
      const statusFilter = wrapper.find('select[v-model="statusFilter"]')
      
      expect(platformFilter.exists()).toBe(true)
      expect(statusFilter.exists()).toBe(true)
      
      // Check platform options
      const platformOptions = platformFilter.findAll('option')
      expect(platformOptions.length).toBeGreaterThanOrEqual(5) // All + twitter, facebook, instagram, linkedin
      expect(platformOptions[0].text()).toBe('All Platforms')
      
      // Check status options
      const statusOptions = statusFilter.findAll('option')
      expect(statusOptions.length).toBeGreaterThanOrEqual(5) // All + draft, scheduled, published, failed
      expect(statusOptions[0].text()).toBe('All Statuses')
    })
    
    it('calls API with filter parameters when filters change', async () => {
      // Setup API mock
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: []
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for initial API call to resolve
      await flushPromises()
      
      // Change platform filter to 'twitter'
      await wrapper.find('select[v-model="platformFilter"]').setValue('twitter')
      
      // Verify API was called with platform param
      expect(apiService.getSocialList).toHaveBeenCalledWith({ platform: 'twitter' })
      
      // Change status filter to 'published'
      await wrapper.find('select[v-model="statusFilter"]').setValue('published')
      
      // Verify API was called with both params
      expect(apiService.getSocialList).toHaveBeenCalledWith({ 
        platform: 'twitter', 
        status: 'published' 
      })
      
      // Reset platform filter to 'all'
      await wrapper.find('select[v-model="platformFilter"]').setValue('all')
      
      // Verify API was called with just status param
      expect(apiService.getSocialList).toHaveBeenCalledWith({ 
        status: 'published' 
      })
    })
  })
  
  // 2. Test social post display
  describe('Social Post Display', () => {
    it('displays posts with platform-specific styling', async () => {
      // Setup API to return posts
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: mockSocialPosts
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check post items are rendered
      const postItems = wrapper.findAll('.post-item')
      expect(postItems.length).toBe(3)
      
      // Check platform-specific styling
      const twitterPost = postItems[0]
      const facebookPost = postItems[1]
      const instagramPost = postItems[2]
      
      // Check platform badges with correct class
      expect(twitterPost.find('.platform').text()).toBe('TWITTER')
      expect(twitterPost.find('.platform').classes()).toContain('twitter')
      
      expect(facebookPost.find('.platform').text()).toBe('FACEBOOK')
      expect(facebookPost.find('.platform').classes()).toContain('facebook')
      
      expect(instagramPost.find('.platform').text()).toBe('INSTAGRAM')
      expect(instagramPost.find('.platform').classes()).toContain('instagram')
    })
    
    it('displays status badges correctly', async () => {
      // Setup API to return posts
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: mockSocialPosts
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check status badges
      const postItems = wrapper.findAll('.post-item')
      
      // Draft status
      const draftStatus = postItems[0].find('.status')
      expect(draftStatus.text()).toBe('draft')
      expect(draftStatus.classes()).toContain('draft')
      
      // Published status
      const publishedStatus = postItems[1].find('.status')
      expect(publishedStatus.text()).toBe('published')
      expect(publishedStatus.classes()).toContain('published')
      
      // Scheduled status
      const scheduledStatus = postItems[2].find('.status')
      expect(scheduledStatus.text()).toBe('scheduled')
      expect(scheduledStatus.classes()).toContain('scheduled')
    })
    
    it('formats dates correctly', async () => {
      // Setup API mock
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: mockSocialPosts
      })
      
      // Mock formatDate method
      const mockFormatDate = vi.fn().mockReturnValue('May 1, 2025')
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Replace formatDate method
      wrapper.vm.formatDate = mockFormatDate
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Verify formatDate was called for dates
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-01T10:00:00Z') // created_at for post 1
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-02T14:30:00Z') // created_at for post 2
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-02T15:00:00Z') // published_at for post 2
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-03T09:00:00Z') // created_at for post 3
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-05T12:00:00Z') // scheduled_at for post 3
    })
    
    it('displays hashtags correctly', async () => {
      // Setup API to return posts
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: mockSocialPosts
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check hashtags
      const postItems = wrapper.findAll('.post-item')
      
      // First post hashtags
      const firstPostHashtags = postItems[0].findAll('.hashtag')
      expect(firstPostHashtags.length).toBe(2)
      expect(firstPostHashtags[0].text()).toBe('#testing')
      expect(firstPostHashtags[1].text()).toBe('#twitter')
      
      // Second post hashtags
      const secondPostHashtags = postItems[1].findAll('.hashtag')
      expect(secondPostHashtags.length).toBe(3)
      expect(secondPostHashtags[0].text()).toBe('#announcement')
      expect(secondPostHashtags[1].text()).toBe('#product')
      expect(secondPostHashtags[2].text()).toBe('#features')
    })
  })
  
  // 3. Test API Integration
  describe('API Integration', () => {
    it('calls getSocialList on mount', () => {
      // Setup API mock
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: []
      })
      
      mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Verify API was called
      expect(apiService.getSocialList).toHaveBeenCalledTimes(1)
      expect(apiService.getSocialList).toHaveBeenCalledWith({})
    })
    
    it('shows loading state initially', () => {
      // Setup API to return pending promise
      apiService.getSocialList.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Check loading state is visible
      expect(wrapper.text()).toContain('Loading')
      // Post items should not be present
      expect(wrapper.find('.post-list').exists()).toBe(false)
    })
    
    it('shows error state when API fails', async () => {
      // Setup API to return error
      apiService.getSocialList.mockResolvedValue({
        success: false,
        error: 'Failed to load social posts'
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check error state
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load social posts')
    })
    
    it('shows empty state when no posts are found', async () => {
      // Setup API to return empty list
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: []
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check empty state
      expect(wrapper.text()).toContain('No social posts found')
    })
    
    it('truncates long post content', async () => {
      // Post with long content
      const longContentPost = {
        id: 'social-4',
        content: 'This is a very long post that should be truncated. '.repeat(10),
        platform: 'twitter',
        status: 'draft',
        topic: 'Testing',
        created_at: '2025-05-01T10:00:00Z',
        hashtags: []
      }
      
      // Setup API to return post with long content
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: [longContentPost]
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check content is truncated and has ellipsis
      const postContent = wrapper.find('.post-content')
      expect(postContent.text().length).toBeLessThan(longContentPost.content.length)
      expect(postContent.text()).toContain('...')
    })
  })
  
  // 4. Test navigation
  describe('Navigation', () => {
    it('navigates to detail view when post is clicked', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return posts
      apiService.getSocialList.mockResolvedValue({
        success: true,
        posts: mockSocialPosts
      })
      
      const wrapper = mount(SocialPostListView, {
        global: {
          plugins: [router]
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Find and click first post link
      const firstPostLink = wrapper.findAll('.post-link')[0]
      await firstPostLink.trigger('click')
      
      // Verify router navigation
      expect(routerPushSpy).toHaveBeenCalledWith('/social/social-1')
    })
  })
})

