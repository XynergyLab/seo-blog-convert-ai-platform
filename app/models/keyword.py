import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.extensions import db
from app.database import Base, MutableJSONDict

# Association table for the many-to-many relationship between keywords and blog posts
keyword_blog_association = Table(
    'keyword_blog_association',
    Base.metadata,
    Column('keyword_id', String(36), ForeignKey('keywords.id', ondelete='CASCADE'), primary_key=True),
    Column('blog_post_id', String(36), ForeignKey('blog_posts.id', ondelete='CASCADE'), primary_key=True)
)

class KeywordStatus(str, Enum):
    """Status values for keywords"""
    ACTIVE = "active"
    RESEARCH = "research"
    TARGET = "target"
    OPTIMIZED = "optimized"
    INACTIVE = "inactive"

class Keyword(Base):
    """Model for keywords with metrics and relationships to blog posts"""
    
    __tablename__ = 'keywords'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    keyword: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=KeywordStatus.RESEARCH.value)
    search_volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    keyword_difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    
    # Analytics metrics
    impressions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    clicks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    ctr: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    position: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    position_change: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    
    # Additional metadata
    keyword_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    
    # Relationships
    blog_posts = relationship(
        "BlogPost",
        secondary=keyword_blog_association,
        backref="keywords_list"  # This creates a back-reference on BlogPost
    )
    
    def __init__(
        self,
        keyword: str,
        status: str = KeywordStatus.RESEARCH.value,
        search_volume: Optional[int] = None,
        keyword_difficulty: Optional[int] = None,
        score: Optional[int] = None,
        keyword_id: Optional[str] = None,
        keyword_metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a new keyword.
        
        Args:
            keyword: The keyword text
            status: Status of the keyword (research, active, etc.)
            search_volume: Monthly search volume if known
            keyword_difficulty: Difficulty score (0-100)
            score: Importance or priority score (0-10)
            keyword_id: Unique identifier (generated if not provided)
            metadata: Additional metadata about the keyword
        """
        self.id = keyword_id or str(uuid.uuid4())
        self.keyword = keyword
        self.status = status
        self.search_volume = search_volume
        self.keyword_difficulty = keyword_difficulty
        self.score = score
        self.keyword_metadata = keyword_metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert keyword to dictionary for serialization"""
        return {
            'id': self.id,
            'keyword': self.keyword,
            'status': self.status,
            'search_volume': self.search_volume,
            'keyword_difficulty': self.keyword_difficulty,
            'score': self.score,
            'impressions': self.impressions,
            'clicks': self.clicks,
            'ctr': self.ctr,
            'position': self.position,
            'position_change': self.position_change,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.keyword_metadata,
            'blogsCount': len(self.blog_posts)
        }
    
    def save(self) -> 'Keyword':
        """Save the keyword to the database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def update(self, **kwargs) -> 'Keyword':
        """Update keyword fields"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        db.session.commit()
        return self
    
    def delete(self) -> bool:
        """Delete the keyword from the database"""
        db.session.delete(self)
        db.session.commit()
        return True
    
    def add_blog_post(self, blog_post) -> 'Keyword':
        """Add a blog post to this keyword"""
        if blog_post not in self.blog_posts:
            self.blog_posts.append(blog_post)
            db.session.commit()
        return self
    
    def remove_blog_post(self, blog_post) -> 'Keyword':
        """Remove a blog post from this keyword"""
        if blog_post in self.blog_posts:
            self.blog_posts.remove(blog_post)
            db.session.commit()
        return self
    
    def calculate_ctr(self) -> float:
        """Calculate CTR based on impressions and clicks"""
        if not self.impressions or self.impressions == 0:
            return 0.0
        ctr = (self.clicks or 0) / self.impressions * 100
        self.ctr = round(ctr, 2)
        return self.ctr
    
    def update_metrics(self, impressions: int, clicks: int, position: float = None) -> 'Keyword':
        """Update all metrics at once"""
        old_position = self.position
        
        self.impressions = impressions
        self.clicks = clicks
        if position is not None:
            self.position = position
            if old_position is not None:
                self.position_change = old_position - position  # Positive = improved, Negative = dropped
            
        self.calculate_ctr()
        db.session.commit()
        return self
    
    @classmethod
    def get_by_id(cls, keyword_id: str) -> Optional['Keyword']:
        """Get a keyword by ID"""
        return db.session.get(cls, keyword_id)
    
    @classmethod
    def get_by_keyword(cls, keyword_text: str) -> Optional['Keyword']:
        """Get a keyword by its text"""
        return db.session.query(cls).filter(cls.keyword == keyword_text).first()
    
    @classmethod
    def get_all(cls) -> List['Keyword']:
        """Get all keywords"""
        return db.session.query(cls).all()
    
    @classmethod
    def get_by_status(cls, status: str) -> List['Keyword']:
        """Get keywords by status"""
        return db.session.query(cls).filter_by(status=status).all()
    
    @classmethod
    def get_top_performing(cls, limit: int = 10) -> List['Keyword']:
        """Get top performing keywords by clicks"""
        return db.session.query(cls).order_by(cls.clicks.desc()).limit(limit).all()
    
    @classmethod
    def search(cls, query: str) -> List['Keyword']:
        """Search keywords containing the query string"""
        search_pattern = f"%{query}%"
        return db.session.query(cls).filter(cls.keyword.ilike(search_pattern)).all()
    
    @classmethod
    def get_performance_data(cls) -> Dict[str, Any]:
        """Get aggregated performance data for analytics"""
        keywords = cls.get_all()
        total_impressions = sum(k.impressions or 0 for k in keywords)
        total_clicks = sum(k.clicks or 0 for k in keywords)
        
        avg_ctr = 0
        if total_impressions > 0:
            avg_ctr = (total_clicks / total_impressions) * 100
            
        return {
            'total_keywords': len(keywords),
            'total_impressions': total_impressions,
            'total_clicks': total_clicks,
            'average_ctr': round(avg_ctr, 2),
            'keywords_by_status': {
                status.value: len([k for k in keywords if k.status == status.value])
                for status in KeywordStatus
            }
        }

