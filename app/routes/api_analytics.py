from flask import Blueprint, request, jsonify, current_app
from app.models.analytics import WebsiteMetrics, PageAnalytics
from app.models.keyword import Keyword
from app.models.blog import BlogPost
from datetime import datetime, timedelta
from typing import Dict, Any, Union, Optional, Tuple

api_analytics = Blueprint('api_analytics', __name__, url_prefix='/api/analytics')

# Helper function to parse date range parameters
def parse_date_range(start_date: Optional[str] = None, end_date: Optional[str] = None, default_days: int = 30) -> Tuple[datetime.date, datetime.date]:
    """Parse and validate date range parameters"""
    today = datetime.now().date()
    
    try:
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start = today - timedelta(days=default_days)
            
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end = today
            
        # Validate range
        if start > end:
            start, end = end, start
            
        # Limit range to reasonable values
        if (end - start).days > 365:
            start = end - timedelta(days=365)
            
        return start, end
        
    except ValueError:
        # Default to last 30 days on parsing error
        return today - timedelta(days=default_days), today

# Generate sample data if no real metrics exist yet (for demo purposes)
def ensure_sample_data(start_date: datetime.date, end_date: datetime.date) -> None:
    """Generate sample metrics data if none exists for the given date range"""
    metrics_list = WebsiteMetrics.get_date_range(start_date, end_date)
    
    if not metrics_list:
        current_date = start_date
        while current_date <= end_date:
            # Check if metrics already exist for this date
            existing = WebsiteMetrics.get_by_date(current_date)
            if not existing:
                # Generate random metrics for demonstration
                day_factor = (current_date - start_date).days / max(1, (end_date - start_date).days)
                base_impressions = 1000 + day_factor * 5000
                base_clicks = base_impressions * (0.05 + day_factor * 0.1)
                
                impressions = int(base_impressions * (0.8 + 0.4 * ((current_date.weekday() % 7) / 7)))
                clicks = int(base_clicks * (0.8 + 0.4 * ((current_date.weekday() % 7) / 7)))
                visitors = int(clicks * (1.2 + 0.3 * ((current_date.weekday() % 7) / 7)))
                unique_visitors = int(visitors * 0.7)
                
                # Create sample metrics
                WebsiteMetrics(
                    date=current_date,
                    impressions=impressions,
                    clicks=clicks,
                    visitors=visitors,
                    unique_visitors=unique_visitors,
                    bounce_rate=30 + day_factor * 10,
                    avg_session_duration=30 + int(day_factor * 60),
                    unique_keywords=50 + int(day_factor * 100),
                    top_keywords={
                        'sample_keyword_1': {'impressions': int(impressions * 0.2), 'clicks': int(clicks * 0.2)},
                        'sample_keyword_2': {'impressions': int(impressions * 0.15), 'clicks': int(clicks * 0.15)},
                        'sample_keyword_3': {'impressions': int(impressions * 0.1), 'clicks': int(clicks * 0.1)}
                    },
                    top_pages={
                        '/blog/sample-1': {'impressions': int(impressions * 0.25), 'clicks': int(clicks * 0.25)},
                        '/blog/sample-2': {'impressions': int(impressions * 0.2), 'clicks': int(clicks * 0.2)},
                        '/blog/sample-3': {'impressions': int(impressions * 0.15), 'clicks': int(clicks * 0.15)}
                    }
                ).save()
            
            current_date += timedelta(days=1)

# 1. Overview metrics endpoints

# GET /api/analytics/overview - Get main dashboard metrics
@api_analytics.route('/overview', methods=['GET'])
def get_overview():
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
        elif period == 'year':
            default_days = 365
        
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data for demo purposes
        ensure_sample_data(start, end)
        
        # Get aggregated metrics
        metrics = WebsiteMetrics.get_aggregate_metrics(start, end)
        
        # Get trend data
        trends = WebsiteMetrics.calculate_trends(start, end)
        
        # Combine metrics and trends
        result = {**metrics, **trends}
        
        # Add date range info
        result['date_range'] = {
            'start': start.isoformat(),
            'end': end.isoformat(),
            'period': period
        }
        
        return jsonify({
            'success': True,
            'metrics': result
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting analytics overview')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/analytics/trends - Get metric trends
@api_analytics.route('/trends', methods=['GET'])
def get_trends():
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data for demo purposes
        ensure_sample_data(start, end)
        
        # Get trends compared to previous period
        trends = WebsiteMetrics.calculate_trends(start, end)
        
        return jsonify({
            'success': True,
            'trends': trends,
            'period': period
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting analytics trends')
        return jsonify({'success': False, 'error': str(e)}), 500

# 2. Time series data endpoints

# GET /api/analytics/impressions - Get impression data over time
@api_analytics.route('/impressions', methods=['GET'])
def get_impressions():
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data for demo purposes
        ensure_sample_data(start, end)
        
        # Get time series data
        time_series = WebsiteMetrics.get_time_series_data(start, end)
        
        return jsonify({
            'success': True,
            'impressions': {
                'labels': time_series['labels'],
                'data': time_series['impressions']
            },
            'date_range': {
                'start': start.isoformat(),
                'end': end.isoformat(),
                'period': period
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting impression data')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/analytics/clicks - Get click data over time
@api_analytics.route('/clicks', methods=['GET'])
def get_clicks():
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data for demo purposes
        ensure_sample_data(start, end)
        
        # Get time series data
        time_series = WebsiteMetrics.get_time_series_data(start, end)
        
        return jsonify({
            'success': True,
            'clicks': {
                'labels': time_series['labels'],
                'data': time_series['clicks']
            },
            'date_range': {
                'start': start.isoformat(),
                'end': end.isoformat(),
                'period': period
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting click data')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/analytics/visitors - Get visitor data over time
@api_analytics.route('/visitors', methods=['GET'])
def get_visitors():
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data for demo purposes
        ensure_sample_data(start, end)
        
        # Get time series data
        time_series = WebsiteMetrics.get_time_series_data(start, end)
        
        return jsonify({
            'success': True,
            'visitors': {
                'labels': time_series['labels'],
                'data': time_series['visitors']
            },
            'date_range': {
                'start': start.isoformat(),
                'end': end.isoformat(),
                'period': period
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting visitor data')
        return jsonify({'success': False, 'error': str(e)}), 500

# 3. Performance data endpoints

# GET /api/analytics/top-keywords - Get top performing keywords
@api_analytics.route('/top-keywords', methods=['GET'])
def get_top_keywords():
    try:
        # Parse parameters
        limit = request.args.get('limit', 10, type=int)
        metric = request.args.get('metric', 'clicks')  # clicks, impressions, ctr, position
        
        # Validate parameters
        if limit < 1:
            limit = 10
        if limit > 100:
            limit = 100
            
        valid_metrics = ['clicks', 'impressions', 'ctr', 'position']
        if metric not in valid_metrics:
            metric = 'clicks'
        
        # For demo purposes, we'll get keywords from the Keyword model
        # In a production system, you might use real analytics data
        
        # Get top keywords based on the requested metric
        if metric == 'position':
            # For position, lower is better
            keywords = Keyword.query.order_by(Keyword.position.asc().nullslast()).limit(limit).all()
        elif metric == 'ctr':
            keywords = Keyword.query.order_by(Keyword.ctr.desc().nullslast()).limit(limit).all()
        elif metric == 'impressions':
            keywords = Keyword.query.order_by(Keyword.impressions.desc().nullslast()).limit(limit).all()
        else:  # clicks
            keywords = Keyword.query.order_by(Keyword.clicks.desc().nullslast()).limit(limit).all()
        
        # If no keywords in database yet, return sample data
        if not keywords:
            sample_keywords = []
            for i in range(1, limit + 1):
                position_value = i * 0.5
                impressions_value = 1000 - (i * 50)
                clicks_value = impressions_value * (0.2 - (i * 0.01))
                ctr_value = (clicks_value / impressions_value) * 100 if impressions_value > 0 else 0
                
                sample_keywords.append({
                    'id': f'sample-{i}',
                    'keyword': f'sample keyword {i}',
                    'position': position_value,
                    'positionChange': round((0.5 - (i * 0.1)) * 1.5, 1),
                    'impressions': impressions_value,
                    'clicks': clicks_value,
                    'ctr': ctr_value
                })
            
            return jsonify({
                'success': True,
                'keywords': sample_keywords,
                'count': len(sample_keywords),
                'metric': metric
            }), 200
        
        return jsonify({
            'success': True,
            'keywords': [k.to_dict() for k in keywords],
            'count': len(keywords),
            'metric': metric
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting top keywords')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/analytics/top-pages - Get top performing pages
@api_analytics.route('/top-pages', methods=['GET'])
def get_top_pages():
    try:
        # Parse parameters
        limit = request.args.get('limit', 10, type=int)
        metric = request.args.get('metric', 'clicks')  # clicks, impressions, ctr
        
        # Validate parameters
        if limit < 1:
            limit = 10
        if limit > 100:
            limit = 100
            
        valid_metrics = ['clicks', 'impressions', 'ctr']
        if metric not in valid_metrics:
            metric = 'clicks'
        
        # In a real application, we would query the PageAnalytics model
        # For demo purposes, let's use BlogPost data or create sample data
        
        # Try to get real blog posts from the database
        blog_posts = BlogPost.get_all()
        
        # If there are no blog posts yet, generate sample data
        if not blog_posts:
            sample_pages = []
            for i in range(1, limit + 1):
                impressions_value = 2000 - (i * 100)
                clicks_value = impressions_value * (0.15 - (i * 0.005))
                ctr_value = (clicks_value / impressions_value) * 100 if impressions_value > 0 else 0
                
                sample_pages.append({
                    'id': f'blog-{i}',
                    'title': f'Sample Blog Post {i}',
                    'path': f'/blog/sample-{i}',
                    'url': f'https://example.com/blog/sample-{i}',
                    'impressions': impressions_value,
                    'clicks': clicks_value,
                    'ctr': ctr_value,
                    'pageViews': clicks_value * 1.5,
                    'uniquePageViews': clicks_value * 1.2,
                    'bounceRate': 65 - (i * 2.5),
                    'exitRate': 55 - (i * 2),
                    'avgTimeOnPage': 120 - (i * 5)
                })
                
            return jsonify({
                'success': True,
                'pages': sample_pages,
                'count': len(sample_pages),
                'metric': metric
            }), 200
        
        # If we have blog posts, convert them to page analytics format with sample metrics
        pages = []
        for i, blog in enumerate(blog_posts[:limit]):
            # Generate realistic sample metrics based on blog post properties
            factor = 1.0 - (i / max(1, len(blog_posts)))
            impressions_value = int(1500 * factor) + 500
            clicks_value = int(impressions_value * (0.12 * factor + 0.05))
            
            pages.append({
                'id': blog.id,
                'title': blog.title,
                'path': f'/blog/{blog.id}',
                'url': f'https://example.com/blog/{blog.id}',
                'blogId': blog.id,
                'impressions': impressions_value,
                'clicks': clicks_value,
                'ctr': (clicks_value / impressions_value) * 100 if impressions_value > 0 else 0,
                'pageViews': clicks_value * 1.5,
                'uniquePageViews': clicks_value * 1.2,
                'bounceRate': 65 - (i * 2.5),
                'exitRate': 55 - (i * 2),
                'avgTimeOnPage': 120 - (i * 5)
            })
        
        # Sort pages based on the requested metric
        if metric == 'ctr':
            pages.sort(key=lambda p: p['ctr'], reverse=True)
        elif metric == 'impressions':
            pages.sort(key=lambda p: p['impressions'], reverse=True)
        else:  # clicks
            pages.sort(key=lambda p: p['clicks'], reverse=True)
        
        return jsonify({
            'success': True,
            'pages': pages,
            'count': len(pages),
            'metric': metric
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error getting top pages')
        return jsonify({'success': False, 'error': str(e)}), 500

# GET /api/analytics/page/{id} - Get single page analytics
@api_analytics.route('/page/<page_id>', methods=['GET'])
def get_page_analytics(page_id):
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # First, try to get a blog post with this ID
        blog_post = BlogPost.get_by_id(page_id)
        
        # If blog post exists, generate sample analytics data for it
        if blog_post:
            # Generate time series data for the page
            labels = []
            page_views = []
            unique_page_views = []
            impressions = []
            clicks = []
            
            # Generate data points for each day in the range
            current_date = start
            day_count = (end - start).days + 1
            base_impressions = 1000
            base_views = 800
            
            while current_date <= end:
                # Generate with some randomness and weekly patterns
                day_factor = (current_date - start).days / max(1, day_count - 1)
                day_of_week_factor = 1.0 - 0.3 * (current_date.weekday() >= 5)  # Weekend drop
                
                daily_impressions = int(base_impressions * (0.8 + 0.4 * day_factor) * day_of_week_factor)
                daily_clicks = int(daily_impressions * (0.1 + 0.05 * day_factor))
                daily_views = int(base_views * (0.8 + 0.4 * day_factor) * day_of_week_factor)
                daily_unique_views = int(daily_views * 0.7)
                
                labels.append(current_date.isoformat())
                impressions.append(daily_impressions)
                clicks.append(daily_clicks)
                page_views.append(daily_views)
                unique_page_views.append(daily_unique_views)
                
                current_date += timedelta(days=1)
            
            # Calculate summary metrics
            total_impressions = sum(impressions)
            total_clicks = sum(clicks)
            total_views = sum(page_views)
            avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
            avg_time_on_page = 120  # seconds
            
            # Create sample keyword metrics
            keywords = []
            for i in range(1, 6):
                kw_impressions = int(total_impressions * (0.2 - (i * 0.03)))
                kw_clicks = int(kw_impressions * (0.15 - (i * 0.02)))
                keywords.append({
                    "keyword": f"sample keyword {i}",
                    "impressions": kw_impressions,
                    "clicks": kw_clicks,
                    "ctr": (kw_clicks / kw_impressions * 100) if kw_impressions > 0 else 0,
                    "position": i * 0.7
                })
            
            result = {
                "id": blog_post.id,
                "title": blog_post.title,
                "path": f"/blog/{blog_post.id}",
                "url": f"https://example.com/blog/{blog_post.id}",
                "summary": {
                    "impressions": total_impressions,
                    "clicks": total_clicks,
                    "ctr": avg_ctr,
                    "pageViews": total_views,
                    "uniquePageViews": sum(unique_page_views),
                    "avgTimeOnPage": avg_time_on_page,
                    "bounceRate": 45.5,
                    "exitRate": 35.2
                },
                "timeSeries": {
                    "labels": labels,
                    "impressions": impressions,
                    "clicks": clicks,
                    "pageViews": page_views,
                    "uniquePageViews": unique_page_views
                },
                "keywords": keywords
            }
            
            return jsonify({
                'success': True,
                'page': result,
                'dateRange': {
                    'start': start.isoformat(),
                    'end': end.isoformat(),
                    'period': period
                }
            }), 200
        
        # If not found, return 404
        return jsonify({'success': False, 'error': 'Page not found'}), 404
        
    except Exception as e:
        current_app.logger.exception('Error getting page analytics')
        return jsonify({'success': False, 'error': str(e)}), 500

# Add combined analytics endpoint for dashboard
@api_analytics.route('/dashboard', methods=['GET'])
def get_analytics_dashboard():
    """Get all analytics data needed for the dashboard in a single request"""
    try:
        # Parse date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        period = request.args.get('period', 'month')
        
        # Set default range based on period
        default_days = 30
        if period == 'week':
            default_days = 7
        elif period == 'quarter':
            default_days = 90
            
        start, end = parse_date_range(start_date, end_date, default_days)
        
        # Ensure we have sample data
        ensure_sample_data(start, end)
        
        # Get all the data for the dashboard
        metrics = WebsiteMetrics.get_aggregate_metrics(start, end)
        trends = WebsiteMetrics.calculate_trends(start, end)
        time_series = WebsiteMetrics.get_time_series_data(start, end)
        
        # Get top keywords
        keyword_metric = request.args.get('keywordMetric', 'clicks')
        keywords = Keyword.get_top_performing(limit=10)
        
        # If no keywords yet, generate sample data
        if not keywords:
            sample_keywords = []
            for i in range(1, 11):
                position_value = i * 0.5
                impressions_value = 1000 - (i * 50)
                clicks_value = impressions_value * (0.2 - (i * 0.01))
                ctr_value = (clicks_value / impressions_value) * 100 if impressions_value > 0 else 0
                
                sample_keywords.append({
                    'id': f'sample-{i}',
                    'keyword': f'sample keyword {i}',
                    'position': position_value,
                    'positionChange': round((0.5 - (i * 0.1)) * 1.5, 1),
                    'impressions': impressions_value,
                    'clicks': clicks_value,
                    'ctr': ctr_value
                })
            top_keywords = sample_keywords
        else:
            top_keywords = [k.to_dict() for k in keywords]
        
        # Get top pages
        page_metric = request.args.get('pageMetric', 'clicks')
        blog_posts = BlogPost.get_all()
        
        # Generate sample page data
        pages = []
        if not blog_posts:
            for i in range(1, 11):
                impressions_value = 2000 - (i * 100)
                clicks_value = impressions_value * (0.15 - (i * 0.005))
                ctr_value = (clicks_value / impressions_value) * 100 if impressions_value > 0 else 0
                
                pages.append({
                    'id': f'blog-{i}',
                    'title': f'Sample Blog Post {i}',
                    'path': f'/blog/sample-{i}',
                    'url': f'https://example.com/blog/sample-{i}',
                    'impressions': impressions_value,
                    'clicks': clicks_value,
                    'ctr': ctr_value
                })
        else:
            for i, blog in enumerate(blog_posts[:10]):
                factor = 1.0 - (i / max(1, len(blog_posts)))
                impressions_value = int(1500 * factor) + 500
                clicks_value = int(impressions_value * (0.12 * factor + 0.05))
                
                pages.append({
                    'id': blog.id,
                    'title': blog.title,
                    'path': f'/blog/{blog.id}',
                    'url': f'https://example.com/blog/{blog.id}',
                    
