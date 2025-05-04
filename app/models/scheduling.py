import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.extensions import db
from app.database import Base, MutableJSONDict


class ScheduleStatus(Enum):
    """Status of a scheduled item"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScheduleFrequency(Enum):
    """Frequency for recurring schedules"""
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ScheduledItem(Base):
    """Model for scheduled publishing of blog and social media posts"""
    
    __tablename__ = 'scheduled_items'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Schedule metadata
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    frequency: Mapped[ScheduleFrequency] = mapped_column(SQLEnum(ScheduleFrequency), default=ScheduleFrequency.ONCE)
    status: Mapped[ScheduleStatus] = mapped_column(SQLEnum(ScheduleStatus), default=ScheduleStatus.PENDING)
    
    # Execution tracking
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_execution: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    execution_count: Mapped[int] = mapped_column(default=0)
    max_executions: Mapped[Optional[int]] = mapped_column(nullable=True)
    
    # Error handling
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(default=0)
    max_retries: Mapped[int] = mapped_column(default=3)
    
    # Additional metadata
    schedule_metadata: Mapped[Dict[str, Any]] = mapped_column(MutableJSONDict, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    
    # Foreign keys - only one of these should be set
    blog_post_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('blog_posts.id'), nullable=True)
    social_post_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('social_posts.id'), nullable=True)
    
    # Relationships
    blog_post = relationship("BlogPost", back_populates="schedules")
    social_post = relationship("SocialPost", back_populates="schedules")
    
    def __init__(
        self,
        scheduled_time: datetime,
        blog_post_id: Optional[str] = None,
        social_post_id: Optional[str] = None,
        schedule_id: Optional[str] = None,
        frequency: Union[ScheduleFrequency, str] = ScheduleFrequency.ONCE,
        status: Union[ScheduleStatus, str] = ScheduleStatus.PENDING,
        max_executions: Optional[int] = None,
        max_retries: int = 3,
        schedule_metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a new scheduled item.
        
        Args:
            scheduled_time: When to publish/execute the item
            blog_post_id: ID of the blog post to publish (mutually exclusive with social_post_id)
            social_post_id: ID of the social post to publish (mutually exclusive with blog_post_id)
            schedule_id: Unique identifier (generated if not provided)
            frequency: How often to repeat the schedule
            status: Current status of the scheduled item
            max_executions: Maximum number of times to execute (for recurring schedules)
            max_retries: Maximum number of retry attempts on failure
            schedule_metadata: Additional metadata for the schedule
        """
        if not blog_post_id and not social_post_id:
            raise ValueError("Either blog_post_id or social_post_id must be provided")
        
        if blog_post_id and social_post_id:
            raise ValueError("Cannot schedule both a blog post and a social post with the same schedule")
        
        self.id = schedule_id or str(uuid.uuid4())
        self.scheduled_time = scheduled_time
        self.blog_post_id = blog_post_id
        self.social_post_id = social_post_id
        
        # Calculate next execution
        self.next_execution = scheduled_time
        
        # Convert string frequency to Enum if necessary
        if isinstance(frequency, str):
            try:
                self.frequency = ScheduleFrequency(frequency.lower())
            except ValueError:
                raise ValueError(f"Unsupported frequency: {frequency}")
        else:
            self.frequency = frequency
        
        # Convert string status to Enum if necessary
        if isinstance(status, str):
            try:
                self.status = ScheduleStatus(status.lower())
            except ValueError:
                raise ValueError(f"Invalid status: {status}")
        else:
            self.status = status
        
        self.max_executions = max_executions
        self.max_retries = max_retries
        self.schedule_metadata = schedule_metadata or {}
    
    def save(self, validate_references: bool = True) -> 'ScheduledItem':
        """
        Save the scheduled item to the database
        
        Args:
            validate_references: Whether to validate foreign key references (default True)
                               Set to False when testing error handling scenarios
        """
        # Validate the schedule
        if self.scheduled_time <= datetime.now():
            raise ValueError("Scheduled time must be in the future")
            
        # Validate foreign key references if needed
        if validate_references:
            if self.blog_post_id:
                from app.models.blog import BlogPost
                if not BlogPost.get_by_id(self.blog_post_id):
                    raise ValueError(f"Blog post with ID {self.blog_post_id} not found")
            if self.social_post_id:
                from app.models.social import SocialPost
                if not SocialPost.get_by_id(self.social_post_id):
                    raise ValueError(f"Social post with ID {self.social_post_id} not found")

        db.session.add(self)
        db.session.commit()
        return self
    
    def update(self, **kwargs) -> 'ScheduledItem':
        """Update scheduled item fields"""
        # Special handling for frequency to ensure it's an enum
        if 'frequency' in kwargs:
            frequency = kwargs.pop('frequency')
            if isinstance(frequency, str):
                self.frequency = ScheduleFrequency(frequency.lower())
            else:
                self.frequency = frequency
        
        # Special handling for status to convert string to enum
        if 'status' in kwargs:
            status = kwargs.pop('status')
            if isinstance(status, str):
                self.status = ScheduleStatus(status.lower())
            else:
                self.status = status
        
        # Update scheduled_time and next_execution together if needed
        if 'scheduled_time' in kwargs:
            self.scheduled_time = kwargs.pop('scheduled_time')
            if self.status == ScheduleStatus.PENDING:
                self.next_execution = self.scheduled_time
        
        # Update other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        db.session.commit()
        return self
    
    def delete(self) -> bool:
        """Delete the scheduled item from the database"""
        db.session.delete(self)
        db.session.commit()
        return True
    
    def cancel(self) -> 'ScheduledItem':
        """Cancel the scheduled item"""
        self.status = ScheduleStatus.CANCELLED
        self.next_execution = None
        db.session.commit()
        return self
    
    def mark_completed(self) -> 'ScheduledItem':
        """Mark the scheduled item as completed"""
        now = datetime.now()
        self.last_executed_at = now
        self.execution_count += 1
        
        # For recurring schedules, calculate the next execution time
        if (self.frequency != ScheduleFrequency.ONCE and 
            (self.max_executions is None or self.execution_count < self.max_executions)):
            
            from datetime import timedelta
            
            if self.frequency == ScheduleFrequency.DAILY:
                # Calculate next execution based on original schedule plus execution count days
                self.next_execution = self.scheduled_time + timedelta(days=self.execution_count)
                # If next execution is in the past, adjust to future
                if self.next_execution <= now:
                    days_passed = (now - self.scheduled_time).days + 1
                    self.next_execution = self.scheduled_time + timedelta(days=days_passed)
                    
            elif self.frequency == ScheduleFrequency.WEEKLY:
                # Calculate next execution based on original schedule plus execution count weeks
                self.next_execution = self.scheduled_time + timedelta(weeks=self.execution_count)
                # If next execution is in the past, adjust to future
                if self.next_execution <= now:
                    weeks_passed = ((now - self.scheduled_time).days // 7) + 1
                    self.next_execution = self.scheduled_time + timedelta(weeks=weeks_passed)
                
            elif self.frequency == ScheduleFrequency.MONTHLY:
                # Calculate next month based on original month + execution count
                next_month = self.scheduled_time.month + self.execution_count
                next_year = self.scheduled_time.year + ((next_month - 1) // 12)
                next_month = ((next_month - 1) % 12) + 1
                
                # Handle edge cases for days at the end of month
                try:
                    self.next_execution = self.scheduled_time.replace(year=next_year, month=next_month)
                except ValueError:
                    # If the day doesn't exist in the target month, use the last day
                    if next_month == 2:
                        # Handle February
                        last_day = 29 if next_year % 4 == 0 and (next_year % 100 != 0 or next_year % 400 == 0) else 28
                    elif next_month in [4, 6, 9, 11]:
                        last_day = 30
                    else:
                        last_day = 31
                    
                    # Create a date with the last valid day of the month
                    self.next_execution = self.scheduled_time.replace(
                        year=next_year, 
                        month=next_month,
                        day=last_day
                    )
                
                # If next execution is in the past, adjust to future
                if self.next_execution <= now:
                    additional_months = 1
                    while True:
                        future_month = next_month + additional_months
                        future_year = next_year + ((future_month - 1) // 12)
                        future_month = ((future_month - 1) % 12) + 1
                        
                        try:
                            future_date = self.scheduled_time.replace(
                                year=future_year,
                                month=future_month
                            )
                        except ValueError:
                            # Handle month end edge cases
                            if future_month == 2:
                                last_day = 29 if future_year % 4 == 0 and (future_year % 100 != 0 or future_year % 400 == 0) else 28
                            elif future_month in [4, 6, 9, 11]:
                                last_day = 30
                            else:
                                last_day = 31
                            
                            future_date = self.scheduled_time.replace(
                                year=future_year,
                                month=future_month,
                                day=last_day
                            )
                            
                        if future_date > now:
                            self.next_execution = future_date
                            break
                        additional_months += 1
            
            self.status = ScheduleStatus.PENDING
        else:
            # This was the last execution
            self.status = ScheduleStatus.COMPLETED
            self.next_execution = None
        
        db.session.commit()
        return self
    
    def mark_failed(self, error: str = None) -> 'ScheduledItem':
        """Mark the scheduled item as failed"""
        self.last_executed_at = datetime.now()
        self.retry_count += 1
        self.last_error = error or "Execution failed"
        
        # Store error in metadata
        if 'errors' not in self.schedule_metadata:
            self.schedule_metadata['errors'] = []
        self.schedule_metadata['errors'].append({
            'time': datetime.now().isoformat(),
            'message': error or "Execution failed"
        })
        
        if self.retry_count < self.max_retries:
            # We can retry later
            from datetime import timedelta
            # Exponential backoff for retries: 5min, 15min, 45min, etc.
            backoff_minutes = 5 * (3 ** (self.retry_count - 1))
            self.next_execution = datetime.now() + timedelta(minutes=backoff_minutes)
            self.status = ScheduleStatus.PENDING
        else:
            # Max retries reached, mark as failed
            self.status = ScheduleStatus.FAILED
            self.next_execution = None
        
        db.session.commit()
        return self
    
    def execute(self) -> bool:
        """
        Execute the scheduled item by publishing the associated post.
        
        Returns:
            bool: True if execution was successful, False otherwise
        """
        now = datetime.now()
        execution_time = self.next_execution or self.scheduled_time
        
        # Skip if not pending or not due yet
        if self.status != ScheduleStatus.PENDING or now < execution_time:
            return False
        
        try:
            if self.blog_post_id:
                # Publish blog post
                from app.models.blog import BlogPost
                blog_post = BlogPost.get_by_id(self.blog_post_id)
                if not blog_post:
                    raise ValueError(f"Blog post with ID {self.blog_post_id} not found")
                blog_post.publish()
                
            elif self.social_post_id:
                # Publish social post
                from app.models.social import SocialPost
                social_post = SocialPost.get_by_id(self.social_post_id)
                if not social_post:
                    raise ValueError(f"Social post with ID {self.social_post_id} not found")
                social_post.publish()
            
            self.mark_completed()
            return True
            
        except Exception as e:
            self.mark_failed(str(e))
            return False
    
    @classmethod
    def get_by_id(cls, schedule_id: str) -> Optional['ScheduledItem']:
        """Get a scheduled item by ID"""
        return db.session.get(cls, schedule_id)
    
    @classmethod
    def get_all(cls) -> List['ScheduledItem']:
        """Get all scheduled items"""
        return db.session.query(cls).all()
    
    @classmethod
    def get_pending(cls) -> List['ScheduledItem']:
        """Get all pending scheduled items"""
        return db.session.query(cls).filter_by(status=ScheduleStatus.PENDING).all()
    
    @classmethod
    def get_due_items(cls) -> List['ScheduledItem']:
        """Get all pending items that are due for execution"""
        now = datetime.now()
        return db.session.query(cls).filter(
            cls.status == ScheduleStatus.PENDING,
            db.or_(
                cls.next_execution <= now,
                db.and_(cls.next_execution.is_(None), cls.scheduled_time <= now)
            )
        ).all()
    
    @classmethod
    def get_by_blog_post(cls, blog_post_id: str) -> List['ScheduledItem']:
        """Get all scheduled items for a specific blog post"""
        return db.session.query(cls).filter_by(blog_post_id=blog_post_id).all()
    
    @classmethod
    def get_by_social_post(cls, social_post_id: str) -> List['ScheduledItem']:
        """Get all scheduled items for a specific social post"""
        return db.session.query(cls).filter_by(social_post_id=social_post_id).all()
    
    @property
    def is_blog_schedule(self) -> bool:
        """Check if this is a blog post schedule"""
        return self.blog_post_id is not None
    
    @property
    def is_social_schedule(self) -> bool:
        """Check if this is a social post schedule"""
        return self.social_post_id is not None
    
    @property
    def is_pending(self) -> bool:
        """Check if the schedule is pending execution"""
        return self.status == ScheduleStatus.PENDING
    
    @property
    def is_completed(self) -> bool:
        """Check if the schedule has been completed"""
        return self.status == ScheduleStatus.COMPLETED
    
    @property
    def is_failed(self) -> bool:
        """Check if the schedule has failed"""
        return self.status == ScheduleStatus.FAILED
    
    @property
    def is_cancelled(self) -> bool:
        """Check if the schedule has been cancelled"""
        return self.status == ScheduleStatus.CANCELLED
    
    @property
    def is_recurring(self) -> bool:
        """Check if this is a recurring schedule"""
        return self.frequency != ScheduleFrequency.ONCE
    
    @property
    def can_retry(self) -> bool:
        """Check if the schedule can be retried"""
        # Can retry if:
        # 1. Not completed or cancelled
        # 2. Not reached max retries
        return (self.status != ScheduleStatus.COMPLETED and 
                self.status != ScheduleStatus.CANCELLED and 
                self.retry_count < self.max_retries)
    
    def retry(self) -> 'ScheduledItem':
        """Retry a failed scheduled item"""
        if not self.can_retry:
            raise ValueError("This scheduled item cannot be retried")
        
        # Reset status to pending
        self.status = ScheduleStatus.PENDING
        
        # Set next execution time with backoff
        from datetime import timedelta
        # Retry with exponential backoff
        backoff_minutes = 5 * (2 ** self.retry_count)
        self.next_execution = datetime.now() + timedelta(minutes=backoff_minutes)
        
        db.session.commit()
        return self

