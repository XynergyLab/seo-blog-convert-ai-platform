import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SocialPreview from '@/components/social/SocialPreview.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  getSocial: vi.fn(),
  publishSocial: vi.fn(),
  deleteSocial: vi.fn(),
  scheduleSocial: vi.fn()
}))

// Mock sample data for different platforms/statuses
const mockTwitterPost = {
  id: 'social-1',
  content: 'This is a Twitter post about testing',
  platform: 'twitter',
  topic: 'Testing',
  status: 'draft',
  created_at: '2025-05-01T10:00:00Z',
  hashtags: ['testing', 'twitter']
}

const mockScheduledPost = {
  id: 'social-2',
  content: 'This post is scheduled for later',
  platform: 'facebook',
  topic: 'Scheduling',
  status: 'scheduled',
  created_at: '2025-05-01T10:00:00Z',
  scheduled_at: '2025-05-10T15:00:00Z',
  hashtags: ['scheduled', 'facebook']
}

const mockPublishedPost = {
  id: 'social-3',
  content: 'This post has been published',
  platform: 'instagram',
  topic: 'Publishing',
  status: 'published',
  created_at: '2025-05-01T10:00:00Z',
  published_at: '2025-05-01T12:00:00Z',
  hashtags: ['published', 'instagram']
}

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/social/:id', 
      name: 'SocialDetail',
      component: SocialPreview,
      props: true
    },
    {
      path: '/social',
      name: 'SocialList',
      component: { template: '<div></div>' }
    }
  ]
})

// Mock confirm dialog
vi.stubGlobal('confirm', vi.fn())

describe('SocialPreview.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers() // For setTimeout testing
    
    // Default mock for confirm dialog (approve by default)
    window.confirm.mockReturnValue(true)
  })
  
  // 1. Test platform-specific display
  describe('Platform-specific Display', () => {
    it('displays Twitter post with correct styling', async () => {
      // Setup API to return Twitter post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Check platform badge
      const platformBadge = wrapper.find('.platform-badge')
      expect(platformBadge.text()).toBe('TWITTER')
      expect(platformBadge.classes()).toContain('twitter')
      
      // Check content styling
      const content = wrapper.find('.post-content')
      expect(content.classes()).toContain('twitter-style')
      
      // Check character count
      const charInfo = wrapper.find('.char-info')
      expect(charInfo.text()).toContain('Characters: 34 / 280')
    })
    
    it('displays Facebook post with correct styling', async () => {
      // Setup API to return Facebook post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockScheduledPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Check platform badge
      const platformBadge = wrapper.find('.platform-badge')
      expect(platformBadge.text()).toBe('FACEBOOK')
      expect(platformBadge.classes()).toContain('facebook')
      
      // Check content styling
      const content = wrapper.find('.post-content')
      expect(content.classes()).toContain('facebook-style')
    })
    
    it('displays Instagram post with correct styling', async () => {
      // Setup API to return Instagram post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockPublishedPost
      })
      
      const wrapper = mount(SocialPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-3' }
            }
          }
        }
      })
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check platform badge
      const platformBadge = wrapper.find('.platform-badge')
      expect(platformBadge.text()).toBe('INSTAGRAM')
      expect(platformBadge.classes()).toContain('instagram')
      
      // Check content styling
      const content = wrapper.find('.post-content')
      expect(content.classes()).toContain('instagram-style')
    })
    
    it('displays status badge correctly', async () => {
      // Setup API to return posts with different statuses
      apiService.getSocial.mockResolvedValueOnce({
        success: true,
        post: mockTwitterPost // draft status
      }).mockResolvedValueOnce({
        success: true,
        post: mockScheduledPost // scheduled status
      }).mockResolvedValueOnce({
        success: true,
        post: mockPublishedPost // published status
      })
      
      // 1. Test draft status
      let wrapper = mount(SocialPreview, {
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
      
      let statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('draft')
      expect(statusBadge.classes()).toContain('draft')
      
      // 2. Test scheduled status
      wrapper = mount(SocialPreview, {
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
      
      statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('scheduled')
      expect(statusBadge.classes()).toContain('scheduled')
      
      // 3. Test published status
      wrapper = mount(SocialPreview, {
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
      
      statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('published')
      expect(statusBadge.classes()).toContain('published')
    })
    
    it('displays hashtags correctly', async () => {
      // Setup API to return post with hashtags
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Check hashtags
      const hashtags = wrapper.findAll('.hashtag')
      expect(hashtags.length).toBe(2)
      expect(hashtags[0].text()).toBe('#testing')
      expect(hashtags[1].text()).toBe('#twitter')
    })
    
    it('displays scheduled/published dates correctly', async () => {
      // Setup API to return scheduled post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockScheduledPost
      })
      
      // Mock formatDate method
      const mockFormatDate = vi.fn().mockReturnValue('May 10, 2025, 3:00 PM')
      
      const wrapper = mount(SocialPreview, {
        global: {
          plugins: [router],
          mocks: {
            $route: {
              params: { id: 'social-2' }
            }
          }
        }
      })
      
      // Replace formatDate method
      wrapper.vm.formatDate = mockFormatDate
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Check that dates are displayed and formatted
      expect(wrapper.text()).toContain('Scheduled:')
      expect(mockFormatDate).toHaveBeenCalledWith('2025-05-10T15:00:00Z')
    })
  })
  
  // 2. Test post actions
  describe('Post Actions', () => {
    it('shows/hides action buttons based on post status', async () => {
      // Setup API with different status posts
      
      // 1. Draft post should have all action buttons
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost // draft
      })
      
      let wrapper = mount(SocialPreview, {
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
      
      // Draft posts should have Edit, Schedule, Publish, Delete
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(4) // Edit, Schedule, Publish, Delete
      expect(buttons[0].text()).toBe('Edit')
      expect(buttons[1].text()).toBe('Schedule')
      expect(buttons[2].text()).toBe('Publish Now')
      
      // 2. Published post should only have Edit and Delete
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockPublishedPost // published
      })
      
      wrapper = mount(SocialPreview, {
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
      
      // Published posts should not have Schedule or Publish buttons
      const publishedButtons = wrapper.findAll('button')
      expect(publishedButtons.length).toBe(2) // Edit, Delete
      expect(publishedButtons[0].text()).toBe('Edit')
    })
    
    it('navigates to edit view when Edit button is clicked', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Find and click Edit button
      const editButton = wrapper.findAll('button')[0] // First button should be Edit
      await editButton.trigger('click')
      
      // Verify router navigation
      expect(routerPushSpy).toHaveBeenCalledWith({
        path: '/social/social-1',
        query: { edit: 'true' }
      })
    })
    
    it('shows schedule form when Schedule button is clicked', async () => {
      // Setup API to return draft post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Initially, schedule form should be hidden
      expect(wrapper.find('.schedule-form').exists()).toBe(false)
      
      // Find and click Schedule button
      const scheduleButton = wrapper.findAll('button')[1] // Second button should be Schedule
      await scheduleButton.trigger('click')
      
      // Schedule form should now be visible
      expect(wrapper.find('.schedule-form').exists()).toBe(true)
      expect(wrapper.find('.schedule-form').text()).toContain('Schedule Post')
    })
    
    it('calls publishSocial when Publish button is clicked', async () => {
      // Setup API to return draft post and success on publish
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.publishSocial.mockResolvedValue({
        success: true,
        post: {
          ...mockTwitterPost,
          status: 'published',
          published_at: '2025-05-03T13:00:00Z'
        }
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Find and click Publish button
      const publishButton = wrapper.findAll('button')[2] // Third button should be Publish
      await publishButton.trigger('click')
      
      // Verify API call
      expect(apiService.publishSocial).toHaveBeenCalledWith('social-1')
      
      // Wait for publish API to resolve
      await flushPromises()
      
      // Success message should be visible
      expect(wrapper.find('.success').exists()).toBe(true)
      expect(wrapper.text()).toContain('Post published successfully')
    })
    
    it('shows confirmation dialog before deleting post', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[3] // Last button should be Delete
      await deleteButton.trigger('click')
      
      // Verify confirm dialog was shown
      expect(window.confirm).toHaveBeenCalled()
      expect(window.confirm.mock.calls[0][0]).toContain('Are you sure')
    })
    
    it('does not delete when confirmation is canceled', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      // Set confirm to return false (cancel)
      window.confirm.mockReturnValueOnce(false)
      
      const wrapper = mount(SocialPreview, {
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
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[3]
      await deleteButton.trigger('click')
      
      // Verify delete API was not called
      expect(apiService.deleteSocial).not.toHaveBeenCalled()
    })
    
    it('calls deleteSocial and navigates when confirmed', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API to return post and successfully delete
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.deleteSocial.mockResolvedValue({
        success: true
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Find and click Delete button
      const deleteButton = wrapper.findAll('button')[3]
      await deleteButton.trigger('click')
      
      // Verify delete API was called
      expect(apiService.deleteSocial).toHaveBeenCalledWith('social-1')
      
      // Wait for delete API to resolve
      await flushPromises()
      
      // Success message should be visible
      expect(wrapper.find('.success').exists()).toBe(true)
      
      // Advance timers for navigation timeout
      vi.advanceTimersByTime(1300)
      
      // Verify navigation to list page
      expect(routerPushSpy).toHaveBeenCalledWith('/social')
    })
  })
  
  // 3. Test scheduling functionality
  describe('Scheduling Functionality', () => {
    it('validates date/time inputs in schedule form', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Open schedule form
      const scheduleButton = wrapper.findAll('button')[1]
      await scheduleButton.trigger('click')
      
      // Schedule form should be visible
      const scheduleForm = wrapper.find('.schedule-form')
      expect(scheduleForm.exists()).toBe(true)
      
      // Find date and time inputs
      const dateInput = scheduleForm.find('input[type="date"]')
      const timeInput = scheduleForm.find('input[type="time"]')
      const confirmButton = scheduleForm.find('button.primary-btn')
      
      // Confirm button should be disabled without date/time
      expect(confirmButton.attributes('disabled')).toBeDefined()
      
      // Set valid date but no time
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateString = tomorrow.toISOString().split('T')[0]
      
      await dateInput.setValue(dateString)
      
      // Button should still be disabled
      expect(confirmButton.attributes('disabled')).toBeDefined()
      
      // Set valid time
      await timeInput.setValue('15:00')
      
      // Button should now be enabled
      expect(confirmButton.attributes('disabled')).toBeUndefined()
    })
    
    it('calls scheduleSocial API with correct date/time', async () => {
      // Setup API to return post and successfully schedule
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.scheduleSocial.mockResolvedValue({
        success: true,
        post: mockScheduledPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Open schedule form
      await wrapper.findAll('button')[1].trigger('click')
      
      // Fill schedule form
      const scheduleForm = wrapper.find('.schedule-form')
      const dateInput = scheduleForm.find('input[type="date"]')
      const timeInput = scheduleForm.find('input[type="time"]')
      
      await dateInput.setValue('2025-05-10')
      await timeInput.setValue('15:00')
      
      // Submit schedule form
      await scheduleForm.find('button.primary-btn').trigger('click')
      
      // Verify API was called with correct ISO date
      expect(apiService.scheduleSocial).toHaveBeenCalledWith('social-1', {
        scheduled_at: '2025-05-10T15:00:00'
      })
      
      // Wait for API to resolve
      await flushPromises()
      
      // Success message should be visible
      expect(wrapper.text()).toContain('Post scheduled')
      
      // Schedule form should be hidden after success
      expect(wrapper.find('.schedule-form').exists()).toBe(false)
    })
    
    it('handles API failure during scheduling', async () => {
      // Setup API to return post but fail scheduling
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.scheduleSocial.mockResolvedValue({
        success: false,
        error: 'Failed to schedule post'
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Open schedule form
      await wrapper.findAll('button')[1].trigger('click')
      
      // Fill schedule form
      const scheduleForm = wrapper.find('.schedule-form')
      await scheduleForm.find('input[type="date"]').setValue('2025-05-10')
      await scheduleForm.find('input[type="time"]').setValue('15:00')
      
      // Submit schedule form
      await scheduleForm.find('button.primary-btn').trigger('click')
      
      // Wait for API to resolve
      await flushPromises()
      
      // Error message should be visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to schedule post')
      
      // Schedule form should remain visible after error
      expect(wrapper.find('.schedule-form').exists()).toBe(true)
    })
    
    it('cancels scheduling when cancel button is clicked', async () => {
      // Setup API to return post
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Open schedule form
      await wrapper.findAll('button')[1].trigger('click')
      
      // Schedule form should be visible
      expect(wrapper.find('.schedule-form').exists()).toBe(true)
      
      // Fill some data
      await wrapper.find('input[type="date"]').setValue('2025-05-10')
      
      // Click cancel button
      await wrapper.find('.schedule-form button.cancel-btn').trigger('click')
      
      // Schedule form should be hidden
      expect(wrapper.find('.schedule-form').exists()).toBe(false)
      
      // No API call should have been made
      expect(apiService.scheduleSocial).not.toHaveBeenCalled()
    })
  })
  
  // 4. Test error handling
  describe('Error Handling', () => {
    it('shows error when post fetch fails', async () => {
      // Setup API to fail
      apiService.getSocial.mockResolvedValue({
        success: false,
        error: 'Failed to find post'
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Error message should be visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to find post')
      
      // Post content should not be rendered
      expect(wrapper.find('.post-content').exists()).toBe(false)
    })
    
    it('shows error when publish API fails', async () => {
      // Setup API to return post but fail on publish
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.publishSocial.mockResolvedValue({
        success: false,
        error: 'Failed to publish post'
      })
      
      const wrapper = mount(SocialPreview, {
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
      
      // Click publish button
      await wrapper.findAll('button')[2].trigger('click')
      
      // Wait for publish API to resolve
      await flushPromises()
      
      // Error message should be visible
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to publish post')
    })
    
    it('disables buttons during API operations', async () => {
      // Setup API to return post but never resolve publish
      apiService.getSocial.mockResolvedValue({
        success: true,
        post: mockTwitterPost
      })
      
      apiService.publishSocial.mockReturnValue(new Promise(() => {})) // Never resolves
      
      const wrapper = mount(SocialPreview, {
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
      
      // Click publish button
      await wrapper.findAll('button')[2].trigger('click')
      
      // All buttons should be disabled during operation
      const buttons = wrapper.findAll('button')
      for (let i = 0; i < buttons.length; i++) {
        expect(buttons[i].attributes('disabled')).toBeDefined()
      }
      
      // Loading indicator should be visible
      expect(wrapper.text()).toContain('Publishing')
    })
  })
})

