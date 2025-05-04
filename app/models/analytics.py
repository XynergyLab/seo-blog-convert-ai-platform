import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from sqlalchemy import String, Integer, Float, DateTime, Date, ForeignKey, func, desc, asc, select, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.extensions import db
from app.database import Base, MutableJSONDict
import json

class WebsiteMetrics(Base):
    """Model for tracking overall website metrics by date"""
    
    __tablename__ = 'website_metrics'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    visitors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_visitors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bounce_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_session_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # in seconds
    unique_keywords: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    top_keywords: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    top_pages: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    
    def __init__(
        self,
        date: Union[datetime.date, str],
        impressions: int = 0,
        clicks: int = 0,
        visitors: int = 0,
        unique_visitors: int = 0,
        bounce_rate: float = 0.0,
        avg_session_duration: int = 0,
        unique_keywords: int = 0,
        top_keywords: Optional[Dict[str, Any]] = None,
        top_pages: Optional[Dict[str, Any]] = None,
        metrics_id: Optional[str] = None
    ):
        """
        Initialize website metrics for a specific date.
        
        Args:
            date: The date for these metrics
            impressions: Total impressions
            clicks: Total clicks
            visitors: Total visitors (sessions)
            unique_visitors: Unique visitors
            bounce_rate: Bounce rate percentage
            avg_session_duration: Average session duration in seconds
            unique_keywords: Number of unique keywords driving traffic
            top_keywords: Dictionary of top performing keywords and their metrics
            top_pages: Dictionary of top performing pages and their metrics
            metrics_id: Unique identifier (generated if not provided)
        """
        self.id = metrics_id or str(uuid.uuid4())
        
        # Handle date string conversion if needed
        if isinstance(date, str):
            self.date = datetime.strptime(date, '%Y-%m-%d').date()
        else:
            self.date = date
            
        self.impressions = impressions
        self.clicks = clicks
        self.visitors = visitors
        self.unique_visitors = unique_visitors
        self.bounce_rate = bounce_rate
        self.avg_session_duration = avg_session_duration
        self.unique_keywords = unique_keywords
        self.top_keywords = top_keywords or {}
        self.top_pages = top_pages or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary for serialization"""
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'impressions': self.impressions,
            'clicks': self.clicks,
            'visitors': self.visitors,
            'unique_visitors': self.unique_visitors,
            'bounce_rate': self.bounce_rate,
            'avg_session_duration': self.avg_session_duration,
            'unique_keywords': self.unique_keywords,
            'top_keywords': self.top_keywords,
            'top_pages': self.top_pages,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def calculate_ctr(self) -> float:
        """Calculate CTR from impressions and clicks"""
        if self.impressions == 0:
            return 0.0
        return (self.clicks / self.impressions) * 100
    
    def save(self) -> 'WebsiteMetrics':
        """Save metrics to the database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def update(self, **kwargs) -> 'WebsiteMetrics':
        """Update metrics fields"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        db.session.commit()
        return self
    
    @classmethod
    def get_by_id(cls, metrics_id: str) -> Optional['WebsiteMetrics']:
        """Get metrics by ID"""
        return db.session.get(cls, metrics_id)
    
    @classmethod
    def get_by_date(cls, date: Union[datetime.date, str]) -> Optional['WebsiteMetrics']:
        """Get metrics for a specific date"""
        if isinstance(date, str):
            date = datetime.strptime(date, '%Y-%m-%d').date()
        
        return db.session.query(cls).filter(cls.date == date).first()
    
    @classmethod
    def get_date_range(cls, start_date: Union[datetime.date, str], end_date: Union[datetime.date, str]) -> List['WebsiteMetrics']:
        """Get metrics for a date range"""
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        return db.session.query(cls).filter(
            cls.date >= start_date,
            cls.date <= end_date
        ).order_by(cls.date).all()
    
    @classmethod
    def get_aggregate_metrics(cls, start_date: Union[datetime.date, str], end_date: Union[datetime.date, str]) -> Dict[str, Any]:
        """Get aggregated metrics for a date range"""
        metrics_list = cls.get_date_range(start_date, end_date)
        
        if not metrics_list:
            return {
                'impressions': 0,
                'clicks': 0,
                'visitors': 0,
                'unique_visitors': 0,
                'unique_keywords': 0,
                'avg_bounce_rate': 0.0,
                'avg_session_duration': 0,
                'ctr': 0.0,
                'date_range': {
                    'start': start_date.isoformat() if isinstance(start_date, datetime.date) else start_date,
                    'end': end_date.isoformat() if isinstance(end_date, datetime.date) else end_date
                }
            }
        
        total_impressions = sum(m.impressions for m in metrics_list)
        total_clicks = sum(m.clicks for m in metrics_list)
        total_visitors = sum(m.visitors for m in metrics_list)
        
        # Calculate weighted averages
        weighted_bounce = sum(m.bounce_rate * m.visitors for m in metrics_list if m.visitors > 0)
        weighted_duration = sum(m.avg_session_duration * m.visitors for m in metrics_list if m.visitors > 0)
        
        avg_bounce_rate = weighted_bounce / total_visitors if total_visitors > 0 else 0
        avg_session_duration = weighted_duration / total_visitors if total_visitors > 0 else 0
        
        # Approximate unique visitors over the range
        # This is a simplification; in a real system you'd use a more sophisticated approach
        unique_visitors = max(m.unique_visitors for m in metrics_list) if metrics_list else 0
        
        # Get unique keywords count from the most recent data point
        unique_keywords = max(m.unique_keywords for m in metrics_list) if metrics_list else 0
        
        # Calculate overall CTR
        ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        
        return {
            'impressions': total_impressions,
            'clicks': total_clicks,
            'visitors': total_visitors,
            'unique_visitors': unique_visitors,
            'unique_keywords': unique_keywords,
            'avg_bounce_rate': avg_bounce_rate,
            'avg_session_duration': avg_session_duration,
            'ctr': ctr,
            'date_range': {
                'start': start_date.isoformat() if isinstance(start_date, datetime.date) else start_date,
                'end': end_date.isoformat() if isinstance(end_date, datetime.date) else end_date
            }
        }
    
    @classmethod
    def get_time_series_data(cls, start_date: Union[datetime.date, str], end_date: Union[datetime.date, str]) -> Dict[str, List]:
        """Get time series data for charts"""
        metrics_list = cls.get_date_range(start_date, end_date)
        
        labels = []
        impressions = []
        clicks = []
        visitors = []
        
        for metrics in metrics_list:
            labels.append(metrics.date.isoformat())
            impressions.append(metrics.impressions)
            clicks.append(metrics.clicks)
            visitors.append(metrics.visitors)
        
        return {
            'labels': labels,
            'impressions': impressions,
            'clicks': clicks,
            'visitors': visitors
        }
    
    @classmethod
    def calculate_trends(cls, current_period_start: Union[datetime.date, str], current_period_end: Union[datetime.date, str]) -> Dict[str, float]:
        """Calculate trends compared to previous period of same length"""
        if isinstance(current_period_start, str):
            current_period_start = datetime.strptime(current_period_start, '%Y-%m-%d').date()
        if isinstance(current_period_end, str):
            current_period_end = datetime.strptime(current_period_end, '%Y-%m-%d').date()
        
        # Calculate previous period
        period_length = (current_period_end - current_period_start).days + 1
        previous_period_end = current_period_start - timedelta(days=1)
        previous_period_start = previous_period_end - timedelta(days=period_length-1)
        
        # Get metrics for both periods
        current_metrics = cls.get_aggregate_metrics(current_period_start, current_period_end)
        previous_metrics = cls.get_aggregate_metrics(previous_period_start, previous_period_end)
        
        # Calculate percentage changes
        def calc_percent_change(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return ((current - previous) / previous) * 100
        
        return {
            'impressions_trend': calc_percent_change(current_metrics['impressions'], previous_metrics['impressions']),
            'clicks_trend': calc_percent_change(current_metrics['clicks'], previous_metrics['clicks']),
            'visitors_trend': calc_percent_change(current_metrics['visitors'], previous_metrics['visitors']),
            'ctr_trend': calc_percent_change(current_metrics['ctr'], previous_metrics['ctr']),
            'bounce_rate_trend': calc_percent_change(current_metrics['avg_bounce_rate'], previous_metrics['avg_bounce_rate']) * -1,  # Lower is better
            'previous_period': {
                'start': previous_period_start.isoformat(),
                'end': previous_period_end.isoformat()
            }
        }


class PageAnalytics(Base):
    """Model for tracking analytics for individual pages"""
    
    __tablename__ = 'page_analytics'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # Can be blog post ID or null for non-blog pages
    path: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    page_views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_page_views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_time_on_page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # in seconds
    entrances: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    exits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bounce_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    exit_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    position: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    keywords: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)  # Keywords driving traffic to this page
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    
    def __init__(
        self,
        path: str,
        title: str,
        date: Union[datetime.date, str],
        page_id: Optional[str] = None,
        page_views: int = 0,
        unique_page_views: int = 0,
        avg_time_on_page: int = 0,
        entrances: int = 0,
        exits: int = 0,
        bounce_rate: float = 0.0,
        exit_rate: float = 0.0,
        impressions: int = 0,
        clicks: int = 0,
        position: Optional[float] = None,
        keywords: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize page analytics for a specific page and date.
        
        Args:
            path: URL path of the page
            title: Page title
            date: Date for these analytics
            page_id: Associated page or post ID (if applicable)
            page_views: Total page views
            unique_page_views: Unique page views
            avg_time_on_page: Average time spent on page in seconds
            entrances: Number of times this page was an entrance point
            exits: Number of times this page was an exit point
            bounce_rate: Bounce rate percentage for this page
            exit_rate: Exit rate percentage for this page
            impressions: Search impressions for this page
            clicks: Search clicks for this page
            position: Average search position
            keywords: Dictionary of keywords driving traffic to this page
        """
        self.id = str(uuid.uuid4())
        self.path = path
        self.title = title
        
        # Handle date string conversion if needed
        if isinstance(date, str):
            self.date = datetime.strptime(date, '%Y-%m-%d').date()
        else:
            self.date = date
            
        self.page_id = page_id
        self.page_views = page_views
        self.unique_page_views = unique_page_views
        self.avg_time_on_page = avg_time_on_page
        self.entrances = entrances
        self.exits = exits
        self.bounce_rate = bounce_rate
        self.exit_rate = exit_rate
        self.impressions = impressions
        self.clicks = clicks
        self.position = position
        self.keywords = keywords or {}

