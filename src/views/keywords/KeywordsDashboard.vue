<template>
  <div class="keywords-dashboard">
    <div class="dashboard-header">
      <h2>Keywords Dashboard</h2>
      <div class="action-buttons">
        <button 
          class="add-button"
          @click="showAddForm = true"
        >
          Add Keyword
        </button>
        <button 
          class="refresh-button"
          @click="refreshKeywords"
          :disabled="loading"
        >
          Refresh
        </button>
        <div class="search-box">
          <input
            v-model="searchTerm"
            placeholder="Search keywords..."
            @input="handleSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <p>Loading keywords...</p>
    </div>

    <div v-else class="dashboard-content">
      <KeywordsTable 
        :keywords="filteredKeywords"
        @keyword-edit="handleEditKeyword"
        @keyword-delete="handleDeleteKeyword"
      />
    </div>

    <div v-if="showAddForm" class="keyword-form-modal">
      <div class="modal-content">
        <h3>{{ editingKeyword ? 'Edit Keyword' : 'Add New Keyword' }}</h3>
        <div class="form-group">
          <label>Keyword:</label>
          <input v-model="keywordForm.term" type="text" />
        </div>
        <div class="form-group">
          <label>Category:</label>
          <select v-model="keywordForm.category">
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div class="form-group">
          <label>Strength:</label>
          <input 
            v-model="keywordForm.strength" 
            type="range" 
            min="1" 
            max="10"
          />
          <span>{{ keywordForm.strength }}/10</span>
        </div>
        <div class="form-buttons">
          <button @click="saveKeyword">
            {{ editingKeyword ? 'Update' : 'Save' }}
          </button>
          <button @click="cancelForm">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import KeywordsTable from '@/components/keywords/KeywordsTable.vue'
import type { Keyword } from '@/types/keywordTypes'

export default defineComponent({
  name: 'KeywordsDashboard',
  components: {
    KeywordsTable
  },
  setup() {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const keywords = ref<Keyword[]>([])
    const searchTerm = ref('')
    const showAddForm = ref(false)
    const editingKeyword = ref<Keyword | null>(null)
    const keywordForm = ref({
      term: '',
      category: 'primary',
      strength: 5
    })

    // TODO: Replace with actual API call
    const loadKeywords = async () => {
      loading.value = true
      error.value = null
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        keywords.value = [
          { id: '1', term: 'SEO', category: 'primary', strength: 8 },
          { id: '2', term: 'Content Marketing', category: 'primary', strength: 7 },
          { id: '3', term: 'Backlinks', category: 'secondary', strength: 6 }
        ]
      } catch (err) {
        error.value = 'Failed to load keywords'
      } finally {
        loading.value = false
      }
    }

    const refreshKeywords = () => {
      loadKeywords()
    }

    const filteredKeywords = computed(() => {
      if (!searchTerm.value) return keywords.value
      return keywords.value.filter(k => 
        k.term.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        k.category.toLowerCase().includes(searchTerm.value.toLowerCase())
      )
    })

    const handleSearch = () => {
      // Additional search logic if needed
    }

    const handleEditKeyword = (keyword: Keyword) => {
      editingKeyword.value = keyword
      keywordForm.value = {
        term: keyword.term,
        category: keyword.category,
        strength: keyword.strength
      }
      showAddForm.value = true
    }

    const handleDeleteKeyword = async (keywordId: string) => {
      if (confirm('Are you sure you want to delete this keyword?')) {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 300))
          keywords.value = keywords.value.filter(k => k.id !== keywordId)
        } catch (err) {
          error.value = 'Failed to delete keyword'
        }
      }
    }

    const saveKeyword = async () => {
      try {
        if (editingKeyword.value) {
          // Update existing keyword
          const index = keywords.value.findIndex(k => k.id === editingKeyword.value?.id)
          if (index !== -1) {
            keywords.value[index] = {
              ...keywords.value[index],
              ...keywordForm.value
            }
          }
        } else {
          // Add new keyword
          const newKeyword = {
            id: Date.now().toString(),
            ...keywordForm.value
          }
          keywords.value = [newKeyword, ...keywords.value]
        }
        showAddForm.value = false
        resetForm()
      } catch (err) {
        error.value = 'Failed to save keyword'
      }
    }

    const cancelForm = () => {
      showAddForm.value = false
      resetForm()
    }

    const resetForm = () => {
      editingKeyword.value = null
      keywordForm.value = {
        term: '',
        category: 'primary',
        strength: 5
      }
    }

    onMounted(() => {
      loadKeywords()
    })

    return {
      loading,
      error,
      keywords,
      searchTerm,
      showAddForm,
      editingKeyword,
      keywordForm,
      filteredKeywords,
      refreshKeywords,
      handleSearch,
      handleEditKeyword,
      handleDeleteKeyword,
      saveKeyword,
      cancelForm
    }
  }
})
</script>

<style scoped>
.keywords-dashboard {
  padding: 1rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.add-button {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button {
  padding: 0.5rem 1rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.search-box {
  position: relative;
  margin-left: 1rem;
}

.search-box input {
  padding: 0.5rem 1rem 0.5rem 2rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-icon {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}

.dashboard-content {
  margin-top: 1rem;
}

.keyword-form-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height:

