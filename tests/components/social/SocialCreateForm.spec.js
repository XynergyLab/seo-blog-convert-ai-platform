import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SocialCreateForm from '@/components/social/SocialCreateForm.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  createSocial: vi.fn()
}))

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/social/:id', name: 'SocialDetail', component: { template: '<div></div>' } }
  ]
})

// Mock social post response
const mockSocialPost = {
  id: 'social-1',
  content: 'Test social post content',
  platform: 'twitter',
  topic: 'Testing',
  status: 'draft',
  created_at: '2025-05-01T10:00:00Z',
  hashtags: ['testing', 'social']
}

describe('SocialCreateForm.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers() // For setTimeout testing
  })
  
  // 1. Test platform and content validation
  describe('Platform and Content Validation', () => {
    it('renders all form fields correctly', () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Check form fields exist
      expect(wrapper.find('select[v-model="platform"]').exists()).toBe(true)
      expect(wrapper.find('input[placeholder="Post topic"]').exists()).toBe(true)
      expect(wrapper.find('select[v-model="tone"]').exists()).toBe(true)
      expect(wrapper.find('input[type="checkbox"][v-model="includeHashtags"]').exists()).toBe(true)
      
      // Platform options
      const platformOptions = wrapper.find('select[v-model="platform"]').findAll('option')
      expect(platformOptions.length).toBeGreaterThan(4) // empty + twitter, facebook, instagram, linkedin
      
      // Tone options
      const toneOptions = wrapper.find('select[v-model="tone"]').findAll('option')
      expect(toneOptions.length).toBeGreaterThan(1)
    })
    
    it('shows platform character limit when platform is selected', async () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Initially, no character limit shown
      expect(wrapper.find('.char-limit').exists()).toBe(false)
      
      // Select Twitter platform
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      
      // Character limit should now be visible
      expect(wrapper.find('.char-limit').exists()).toBe(true)
      expect(wrapper.find('.char-limit').text()).toContain('Character limit for twitter: 280')
    })
    
    it('shows Instagram-specific requirement note', async () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Select Instagram platform
      await wrapper.find('select[v-model="platform"]').setValue('instagram')
      
      // Instagram note should be visible
      expect(wrapper.find('.platform-note').exists()).toBe(true)
      expect(wrapper.find('.platform-note').text()).toContain('Instagram requires')
    })
    
    it('conditionally displays hashtag count dropdown', async () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Initially, hashtags are included by default
      expect(wrapper.find('select[v-model="hashtagCount"]').exists()).toBe(true)
      
      // Uncheck include hashtags
      await wrapper.find('input[type="checkbox"][v-model="includeHashtags"]').setValue(false)
      
      // Hashtag count should be hidden
      expect(wrapper.find('select[v-model="hashtagCount"]').exists()).toBe(false)
    })
    
    it('requires platform selection for form submission', async () => {
      // Setup API mock (shouldn't be called)
      apiService.createSocial.mockResolvedValue({})
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Submit button should be disabled without platform
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
      
      // Fill topic but not platform
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      
      // Submit the form (shouldn't call API)
      await wrapper.find('form').trigger('submit')
      
      // API should not be called
      expect(apiService.createSocial).not.toHaveBeenCalled()
    })
  })
  
  // 2. Test form submission
  describe('Form Submission', () => {
    it('calls createSocial API with correct payload', async () => {
      // Setup API mock success response
      apiService.createSocial.mockResolvedValue({
        success: true,
        post: mockSocialPost
      })
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      await wrapper.find('select[v-model="tone"]').setValue('casual')
      await wrapper.find('input[type="checkbox"][v-model="includeHashtags"]').setValue(true)
      await wrapper.find('select[v-model="hashtagCount"]').setValue(3)
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Verify API was called with correct payload
      expect(apiService.createSocial).toHaveBeenCalledWith({
        platform: 'twitter',
        topic: 'Test topic',
        tone: 'casual',
        include_hashtags: true,
        hashtag_count: 3
      })
    })
    
    it('shows loading state during submission', async () => {
      // Setup API to return a pending promise
      apiService.createSocial.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Loading indicator should be visible
      expect(wrapper.text()).toContain('Generating social media post')
      
      // Submit button should be disabled
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
    
    it('shows success message after successful creation', async () => {
      // Setup API mock success response
      apiService.createSocial.mockResolvedValue({
        success: true,
        post: mockSocialPost
      })
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Success message should be visible
      expect(wrapper.find('.success').exists()).toBe(true)
      expect(wrapper.text()).toContain('Social media post generated')
    })
    
    it('shows error message when API fails', async () => {
      // Setup API mock error response
      apiService.createSocial.mockResolvedValue({
        success: false,
        error: 'Failed to create social post'
      })
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Error message should be visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to create social post')
    })
    
    it('navigates to preview after successful creation', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API mock success response
      apiService.createSocial.mockResolvedValue({
        success: true,
        post: mockSocialPost
      })
      
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      await wrapper.find('input[placeholder="Post topic"]').setValue('Test topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Advance timers for setTimeout
      vi.advanceTimersByTime(1300)
      
      // Verify navigation
      expect(routerPushSpy).toHaveBeenCalledWith('/social/social-1')
    })
  })
  
  // 3. Test platform-specific UI
  describe('Platform-specific UI', () => {
    it('updates character limit when platform changes', async () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Select Twitter
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      expect(wrapper.find('.char-limit').text()).toContain('280')
      
      // Change to LinkedIn
      await wrapper.find('select[v-model="platform"]').setValue('linkedin')
      expect(wrapper.find('.char-limit').text()).toContain('3000')
      
      // Change to Facebook
      await wrapper.find('select[v-model="platform"]').setValue('facebook')
      expect(wrapper.find('.char-limit').text()).toContain('63206')
    })
    
    it('clears error message when platform changes', async () => {
      // This tests the behavior of the updateCharLimit method
      
      // Setup component with initial error
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Set an error message directly
      wrapper.vm.error = 'Some error message'
      await wrapper.vm.$nextTick()
      
      // Verify error is displayed
      expect(wrapper.find('.error').exists()).toBe(true)
      
      // Change platform
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      
      // Error should be cleared
      expect(wrapper.find('.error').exists()).toBe(false)
    })
    
    it('disables submit when platform is not selected', async () => {
      const wrapper = mount(SocialCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Initially, platform is empty
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
      
      // Select platform
      await wrapper.find('select[v-model="platform"]').setValue('twitter')
      
      // Button should be enabled
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
      
      // Set back to empty
      await wrapper.find('select[v-model="platform"]').setValue('')
      
      // Button should be disabled again
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
  })
})

