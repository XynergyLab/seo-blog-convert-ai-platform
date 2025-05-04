<style scoped>
.blog-create-form {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.wizard-progress {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  position: relative;
}

.wizard-progress::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #e0e0e0;
  z-index: 1;
}

.wizard-step {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  padding: 0 10px;
}

.wizard-step::before {
  content: '';
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #e0e0e0;
  margin-bottom: 8px;
}

.wizard-step.active::before {
  background-color: #4caf50;
}

.wizard-step.completed::before {
  background-color: #2196f3;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.keyword-tag {
  background-color: #f1f1f1;
  border-radius: 16px;
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-keyword {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions {
  margin-top: 20px;
}

button {
  padding: 10px 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 16px;
  background-color: white;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  background-color: #2196f3;
  color: white;
  border: none;
}

.outline-container {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.outline-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #ddd;
}

.outline-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.outline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title-input {
  flex: 1;
  padding: 8px;
  font-weight: bold;
}

.section-actions {
  display: flex;
  gap: 5px;
}

.section-actions button {
  padding: 5px 10px;
}

.section-content-input,
.section-content-editor {
  width: 100%;
  resize: vertical;
}

.add-section-button {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f8f8;
  border: 1px dashed #aaa;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wizard-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.loading-indicator,
.error-message,
.success-message {
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
}

.loading-indicator {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.content-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header h4 {
  margin: 0;
}

.generate-button {
  background-color: #ff9800;
  color: white;
  border: none;
}

.overlay-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.generation-options {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.spacer {
  flex: 1;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .wizard-progress {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .wizard-progress::before {
    display: none;
  }
  
  .wizard-step {
    width: 100%;
  }
}
</style>

<template>
  <div class="blog-create-form">
    <h2>Create Blog Post</h2>
    
    <!-- Wizard Progress Bar -->
    <div class="wizard-progress">
      <div 
        v-for="(step, index) in wizardSteps" 
        :key="index"
        :class="['wizard-step', { active: currentStep === index, completed: currentStep > index }]"
      >
        {{ step }}
      </div>
    </div>

    <!-- Step 1: Basic Information -->
    <div v-if="currentStep === 0">
      <form @submit.prevent="goToNextStep">
        <div class="form-group">
          <label>Title</label>
          <input v-model="title" type="text" required placeholder="Blog title" />
        </div>
        <div class="form-group">
          <label>Topic</label>
          <input v-model="topic" type="text" required placeholder="Blog topic" />
        </div>
        <div class="form-group">
          <label>Keywords</label>
          <input v-model="keywordsInput" type="text" placeholder="Keywords (comma separated)" />
          <div class="keywords-list" v-if="keywords.length > 0">
            <span v-for="(keyword, i) in keywords" :key="i" class="keyword-tag">
              {{ keyword }}
              <button type="button" @click="removeKeyword(i)" class="remove-keyword">×</button>
            </span>
          </div>
        </div>
        <div class="form-group">
          <label>Tone</label>
          <select v-model="tone">
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="persuasive">Persuasive</option>
            <option value="friendly">Friendly</option>
            <option value="authoritative">Authoritative</option>
          </select>
        </div>
        <div class="form-group">
          <label>Length</label>
          <select v-model="length">
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        <div class="actions">
          <button type="submit" :disabled="!canProceed">Next: Generate Outline</button>
        </div>
      </form>
    </div>

    <!-- Step 2: Outline Generation -->
    <div v-else-if="currentStep === 1">
      <div class="form-group">
        <h3>Blog Outline</h3>
        <p>Generate an outline for your blog post or create one manually.</p>
        
        <div class="outline-actions">
          <button 
            @click="generateOutline" 
            :disabled="outlineLoading" 
            class="primary-button"
          >
            {{ outline.length ? 'Regenerate Outline' : 'Generate Outline' }}
          </button>
        </div>
        
        <div v-if="outlineLoading" class="loading-indicator">
          Generating outline...
        </div>
        
        <div v-else-if="outlineError" class="error-message">
          {{ outlineError }}
        </div>
        
        <div v-if="outline.length > 0" class="outline-container">
          <div v-for="(section, index) in outline" :key="index" class="outline-section">
            <div class="outline-header">
              <input 
                v-model="section.title" 
                type="text" 
                placeholder="Section Title" 
                class="section-title-input"
              />
              <div class="section-actions">
                <button @click="moveSection(index, -1)" :disabled="index === 0" type="button">↑</button>
                <button @click="moveSection(index, 1)" :disabled="index === outline.length - 1" type="button">↓</button>
                <button @click="removeSection(index)" type="button">×</button>
              </div>
            </div>
            <textarea 
              v-model="section.content" 
              placeholder="Describe what this section should include..."
              rows="3"
              class="section-content-input"
            ></textarea>
          </div>
          
          <button @click="addSection" class="add-section-button">
            + Add Section
          </button>
        </div>
      </div>
      
      <div class="wizard-navigation">
        <button @click="currentStep = 0" type="button">Back</button>
        <button 
          @click="goToNextStep" 
          :disabled="outline.length === 0" 
          type="button"
        >
          Next: Generate Content
        </button>
      </div>
    </div>

    <!-- Step 3: Content Generation -->
    <div v-else-if="currentStep === 2">
      <div class="form-group">
        <h3>Content Generation</h3>
        <p>Generate content for each section or for the entire blog post at once.</p>
        
        <div class="generation-options">
          <button @click="generateFullContent" :disabled="contentLoading" class="primary-button">
            Generate Full Content
          </button>
          <div class="spacer"></div>
          <label class="toggle-label">
            <input type="checkbox" v-model="autoGenerate">
            Auto-generate all sections
          </label>
        </div>
        
        <div v-if="contentLoading" class="loading-indicator">
          Generating content...
        </div>
        
        <div v-else-if="contentError" class="error-message">
          {{ contentError }}
        </div>
        
        <div v-for="(section, index) in outline" :key="index" class="content-section">
          <div class="section-header">
            <h4>{{ section.title }}</h4>
            <button 
              v-if="!section.generatedContent" 
              @click="generateSectionContent(index)" 
              :disabled="sectionLoading === index"
              type="button"
              class="generate-button"
            >
              Generate
            </button>
            <div v-else-if="sectionLoading === index" class="section-loading">
              Generating...
            </div>
          </div>
          
          <textarea 
            v-model="section.generatedContent" 
            placeholder="Content will appear here after generation..."
            rows="6"
            class="section-content-editor"
          ></textarea>
        </div>
      </div>
      
      <div class="wizard-navigation">
        <button @click="currentStep = 1" type="button">Back</button>
        <button 
          @click="savePost" 
          :disabled="!canSave || saveLoading" 
          type="button"
          class="primary-button"
        >
          Save Blog Post
        </button>
      </div>
    </div>
    
    <!-- Loading and Error States -->
    <div v-if="saveLoading" class="overlay-loading">
      <div class="loading-spinner">Saving blog post...</div>
    </div>
    
    <div v-if="saveError" class="error-message">
      {{ saveError }}
    </div>
    
    <div v-if="saveSuccess" class="success-message">
      {{ saveSuccess }}
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  createBlog, 
  generateBlogOutline,
  generateBlogSection 
} from '../../services/api'

export default {
  name: 'BlogCreateForm',
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    // Router
    const router = useRouter()

    // Wizard steps
    const wizardSteps = ['Basic Information', 'Create Outline', 'Generate Content']
    const currentStep = ref(0)

    // Basic information
    const title = ref('')
    const topic = ref('')
    const keywordsInput = ref('')
    const keywords = ref([])
    const tone = ref('professional')
    const length = ref('medium')

    // Watch for keywords changes from input
    watch(keywordsInput, (newValue) => {
      if (newValue.includes(',')) {
        const parts = newValue.split(',')
        const lastPart = parts.pop() || ''
        
        // Add all complete parts to keywords
        parts.forEach(part => {
          const trimmed = part.trim()
          if (trimmed && !keywords.value.includes(trimmed)) {
            keywords.value.push(trimmed)
          }
        })
        
        // Update input to only contain the last part
        keywordsInput.value = lastPart
      }
    })

    // Outline state
    const outline = ref([])
    const outlineLoading = ref(false)
    const outlineError = ref('')

    // Content generation state
    const contentLoading = ref(false)
    const contentError = ref('')
    const sectionLoading = ref(-1)
    const autoGenerate = ref(false)

    // Save state
    const saveLoading = ref(false)
    const saveError = ref('')
    const saveSuccess = ref('')

    // Helper methods for keywords
    function addKeyword(keyword) {
      const trimmed = keyword.trim()
      if (trimmed && !keywords.value.includes(trimmed)) {
        keywords.value.push(trimmed)
      }
    }

    function removeKeyword(index) {
      keywords.value.splice(index, 1)
    }

    // Outline methods
    async function generateOutline() {
      outlineLoading.value = true
      outlineError.value = ''
      
      try {
        // If we already have an outline, confirm before regenerating
        if (outline.value.length > 0 && 
            outline.value.some(section => section.generatedContent && section.generatedContent.trim() !== '')) {
          const confirmed = window.confirm('Regenerating the outline will clear any generated content. Continue?')
          if (!confirmed) {
            outlineLoading.value = false
            return
          }
        }
        
        const response = await generateBlogOutline({
          title: title.value,
          keywords: keywords.value,
          sections: 4 // Default number of sections
        })
        
        if (response.success && response.outline) {
          // Map the outline format to our component format
          outline.value = response.outline.map((section) => ({
            title: section.title,
            content: section.content,
            generatedContent: ''
          }))
        } else {
          outlineError.value = response.error || 'Failed to generate outline'
        }
      } catch (e) {
        outlineError.value = e.message || 'Failed to generate outline'
      } finally {
        outlineLoading.value = false
      }
    }

    function addSection() {
      outline.value.push({
        title: 'New Section',
        content: '',
        generatedContent: ''
      })
    }

    function removeSection(index) {
      outline.value.splice(index, 1)
    }

    function moveSection(index, direction) {
      if ((direction < 0 && index === 0) || 
          (direction > 0 && index === outline.value.length - 1)) {
        return // Can't move beyond boundaries
      }
      
      const newIndex = index + direction
      const sectionToMove = outline.value[index]
      
      // Remove from current position and insert at new position
      outline.value.splice(index, 1)
      outline.value.splice(newIndex, 0, sectionToMove)
    }

    // Content generation methods
    async function generateSectionContent(index) {
      if (index < 0 || index >= outline.value.length) return
      
      sectionLoading.value = index
      contentError.value = ''
      
      try {
        const section = outline.value[index]
        const previousSection = index > 0 ? outline.value[index - 1].generatedContent : undefined
        
        const response = await generateBlogSection({
          title: title.value,
          heading: section.title,
          keywords: keywords.value,
          previousSection,
          tone: tone.value
        })
        
        if (response.success && response.content) {
          section.generatedContent = response.content
        } else {
          contentError.value = response.error || `Failed to generate content for ${section.title}`
        }
      } catch (e) {
        contentError.value = e.message || 'Failed to generate section content'
      } finally {
        sectionLoading.value = -1
      }
    }

    async function generateFullContent() {
      if (outline.value.length === 0) {
        contentError.value = 'Please generate an outline first'
        return
      }
      
      contentLoading.value = true
      contentError.value = ''
      
      try {
        // Generate content for all sections sequentially
        for (let i = 0; i < outline.value.length; i++) {
          sectionLoading.value = i
          
          const section = outline.value[i]
          const previousSection = i > 0 ? outline.value[i - 1].generatedContent : undefined
          
          const response = await generateBlogSection({
            title: title.value,
            heading: section.title,
            keywords: keywords.value,
            previousSection,
            tone: tone.value
          })
          
          if (response.success && response.content) {
            section.generatedContent = response.content
          } else {
            contentError.value = response.error || `Failed to generate content for ${section.title}`
            break
          }
        }
      } catch (e) {
        contentError.value = e.message || 'Failed to generate content'
      } finally {
        contentLoading.value = false
        sectionLoading.value = -1
      }
    }

    // Navigation
    function goToNextStep() {
      // If on keywords step, add any remaining keyword
      if (currentStep.value === 0 && keywordsInput.value.trim()) {
        addKeyword(keywordsInput.value)
        keywordsInput.value = ''
      }
      
      // If moving to content generation and auto-generate is enabled
      if (currentStep.value === 1 && autoGenerate.value) {
        currentStep.value += 1
        // Auto-generate content after a short delay
        setTimeout(() => {
          generateFullContent()
        }, 300)
      } else {
        currentStep.value += 1
      }
    }

    // Save the blog post
    async function savePost() {
      if (!canSave.value) return
      
      saveLoading.value = true
      saveError.value = ''
      saveSuccess.value = ''
      
      try {
        // Combine all section content
        const fullContent = outline.value
          .filter(section => section.generatedContent && section.generatedContent.trim() !== '')
          .map(section => `## ${section.title}\n\n${section.generatedContent}`)
          .join('\n\n')
        
        // Prepare metadata
        const outlineData = outline.value.map(section => ({
          title: section.title,
          content: section.content
        }))
        
        const payload = {
          title: title.value,
          topic: topic.value,
          keywords: keywords.value.join(', '),
          tone: tone.value,
          length: length.value,
          content: fullContent,
          // Include metadata about the structure
          generation_metadata: {
            outline: outlineData,
            generated_sections: outline.value.length
          }
        }
        
        const result = await createBlog(payload)
        
        if (result.success && result.post) {
          saveSuccess.value = 'Blog post saved successfully!'
          // Emit the submit event with the created post
          emit('submit', result.post)
          // Navigate to the post view after a short delay
          setTimeout(() => {
            router.push(`/blog/${result.post.id}`)
          }, 1000)
        } else {
          saveError.value = result.error || 'Failed to save blog post'
        }
      } catch (e) {
        saveError.value = e.message || 'Failed to save blog post'
      } finally {
        saveLoading.value = false
      }
    }

    // Computed properties
    const canProceed = computed(() => title.value.trim() !== '' && topic.value.trim() !== '')
    
    const canSave = computed(() => {
      return outline.value.length > 0 && 
        outline.value.some(section => section.generatedContent && section.generatedContent.trim() !== '')
    })

    return {
      // Wizard state
      wizardSteps,
      currentStep,
      
      // Form fields
      title,
      topic,
      keywordsInput,
      keywords,
      tone,
      length,
      
      // Outline 
      outline,
      outlineLoading,
      outlineError,
      
      // Content
      contentLoading,
      contentError,
      sectionLoading,
      autoGenerate,
      
      // Save state
      saveLoading,
      saveError,
      saveSuccess,
      
      // Computed
      canProceed,
      canSave,
      
      // Methods
      addKeyword,
      removeKeyword,
      goToNextStep,
      generateOutline,
      addSection,
      removeSection,
      moveSection,
      generateSectionContent,
      generateFullContent,
      savePost
    }
  }
}
</script>
