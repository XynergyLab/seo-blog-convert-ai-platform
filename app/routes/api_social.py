from flask import Blueprint, request, jsonify, current_app
from app.models.social import SocialPost, Platform, PostStatus
from app.services.lmstudio import LMStudioClient, LMStudioAPIError
from datetime import datetime

api_social = Blueprint('api_social', __name__, url_prefix='/api/social')

# GET /api/social/list: List all social posts as JSON (optional platform/status filters)
@api_social.route('/list', methods=['GET'])
def api_social_list():
    platform = request.args.get('platform', 'all')
    status = request.args.get('status', 'all')
    if platform != 'all' and status != 'all':
        platform_posts = SocialPost.get_by_platform(platform)
        posts = [p for p in platform_posts if p.status.value == status]
    elif platform != 'all':
        posts = SocialPost.get_by_platform(platform)
    elif status != 'all':
        posts = SocialPost.get_by_status(status)
    else:
        posts = SocialPost.get_all()
    posts = sorted(posts, key=lambda p: p.created_at, reverse=True)
    return jsonify({'success': True, 'posts': [p.to_dict() for p in posts]}), 200

# GET /api/social/<post_id>: Get details for a single social post
@api_social.route('/<post_id>', methods=['GET'])
def api_social_get(post_id):
    post = SocialPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Social post not found'}), 404
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/social/generate: Generate a social post from JSON payload
@api_social.route('/generate', methods=['POST'])
def api_social_generate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400

        platform = data.get('platform', '').strip().lower()
        topic = data.get('topic', '').strip()
        tone = data.get('tone', 'professional').strip()
        include_hashtags = data.get('include_hashtags', False)
        hashtag_count = int(data.get('hashtag_count', 3))

        if not platform or not topic:
            return jsonify({'success': False, 'error': 'Platform and topic required'}), 400

        try:
            platform_enum = Platform(platform)
        except ValueError:
            return jsonify({'success': False, 'error': f'Invalid platform: {platform}'}), 400

        char_limit = SocialPost.PLATFORM_CONSTRAINTS[platform_enum]["char_limit"]

        prompt = f"""Generate a {tone} social media post for {platform} about {topic}.
Keep the post under {char_limit} characters.
"""
        if include_hashtags:
            prompt += f"\nInclude {hashtag_count} relevant hashtags."

        client = LMStudioClient()
        if not client.check_connection():
            return jsonify({'success': False, 'error': "Cannot connect to LM Studio API."}), 503

        messages = [
            {"role": "system", "content": f"You are an expert social media copywriter for {platform}."},
            {"role": "user", "content": prompt}
        ]

        response = client.create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        content = response.get('choices', [{}])[0].get('message', {}).get('content', '')

        if not content:
            return jsonify({'success': False, 'error': 'No content generated'}), 500

        hashtags = []
        if include_hashtags:
            hashtags = [
                word.strip('#').lower() 
                for word in content.split() 
                if word.startswith('#')
            ]
            # Heuristic cleanup
            if len(hashtags) > 0 and "hashtags:" in content.lower():
                content_parts = content.lower().split("hashtags:")
                if len(content_parts) > 1:
                    content = content_parts[0].strip()

        metadata = {
            "model": response.get('model', 'unknown'),
            "usage": response.get('usage', {}),
            "tone": tone,
            "generated_with_hashtags": include_hashtags,
        }
        # If extra fields are needed (e.g., scheduling), handle appropriately

        try:
            social_post = SocialPost(
                content=content,
                platform=platform,
                topic=topic,
                hashtags=hashtags,
                generation_metadata=metadata
            ).save()
        except ValueError as e:
            return jsonify({'success': False, 'error': f'Validation error: {str(e)}'}), 400

        return jsonify({'success': True, 'post': social_post.to_dict()}), 201

    except LMStudioAPIError as e:
        return jsonify({'success': False, 'error': f'LM Studio API error: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.exception('Error generating social post')
        return jsonify({'success': False, 'error': 'Unexpected error'}), 500

# POST /api/social/edit/<post_id>: Edit a social post with JSON
@api_social.route('/edit/<post_id>', methods=['POST'])
def api_social_edit(post_id):
    post = SocialPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Social post not found'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON payload required'}), 400
    content = data.get('content', post.content)
    hashtags = data.get('hashtags', post.hashtags)
    topic = data.get('topic', post.topic)
    try:
        post.update(content=content, hashtags=hashtags, topic=topic)
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/social/schedule/<post_id>: Schedule a post for publishing
@api_social.route('/schedule/<post_id>', methods=['POST'])
def api_social_schedule(post_id):
    post = SocialPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Social post not found'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON payload required'}), 400
    scheduled_at = data.get('scheduled_at', None)
    if not scheduled_at:
        return jsonify({'success': False, 'error': 'scheduled_at required (ISO datetime)'}), 400
    try:
        scheduled_datetime = datetime.fromisoformat(scheduled_at)
        post.schedule(scheduled_datetime)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Scheduling error: {str(e)}'}), 400
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/social/publish/<post_id>: Mark a post as published
@api_social.route('/publish/<post_id>', methods=['POST'])
def api_social_publish(post_id):
    post = SocialPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Social post not found'}), 404
    try:
        post.publish()
    except Exception as e:
        return jsonify({'success': False, 'error': f'Publish error: {str(e)}'}), 500
    return jsonify({'success': True, 'post': post.to_dict()}), 200

# POST /api/social/delete/<post_id>: Delete a post
@api_social.route('/delete/<post_id>', methods=['POST'])
def api_social_delete(post_id):
    post = SocialPost.get_by_id(post_id)
    if not post:
        return jsonify({'success': False, 'error': 'Social post not found'}), 404
    try:
        post.delete()
    except Exception as e:
        return jsonify({'success': False, 'error': f'Delete error: {str(e)}'}), 500
    return jsonify({'success': True}), 200

