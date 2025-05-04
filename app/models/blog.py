import uuid
import json
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.associationproxy import association_proxy
from app.extensions import db
from app.database import Base, MutableJSONDict, MutableJSONList

class ContentStatus(str, Enum):
    """Status values for blog post drafts and versions"""
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class BlogPostSection(Base):
    """Model for storing individual blog post sections"""
    
    __tablename__ = 'blog_post_sections'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey('blog_posts.id', ondelete='CASCADE'))
    order: Mapped[int] = mapped_column(db.Integer, nullable=False)
    section_type: Mapped[str] = mapped_column(String(50), nullable=False, default="content")  # header, subheader, content, list, quote, etc.
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    section_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    
    # Relationship with blog post
    post = relationship("BlogPost", back_populates="sections")
    
    def __init__(
        self,
        post_id: str,
        order: int,
        content: str,
        section_type: str = "content",
        title: Optional[str] = None,
        section_metadata: Optional[Dict[str, Any]] = None,
        section_id: Optional[str] = None
    ):
        self.id = section_id or str(uuid.uuid4())
        self.post_id = post_id
        self.order = order
        self.section_type = section_type
        self.title = title
        self.content = content
        self.section_metadata = section_metadata or {}
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert section to dictionary for serialization"""
        return {
            'id': self.id,
            'post_id': self.post_id,
            'order': self.order,
            'section_type': self.section_type,
            'title': self.title,
            'content': self.content,
            'section_metadata': self.section_metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BlogPostVersion(Base):
    """Model for storing blog post versions"""
    
    __tablename__ = 'blog_post_versions'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey('blog_posts.id', ondelete='CASCADE'))
    version_number: Mapped[int] = mapped_column(db.Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ContentStatus.DRAFT.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    version_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    
    # Relationship with blog post
    post = relationship("BlogPost", back_populates="versions")
    
    def __init__(
        self,
        post_id: str,
        version_number: int,
        title: str,
        content: str,
        status: str = ContentStatus.DRAFT.value,
        version_metadata: Optional[Dict[str, Any]] = None,
        version_id: Optional[str] = None
    ):
        self.id = version_id or str(uuid.uuid4())
        self.post_id = post_id
        self.version_number = version_number
        self.title = title
        self.content = content
        self.status = status
        self.version_metadata = version_metadata or {}
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert version to dictionary for serialization"""
        return {
            'id': self.id,
            'post_id': self.post_id,
            'version_number': self.version_number,
            'title': self.title,
            'content': self.content,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'version_metadata': self.version_metadata
        }


class BlogPostSEOData(Base):
    """Model for storing blog post SEO data"""
    
    __tablename__ = 'blog_post_seo_data'
    
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey('blog_posts.id', ondelete='CASCADE'), primary_key=True)
    meta_title: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    meta_description: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    focus_keyword: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    secondary_keywords: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    seo_score: Mapped[Optional[int]] = mapped_column(db.Integer, nullable=True)
    readability_score: Mapped[Optional[int]] = mapped_column(db.Integer, nullable=True)
    analysis_data: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    
    # Relationship with blog post
    post = relationship("BlogPost", back_populates="seo_data", uselist=False)
    
    def __init__(
        self,
        post_id: str,
        meta_title: Optional[str] = None,
        meta_description: Optional[str] = None,
        focus_keyword: Optional[str] = None,
        secondary_keywords: Optional[str] = None,
        slug: Optional[str] = None,
        seo_score: Optional[int] = None,
        readability_score: Optional[int] = None,
        analysis_data: Optional[Dict[str, Any]] = None
    ):
        self.post_id = post_id
        self.meta_title = meta_title
        self.meta_description = meta_description
        self.focus_keyword = focus_keyword
        self.secondary_keywords = secondary_keywords
        self.slug = slug
        self.seo_score = seo_score
        self.readability_score = readability_score
        self.analysis_data = analysis_data or {}
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert SEO data to dictionary for serialization"""
        return {
            'post_id': self.post_id,
            'meta_title': self.meta_title,
            'meta_description': self.meta_description,
            'focus_keyword': self.focus_keyword,
            'secondary_keywords': self.secondary_keywords,
            'slug': self.slug,
            'seo_score': self.seo_score,
            'readability_score': self.readability_score,
            'analysis_data': self.analysis_data,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BlogPost(Base):
    """Model for blog posts with CRUD operations"""
    
    """Blog post model for storing generated blog content"""
    
    __tablename__ = 'blog_posts'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    keywords: Mapped[str] = mapped_column(String(255), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.now)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    generation_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    
    # New fields
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ContentStatus.DRAFT.value)
    current_version: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    has_outline: Mapped[bool] = mapped_column(Boolean, default=False)
    outline_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_audience: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_purpose: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    quality_score: Mapped[Optional[int]] = mapped_column(db.Integer, nullable=True)
    last_autosave: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    schedules = relationship("ScheduledItem", back_populates="blog_post", cascade="all, delete-orphan")
    sections = relationship("BlogPostSection", back_populates="post", cascade="all, delete-orphan", order_by="BlogPostSection.order")
    versions = relationship("BlogPostVersion", back_populates="post", cascade="all, delete-orphan", order_by="BlogPostVersion.version_number")
    seo_data = relationship("BlogPostSEOData", back_populates="post", cascade="all, delete-orphan", uselist=False)
    
    def __init__(
        self, 
        title: str, 
        content: str, 
        topic: str,
        keywords: Optional[str] = None,
        post_id: Optional[str] = None,
        published: bool = False,
        created_at: Optional[datetime] = None,
        published_at: Optional[datetime] = None,
        generation_metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a new blog post.
        
        Args:
            title: The blog post title
            content: The blog post content
            topic: The main topic of the blog
            keywords: Comma-separated keywords used for the post
            post_id: Unique identifier (generated if not provided)
            published: Whether the post is published
            created_at: Creation timestamp (defaults to now)
            published_at: Publishing timestamp
            generation_metadata: Additional metadata about the post generation
        """
        self.id = post_id or str(uuid.uuid4())
        self.title = title
        self.content = content
        self.topic = topic
        self.keywords = keywords or ""
        self.published = published
        if created_at:
            self.created_at = created_at
        self.published_at = published_at
        self.generation_metadata = generation_metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert blog post to dictionary for serialization"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'topic': self.topic,
            'keywords': self.keywords,
            'published': self.published,
            'created_at': self.created_at.isoformat(),
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'metadata': self.generation_metadata
        }
    
    def save(self) -> 'BlogPost':
        """Save the blog post to the database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def update(self, **kwargs) -> 'BlogPost':
        """Update blog post fields"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        if 'published' in kwargs and kwargs['published'] and not self.published_at:
            self.published_at = datetime.now()
        
        db.session.commit()
        return self
    
    def delete(self) -> bool:
        """Delete the blog post from the database"""
        db.session.delete(self)
        db.session.commit()
        return True
    
    def publish(self) -> 'BlogPost':
        """Mark the blog post as published"""
        self.published = True
        self.published_at = datetime.now()
        db.session.commit()
        return self
    
    @classmethod
    def get_by_id(cls, post_id: str) -> Optional['BlogPost']:
        """Get a blog post by ID"""
        return db.session.get(cls, post_id)
    
    @classmethod
    def get_all(cls) -> List['BlogPost']:
        """Get all blog posts"""
        return db.session.query(cls).all()
    
    @classmethod
    def get_published(cls) -> List['BlogPost']:
        """Get all published blog posts"""
        return db.session.query(cls).filter_by(published=True).all()
    
    @classmethod
    def get_drafts(cls) -> List['BlogPost']:
        """Get all draft blog posts"""
        return db.session.query(cls).filter_by(published=False).all()
    
    @classmethod
    def clear_all(cls) -> None:
        """Clear all blog posts from the database (mainly for testing)"""
        db.session.query(cls).delete()
        db.session.commit()

