from flask import (
    Blueprint, flash, redirect, render_template, 
    request, url_for, jsonify, current_app
)
import uuid
import json
from datetime import datetime
from app.services.lmstudio import LMStudioClient, LMStudioAPIError
from app.models.blog import BlogPost

# Create blueprint with documentation
bp = Blueprint('blog', __name__, url_prefix='/blog')

"""
BLOG MODULE API DOCUMENTATION

Available Endpoints:
------------------
GET  /blog/list                - List all generated blog posts (HTML)
GET  /blog/                    - Display blog generation form (HTML)
POST /blog/generate            - Generate a blog post via LM Studio/LLM
GET  /blog/preview/<post_id>   - Preview a generated blog post (HTML)
POST /blog/edit/<post_id>      - Edit/Update a generated blog post
POST /blog/publish/<post_id>   - Mark a blog post as published
POST /blog/delete/<post_id>    - Delete a blog post
GET  /blog/wizard              - Display blog post creation wizard (HTML)
POST /blog/generate-outline    - Generate a blog outline (JSON API)
POST /blog/generate-section    - Generate section content (JSON API)

Frontend Component Mapping:
------------------------
- /blog/list         -> BlogListView.vue
- /blog/             -> BlogCreateForm.vue
- /blog/generate     -> BlogCreateForm.vue
- /blog/preview      -> BlogPreview.vue
- /blog/edit         -> BlogEditor.vue
- /blog/wizard       -> BlogWizard.vue
- /blog/generate-*   -> BlogOutlineGen.vue, BlogSectionGen.vue

Notes:
-----
- HTML endpoints will be converted to JSON APIs for Vue frontend
- POST actions use flash messages for feedback
- Outline and Section generation are already JSON-ready
"""

@bp.route('/', methods=['GET'])
def index():
    """Display the blog generation form (API endpoint)"""
    return jsonify({
        'success': True,
        'message': 'Blog creation form data',
        'data': {
            'formType': 'blog_creation',
            'supportedTones': ['professional', 'casual', 'humorous', 'formal', 'technical'],
            'supportedLengths': ['short', 'medium', 'long']
        }
    })

@bp.route('/generate', methods=['POST'])
def generate():
    """Generate a blog post using the LM Studio API"""
    try:
        # Get form data
        title = request.form.get('title', '').strip()
        topic = request.form.get('topic', '').strip()
        tone = request.form.get('tone', 'professional').strip()
        length = request.form.get('length', 'medium').strip()
        keywords = request.form.get('keywords', '').strip()
        
        # Validate inputs
        if not title:
            flash('Please provide a blog title', 'error')
            return redirect(url_for('blog.index'))
        
        if not topic:
            flash('Please provide a blog topic', 'error')
            return redirect(url_for('blog.index'))
        
        # Map length to approximate word count
        length_map = {
            'short': 300,
            'medium': 600,
            'long': 1200
        }
        word_count = length_map.get(length, 600)
        
        # Create the prompt for the LM Studio API
        prompt = f"""Write a {tone} blog post about {topic}. 
The title of the blog post is: "{title}". 
Make it approximately {word_count} words long.
"""
        
        if keywords:
            prompt += f"\nTry to incorporate the following keywords: {keywords}."
        
        # Initialize LM Studio client
        client = LMStudioClient()
        
        # Check if LM Studio is available
        if not client.check_connection():
            flash("Cannot connect to LM Studio API. Please ensure it's running.", 'error')
            return redirect(url_for('blog.index'))
        
        # Create the messages for chat completion
        messages = [
            {"role": "system", "content": "You are a professional blog writer."},
            {"role": "user", "content": prompt}
        ]
        
        # Generate the blog post
        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract the content from the response
        content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        if not content:
            flash("Failed to generate blog content. Please try again.", 'error')
            return redirect(url_for('blog.index'))
        
        # Create metadata for the generation
        metadata = {
            "model": response.get('model', 'unknown'),
            "prompt_tokens": response.get('usage', {}).get('prompt_tokens', 0),
            "completion_tokens": response.get('usage', {}).get('completion_tokens', 0),
            "total_tokens": response.get('usage', {}).get('total_tokens', 0),
            "tone": tone,
            "requested_length": length
        }
        
        # Create and save the blog post
        blog_post = BlogPost(
            title=title,
            content=content,
            topic=topic,
            keywords=keywords,
            generation_metadata=metadata
        ).save()
        
        # Redirect to the preview page
        flash("Blog post generated successfully!", 'success')
        return redirect(url_for('blog.preview', post_id=blog_post.id))
        
    except LMStudioAPIError as e:
        flash(f"LM Studio API error: {str(e)}", 'error')
        return redirect(url_for('blog.index'))
    except Exception as e:
        current_app.logger.error(f"Error generating blog: {str(e)}")
        flash("An unexpected error occurred. Please try again.", 'error')
        return redirect(url_for('blog.index'))

@bp.route('/preview/<post_id>', methods=['GET'])
def preview(post_id):
    """Preview a generated blog post (API endpoint)"""
    # Get the blog post
    post = BlogPost.get_by_id(post_id)
    
    if not post:
        return jsonify({
            'success': False,
            'error': 'Blog post not found'
        }), 404
    
    # Convert post to dict for JSON serialization
    post_data = post.to_dict() if hasattr(post, 'to_dict') else {
        'id': post.id,
        'title': post.title,
        'content': post.content,
        'topic': post.topic,
        'keywords': post.keywords,
        'created_at': post.created_at.isoformat() if isinstance(post.created_at, datetime) else post.created_at,
        'published': post.published,
        'published_at': post.published_at.isoformat() if post.published_at and isinstance(post.published_at, datetime) else post.published_at,
        'generation_metadata': post.generation_metadata
    }
    
    return jsonify({
        'success': True,
        'post': post_data
    })

@bp.route('/edit/<post_id>', methods=['POST'])
def edit(post_id):
    """Edit a generated blog post"""
    # Get the blog post
    post = BlogPost.get_by_id(post_id)
    
    if not post:
        flash("Blog post not found", 'error')
        return redirect(url_for('blog.index'))
    
    # Update the blog post
    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    
    if not title:
        flash("Blog title cannot be empty", 'error')
        return redirect(url_for('blog.preview', post_id=post_id))
    
    if not content:
        flash("Blog content cannot be empty", 'error')
        return redirect(url_for('blog.preview', post_id=post_id))
    
    # Update and save
    post.update(title=title, content=content)
    
    flash("Blog post updated successfully", 'success')
    return redirect(url_for('blog.preview', post_id=post_id))

@bp.route('/list', methods=['GET'])
def list_posts():
    """List all generated blog posts (API endpoint)"""
    # Get all blog posts, sorted by creation date (newest first)
    posts = sorted(
        BlogPost.get_all(),
        key=lambda p: p.created_at if isinstance(p.created_at, datetime) else datetime.fromisoformat(p.created_at),
        reverse=True
    )
    
    # Convert posts to dict for JSON serialization
    posts_data = []
    for post in posts:
        post_dict = post.to_dict() if hasattr(post, 'to_dict') else {
            'id': post.id,
            'title': post.title,
            'content': post.content,
            'topic': post.topic,
            'keywords': post.keywords,
            'created_at': post.created_at.isoformat() if isinstance(post.created_at, datetime) else post.created_at,
            'published': post.published,
            'published_at': post.published_at.isoformat() if post.published_at and isinstance(post.published_at, datetime) else post.published_at
        }
        posts_data.append(post_dict)
    
    return jsonify({
        'success': True,
        'posts': posts_data
    })

@bp.route('/publish/<post_id>', methods=['POST'])
def publish(post_id):
    """Mark a blog post as published"""
    # Get the blog post
    post = BlogPost.get_by_id(post_id)
    
    if not post:
        flash("Blog post not found", 'error')
        return redirect(url_for('blog.list_posts'))
    
    # Publish the post
    post.publish()
    
    flash("Blog post published successfully", 'success')
    return redirect(url_for('blog.preview', post_id=post_id))

@bp.route('/delete/<post_id>', methods=['POST'])
def delete(post_id):
    """Delete a blog post"""
    # Get the blog post
    post = BlogPost.get_by_id(post_id)
    
    if not post:
        flash("Blog post not found", 'error')
        return redirect(url_for('blog.list_posts'))
    
    # Delete the post
    post.delete()
    
    flash("Blog post deleted successfully", 'success')
    return redirect(url_for('blog.list_posts'))

@bp.route('/wizard', methods=['GET'])
def wizard():
    """Display the blog post creation wizard (API endpoint)"""
    return jsonify({
        'success': True,
        'message': 'Blog creation wizard configuration',
        'data': {
            'steps': ['topic', 'outline', 'sections', 'review'],
            'tones': ['professional', 'casual', 'humorous', 'formal', 'technical'],
            'lengths': ['short', 'medium', 'long', 'comprehensive'],
            'purposes': ['informative', 'persuasive', 'educational', 'entertaining']
        }
    })

@bp.route('/generate-outline', methods=['POST'])
def generate_outline():
    """Generate a blog post outline using the LM Studio API"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request format. JSON payload required.'
            }), 400
            
        # Extract required fields
        title = data.get('title', '').strip()
        topic = data.get('topic', '').strip()
        purpose = data.get('purpose', '').strip()
        audience = data.get('audience', '').strip()
        tone = data.get('tone', 'professional').strip()
        
        # Validate required inputs
        if not title:
            return jsonify({
                'success': False,
                'error': 'Blog title is required'
            }), 400
        
        if not topic:
            return jsonify({
                'success': False,
                'error': 'Blog topic is required'
            }), 400
            
        if not purpose:
            return jsonify({
                'success': False,
                'error': 'Content purpose is required'
            }), 400
            
        if not audience:
            return jsonify({
                'success': False,
                'error': 'Target audience is required'
            }), 400
        
        # Initialize LM Studio client
        client = LMStudioClient()
        
        # Check if LM Studio is available
        if not client.check_connection():
            return jsonify({
                'success': False,
                'error': "Cannot connect to LM Studio API. Please ensure it's running."
            }), 503
        
        # Generate the outline using helper function
        outline = generate_blog_outline(client, title, topic, purpose, audience, tone)
        
        # Return the outline
        return jsonify({
            'success': True,
            'outline': outline
        })
            
    except LMStudioAPIError as e:
        current_app.logger.error(f"LM Studio API error generating outline: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"LM Studio API error: {str(e)}"
        }), 500
    except Exception as e:
        current_app.logger.error(f"Error generating outline: {str(e)}")
        return jsonify({
            'success': False,
            'error': "An unexpected error occurred. Please try again."
        }), 500

@bp.route('/generate-section', methods=['POST'])
def generate_section():
    """Generate content for a specific section of a blog post"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request format. JSON payload required.'
            }), 400
            
        # Extract required fields
        title = data.get('title', '').strip()
        topic = data.get('topic', '').strip()
        purpose = data.get('purpose', '').strip()
        audience = data.get('audience', '').strip()
        tone = data.get('tone', 'professional').strip()
        length = data.get('length', 'medium').strip()
        section_id = data.get('sectionId', '').strip()
        section_title = data.get('sectionTitle', '').strip()
        section_description = data.get('sectionDescription', '').strip()
        outline_json = data.get('outline', '')
        
        # Validate required inputs
        if not title or not topic or not purpose or not audience:
            return jsonify({
                'success': False,
                'error': 'Missing required fields (title, topic, purpose, audience)'
            }), 400
            
        if not section_id or not section_title:
            return jsonify({
                'success': False,
                'error': 'Section ID and title are required'
            }), 400
        
        # Initialize LM Studio client
        client = LMStudioClient()
        
        # Check if LM Studio is available
        if not client.check_connection():
            return jsonify({
                'success': False,
                'error': "Cannot connect to LM Studio API. Please ensure it's running."
            }), 503
        
        # Generate section content using helper function
        section_content = generate_section_content(
            client, title, topic, purpose, audience, tone, length,
            section_id, section_title, section_description, outline_json
        )
        
        # Return success response
        return jsonify({
            'success': True,
            'content': section_content
        })
            
    except LMStudioAPIError as e:
        current_app.logger.error(f"LM Studio API error generating section: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"LM Studio API error: {str(e)}"
        }), 500
    except Exception as e:
        current_app.logger.error(f"Error generating section content: {str(e)}")
        return jsonify({
            'success': False,
            'error': "An unexpected error occurred. Please try again."
        }), 500

# Helper functions for blog generation
def generate_blog_outline(client, title, topic, purpose, audience, tone="professional"):
    """
    Generate a blog post outline using the LM Studio API
    
    Args:
        client: LMStudioClient instance
        title: The blog post title
        topic: The blog post topic
        purpose: The content purpose (informative, persuasive, etc.)
        audience: The target audience
        tone: The writing tone
        
    Returns:
        list: The outline as a list of section objects
    """
    # Create the system prompt
    system_prompt = """You are an expert content strategist and blog outline creator.
Your task is to create a well-structured outline for a blog post.
The outline should include:
1. An introduction section
2. 3-5 main sections that cover the topic comprehensively
3. A conclusion section

For each section, provide:
- A clear, concise section title
- A brief description of what should be covered in that section

Your response MUST be in valid JSON format with this structure:
[
  {
    "id": "introduction",
    "title": "Introduction",
    "content": "Description of what to cover in the introduction..."
  },
  {
    "id": "section-1",
    "title": "First Main Point",
    "content": "Description of what to cover in this section..."
  },
  ...additional sections...
  {
    "id": "conclusion",
    "title": "Conclusion",
    "content": "Description of what to cover in the conclusion..."
  }
]"""
    
    # Create the user prompt
    user_prompt = f"""Create an outline for a {purpose} blog post titled "{title}" about {topic}.
The content is intended for a {audience} audience and should use a {tone} tone.

Please provide a structured outline with:
1. An engaging introduction that hooks the reader
2. 3-5 main sections that cover the topic logically and completely
3. A powerful conclusion that summarizes key points and includes a call to action

Ensure each section has a clear title and a brief description of what should be covered.

Return ONLY the JSON array as specified, with no additional text or explanation."""
    
    # Create the messages for chat completion
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    # Generate the outline
    current_app.logger.info(f"Generating outline for blog post: {title}")
    response = client.create_chat_completion(
        messages=messages,
        temperature=0.7,
        max_tokens=1000
    )
    
    # Extract the content from the response
    content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
    
    if not content:
        raise LMStudioAPIError('Failed to generate outline. Empty response.')
    
    # Parse the JSON response
    try:
        # The model might return the JSON string with extra text before or after
        # Try to extract just the JSON part
        content = content.strip()
        # Find the first '[' and the last ']' to extract the JSON array
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            raise ValueError("Cannot find JSON array in response")
            
        json_str = content[start_idx:end_idx]
        outline = json.loads(json_str)
        
        # Validate and fix the outline structure
        outline = validate_outline_structure(outline, title, topic, audience)
        
        return outline
        
    except (json.JSONDecodeError, ValueError) as e:
        current_app.logger.error(f"Error parsing outline JSON: {str(e)}")
        current_app.logger.error(f"Raw content: {content}")
        raise LMStudioAPIError(f"Failed to parse outline: {str(e)}")

def validate_outline_structure(outline, title, topic, audience):
    """
    Validate and fix the outline structure
    
    Args:
        outline: The outline to validate
        title: The blog post title
        topic: The blog post topic
        audience: The target audience
        
    Returns:
        list: The validated and fixed outline
    """
    section_ids = set()
    
    # Validate and fix each section
    for i, section in enumerate(outline):
        # Ensure all required keys are present
        if not all(key in section for key in ['id', 'title', 'content']):
            # If the section is missing any required keys, add them
            if 'id' not in section:
                if i == 0:
                    section['id'] = 'introduction'
                elif i == len(outline) - 1:
                    section['id'] = 'conclusion'
                else:
                    section['id'] = f'section-{i}'
            
            if 'title' not in section:
                if i == 0:
                    section['title'] = 'Introduction'
                elif i == len(outline) - 1:
                    section['title'] = 'Conclusion'
                else:
                    section['title'] = f'Section {i}'
            
            if 'content' not in section:
                section['content'] = ''
        
        # Ensure section IDs are unique
        if section['id'] in section_ids:
            section['id'] = f"{section['id']}-{i}"
        section_ids.add(section['id'])
    
    # Ensure we have introduction and conclusion
    has_intro = any(s['id'] == 'introduction' for s in outline)
    has_conclusion = any(s['id'] == 'conclusion' for s in outline)
    
    if not has_intro:
        outline.insert(0, {
            'id': 'introduction',
            'title': 'Introduction',
            'content': f'Introduce the topic of {topic} and why it matters to the {audience}.'
        })
    
    if not has_conclusion:
        outline.append({
            'id': 'conclusion',
            'title': 'Conclusion',
            'content': f'Summarize the key points and provide a call to action for the {audience}.'
        })
    
    return outline

def generate_section_content(client, title, topic, purpose, audience, tone, length,
                            section_id, section_title, section_description, outline_json):
    """
    Generate content for a specific section of a blog post.
    - Uses LMStudioClient to generate content with context: title, topic, audience, tone, length, and outline.
    - Handles Intro, Main, or Conclusion sections.
    - Ensures response only includes the generated content text.
    - Handles errors gracefully.
    """
    try:
        import json
        # Parse outline if it's a string
        if isinstance(outline_json, str):
            try:
                outline = json.loads(outline_json)
            except Exception as e:
                outline = []
        else:
            outline = outline_json or []

        length_map = {
            'short': 120,
            'medium': 220,
            'long': 340,
            'comprehensive': 500,
        }
        target_words = length_map.get(length, 220)

        # Figure out type of section
        section_type = 'main'
        if section_id.lower() == 'introduction':
            section_type = 'introduction'
        elif section_id.lower() == 'conclusion':
            section_type = 'conclusion'

        # Outline summary for LLM context
        outline_brief = ""
        if outline:
            outline_brief = "Overall Outline:\n" + "\n".join(
                [f"- {s.get('title','').strip()}: {s.get('content','').strip()}" for s in outline if s.get('title')])

        # Instruction prompt construction
        prompt = (
            f"You are writing only ONE section of a {purpose} blog post for a {audience} audience.\n"
            f"Blog Title: \"{title}\"\n"
            f"Topic: {topic}\n"
            f"Section Type: {section_type.capitalize()}\n"
            f"Section Title: {section_title.strip()}\n"
            f"Section Brief: {section_description.strip()}\n"
            f"{outline_brief}\n"
            f"Write only the content for this section in a {tone} tone. Do not include a title. Make it approximately {target_words} words.\n"
            f"Reply with only the body text for this section (no titles, headers, or additional notes).\n"
        )

        messages = [
            {"role": "system", "content": "You are an expert blog content writer."},
            {"role": "user", "content": prompt}
        ]

        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=int(target_words * 4)//3  # Rough token estimation
        )

        content = response.get('choices', [{}])[0].get('message', {}).get('content', '').strip()

        if not content:
            raise LMStudioAPIError("LM Studio returned an empty section.")

        return content

    except Exception as e:
        current_app.logger.error(f"Error generating section content for {section_id}: {str(e)}")
        return ""
