import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SocialEditor from '@/components/social/SocialEditor.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  getSocial: vi.fn(),
  editSocial: vi.fn()
}))

// Mock sample data for different platforms
const mockTwitterPost = {
  id: 'social-1',
  content: 'This is a Twitter post about testing',
  platform: 'twitter',
  topic: 'Testing',
  status: 'draft',
  created_at: '2025-05-01T10:00:00Z',
  hashtags: ['testing', 'twitter']
}

const mockInstagramPost = {
  id: 'social-2',
  content: 'This is an Instagram post',
  platform: 'instagram',
  topic: 'Social Media',
  status: 'draft',
  created_at: '2025-05-01T10:00:00Z',
  hashtags: ['instagram', 'photo']
}

// Very long content for character limit testing
const generateLongContent = (length) => {
  return 'x'.repeat(length)
}

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/social/:id', 
      name: 'SocialDetail', 
      component: { template: '<div></div>' },
      props: true
    }
  ]
})

describe('SocialEditor.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers() // For setTimeout testing
  })
  
  // 1. Test form validation and constraints
  describe('Form Validation and Constraints', () => {
    it('renders platform badge and character counter', async () => {
      // Setup API to return Twitter post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check platform badge is visible
      const platformBadge = wrapper.find('.platform-badge')
      expect(platformBadge.exists()).toBe(true)
      expect(platformBadge.text()).toBe('TWITTER')
      
      // Check character counter exists
      const charCounter = wrapper.find('.char-counter')
      expect(charCounter.exists()).toBe(true)
      expect(charCounter.text()).toContain('34 / 280')
    })
    
    it('shows warning when content exceeds platform limit', async () => {
      // Setup API to return Twitter post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Update content to exceed Twitter's limit (280 chars)
      const longContent = generateLongContent(290)
      await wrapper.find('textarea').setValue(longContent)
      
      // Character counter should be red
      const charCounter = wrapper.find('.char-counter')
      expect(charCounter.classes()).toContain('over-limit')
      
      // Warning message should be visible
      expect(wrapper.find('.limit-warning').exists()).toBe(true)
      
      // Save button should be disabled
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
    
    it('parses hashtags correctly', async () => {
      // Setup API to return post with hashtags
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check that hashtags are loaded
      expect(wrapper.vm.hashtagsInput).toBe('testing twitter')
      
      // Update hashtags with mixed formats
      await wrapper.find('input[placeholder="Enter hashtags separated by spaces or commas"]').setValue('new, #tag, with,spaces')
      
      // Check hashtag preview
      const hashtags = wrapper.findAll('.hashtag')
      expect(hashtags.length).toBe(4)
      expect(hashtags[0].text()).toBe('#new')
      expect(hashtags[1].text()).toBe('#tag')
      expect(hashtags[2].text()).toBe('#with')
      expect(hashtags[3].text()).toBe('#spaces')
    })
  })
  
  // 2. Test edit functionality
  describe('Edit Functionality', () => {
    it('loads post data correctly', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check fields are populated
      expect(wrapper.vm.content).toBe('This is a Twitter post about testing')
      expect(wrapper.vm.hashtagsInput).toBe('testing twitter')
      expect(wrapper.vm.topic).toBe('Testing')
      expect(wrapper.vm.platform).toBe('twitter')
    })
    
    it('submits edited content correctly', async () => {
      // Setup API to return post and successful update
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.editSocial.mockResolvedValue({
        success: true,
        post: {
          ...mockTwitterPost,
          content: 'Updated content',
          hashtags: ['new', 'hashtags']
        }
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Update fields
      await wrapper.find('textarea').setValue('Updated content')
      await wrapper.find('input[placeholder="Enter hashtags separated by spaces or commas"]').setValue('new hashtags')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      // Verify API was called with correct data
      expect(apiService.editSocial).toHaveBeenCalledWith('social-1', {
        content: 'Updated content',
        hashtags: ['new', 'hashtags'],
        topic: 'Testing'
      })
      
      // Should show loading indicator
      expect(wrapper.find('.status-message').exists()).toBe(true)
      expect(wrapper.text()).toContain('Saving changes')
    })
    
    it('shows success message after saving', async () => {
      // Setup API to return post and successful update
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.editSocial.mockResolvedValue({
        success: true,
        post: {
          ...mockTwitterPost,
          content: 'Updated content'
        }
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Update content
      await wrapper.find('textarea').setValue('Updated content')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      // Wait for edit API to resolve
      await flushPromises()
      
      // Success message should be visible
      expect(wrapper.find('.success').exists()).toBe(true)
      expect(wrapper.text()).toContain('Social post updated successfully')
    })
    
    it('navigates back to preview after successful save', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return post and successful update
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.editSocial.mockResolvedValue({
        success: true,
        post: {
          ...mockTwitterPost,
          content: 'Updated content'
        }
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Update content
      await wrapper.find('textarea').setValue('Updated content')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      // Wait for edit API to resolve
      await flushPromises()
      
      // Advance timers for navigation timeout
      vi.advanceTimersByTime(1300)
      
      // Verify navigation
      expect(routerPushSpy).toHaveBeenCalledWith('/social/social-1')
    })
    
    it('shows error message on API failure', async () => {
      // Setup API to return post but failed update
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.editSocial.mockResolvedValue({
        success: false,
        error: 'Failed to update post'
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Update content
      await wrapper.find('textarea').setValue('Updated content')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      // Wait for edit API to resolve
      await flushPromises()
      
      // Error message should be visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to update post')
    })
  })
  
  // 3. Test platform-specific features
  describe('Platform-specific Features', () => {
    it('shows different character limits per platform', async () => {
      // Test with Twitter
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost // Twitter platform
      })
      
      let wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      await flushPromises()
      
      // Check Twitter limit
      expect(wrapper.find('.char-counter').text()).toContain('280')
      
      // Test with Instagram
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockInstagramPost // Instagram platform
      })
      
      wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-2' }
            }
          }
        }
      })
      
      await flushPromises()
      
      // Check Instagram limit
      expect(wrapper.find('.char-counter').text()).toContain('2200')
    })
    
    it('provides platform-specific styling', async () => {
      // Setup API to return Instagram post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockInstagramPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-2' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Instagram platform badge should have specific styling
      const platformBadge = wrapper.find('.platform-badge')
      expect(platformBadge.classes()).toContain('instagram')
    })
    
    it('validates against platform constraints', async () => {
      // Test validation function directly by exposing it
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      await flushPromises()
      
      // Get reference to validateContent method
      const validateContent = wrapper.vm.validateContent
      
      // Set content longer than Twitter's limit
      wrapper.vm.content = generateLongContent(300)
      validateContent()
      
      // Should have validation error
      expect(wrapper.vm.validationError).not.toBeNull()
      
      // Button should be disabled
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
    
    it('handles navigation to preview when cancel is clicked', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Make some changes
      await wrapper.find('textarea').setValue('Changed but not saved')
      
      // Find and click Cancel button
      const cancelButton = wrapper.find('button.cancel-btn')
      await cancelButton.trigger('click')
      
      // Verify navigation to detail view without edit query param
      expect(routerPushSpy).toHaveBeenCalledWith(`/social/${mockTwitterPost.id}`)
      
      // Verify no API call was made
      expect(apiService.editSocial).not.toHaveBeenCalled()
    })
    
    it('shows loading state during initial data fetch', async () => {
      // Setup API to never resolve
      apiService.getSocial.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Check loading indicator is visible
      expect(wrapper.text()).toContain('Loading')
      
      // Form should not be visible yet
      expect(wrapper.find('form').exists()).toBe(false)
    })
    
    it('shows error when API fetch fails', async () => {
      // Setup API to fail
      apiService.getSocial.mockResolvedValue({
        success: false,
        error: 'Failed to find social post'
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'non-existent-id' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check error message is visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to find social post')
      
      // Form should not be visible
      expect(wrapper.find('form').exists()).toBe(false)
    })
    
    it('handles API exceptions gracefully', async () => {
      // Setup API to throw error
      apiService.getSocial.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to reject
      await flushPromises()
      
      // Check error message is visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Network error')
    })
    
    it('validates each platform with appropriate character limits', async () => {
      // Test for Facebook (higher limit)
      const mockFacebookPost = {
        id: 'social-3',
        content: 'This is a Facebook post',
        platform: 'facebook',
        topic: 'Testing',
        status: 'draft',
        created_at: '2025-05-01T10:00:00Z',
        hashtags: []
      }
      
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockFacebookPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-3' }
            }
          }
        }
      })
      
      await flushPromises()
      
      // Facebook should allow much longer content
      const longFacebookContent = generateLongContent(3000)
      await wrapper.find('textarea').setValue(longFacebookContent)
      
      // Should NOT have validation error for Facebook's higher limit
      expect(wrapper.find('.over-limit').exists()).toBe(false)
      
      // Button should be enabled
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
      
      // Update to way too long content
      const excessiveContent = generateLongContent(70000)
      await wrapper.find('textarea').setValue(excessiveContent)
      
      // Should show validation error even for Facebook
      expect(wrapper.find('.over-limit').exists()).toBe(true)
    })
    
    it('disables buttons during save operation', async () => {
      // Setup API to return post but never resolve edit
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.editSocial.mockReturnValue(new Promise(() => {})) // Never resolves
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for get API promise to resolve
      await flushPromises()
      
      // Update content
      await wrapper.find('textarea').setValue('Updated content')
      
      // Submit form
      await wrapper.find('form').trigger('submit')
      
      // Both buttons should be disabled during operation
      const buttons = wrapper.findAll('button')
      expect(buttons[0].attributes('disabled')).toBeDefined() // Save button
      expect(buttons[1].attributes('disabled')).toBeDefined() // Cancel button
      
      // Loading indicator should be visible
      expect(wrapper.text()).toContain('Saving changes')
    })
    
    it('handles invalid hashtag input gracefully', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialEditor, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-1' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Test with empty hashtags
      await wrapper.find('input[placeholder="Enter hashtags separated by spaces or commas"]').setValue('')
      
      // Empty hashtags should be handled gracefully
      expect(wrapper.findAll('.hashtag').length).toBe(0)
      
      // Test with only spaces and commas
      await wrapper.find('input[placeholder="Enter hashtags separated by spaces or commas"]').setValue(',,, ,,,')
      
      // Should filter out empty tags
      expect(wrapper.findAll('.hashtag').length).toBe(0)
    })
  })
})

