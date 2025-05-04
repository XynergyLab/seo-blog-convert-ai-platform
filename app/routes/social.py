"""
==== SOCIAL CONTENT MODULE ENDPOINTS DOCUMENTATION ====

Feature      | HTTP Method | URL                       | Backend Functionality / Description             | Response Type
-------------|-------------|---------------------------|-------------------------------------------------|---------------------
List         | GET         | /social/list              | List all social media posts, with filters       | HTML (list.html)
Create UI    | GET         | /social/                  | Display content generation form                 | HTML (index.html)
Create Post  | POST        | /social/generate          | Generate a social media post via LLM            | Redirect on errors/success, Flash + Preview
Preview      | GET         | /social/preview/<post_id> | Preview a generated social media post           | HTML (preview.html)
Edit         | POST        | /social/edit/<post_id>    | Edit/Update a generated social media post       | Redirect + Flash
Schedule     | POST        | /social/schedule/<post_id>| Schedule a post for publishing                  | Redirect + Flash
Publish      | POST        | /social/publish/<post_id> | Mark a post as published                        | Redirect + Flash
Delete       | POST        | /social/delete/<post_id>  | Delete a social media post                      | Redirect + Flash

Notes:
 - Most routes use server-side templates, serving HTML, with all mutations using POST + redirect pattern.
 - Status, scheduling, and publish flows will need to be wrapped as JSON APIs or adapted for frontend frameworks.
 - List endpoint allows filtering by platform/status in query args; Preview/edit/publish/schedule all operate on post_id.
"""

"""
==== SOCIAL CONTENT FLASK ENDPOINT TO VUE COMPONENT MAPPING ====

| Endpoint (Method)                   | Backend Feature        | Response | Proposed Vue Component          | API Ready or Needs Adaptation? |
|-------------------------------------|-----------------------|----------|----------------------------------|---------------------------------|
| /social/list (GET)                  | List Social Posts     | HTML     | SocialPostListView.vue           | Needs JSON API endpoint         |
| /social/ (GET)                      | Social Gen Form       | HTML     | SocialCreateForm.vue             | Needs JSON API endpoint         |
| /social/generate (POST)             | Gen Social Post       | Redirect | SocialCreateForm.vue             | Needs dedicated JSON API        |
| /social/preview/<id> (GET)          | Preview Social Post   | HTML     | SocialPreview.vue                | Needs JSON API endpoint         |
| /social/edit/<id> (POST)            | Edit Social Post      | Redirect | SocialEditor.vue                 | Needs JSON API endpoint         |
| /social/schedule/<id> (POST)        | Schedule Social Post  | Redirect | SocialSchedule.vue               | Needs JSON API endpoint         |
| /social/publish/<id> (POST)         | Publish Social Post   | Redirect | SocialPreview.vue                | Needs JSON API endpoint         |
| /social/delete/<id> (POST)          | Delete Social Post    | Redirect | SocialPostListView.vue           | Needs JSON API endpoint         |

Notes:
 - Like blog routes, all main flows (list, create, edit, schedule, publish, delete) are server-rendered or redirect; API adaptation (JSON) is required for SPA.
 - For MVP: Implement SocialPostListView, SocialCreateForm, SocialPreview, SocialEditor, SocialSchedule and adapt their endpoints to REST/JSON.
"""
from flask import (
    Blueprint, flash, redirect, render_template, 
    request, url_for, jsonify, current_app
)
import uuid
from datetime import datetime
from app.services.lmstudio import LMStudioClient, LMStudioAPIError
from app.models.social import SocialPost, Platform, PostStatus
# Create blueprint
bp = Blueprint('social', __name__, url_prefix='/social')

@bp.route('/', methods=['GET'])
def index():
    """Display the social media content generation form"""
    return render_template('social/index.html', platforms=[p.value for p in Platform])

@bp.route('/generate', methods=['POST'])
def generate():
    """Generate social media content using the LM Studio API"""
    try:
        # Get form data
        platform = request.form.get('platform', '').strip().lower()
        topic = request.form.get('topic', '').strip()
        tone = request.form.get('tone', 'professional').strip()
        include_hashtags = request.form.get('include_hashtags') == 'on'
        hashtag_count = int(request.form.get('hashtag_count', 3))
        
        # Validate inputs
        if not platform:
            flash('Please select a social media platform', 'error')
            return redirect(url_for('social.index'))
        
        try:
            platform_enum = Platform(platform)
        except ValueError:
            flash(f'Invalid platform: {platform}', 'error')
            return redirect(url_for('social.index'))
        
        if not topic:
            flash('Please provide a topic', 'error')
            return redirect(url_for('social.index'))
        
        # Get platform constraints for the prompt
        char_limit = SocialPost.PLATFORM_CONSTRAINTS[platform_enum]["char_limit"]
        
        # Create the prompt for the LM Studio API
        prompt = f"""Generate a {tone} social media post for {platform} about {topic}.
Keep the post under {char_limit} characters.
"""
        
        if include_hashtags:
            prompt += f"\nInclude {hashtag_count} relevant hashtags."
        
        # Initialize LM Studio client
        client = LMStudioClient()
        
        # Check if LM Studio is available
        if not client.check_connection():
            flash("Cannot connect to LM Studio API. Please ensure it's running.", 'error')
            return redirect(url_for('social.index'))
        
        # Create the messages for chat completion
        messages = [
            {"role": "system", "content": f"You are an expert social media copywriter for {platform}."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            # Generate the social media content
            response = client.create_chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=500  # Adjust based on platform
            )
            
            # Extract the content from the response
            content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            if not content:
                flash("Failed to generate social media content. Please try again.", 'error')
                return redirect(url_for('social.index'))
            
            # Extract hashtags from content if they are included
            hashtags = []
            if include_hashtags:
                # Simple extraction of hashtags (could be improved)
                hashtags = [
                    word.strip('#').lower() 
                    for word in content.split() 
                    if word.startswith('#')
                ]
                
                # Clean up content if needed (remove hashtag section if it's at the end)
                if len(hashtags) > 0 and "hashtags:" in content.lower():
                    # Try to remove "hashtags:" section if it exists
                    content_parts = content.lower().split("hashtags:")
                    if len(content_parts) > 1:
                        content = content_parts[0].strip()
            
            # Create metadata
            metadata = {
                "model": response.get('model', 'unknown'),
                "prompt_tokens": response.get('usage', {}).get('prompt_tokens', 0),
                "completion_tokens": response.get('usage', {}).get('completion_tokens', 0),
                "total_tokens": response.get('usage', {}).get('total_tokens', 0),
                "tone": tone,
                "generated_with_hashtags": include_hashtags
            }
            
            try:
                # Create and save the social post
                social_post = SocialPost(
                    content=content,
                    platform=platform,
                    topic=topic,
                    hashtags=hashtags,
                    metadata=metadata
                ).save()
                
                # Redirect to the preview page
                flash("Social media post generated successfully!", 'success')
                return redirect(url_for('social.preview', post_id=social_post.id))
                
            except ValueError as e:
                # Handle validation errors
                flash(f"Validation error: {str(e)}", 'error')
                return redirect(url_for('social.index'))
                
        except LMStudioAPIError as e:
            flash(f"LM Studio API error: {str(e)}", 'error')
            return redirect(url_for('social.index'))
            
    except Exception as e:
        current_app.logger.error(f"Error generating social media content: {str(e)}")
        flash("An unexpected error occurred. Please try again.", 'error')
        return redirect(url_for('social.index'))

@bp.route('/preview/<post_id>', methods=['GET'])
def preview(post_id):
    """Preview a generated social media post"""
    # Get the social post
    post = SocialPost.get_by_id(post_id)
    
    if not post:
        flash("Social media post not found", 'error')
        return redirect(url_for('social.index'))
    
    # Get platform constraints for display
    constraints = SocialPost.PLATFORM_CONSTRAINTS.get(post.platform, {})
    
    return render_template(
        'social/preview.html', 
        post=post, 
        constraints=constraints,
        char_count=len(post.content),
        char_limit=constraints.get("char_limit", 0)
    )

@bp.route('/edit/<post_id>', methods=['POST'])
def edit(post_id):
    """Edit a generated social media post"""
    # Get the social post
    post = SocialPost.get_by_id(post_id)
    
    if not post:
        flash("Social media post not found", 'error')
        return redirect(url_for('social.list'))
    
    # Get form data
    content = request.form.get('content', '').strip()
    hashtags_text = request.form.get('hashtags', '').strip()
    
    # Parse hashtags from comma-separated text
    hashtags = [tag.strip().lstrip('#') for tag in hashtags_text.split(',') if tag.strip()]
    
    try:
        # Update the post
        post.update(
            content=content,
            hashtags=hashtags
        )
        
        flash("Social media post updated successfully", 'success')
        return redirect(url_for('social.preview', post_id=post_id))
        
    except ValueError as e:
        # Handle validation errors
        flash(f"Validation error: {str(e)}", 'error')
        return redirect(url_for('social.preview', post_id=post_id))

@bp.route('/schedule/<post_id>', methods=['POST'])
def schedule(post_id):
    """Schedule a social media post for publishing"""
    # Get the social post
    post = SocialPost.get_by_id(post_id)
    
    if not post:
        flash("Social media post not found", 'error')
        return redirect(url_for('social.list'))
    
    # Get the scheduled datetime
    scheduled_date = request.form.get('scheduled_date', '').strip()
    scheduled_time = request.form.get('scheduled_time', '').strip()
    
    if not scheduled_date or not scheduled_time:
        flash("Please provide both date and time for scheduling", 'error')
        return redirect(url_for('social.preview', post_id=post_id))
    
    try:
        # Parse the datetime
        scheduled_datetime = datetime.strptime(f"{scheduled_date} {scheduled_time}", "%Y-%m-%d %H:%M")
        
        # Schedule the post
        post.schedule(scheduled_datetime)
        
        flash(f"Post scheduled for {scheduled_datetime.strftime('%Y-%m-%d %H:%M')}", 'success')
        return redirect(url_for('social.preview', post_id=post_id))
        
    except ValueError as e:
        flash(f"Scheduling error: {str(e)}", 'error')
        return redirect(url_for('social.preview', post_id=post_id))

@bp.route('/publish/<post_id>', methods=['POST'])
def publish(post_id):
    """Mark a social media post as published"""
    # Get the social post
    post = SocialPost.get_by_id(post_id)
    
    if not post:
        flash("Social media post not found", 'error')
        return redirect(url_for('social.list'))
    
    try:
        # In a real application, this would integrate with the respective social media API
        # For this MVP, we're just marking it as published
        post.publish()
        
        flash("Social media post published successfully", 'success')
        return redirect(url_for('social.preview', post_id=post_id))
        
    except Exception as e:
        current_app.logger.error(f"Error publishing post: {str(e)}")
        post.mark_failed(str(e))
        flash(f"Failed to publish post: {str(e)}", 'error')
        return redirect(url_for('social.preview', post_id=post_id))

@bp.route('/delete/<post_id>', methods=['POST'])
def delete(post_id):
    """Delete a social media post"""
    # Get the social post
    post = SocialPost.get_by_id(post_id)
    
    if not post:
        flash("Social media post not found", 'error')
        return redirect(url_for('social.list'))
    
    # Delete the post
    post.delete()
    
    flash("Social media post deleted successfully", 'success')
    return redirect(url_for('social.list'))

@bp.route('/list', methods=['GET'])
def list_posts():
    """List all social media posts"""
    # Get filter parameters
    platform_filter = request.args.get('platform', 'all')
    status_filter = request.args.get('status', 'all')
    
    # Get all posts
    if platform_filter != 'all' and status_filter != 'all':
        # Filter by both platform and status
        platform_posts = SocialPost.get_by_platform(platform_filter)
        posts = [post for post in platform_posts if post.status.value == status_filter]
    elif platform_filter != 'all':
        # Filter by platform only
        posts = SocialPost.get_by_platform(platform_filter)
    elif status_filter != 'all':
        # Filter by status only
        posts = SocialPost.get_by_status(status_filter)
    else:
        # No filters
        posts = SocialPost.get_all()
    
    # Sort by creation date (newest first)
    posts = sorted(
        posts,
        key=lambda p: p.created_at if isinstance(p.created_at, datetime) else datetime.fromisoformat(p.created_at),
        reverse=True
    )
    
    return render_template(
        'social/list.html', 
        posts=posts,
        platforms=[p.value for p in Platform],
        statuses=[s.value for s in PostStatus],
        current_platform=platform_filter,
        current_status=status_filter
    )
