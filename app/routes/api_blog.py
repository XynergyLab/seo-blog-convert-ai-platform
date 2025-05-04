from flask import Blueprint, request, jsonify, current_app
from app.models.blog import BlogPost
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

