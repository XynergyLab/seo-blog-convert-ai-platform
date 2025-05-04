from flask import Blueprint, request, jsonify, current_app
from app.models.blog import BlogPost, BlogPostVersion
from app.services.lmstudio import LMStudioClient, LMStudioAPIError
from datetime import datetime

api_blog = Blueprint('api_blog', __name__, url_prefix='/api/blog')

# GET /api/blog/list: Return list of all blog posts as JSON
@api_blog.route('/list', methods=['GET'])
def api_blog_list():
    posts = BlogPost.get_all()
    return jsonify({
        'success': True,
        'posts': [p.to_dict() for p in posts]
    }), 200

# GET /api/blog/<id>: Return a single blog post as JSON
@api_blog.route('/<post_id>', methods=['GET'])
def api_blog_get(post_id):
    post = BlogPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Blog post not found'}), 404
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/blog/generate: Create/generate a new blog post via LLM, from JSON payload
@api_blog.route('/generate', methods=['POST'])
def api_blog_generate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400

        title = data.get('title', '').strip()
        topic = data.get('topic', '').strip()
        tone = data.get('tone', 'professional').strip()
        length = data.get('length', 'medium').strip()
        keywords = data.get('keywords', '').strip()

        # Validate
        if not title or not topic:
            return jsonify({'success': False, 'error': 'Title and topic required'}), 400

        length_map = {'short': 300, 'medium': 600, 'long': 1200}
        word_count = length_map.get(length, 600)

        prompt = f"""Write a {tone} blog post about {topic}. 
The title of the blog post is: "{title}". 
Make it approximately {word_count} words long.
"""
        if keywords:
            prompt += f"\nTry to incorporate the following keywords: {keywords}."

        client = LMStudioClient()
        if not client.check_connection():
            return jsonify({'success': False, 'error': 'Cannot connect to LM Studio API.'}), 503

        messages = [
            {"role": "system", "content": "You are a professional blog writer."},
            {"role": "user", "content": prompt}
        ]

        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        if not content:
            return jsonify({'success': False, 'error': 'No content generated'}), 500

        metadata = {
            "model": response.get('model', 'unknown'),
            "usage": response.get('usage', {}),
            "tone": tone,
            "requested_length": length
        }

        blog_post = BlogPost(
            title=title,
            content=content,
            topic=topic,
            keywords=keywords,
            generation_metadata=metadata
        ).save()

        return jsonify({'success': True, 'post': blog_post.to_dict()}), 201

    except LMStudioAPIError as e:
        return jsonify({'success': False, 'error': f'LM Studio API error: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.exception('Error generating blog')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

# POST /api/blog/edit/<id>: Update/edit an existing blog post
@api_blog.route('/edit/<post_id>', methods=['POST'])
def api_blog_edit(post_id):
    post = BlogPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Blog post not found'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON payload required'}), 400
    title = data.get('title', post.title)
    content = data.get('content', post.content)
    topic = data.get('topic', post.topic)
    keywords = data.get('keywords', post.keywords)
    post.update(title=title, content=content, topic=topic, keywords=keywords)
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/blog/publish/<id>: Mark a blog post as published
@api_blog.route('/publish/<post_id>', methods=['POST'])
def api_blog_publish(post_id):
    post = BlogPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Blog post not found'}), 404
    post.publish()
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/blog/delete/<id>: Delete a blog post
@api_blog.route('/delete/<post_id>', methods=['POST'])
def api_blog_delete(post_id):
    post = BlogPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Blog post not found'}), 404
    post.delete()
    return jsonify({'success': True}), 200

# POST /api/blog/generate-outline: Generate a structured outline for a blog post
@api_blog.route('/generate-outline', methods=['POST'])
def api_blog_generate_outline():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400
        
        title = data.get('title', '').strip()
        keywords = data.get('keywords', [])
        sections = data.get('sections', 3)
        
        # Validate
        if not title:
            return jsonify({'success': False, 'error': 'Title is required'}), 400
            
        # Cap sections to reasonable number
        if sections > 10:
            sections = 10
            
        # Format keywords for prompt
        keywords_text = ", ".join(keywords) if keywords else "no specific keywords"
        
        prompt = f"""Create a detailed outline for a blog post titled "{title}".
The outline should include {sections} main sections (plus an introduction and conclusion).
Focus on these keywords: {keywords_text}.
For each section, provide a clear heading and a brief description of what should be covered.
Format your response as a structured outline with main points and supporting details.
"""

        client = LMStudioClient()
        if not client.check_connection():
            return jsonify({'success': False, 'error': 'Cannot connect to LM Studio API.'}), 503
            
        messages = [
            {"role": "system", "content": "You are a professional content outline creator."},
            {"role": "user", "content": prompt}
        ]
        
        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        outline_text = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        if not outline_text:
            return jsonify({'success': False, 'error': 'No outline generated'}), 500
            
        # Parse the outline into a structured format
        # This is a simple approach - you might want to enhance this with more sophisticated parsing
        lines = outline_text.strip().split('\n')
        sections = []
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('#') or line.startswith('Section') or line.startswith('Introduction') or line.startswith('Conclusion'):
                if current_section:
                    sections.append(current_section)
                current_section = {'title': line.replace('#', '').strip(), 'content': ''}
            elif current_section:
                if current_section['content']:
                    current_section['content'] += '\n' + line
                else:
                    current_section['content'] = line
                    
        if current_section:
            sections.append(current_section)
            
        return jsonify({
            'success': True, 
            'outline': sections,
            'raw_outline': outline_text
        }), 200
        
    except LMStudioAPIError as e:
        return jsonify({'success': False, 'error': f'LM Studio API error: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.exception('Error generating blog outline')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

# POST /api/blog/generate-section: Generate content for a specific section of a blog post
@api_blog.route('/generate-section', methods=['POST'])
def api_blog_generate_section():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400
        
        title = data.get('title', '').strip()
        heading = data.get('heading', '').strip()
        keywords = data.get('keywords', [])
        previous_section = data.get('previousSection', '').strip()
        tone = data.get('tone', 'professional').strip()
        
        # Validate
        if not title or not heading:
            return jsonify({'success': False, 'error': 'Title and heading are required'}), 400
            
        # Format keywords for prompt
        keywords_text = ", ".join(keywords) if keywords else "no specific keywords"
        
        prompt = f"""Write a section for a blog post titled "{title}".
Section heading: "{heading}"
Tone: {tone}
Keywords to include: {keywords_text}
"""

        if previous_section:
            prompt += f"\nThis section follows after: \"{previous_section}\"\nMake sure your content flows naturally from the previous section."
        
        client = LMStudioClient()
        if not client.check_connection():
            return jsonify({'success': False, 'error': 'Cannot connect to LM Studio API.'}), 503
            
        messages = [
            {"role": "system", "content": "You are a professional blog writer skilled at creating engaging, informative content."},
            {"role": "user", "content": prompt}
        ]
        
        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        section_content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        if not section_content:
            return jsonify({'success': False, 'error': 'No content generated'}), 500
            
        return jsonify({
            'success': True, 
            'heading': heading,
            'content': section_content
        }), 200
        
    except LMStudioAPIError as e:
        return jsonify({'success': False, 'error': f'LM Studio API error: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.exception('Error generating blog section')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

# GET /api/blog/<id>/history: Get version history for a blog post
@api_blog.route('/<post_id>/history', methods=['GET'])
def api_blog_history(post_id):
    try:
        post = BlogPost.get_by_id(post_id)
        if not post:
            return jsonify({'success': False, 'error': 'Blog post not found'}), 404
            
        versions = BlogPostVersion.get_for_post(post_id)
        return jsonify({
            'success': True,
            'versions': [v.to_dict() for v in versions]
        }), 200
        
    except Exception as e:
        current_app.logger.exception(f'Error retrieving history for blog post {post_id}')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

# POST /api/blog/<id>/restore/<version_id>: Restore a previous version of a blog post
@api_blog.route('/<post_id>/restore/<version_id>', methods=['POST'])
def api_blog_restore_version(post_id, version_id):
    try:
        post = BlogPost.get_by_id(post_id)
        if not post:
            return jsonify({'success': False, 'error': 'Blog post not found'}), 404
            
        version = BlogPostVersion.get_by_id(version_id)
        if not version or version.post_id != post_id:
            return jsonify({'success': False, 'error': 'Version not found for this post'}), 404
            
        # Create a new version of the current content before restoring
        post.create_version("Auto-saved before restoration")
        
        # Restore content from version
        post.update(
            title=version.title,
            content=version.content,
            updated_at=datetime.now()
        )
        
        return jsonify({
            'success': True,
            'post': post.to_dict(),
            'restored_from': version.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.exception(f'Error restoring version {version_id} for blog post {post_id}')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

