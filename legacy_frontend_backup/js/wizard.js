/**
 * Blog Post Creation Wizard
 * 
 * Handles all client-side functionality for the multi-step blog post creation interface:
 * - Step navigation and validation
 * - Autosave functionality
 * - Content generation
 * - Outline management
 * - SEO analysis
 * - Form validation and submission
 * - Progress tracking
 * - Real-time character counting
 * - Keyword tag management
 */

document.addEventListener('DOMContentLoaded', function() {
    // ----------------------------
    // Main controller for wizard
    // ----------------------------
    const BlogWizard = {
        currentStep: 1,
        totalSteps: 5,
        formData: {},
        autosaveInterval: null,
        autosaveDelay: 30000, // 30 seconds
        lastAutosave: null,
        
        init: function() {
            this.cacheDOM();
            this.bindEvents();
            this.setupAutosave();
            this.updateProgressBar();
            
            // Check if we have a draft in localStorage
            this.loadDraft();
            
            // Initialize modules
            OutlineManager.init();
            ContentGenerator.init();
            SEOAnalyzer.init();
            KeywordManager.init();
            
            // Show the autosave indicator
            this.showAutosaveIndicator();
        },
        
        cacheDOM: function() {
            this.form = document.getElementById('blog-wizard-form');
            this.steps = document.querySelectorAll('.wizard-step');
            this.stepIndicators = document.querySelectorAll('.progress-step');
            this.progressBar = document.querySelector('.progress-fill');
            this.nextButton = document.getElementById('next-step');
            this.prevButton = document.getElementById('prev-step');
            this.submitButton = document.getElementById('submit-post');
            
            // Create autosave indicator if it doesn't exist
            if (!document.querySelector('.autosave-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'autosave-indicator';
                indicator.innerHTML = '<div class="spinner"></div><span>Saving...</span>';
                document.body.appendChild(indicator);
                this.autosaveIndicator = indicator;
            } else {
                this.autosaveIndicator = document.querySelector('.autosave-indicator');
            }
        },
        
        bindEvents: function() {
            this.nextButton.addEventListener('click', this.goToNextStep.bind(this));
            this.prevButton.addEventListener('click', this.goToPrevStep.bind(this));
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
            
            // Purpose selection
            const purposeOptions = document.querySelectorAll('.purpose-option');
            purposeOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // Remove selection from all options
                    purposeOptions.forEach(opt => opt.classList.remove('selected'));
                    // Add selection to clicked option
                    this.classList.add('selected');
                    // Update hidden input
                    document.getElementById('content_purpose').value = this.dataset.purpose;
                    // Trigger autosave
                    BlogWizard.saveFormData();
                });
            });
            
            // Audience selection
            const audienceOptions = document.querySelectorAll('.audience-option');
            audienceOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // Remove selection from all options
                    audienceOptions.forEach(opt => opt.classList.remove('selected'));
                    // Add selection to clicked option
                    this.classList.add('selected');
                    // Update hidden input
                    document.getElementById('target_audience').value = this.dataset.audience;
                    // Trigger autosave
                    BlogWizard.saveFormData();
                });
            });
            
            // Character count for meta title and description
            document.getElementById('meta_title').addEventListener('input', function() {
                document.getElementById('meta-title-count').textContent = this.value.length;
            });
            
            document.getElementById('meta_description').addEventListener('input', function() {
                document.getElementById('meta-desc-count').textContent = this.value.length;
            });
            
            // Auto-generate slug from title
            document.getElementById('title').addEventListener('blur', function() {
                if (!document.getElementById('slug').value) {
                    const title = this.value;
                    const slug = title.toLowerCase()
                        .replace(/[^\w\s-]/g, '')  // Remove special chars
                        .replace(/\s+/g, '-')      // Replace spaces with hyphens
                        .replace(/-+/g, '-');      // Remove consecutive hyphens
                    
                    document.getElementById('slug').value = slug;
                }
            });
            
            // Handle input changes for autosave
            const formInputs = this.form.querySelectorAll('input, textarea, select');
            formInputs.forEach(input => {
                input.addEventListener('change', this.handleInputChange.bind(this));
            });
        },
        
        handleInputChange: function() {
            this.saveFormData();
        },
        
        goToNextStep: function() {
            if (this.currentStep < this.totalSteps) {
                // Validate current step
                if (!this.validateStep(this.currentStep)) {
                    return;
                }
                
                // Hide current step
                this.steps[this.currentStep - 1].classList.remove('active');
                // Mark step as completed
                this.stepIndicators[this.currentStep - 1].classList.add('completed');
                
                // Go to next step
                this.currentStep++;
                
                // Show next step
                this.steps[this.currentStep - 1].classList.add('active');
                this.stepIndicators[this.currentStep - 1].classList.add('active');
                
                // Update buttons
                this.updateButtons();
                
                // Update progress bar
                this.updateProgressBar();
                
                // If we're on the last step, show the submit button
                if (this.currentStep === this.totalSteps) {
                    this.nextButton.style.display = 'none';
                    this.submitButton.style.display = 'block';
                }
            }
        },
        
        goToPrevStep: function() {
            if (this.currentStep > 1) {
                // Hide current step
                this.steps[this.currentStep - 1].classList.remove('active');
                this.stepIndicators[this.currentStep - 1].classList.remove('active');
                
                // Go to previous step
                this.currentStep--;
                
                // Show previous step
                this.steps[this.currentStep - 1].classList.add('active');
                
                // Update buttons
                this.updateButtons();
                
                // Update progress bar
                this.updateProgressBar();
                
                // If we moved back from the last step, hide submit button and show next button
                if (this.currentStep < this.totalSteps) {
                    this.nextButton.style.display = 'block';
                    this.submitButton.style.display = 'none';
                }
            }
        },
        
        updateButtons: function() {
            // Enable/disable previous button based on current step
            this.prevButton.disabled = this.currentStep === 1;
            
            // Update next button text based on current step
            if (this.currentStep === this.totalSteps - 1) {
                this.nextButton.textContent = 'Finish';
            } else {
                this.nextButton.textContent = 'Next';
            }
        },
        
        updateProgressBar: function() {
            const progressPercentage = (this.currentStep / this.totalSteps) * 100;
            this.progressBar.style.width = `${progressPercentage}%`;
        },
        
        validateStep: function(step) {
            // Different validation logic based on step
            switch(step) {
                case 1: // Basic Information
                    const title = document.getElementById('title').value.trim();
                    const topic = document.getElementById('topic').value.trim();
                    const purpose = document.getElementById('content_purpose').value;
                    
                    if (!title) {
                        alert('Please enter a blog title');
                        return false;
                    }
                    
                    if (!topic) {
                        alert('Please enter a blog topic');
                        return false;
                    }
                    
                    if (!purpose) {
                        alert('Please select a content purpose');
                        return false;
                    }
                    
                    return true;
                    
                case 2: // Target Audience
                    const audience = document.getElementById('target_audience').value;
                    
                    if (!audience) {
                        alert('Please select a target audience');
                        return false;
                    }
                    
                    return true;
                    
                case 3: // Outline
                    // Make sure we have at least one section besides intro and conclusion
                    const sections = document.querySelectorAll('.outline-section');
                    if (sections.length < 3) {
                        alert('Please add at least one content section to your outline');
                        return false;
                    }
                    
                    // Update the outline JSON
                    OutlineManager.saveOutlineToForm();
                    return true;
                    
                case 4: // Content
                    // Ensure content has been generated or entered
                    const contentEditor = document.getElementById('content-editor');
                    const textareas = contentEditor.querySelectorAll('textarea');
                    let hasContent = false;
                    
                    textareas.forEach(textarea => {
                        if (textarea.value.trim()) {
                            hasContent = true;
                        }
                    });
                    
                    if (!hasContent) {
                        alert('Please generate or enter content for at least one section');
                        return false;
                    }
                    
                    // Combine all content into the hidden field
                    ContentGenerator.saveContentToForm();
                    return true;
                    
                default:
                    return true;
            }
        },
        
        handleSubmit: function(e) {
            // Perform final validation before submission
            if (!this.validateAll()) {
                e.preventDefault();
                return;
            }
            
            // Clear draft from localStorage
            localStorage.removeItem('blog_draft');
            
            // Continue with form submission
        },
        
        validateAll: function() {
            // Validate all steps
            for (let i = 1; i <= this.totalSteps; i++) {
                if (!this.validateStep(i)) {
                    // Switch to the invalid step
                    this.goToStep(i);
                    return false;
                }
            }
            
            return true;
        },
        
        goToStep: function(step) {
            if (step < 1 || step > this.totalSteps) {
                return;
            }
            
            // Hide current step
            this.steps[this.currentStep - 1].classList.remove('active');
            
            // Set new current step
            this.currentStep = step;
            
            // Show new current step
            this.steps[this.currentStep - 1].classList.add('active');
            
            // Update buttons
            this.updateButtons();
            
            // Update progress bar
            this.updateProgressBar();
            
            // Update step indicators
            this.updateStepIndicators();
        },
        
        updateStepIndicators: function() {
            // Reset all indicators
            this.stepIndicators.forEach((indicator, index) => {
                const stepNum = index + 1;
                if (stepNum < this.currentStep) {
                    indicator.classList.add('completed');
                    indicator.classList.remove('active');
                } else if (stepNum === this.currentStep) {
                    indicator.classList.add('active');
                    indicator.classList.remove('completed');
                } else {
                    indicator.classList.remove('active', 'completed');
                }
            });
        },
        
        setupAutosave: function() {
            // Set up autosave interval
            this.autosaveInterval = setInterval(() => {
                this.saveFormData();
            }, this.autosaveDelay);
        },
        
        saveFormData: function() {
            // Collect all form data
            const formData = new FormData(this.form);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // Add current step
            data.currentStep = this.currentStep;
            
            // Save to localStorage
            localStorage.setItem('blog_draft', JSON.stringify(data));
            
            // Update last autosave time
            this.lastAutosave = new Date();
            
            // Show autosave indicator
            this.showAutosaveIndicator();
        },
        
        loadDraft: function() {
            const draft = localStorage.getItem('blog_draft');
            
            if (draft) {
                try {
                    const data = JSON.parse(draft);
                    
                    // Populate form fields
                    for (const key in data) {
                        if (key === 'currentStep') continue;
                        
                        const field = document.getElementById(key);
                        if (field) {
                            field.value = data[key];
                            
                            // Trigger change event
                            const event = new Event('change');
                            field.dispatchEvent(event);
                        }
                    }
                    
                    // Set purpose selection
                    if (data.content_purpose) {
                        const purposeOption = document.querySelector(`.purpose-option[data-purpose="${data.content_purpose}"]`);
                        if (purposeOption) {
                            purposeOption.click();
                        }
                    }
                    
                    // Set audience selection
                    if (data.target_audience) {
                        const audienceOption = document.querySelector(`.audience-option[data-audience="${data.target_audience}"]`);
                        if (audienceOption) {
                            audienceOption.click();
                        }
                    }
                    
                    // Load outline if available
                    if (data.outline_json) {
                        OutlineManager.loadOutlineFromJSON(data.outline_json);
                    }
                    
                    // Go to saved step
                    if (data.currentStep) {
                        this.goToStep(data.currentStep);
                    }
                    
                    // Show message that draft was loaded
                    this.showMessage('Draft loaded successfully!', 'success');
                } catch (error) {
                    console.error('Error loading draft:', error);
                }
            }
        },
        
        showAutosaveIndicator: function() {
            this.autosaveIndicator.classList.add('visible');
            
            // Hide after 2 seconds
            setTimeout(() => {
                this.autosaveIndicator.classList.remove('visible');
            }, 2000);
        },
        
        showMessage: function(message, type = 'info') {
            // Check if flash container exists
            let flashContainer = document.querySelector('.flashes');
            
            if (!flashContainer) {
                // Create flash container
                flashContainer = document.createElement('div');
                flashContainer.className = 'flashes';
                
                // Insert after page header
                const pageHeader = document.querySelector('.page-header');
                pageHeader.parentNode.insertBefore(flashContainer, pageHeader.nextSibling);
            }
            
            // Create flash message
            const flash = document.createElement('div');
            flash.className = `flash ${type}`;
            flash.textContent = message;
            
            // Add dismiss button
            const dismissBtn = document.createElement('button');
            dismissBtn.type = 'button';
            dismissBtn.className = 'flash-dismiss';
            dismissBtn.innerHTML = '&times;';
            dismissBtn.addEventListener('click', () => {
                flash.remove();
            });
            flash.appendChild(dismissBtn);
            
            // Add to container
            flashContainer.appendChild(flash);
            
            // Auto dismiss after 5 seconds
            setTimeout(() => {
                if (flash.parentNode) {
                    flash.remove();
                }
            }, 5000);
        }
    };
    
    // ----------------------------
    // Outline Management Module
    // ----------------------------
    const OutlineManager = {
        sectionCounter: 1,
        
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },
        
        cacheDOM: function() {
            this.outlineContainer = document.getElementById('outline-container');
            this.addSectionButton = document.getElementById('add-section');
            this.generateOutlineButton = document.getElementById('generate-outline');
            this.outlineLoading = document.getElementById('outline-loading');
            this.outlineJsonInput = document.getElementById('outline_json');
        },
        
        bindEvents: function() {
            // Add new section
            this.addSectionButton.addEventListener('click', this.addNewSection.bind(this));
            
            // Generate outline using AI
            this.generateOutlineButton.addEventListener('click', this.generateOutline.bind(this));
            
            // Delegate events for section actions (move up/down, delete)
            this.outlineContainer.addEventListener('click', e => {
                const target = e.target;
                
                // Move section up
                if (target.classList.contains('move-section-up')) {
                    const section = target.closest('.outline-section');
                    this.moveSectionUp(section);
                }
                
                // Move section down
                if (target.classList.contains('move-section-down')) {
                    const section = target.closest('.outline-section');
                    this.moveSectionDown(section);
                }
                
                // Delete section
                if (target.classList.contains('delete-section')) {
                    const section = target.closest('.outline-section');
                    this.deleteSection(section);
                }
            });
        },
        
        addNewSection: function() {
            // Create a unique ID for the section
            const sectionId = `section-${this.sectionCounter++}`;
            
            // Create section element
            const section = document.createElement('div');
            section.className = 'outline-section';
            section.dataset.sectionId = sectionId;
            
            // Add section content
            section.innerHTML = `
                <div class="outline-section-header">
                    <input type="text" placeholder="Section Title" value="Section ${this.sectionCounter - 1}">
                    <div class="outline-actions">
                        <button type="button" class="move-section-up">↑</button>
                        <button type="button" class="move-section-down">↓</button>
                        <button type="button" class="delete-section">×</button>
                    </div>
                </div>
                <textarea placeholder="Describe what this section should cover..."></textarea>
            `;
            
            // Insert before the Add Section button
            this.outlineContainer.appendChild(section);
            
            // Focus the new title input
            section.querySelector('input').focus();
            
            // Save the outline
            this.saveOutlineToForm();

            // Update content editor sections
            ContentGenerator.updateContentSections();
        },
        
        moveSectionUp: function(section) {
            const prevSection = section.previousElementSibling;
            
            if (prevSection) {
                this.outlineContainer.insertBefore(section, prevSection);
                this.saveOutlineToForm();
                ContentGenerator.updateContentSections();
            }
        },
        
        moveSectionDown: function(section) {
            const nextSection = section.nextElementSibling;
            
            if (nextSection) {
                this.outlineContainer.insertBefore(nextSection, section);
                this.saveOutlineToForm();
                ContentGenerator.updateContentSections();
            }
        },
        
        deleteSection: function(section) {
            // Don't delete if we only have the bare minimum sections (intro + 1 section + conclusion)
            const sections = this.outlineContainer.querySelectorAll('.outline-section');
            if (sections.length <= 3) {
                BlogWizard.showMessage('You need at least 3 sections in your outline (introduction, one content section, and conclusion).', 'error');
                return;
            }
            
            // Confirm deletion
            if (confirm('Are you sure you want to delete this section?')) {
                section.remove();
                this.saveOutlineToForm();
                ContentGenerator.updateContentSections();
            }
        },
        
        generateOutline: function() {
            // Get blog title and topic
            const title = document.getElementById('title').value.trim();
            const topic = document.getElementById('topic').value.trim();
            const purpose = document.getElementById('content_purpose').value;
            const audience = document.getElementById('target_audience').value;
            
            // Validate inputs
            if (!title || !topic || !purpose || !audience) {
                BlogWizard.showMessage('Please fill in the title, topic, purpose, and target audience to generate an outline.', 'error');
                return;
            }
            
            // Show loading spinner
            this.generateOutlineButton.style.display = 'none';
            this.outlineLoading.style.display = 'flex';
            
            // Prepare data for the API request
            const requestData = {
                title: title,
                topic: topic,
                purpose: purpose,
                audience: audience
            };
            
            // Make AJAX request to generate outline
            fetch('/blog/generate-outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide loading spinner
                this.generateOutlineButton.style.display = 'block';
                this.outlineLoading.style.display = 'none';
                
                if (data.success) {
                    // Load the outline into the UI
                    this.loadOutlineFromJSON(data.outline);
                    BlogWizard.showMessage('Outline generated successfully!', 'success');
                } else {
                    BlogWizard.showMessage('Failed to generate outline: ' + data.error, 'error');
                }
            })
            .catch(error => {
                // Hide loading spinner
                this.generateOutlineButton.style.display = 'block';
                this.outlineLoading.style.display = 'none';
                
                BlogWizard.showMessage('Error generating outline: ' + error.message, 'error');
                console.error('Error:', error);
            });
        },
        
        saveOutlineToForm: function() {
            // Get all sections
            const sections = this.outlineContainer.querySelectorAll('.outline-section');
            const outline = [];
            
            // Parse each section
            sections.forEach((section, index) => {
                const title = section.querySelector('input').value.trim() || `Section ${index + 1}`;
                const content = section.querySelector('textarea').value.trim();
                const sectionId = section.dataset.sectionId;
                
                outline.push({
                    id: sectionId,
                    title: title,
                    content: content
                });
            });
            
            // Update the hidden input
            this.outlineJsonInput.value = JSON.stringify(outline);
            
            return outline;
        },
        
        loadOutlineFromJSON: function(outlineJson) {
            let outline;
            
            // Parse JSON if it's a string
            if (typeof outlineJson === 'string') {
                try {
                    outline = JSON.parse(outlineJson);
                } catch (error) {
                    console.error('Error parsing outline JSON:', error);
                    return;
                }
            } else {
                outline = outlineJson;
            }
            
            // Clear existing sections
            this.outlineContainer.innerHTML = '';
            
            // Reset counter
            this.sectionCounter = 1;
            
            // Add sections from outline
            outline.forEach(section => {
                // Create section element
                const sectionEl = document.createElement('div');
                sectionEl.className = 'outline-section';
                sectionEl.dataset.sectionId = section.id || `section-${this.sectionCounter++}`;
                
                // Add section content
                sectionEl.innerHTML = `
                    <div class="outline-section-header">
                        <input type="text" placeholder="Section Title" value="${section.title || ''}">
                        <div class="outline-actions">
                            <button type="button" class="move-section-up">↑</button>
                            <button type="button" class="move-section-down">↓</button>
                            <button type="button" class="delete-section">×</button>
                        </div>
                    </div>
                    <textarea placeholder="Describe what this section should cover...">${section.content || ''}</textarea>
                `;
                
                // Add to container
                this.outlineContainer.appendChild(sectionEl);
            });
            
            // Update the content editor
            ContentGenerator.updateContentSections();
            
            // Save to form
            this.saveOutlineToForm();
        }
    };
    
    // ----------------------------
    // Content Generator Module
    // ----------------------------
    const ContentGenerator = {
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },
        
        cacheDOM: function() {
            this.contentEditor = document.getElementById('content-editor');
            this.generateAllBtn = document.getElementById('generate-all-content');
            this.contentLoading = document.getElementById('content-loading');
            this.contentInput = document.getElementById('content');
        },
        
        bindEvents: function() {
            // Generate all content
            this.generateAllBtn.addEventListener('click', this.generateAllContent.bind(this));
            
            // Delegate for generate section buttons
            this.contentEditor.addEventListener('click', e => {
                if (e.target.classList.contains('generate-section')) {
                    const section = e.target.closest('.editor-section');
                    this.generateSection(section);
                }
            });
        },
        
        updateContentSections: function() {
            // Get the outline
            const outline = OutlineManager.saveOutlineToForm();
            const outlineData = JSON.parse(document.getElementById('outline_json').value);
            
            // Clear existing sections except intro and conclusion
            const sections = this.contentEditor.querySelectorAll('.editor-section');
            sections.forEach(section => {
                const sectionId = section.dataset.sectionId;
                if (sectionId !== 'introduction' && sectionId !== 'conclusion') {
                    section.remove();
                }
            });
            
            // Get intro and conclusion sections
            const introSection = this.contentEditor.querySelector('.editor-section[data-section-id="introduction"]');
            const conclusionSection = this.contentEditor.querySelector('.editor-section[data-section-id="conclusion"]');
            
            // Remove all sections
            this.contentEditor.innerHTML = '';
            
            // Add intro section
            this.contentEditor.appendChild(introSection);
            
            // Add content sections from outline
            outlineData.forEach(section => {
                if (section.id !== 'introduction' && section.id !== 'conclusion') {
                    // Create section element
                    const sectionEl = document.createElement('div');
                    sectionEl.className = 'editor-section';
                    sectionEl.dataset.sectionId = section.id;
                    
                    // Add section content
                    sectionEl.innerHTML = `
                        <div class="editor-section-header">
                            <h4 class="editor-section-title">${section.title}</h4>
                            <button type="button" class="btn small generate-section">Generate</button>
                        </div>
                        <div class="editor-section-content">
                            <textarea placeholder="Your content goes here..."></textarea>
                        </div>
                    `;
                    
                    // Add to editor
                    this.contentEditor.appendChild(sectionEl);
                }
            });
            
            // Add conclusion section
            this.contentEditor.appendChild(conclusionSection);
            
            // Save to form
            this.saveContentToForm();
        },
        
        generateAllContent: function() {
            // Get blog title, topic, and outline
            const title = document.getElementById('title').value.trim();
            const topic = document.getElementById('topic').value.trim();
            const purpose = document.getElementById('content_purpose').value;
            const audience = document.getElementById('target_audience').value;
            const tone = document.getElementById('tone').value;
            const length = document.getElementById('length').value;
            const outlineJson = document.getElementById('outline_json').value;
            
            // Validate inputs
            if (!title || !topic || !purpose || !audience || !outlineJson) {
                BlogWizard.showMessage('Please fill in all required fields and create an outline first.', 'error');
                return;
            }
            
            // Show loading spinner
            this.generateAllBtn.style.display = 'none';
            this.contentLoading.style.display = 'flex';
            
            // Prepare data for the API request
            const requestData = {
                title: title,
                topic: topic,
                purpose: purpose,
                audience: audience,
                tone: tone,
                length: length,
                outline: outlineJson
            };
            
            // Make AJAX request to generate content
            fetch('/blog/generate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide loading spinner
                this.generateAllBtn.style.display = 'block';
                this.contentLoading.style.display = 'none';
                
                if (data.success) {
                    // Load the content into the sections
                    this.loadContent(data.content);
                    BlogWizard.showMessage('Content generated successfully!', 'success');
                    
                    // Save content to form
                    this.saveContentToForm();
                    
                    // Trigger autosave
                    BlogWizard.saveFormData();
                } else {
                    BlogWizard.showMessage('Failed to generate content: ' + data.error, 'error');
                }
            })
            .catch(error => {
                // Hide loading spinner
                this.generateAllBtn.style.display = 'block';
                this.contentLoading.style.display = 'none';
                
                BlogWizard.showMessage('Error generating content: ' + error.message, 'error');
                console.error('Error:', error);
            });
        },
        
        generateSection: function(section) {
            // Get blog title, topic, section info
            const title = document.getElementById('title').value.trim();
            const topic = document.getElementById('topic').value.trim();
            const purpose = document.getElementById('content_purpose').value;
            const audience = document.getElementById('target_audience').value;
            const tone = document.getElementById('tone').value;
            const length = document.getElementById('length').value;
            const sectionId = section.dataset.sectionId;
            
            // Get section title and description from outline
            const outline = JSON.parse(document.getElementById('outline_json').value);
            const sectionData = outline.find(item => item.id === sectionId);
            
            if (!sectionData) {
                BlogWizard.showMessage('Section not found in outline.', 'error');
                return;
            }
            
            // Show loading spinner in the section
            const generateBtn = section.querySelector('.generate-section');
            const originalBtnText = generateBtn.textContent;
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            
            // Prepare data for the API request
            const requestData = {
                title: title,
                topic: topic,
                purpose: purpose,
                audience: audience,
                tone: tone,
                length: length,
                sectionId: sectionId,
                sectionTitle: sectionData.title,
                sectionDescription: sectionData.content,
                outline: document.getElementById('outline_json').value
            };
            
            // Make AJAX request to generate section content
            fetch('/blog/generate-section', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Restore button
                generateBtn.disabled = false;
                generateBtn.textContent = originalBtnText;
                
                if (data.success) {
                    // Update section content
                    const textarea = section.querySelector('textarea');
                    textarea.value = data.content;
                    
                    // Show success message
                    BlogWizard.showMessage(`"${sectionData.title}" section generated successfully!`, 'success');
                    
                    // Save content to form
                    this.saveContentToForm();
                    
                    // Trigger autosave
                    BlogWizard.saveFormData();
                } else {
                    BlogWizard.showMessage('Failed to generate section: ' + data.error, 'error');
                }
            })
            .catch(error => {
                // Restore button
                generateBtn.disabled = false;
                generateBtn.textContent = originalBtnText;
                
                BlogWizard.showMessage('Error generating section: ' + error.message, 'error');
                console.error('Error:', error);
            });
        },
        
        loadContent: function(contentData) {
            if (typeof contentData === 'string') {
                try {
                    contentData = JSON.parse(contentData);
                } catch (error) {
                    console.error('Error parsing content data:', error);
                    return;
                }
            }
            
            // Update each section's content
            Object.keys(contentData).forEach(sectionId => {
                const section = this.contentEditor.querySelector(`.editor-section[data-section-id="${sectionId}"]`);
                if (section) {
                    const textarea = section.querySelector('textarea');
                    textarea.value = contentData[sectionId];
                }
            });
        },
        
        saveContentToForm: function() {
            // Collect content from all sections
            const sections = this.contentEditor.querySelectorAll('.editor-section');
            const content = {};
            
            sections.forEach(section => {
                const sectionId = section.dataset.sectionId;
                const textarea = section.querySelector('textarea');
                
                if (textarea && textarea.value.trim()) {
                    content[sectionId] = textarea.value.trim();
                }
            });
            
            // Update the hidden input
            this.contentInput.value = JSON.stringify(content);
            
            return content;
        }
    };
    
    // ----------------------------
    // SEO Analyzer Module
    // ----------------------------
    const SEOAnalyzer = {
        scores: {
            seo: 0,
            readability: 0,
            keywordDensity: 0
        },
        
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },
        
        cacheDOM: function() {
            this.analyzeBtn = document.getElementById('analyze-seo');
            this.seoLoading = document.getElementById('seo-loading');
            this.seoMetrics = document.getElementById('seo-metrics');
            this.seoScore = document.getElementById('seo-score');
            this.readabilityScore = document.getElementById('readability-score');
            this.keywordDensity = document.getElementById('keyword-density');
            this.metaTitle = document.getElementById('meta_title');
            this.metaDescription = document.getElementById('meta_description');
            this.focusKeyword = document.getElementById('focus_keyword');
        },
        
        bindEvents: function() {
            // Analyze SEO on button click
            this.analyzeBtn.addEventListener('click', this.analyzeSEO.bind(this));
            
            // Real-time analysis on content and meta fields change
            document.getElementById('content-editor').addEventListener('input', this.debouncedAnalysis.bind(this));
            this.metaTitle.addEventListener('input', this.debouncedAnalysis.bind(this));
            this.metaDescription.addEventListener('input', this.debouncedAnalysis.bind(this));
            this.focusKeyword.addEventListener('input', this.debouncedAnalysis.bind(this));
        },
        
        debouncedAnalysis: function() {
            clearTimeout(this.analysisTimeout);
            this.analysisTimeout = setTimeout(() => {
                this.quickAnalysis();
            }, 1000);
        },
        
        quickAnalysis: function() {
            // Only run if we're on the SEO step or if the metrics are visible
            if (BlogWizard.currentStep !== 5 && this.seoMetrics.style.display === 'none') {
                return;
            }
            
            const content = this.getFullContent();
            const focusKey = this.focusKeyword.value.trim().toLowerCase();
            if (!content || !focusKey) {
                return;
            }
            
            // Keyword density calculation
            const contentLower = content.toLowerCase();
            const keywordCount = contentLower.split(focusKey).length - 1;
            const wordCount = content.split(/\s+/).length;
            const density = (keywordCount / wordCount) * 100;
            this.scores.keywordDensity = parseFloat(density.toFixed(2));
            this.keywordDensity.querySelector('.score').textContent = `${this.scores.keywordDensity}%`;
            
            // Set class based on density
            if (this.scores.keywordDensity < 0.5 || this.scores.keywordDensity > 3) {
                this.keywordDensity.className = 'seo-metric warning';
            } else {
                this.keywordDensity.className = 'seo-metric good';
            }
            
            // Calculate readability (simplified)
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const avgWordsPerSentence = wordCount / sentences.length;
            let readabilityScore = 100;
            if (avgWordsPerSentence > 20) {
                readabilityScore -= (avgWordsPerSentence - 20) * 2;
            }
            readabilityScore = Math.max(0, Math.min(100, readabilityScore));
            this.scores.readability = Math.round(readabilityScore);
            this.readabilityScore.querySelector('.score').textContent = `${this.scores.readability}/100`;

            if (this.scores.readability < 60) {
                this.readabilityScore.className = 'seo-metric bad';
            } else if (this.scores.readability < 80) {
                this.readabilityScore.className = 'seo-metric warning';
            } else {
                this.readabilityScore.className = 'seo-metric good';
            }

            if (this.seoMetrics.style.display === 'none') {
                this.seoMetrics.style.display = 'flex';
            }
        },

        analyzeSEO: function() {
            const metaTitle = this.metaTitle.value.trim();
            const metaDescription = this.metaDescription.value.trim();
            const focusKey = this.focusKeyword.value.trim();
            const content = this.getFullContent();

            if (!metaTitle || !metaDescription || !focusKey || !content) {
                BlogWizard.showMessage('Please fill in meta fields and content before analyzing SEO.', 'error');
                return;
            }

            this.analyzeBtn.disabled = true;
            this.seoLoading.style.display = 'flex';

            const requestData = {
                metaTitle: metaTitle,
                metaDescription: metaDescription,
                focusKeyword: focusKey,
                content: content
            };

            fetch('/blog/analyze-seo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network error during SEO analysis');
                }
                return response.json();
            })
            .then(data => {
                this.analyzeBtn.disabled = false;
                this.seoLoading.style.display = 'none';
                
                if (data.success) {
                    this.scores.seo = data.seoScore;
                    this.seoScore.querySelector('.score').textContent = `${this.scores.seo}/100`;
                    if (this.scores.seo < 50) {
                        this.seoScore.className = 'seo-metric bad';
                    } else if (this.scores.seo < 75) {
                        this.seoScore.className = 'seo-metric warning';
                    } else {
                        this.seoScore.className = 'seo-metric good';
                    }
                    BlogWizard.showMessage('SEO analysis completed successfully!', 'success');
                } else {
                    BlogWizard.showMessage('SEO analysis failed: ' + data.error, 'error');
                }
            })
            .catch(error => {
                this.analyzeBtn.disabled = false;
                this.seoLoading.style.display = 'none';
                BlogWizard.showMessage('Error during SEO analysis: ' + error.message, 'error');
                console.error('SEO Analysis Error:', error);
            });
        },

        getFullContent: function() {
            const contentEditor = document.getElementById('content-editor');
            const textareas = contentEditor.querySelectorAll('textarea');
            let fullContent = '';
            textareas.forEach(textarea => {
                fullContent += ' ' + textarea.value;
            });
            return fullContent.trim();
        }
    };

    // ----------------------------
    // Keyword Manager Module
    // ----------------------------
    const KeywordManager = {
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },

        cacheDOM: function() {
            this.tagInput = document.getElementById('keyword-input');
            this.tagContainer = document.getElementById('keyword-container');
            this.hiddenInput = document.getElementById('keywords');
        },

        bindEvents: function() {
            this.tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const tag = this.tagInput.value.trim();
                    if (tag) {
                        this.addTag(tag);
                        this.tagInput.value = '';
                    }
                }
            });
        },

        addTag: function(tag) {
            // Prevent duplicate tags
            const existingTags = this.tagContainer.querySelectorAll('.keyword-tag');
            for (let el of existingTags) {
                if (el.firstChild.textContent.trim().toLowerCase() === tag.toLowerCase()) {
                    return;
                }
            }
            const tagEl = document.createElement('span');
            tagEl.className = 'keyword-tag';
            tagEl.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-keyword';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                tagEl.remove();
                this.updateHiddenInput();
            });
            tagEl.appendChild(removeBtn);
            this.tagContainer.appendChild(tagEl);
            this.updateHiddenInput();
        },

        updateHiddenInput: function() {
            const tags = [];
            this.tagContainer.querySelectorAll('.keyword-tag').forEach(el => {
                // Extract the tag text (ignoring the remove button)
                const tagText = el.firstChild.textContent;
                tags.push(tagText.trim());
            });
            this.hiddenInput.value = JSON.stringify(tags);
        }
    };

    // Initialize the wizard
    BlogWizard.init();
});
