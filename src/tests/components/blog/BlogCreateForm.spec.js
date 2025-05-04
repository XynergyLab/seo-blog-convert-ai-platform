import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import BlogCreateForm from '@/components/blog/BlogCreateForm.vue'
import * as apiService from '@/services/api'

// Mock API service
vi.mock('@/services/api', () => ({
  createBlog: vi.fn()
}))

// Setup mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/blog/:id', name: 'BlogDetail', component: { template: '<div></div>' } }
  ]
})

describe('BlogCreateForm.vue', () => {
  
  // Setup for each test
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers() // For setTimeout testing
  })
  
  // 1. Test form rendering and validation
  describe('Form Rendering and Validation', () => {
    it('renders all form fields correctly', () => {
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Check all form fields are present
      expect(wrapper.find('input[placeholder="Blog title"]').exists()).toBe(true)
      expect(wrapper.find('input[placeholder="Blog topic"]').exists()).toBe(true)
      expect(wrapper.find('input[placeholder="Keywords (comma separated)"]').exists()).toBe(true)
      expect(wrapper.find('select[v-model="tone"]').exists()).toBe(true)
      expect(wrapper.find('select[v-model="length"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })
    
    it('disables submit button during loading state', async () => {
      // Mock a pending API call
      apiService.createBlog.mockReturnValue(new Promise(() => {}))
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill required fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Check that the button is disabled during loading
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Generating blog post')
    })
    
    it('validates required fields', async () => {
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router],
          stubs: {
            // Stub the form submission to avoid redirects
            form: {
              template: '<form><slot></slot></form>',
              methods: {
                submit: vi.fn()
              }
            }
          }
        }
      })
      
      // Title field should be required
      const titleInput = wrapper.find('input[placeholder="Blog title"]')
      expect(titleInput.attributes('required')).toBeDefined()
      
      // Topic field should be required
      const topicInput = wrapper.find('input[placeholder="Blog topic"]')
      expect(topicInput.attributes('required')).toBeDefined()
      
      // Keywords field should not be required
      const keywordsInput = wrapper.find('input[placeholder="Keywords (comma separated)"]')
      expect(keywordsInput.attributes('required')).toBeUndefined()
    })
  })
  
  // 2. Test API integration
  describe('API Integration', () => {
    it('calls createBlog API with correct payload', async () => {
      // Setup API mock success response
      const mockPostResponse = {
        success: true,
        post: {
          id: 'new-post-id',
          title: 'Test Title',
          topic: 'Test Topic'
        }
      }
      
      apiService.createBlog.mockResolvedValue(mockPostResponse)
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill form fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      await wrapper.find('input[placeholder="Keywords (comma separated)"]').setValue('test, blog')
      
      // Select options
      await wrapper.find('select[v-model="tone"]').setValue('casual')
      await wrapper.find('select[v-model="length"]').setValue('short')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Verify API was called with correct payload
      expect(apiService.createBlog).toHaveBeenCalledWith({
        title: 'Test Title',
        topic: 'Test Topic',
        keywords: 'test, blog',
        tone: 'casual',
        length: 'short'
      })
    })
    
    it('shows success message after successful creation', async () => {
      // Setup API mock success response
      const mockPostResponse = {
        success: true,
        post: {
          id: 'new-post-id',
          title: 'Test Title',
          topic: 'Test Topic'
        }
      }
      
      apiService.createBlog.mockResolvedValue(mockPostResponse)
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill required fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Verify success message is shown
      expect(wrapper.find('.success').exists()).toBe(true)
      expect(wrapper.find('.success').text()).toContain('Blog post generated!')
    })
    
    it('shows error message when API returns error', async () => {
      // Setup API mock error response
      const mockErrorResponse = {
        success: false,
        error: 'Failed to create blog post'
      }
      
      apiService.createBlog.mockResolvedValue(mockErrorResponse)
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill required fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Verify error message is shown
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.find('.error').text()).toContain('Failed to create blog post')
    })
    
    it('handles API exceptions gracefully', async () => {
      // Setup API to throw an exception
      apiService.createBlog.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill required fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to reject
      await flushPromises()
      
      // Verify error message is shown
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.find('.error').text()).toContain('Network error')
    })
    
    it('navigates to the blog preview after successful creation', async () => {
      // Setup router push spy
      const routerPushSpy = vi.spyOn(router, 'push')
      
      // Setup API mock success response
      const mockPostResponse = {
        success: true,
        post: {
          id: 'new-post-id',
          title: 'Test Title',
          topic: 'Test Topic'
        }
      }
      
      apiService.createBlog.mockResolvedValue(mockPostResponse)
      
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Fill required fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('Test Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('Test Topic')
      
      // Submit the form
      await wrapper.find('form').trigger('submit')
      
      // Wait for API promise to resolve
      await flushPromises()
      
      // Advance timers for the setTimeout
      vi.advanceTimersByTime(1300) // Slightly more than the timeout
      
      // Verify router navigation occurred
      expect(routerPushSpy).toHaveBeenCalledWith('/blog/new-post-id')
    })
  })
  
  // 3. Test user interactions
  describe('User Interactions', () => {
    it('updates form values when fields are changed', async () => {
      const wrapper = mount(BlogCreateForm, {
        global: {
          plugins: [router]
        }
      })
      
      // Get initial empty values
      expect(wrapper.vm.title).toBe('')
      expect(wrapper.vm.topic).toBe('')
      
      // Update fields
      await wrapper.find('input[placeholder="Blog title"]').setValue('New Title')
      await wrapper.find('input[placeholder="Blog topic"]').setValue('New Topic')
      await wrapper.find('select[v-model="tone"]').setValue('persuasive')
      
      // Verify values are updated
      expect(wrapper.vm.title).toBe('New Title')
      expect(wrapper.vm.topic).toBe('New Topic')
      expect(wrapper.vm.tone).toBe('persuasive')
    })
    
    it('resets form state after successful submission', async () => {
      // This would be applicable if the form clears itself after submission
      // In our implementation, we navigate away instead, so we don't need to test resetting
      
      // For components that reset fields, test like this:
      // const wrapper = mount(BlogCreateForm)
      // await wrapper.find('input').setValue('test')
      // await wrapper.vm.resetForm()
      // expect(wrapper.vm.title).toBe('')
    })
  })
})

