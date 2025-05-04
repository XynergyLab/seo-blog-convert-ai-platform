from flask import Blueprint, request, jsonify, current_app
from app.models.keyword import Keyword, KeywordStatus
from app.models.blog import BlogPost
from typing import List, Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError

api_keywords = Blueprint('api_keywords', __name__, url_prefix='/api/keywords')

# Helper function to parse sorting parameters
def parse_sorting(sort_field: str, sort_order: str) -> tuple:
    """Parse and validate sorting parameters"""
    valid_fields = ['keyword', 'status', 'search_volume', 'keyword_difficulty', 'score', 'impressions', 'clicks', 'ctr', 'position', 'created_at']
    valid_orders = ['asc', 'desc']
    
    if sort_field not in valid_fields:
        sort_field = 'keyword'
    if sort_order not in valid_orders:
        sort_order = 'asc'
        
    return sort_field, sort_order

# 1. List/Search endpoints

# GET /api/keywords - Get all keywords with optional filtering and sorting
@api_keywords.route('', methods=['GET'])
def list_keywords():
    try:
        # Get query parameters for filtering
        status = request.args.get('status')
        sort_field = request.args.get('sort', 'keyword')
        sort_order = request.args.get('order', 'asc')
        limit = request.args.get('limit', type=int)
        
        # Apply filters
        if status:
            # Check if status is valid
            if status in [s.value for s in KeywordStatus]:
                keywords = Keyword.get_by_status(status)
            else:
                return jsonify({'success': False, 'error': f'Invalid status: {status}'}), 400
        else:
            keywords = Keyword.get_all()
        
        # Apply sorting
        sort_field, sort_order = parse_sorting(sort_field, sort_order)
        
        # Manual sorting since we're already fetched from DB
        reverse = sort_order == 'desc'
        if hasattr(Keyword, sort_field):
            keywords = sorted(keywords, key=lambda k: getattr(k, sort_field) or 0, reverse=reverse)
        
        # Apply limit
        if limit and limit > 0:
            keywords = keywords[:limit]
        
        return jsonify({
            'success': True,
            'keywords': [k.to_dict() for k in keywords],
            'count': len(keywords)
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error listing keywords')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/keywords/search - Search keywords by text
@api_keywords.route('/search', methods=['GET'])
def search_keywords():
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'success': False, 'error': 'Search query is required'}), 400
        
        keywords = Keyword.search(query)
        return jsonify({
            'success': True,
            'keywords': [k.to_dict() for k in keywords],
            'count': len(keywords)
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error searching keywords')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/keywords/{id} - Get single keyword details
@api_keywords.route('/<keyword_id>', methods=['GET'])
def get_keyword(keyword_id):
    try:
        keyword = Keyword.get_by_id(keyword_id)
        if not keyword:
            return jsonify({'success': False, 'error': 'Keyword not found'}), 404
        
        return jsonify({
            'success': True,
            'keyword': keyword.to_dict()
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error getting keyword')
        return jsonify({'success': False, 'error': str(e)}), 500

# 2. CRUD operations

# POST /api/keywords - Create new keyword
@api_keywords.route('', methods=['POST'])
def create_keyword():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400
        
        keyword_text = data.get('keyword', '').strip()
        if not keyword_text:
            return jsonify({'success': False, 'error': 'Keyword text is required'}), 400
        
        # Check if keyword already exists
        existing = Keyword.get_by_keyword(keyword_text)
        if existing:
            return jsonify({'success': False, 'error': 'Keyword already exists'}), 409
        
        status = data.get('status', KeywordStatus.RESEARCH.value)
        search_volume = data.get('search_volume')
        keyword_difficulty = data.get('keyword_difficulty')
        score = data.get('score')
        metadata = data.get('metadata', {})
        
        # Create and save keyword
        keyword = Keyword(
            keyword=keyword_text,
            status=status,
            search_volume=search_volume,
            keyword_difficulty=keyword_difficulty,
            score=score,
            metadata=metadata
        ).save()
        
        return jsonify({
            'success': True,
            'keyword': keyword.to_dict()
        }), 201
    
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception('Database error creating keyword')
        return jsonify({'success': False, 'error': 'Database error'}), 500
    except Exception as e:
        current_app.logger.exception('Error creating keyword')
        return jsonify({'success': False, 'error': str(e)}), 500

# PUT /api/keywords/{id} - Update keyword
@api_keywords.route('/<keyword_id>', methods=['PUT'])
def update_keyword(keyword_id):
    try:
        keyword = Keyword.get_by_id(keyword_id)
        if not keyword:
            return jsonify({'success': False, 'error': 'Keyword not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON payload required'}), 400
        
        # Update fields
        keyword_text = data.get('keyword')
        if keyword_text and keyword_text.strip() != keyword.keyword:
            # Check if new keyword text already exists
            existing = Keyword.get_by_keyword(keyword_text.strip())
            if existing and existing.id != keyword_id:
                return jsonify({'success': False, 'error': 'Keyword text already exists'}), 409
            
        # Update fields if provided
        update_fields = {}
        for field in ['keyword', 'status', 'search_volume', 'keyword_difficulty', 'score', 'metadata']:
            if field in data:
                update_fields[field] = data[field]
        
        keyword.update(**update_fields)
        
        return jsonify({
            'success': True,
            'keyword': keyword.to_dict()
        }), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception('Database error updating keyword')
        return jsonify({'success': False, 'error': 'Database error'}), 500
    except Exception as e:
        current_app.logger.exception('Error updating keyword')
        return jsonify({'success': False, 'error': str(e)}), 500

# DELETE /api/keywords/{id} - Delete keyword
@api_keywords.route('/<keyword_id>', methods=['DELETE'])
def delete_keyword(keyword_id):
    try:
        keyword = Keyword.get_by_id(keyword_id)
        if not keyword:
            return jsonify({'success': False, 'error': 'Keyword not found'}), 404
        
        keyword.delete()
        return jsonify({'success': True}), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception('Database error deleting keyword')
        return jsonify({'success': False, 'error': 'Database error'}), 500
    except Exception as e:
        current_app.logger.exception('Error deleting keyword')
        return jsonify({'success': False, 'error': str(e)}), 500

# PATCH /api/keywords/{id}/status - Update keyword status
@api_keywords.route('/<keyword_id>/status', methods=['PATCH'])
def update_keyword_status(keyword_id):
    try:
        keyword = Keyword.get_by_id(keyword_id)
        if not keyword:
            return jsonify({'success': False, 'error': 'Keyword not found'}), 404
        
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'success': False, 'error': 'Status is required'}), 400
        
        status = data['status']
        if status not in [s.value for s in KeywordStatus]:
            return jsonify({'success': False, 'error': f'Invalid status: {status}'}), 400
        
        keyword.update(status=status)
        
        return jsonify({
            'success': True,
            'keyword': keyword.to_dict()
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error updating keyword status')
        return jsonify({'success': False, 'error': str(e)}), 500

# 3. Batch operations

# POST /api/keywords/batch/delete - Delete multiple keywords
@api_keywords.route('/batch/delete', methods=['POST'])
def batch_delete_keywords():
    try:
        data = request.get_json()
        if not data or 'ids' not in data or not isinstance(data['ids'], list):
            return jsonify({'success': False, 'error': 'List of keyword IDs is required'}), 400
        
        keyword_ids = data['ids']
        deleted = 0
        errors = []
        
        for keyword_id in keyword_ids:
            keyword = Keyword.get_by_id(keyword_id)
            if keyword:
                try:
                    keyword.delete()
                    deleted += 1
                except Exception as e:
                    errors.append(f"Error deleting keyword {keyword_id}: {str(e)}")
            else:
                errors.append(f"Keyword not found: {keyword_id}")
        
        return jsonify({
            'success': True,
            'deleted': deleted,
            'total': len(keyword_ids),
            'errors': errors
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error batch deleting keywords')
        return jsonify({'success': False, 'error': str(e)}), 500

# PATCH /api/keywords/batch/status - Update status for multiple keywords
@api_keywords.route('/batch/status', methods=['PATCH'])
def batch_update_status():
    try:
        data = request.get_json()
        if not data or 'ids' not in data or not isinstance(data['ids'], list) or 'status' not in data:
            return jsonify({'success': False, 'error': 'List of keyword IDs and status are required'}), 400
        
        keyword_ids = data['ids']
        status = data['status']
        
        if status not in [s.value for s in KeywordStatus]:
            return jsonify({'success': False, 'error': f'Invalid status: {status}'}), 400
        
        updated = 0
        errors = []
        
        for keyword_id in keyword_ids:
            keyword = Keyword.get_by_id(keyword_id)
            if keyword:
                try:
                    keyword.update(status=status)
                    updated += 1
                except Exception as e:
                    errors.append(f"Error updating keyword {keyword_id}: {str(e)}")
            else:
                errors.append(f"Keyword not found: {keyword_id}")
        
        return jsonify({
            'success': True,
            'updated': updated,
            'total': len(keyword_ids),
            'errors': errors
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error batch updating keyword status')
        return jsonify({'success': False, 'error': str(e)}), 500

# 4. Analytics endpoints

# GET /api/keywords/metrics - Get performance metrics
@api_keywords.route('/metrics', methods=['GET'])
def get_keyword_metrics():
    try:
        metrics = Keyword.get_performance_data()
        top_keywords = Keyword.get_top_performing(limit=10)
        
        return jsonify({
            'success': True,
            'metrics': metrics,
            'topKeywords': [k.to_dict() for k in top_keywords]
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error getting keyword metrics')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/keywords/{id}/blogs - Get related blogs for a keyword
@api_keywords.route('/<keyword_id>/blogs', methods=['GET'])
def get_keyword_blogs(keyword_id):
    try:
        keyword = Keyword.get_by_id(keyword_id)
        if not keyword:
            return jsonify({'success': False, 'error': 'Keyword not found'}), 404
        
        blogs = keyword.blog_posts
        
        return jsonify({
            'success': True,
            'keyword': keyword.to_dict(),
            'blogs': [blog.to_dict() for blog in blogs],
            'count': len(blogs)
        }), 200
    
    except Exception as e:
        current_app.logger.exception('Error getting keyword blogs')
        return jsonify({'success': False, 'error': str(e)}), 500

