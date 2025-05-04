import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from sqlalchemy import String, Text, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.extensions import db
from app.database import Base, MutableJSONDict, MutableJSONList


class Platform(Enum):
    """Supported social media platforms"""
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"


class PostStatus(Enum):
    """Status of a social media post"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"


class SocialPost(Base):
    """Model for social media posts with platform-specific validation"""
    
    __tablename__ = 'social_posts'
    
    # Platform-specific constraints stored as class variable
    PLATFORM_CONSTRAINTS = {
        Platform.TWITTER: {
            "char_limit": 280,
            "media_allowed": True,
            "media_count": 4
        },
        Platform.FACEBOOK: {
            "char_limit": 63206,  # Practical limit
            "media_allowed": True,
            "media_count": 10
        },
        Platform.INSTAGRAM: {
            "char_limit": 2200,
            "media_allowed": True,
            "media_count": 10,
            "requires_media": True
        },
        Platform.LINKEDIN: {
            "char_limit": 3000,
            "media_allowed": True,
            "media_count": 9
        }
    }
    
    # Model columns
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[Platform] = mapped_column(SQLEnum(Platform), nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[PostStatus] = mapped_column(SQLEnum(PostStatus), default=PostStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    media_urls: Mapped[List[str]] = mapped_column(MutableJSONList, default=list)
    hashtags: Mapped[List[str]] = mapped_column(MutableJSONList, default=list)
    generation_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    
    # Relationship with scheduled items
    schedules = relationship("ScheduledItem", back_populates="social_post", cascade="all, delete-orphan")
    
    def __init__(
        self, 
        content: str, 
        platform: Union[Platform, str],
        topic: str,
        post_id: Optional[str] = None,
        status: Union[PostStatus, str] = PostStatus.DRAFT,
        created_at: Optional[datetime] = None,
        scheduled_at: Optional[datetime] = None,
        published_at: Optional[datetime] = None,
        media_urls: Optional[List[str]] = None,
        hashtags: Optional[List[str]] = None,
        generation_metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a new social media post.
        
        Args:
            content: The post content
            platform: The target social media platform
            topic: The main topic of the post
            post_id: Unique identifier (generated if not provided)
            status: Current status of the post
            created_at: Creation timestamp (defaults to now)
            scheduled_at: Scheduled publishing timestamp
            published_at: Actual publishing timestamp
            media_urls: List of media URLs to attach to the post
            hashtags: List of hashtags for the post
            generation_metadata: Additional metadata about the post generation
        """
        self.id = post_id or str(uuid.uuid4())
        
        # Convert string platform to Enum if necessary
        if isinstance(platform, str):
            try:
                self.platform = Platform(platform.lower())
            except ValueError:
                raise ValueError(f"Unsupported platform: {platform}")
        else:
            self.platform = platform
        
        # Convert string status to Enum if necessary
        if isinstance(status, str):
            try:
                self.status = PostStatus(status.lower())
            except ValueError:
                raise ValueError(f"Invalid status: {status}")
        else:
            self.status = status
        
        self.content = content
        self.topic = topic
        if created_at:
            self.created_at = created_at
        self.scheduled_at = scheduled_at
        self.published_at = published_at
        self.media_urls = media_urls or []
        self.hashtags = hashtags or []
        self.generation_metadata = generation_metadata or {}
        
        # Validate the post
        self.validate()
    
    def validate(self) -> None:
        """
        Validate the post against platform-specific constraints.
        
        Raises:
            ValueError: If validation fails
        """
        constraints = self.PLATFORM_CONSTRAINTS.get(self.platform)
        if not constraints:
            raise ValueError(f"Unsupported platform: {self.platform}")
        
        # Check character limit
        if len(self.content) > constraints["char_limit"]:
            raise ValueError(
                f"Content exceeds character limit for {self.platform.value}. "
                f"Maximum: {constraints['char_limit']}, Current: {len(self.content)}"
            )
        
        # Check media requirements
        if constraints.get("requires_media", False) and not self.media_urls:
            raise ValueError(f"{self.platform.value} requires at least one media attachment")
        
        # Check media count
        if len(self.media_urls) > constraints.get("media_count", 0):
            raise ValueError(
                f"Too many media attachments for {self.platform.value}. "
                f"Maximum: {constraints['media_count']}, Current: {len(self.media_urls)}"
            )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert social post to dictionary for serialization"""
        return {
            'id': self.id,
            'content': self.content,
            'platform': self.platform.value,
            'topic': self.topic,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'media_urls': self.media_urls,
            'hashtags': self.hashtags,
            'generation_metadata': self.generation_metadata
        }
    
    def save(self) -> 'SocialPost':
        """Save the social post to the database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def update(self, **kwargs) -> 'SocialPost':
        """Update social post fields"""
        # Special handling for platform to ensure validation
        if 'platform' in kwargs:
            platform = kwargs.pop('platform')
            if isinstance(platform, str):
                self.platform = Platform(platform.lower())
            else:
                self.platform = platform
        
        # Special handling for status to convert string to enum
        if 'status' in kwargs:
            status = kwargs.pop('status')
            if isinstance(status, str):
                self.status = PostStatus(status.lower())
            else:
                self.status = status
        
        # Update other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        # Re-validate after updates
        self.validate()
        
        db.session.commit()
        return self
    
    def delete(self) -> bool:
        """Delete the social post from the database"""
        db.session.delete(self)
        db.session.commit()
        return True
    
    def schedule(self, scheduled_at: datetime) -> 'SocialPost':
        """Schedule the post for publishing"""
        if scheduled_at <= datetime.now():
            raise ValueError("Scheduled time must be in the future")
        
        self.scheduled_at = scheduled_at
        self.status = PostStatus.SCHEDULED
        db.session.commit()
        return self
    
    def publish(self) -> 'SocialPost':
        """Mark the post as published"""
        self.status = PostStatus.PUBLISHED
        self.published_at = datetime.now()
        db.session.commit()
        return self
    
    def mark_failed(self, reason: str = None) -> 'SocialPost':
        """Mark the post as failed to publish"""
        self.status = PostStatus.FAILED
        if reason:
            if 'failure_reason' not in self.generation_metadata:
                self.generation_metadata['failure_reason'] = reason
        db.session.commit()
        return self
    
    @classmethod
    def get_by_id(cls, post_id: str) -> Optional['SocialPost']:
        """Get a social post by ID"""
        return db.session.get(cls, post_id)
    
    @classmethod
    def get_all(cls) -> List['SocialPost']:
        """Get all social posts"""
        return db.session.query(cls).all()
    
    @classmethod
    def get_by_status(cls, status: Union[PostStatus, str]) -> List['SocialPost']:
        """Get all posts with the given status"""
        if isinstance(status, str):
            status_enum = PostStatus(status.lower())
        else:
            status_enum = status
            
        return db.session.query(cls).filter_by(status=status_enum).all()
    
    @classmethod
    def get_by_platform(cls, platform: Union[Platform, str]) -> List['SocialPost']:
        """Get all posts for the given platform"""
        if isinstance(platform, str):
            platform_enum = Platform(platform.lower())
        else:
            platform_enum = platform
            
        return db.session.query(cls).filter_by(platform=platform_enum).all()
    
    @classmethod
    def get_scheduled_posts(cls) -> List['SocialPost']:
        """Get all scheduled posts"""
        return cls.get_by_status(PostStatus.SCHEDULED)
    
    @classmethod
    def get_published_posts(cls) -> List['SocialPost']:
        """Get all published posts"""
        return cls.get_by_status(PostStatus.PUBLISHED)
    
    @classmethod
    def get_draft_posts(cls) -> List['SocialPost']:
        """Get all draft posts"""
        return cls.get_by_status(PostStatus.DRAFT)
    
    @property
    def character_count(self) -> int:
        """Get the character count of the post content"""
        return len(self.content)
    
    @property
    def character_limit(self) -> int:
        """Get the character limit for the platform"""
        return self.PLATFORM_CONSTRAINTS.get(self.platform, {}).get("char_limit", 0)
    
    @property
    def characters_remaining(self) -> int:
        """Get the number of characters remaining before hitting the limit"""
        return max(0, self.character_limit - self.character_count)
    
    @property
    def is_scheduled(self) -> bool:
        """Check if the post is scheduled"""
        return self.status == PostStatus.SCHEDULED
    
    @property
    def is_published(self) -> bool:
        """Check if the post is published"""
        return self.status == PostStatus.PUBLISHED
    
    @property
    def is_draft(self) -> bool:
        """Check if the post is a draft"""
        return self.status == PostStatus.DRAFT
    
    @property
    def is_failed(self) -> bool:
        """Check if the post failed to publish"""
        return self.status == PostStatus.FAILED
