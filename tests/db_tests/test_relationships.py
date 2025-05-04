"""
Tests for database relationships between models.
"""
import os
import pytest
from datetime import datetime, timedelta
from flask import Flask
from app import create_app
from app.database import db
from app.models.blog import BlogPost
from app.models.social import SocialPost, Platform, PostStatus
from app.models.scheduling import ScheduledItem, ScheduleStatus, ScheduleFrequency


@pytest.fixture(scope="function")
def app():
    """Create and configure a Flask app for testing"""
    # Set environment variables for testing
    os.environ["FLASK_ENV"] = "testing"
    os.environ["TESTING"] = "True"
    
    # Create the app with a test configuration
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    
    # Create the database tables
    with app.app_context():
        db.create_all()
    
    yield app
    
    # Clean up after the test
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="function")
def app_context(app):
    """Application context for tests"""
    with app.app_context():
        yield


@pytest.fixture
def sample_blog_post(app_context):
    """Create a sample blog post for testing"""
    post = BlogPost(
        title="Test Blog Post",
        content="This is a test blog post content.",
        topic="Testing",
        keywords="test,blog,relationship"
    )
    post.save()
    return post


@pytest.fixture
def sample_social_post(app_context):
    """Create a sample social post for testing"""
    post = SocialPost(
        content="This is a test social post #testing",
        platform=Platform.TWITTER,
        topic="Testing"
    )
    post.save()
    return post


@pytest.fixture
def future_datetime():
    """Return a datetime in the future for scheduling"""
    return datetime.now() + timedelta(days=1)


class TestBlogPostRelationships:
    """Test relationships between BlogPost and ScheduledItem"""
    
    def test_blog_to_schedule_relationship(self, app_context, sample_blog_post, future_datetime):
        """Test creating a schedule for a blog post"""
        # Create a schedule for the blog post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id,
            frequency=ScheduleFrequency.ONCE
        )
        schedule.save()
        
        # Retrieve the blog post and check relationships
        blog_post = BlogPost.get_by_id(sample_blog_post.id)
        
        # Verify the schedule is related to the blog post
        assert len(blog_post.schedules) == 1
        assert blog_post.schedules[0].id == schedule.id
        assert blog_post.schedules[0].blog_post_id == blog_post.id
    
    def test_schedule_to_blog_back_reference(self, app_context, sample_blog_post, future_datetime):
        """Test accessing blog post from schedule"""
        # Create a schedule for the blog post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id
        )
        schedule.save()
        
        # Retrieve the schedule and check the blog post reference
        retrieved_schedule = ScheduledItem.get_by_id(schedule.id)
        
        # Verify the blog post is accessible from the schedule
        assert retrieved_schedule.blog_post is not None
        assert retrieved_schedule.blog_post.id == sample_blog_post.id
        assert retrieved_schedule.blog_post.title == "Test Blog Post"
        
        # Verify the social post reference is None
        assert retrieved_schedule.social_post is None
    
    def test_cascade_deletion(self, app_context, sample_blog_post, future_datetime):
        """Test that deleting a blog post cascades to its schedules"""
        # Create multiple schedules for the blog post
        schedule1 = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id
        )
        schedule1.save()
        
        schedule2 = ScheduledItem(
            scheduled_time=future_datetime + timedelta(days=1),
            blog_post_id=sample_blog_post.id
        )
        schedule2.save()
        
        # Verify schedules exist
        schedules = ScheduledItem.get_by_blog_post(sample_blog_post.id)
        assert len(schedules) == 2
        
        # Delete the blog post
        sample_blog_post.delete()
        
        # Verify both schedules were deleted
        all_schedules = ScheduledItem.get_all()
        assert len(all_schedules) == 0
        
        # Verify schedules can't be found by ID
        assert ScheduledItem.get_by_id(schedule1.id) is None
        assert ScheduledItem.get_by_id(schedule2.id) is None


class TestSocialPostRelationships:
    """Test relationships between SocialPost and ScheduledItem"""
    
    def test_social_to_schedule_relationship(self, app_context, sample_social_post, future_datetime):
        """Test creating a schedule for a social post"""
        # Create a schedule for the social post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            social_post_id=sample_social_post.id,
            frequency=ScheduleFrequency.ONCE
        )
        schedule.save()
        
        # Retrieve the social post and check relationships
        social_post = SocialPost.get_by_id(sample_social_post.id)
        
        # Verify the schedule is related to the social post
        assert len(social_post.schedules) == 1
        assert social_post.schedules[0].id == schedule.id
        assert social_post.schedules[0].social_post_id == social_post.id
    
    def test_schedule_to_social_back_reference(self, app_context, sample_social_post, future_datetime):
        """Test accessing social post from schedule"""
        # Create a schedule for the social post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            social_post_id=sample_social_post.id
        )
        schedule.save()
        
        # Retrieve the schedule and check the social post reference
        retrieved_schedule = ScheduledItem.get_by_id(schedule.id)
        
        # Verify the social post is accessible from the schedule
        assert retrieved_schedule.social_post is not None
        assert retrieved_schedule.social_post.id == sample_social_post.id
        assert retrieved_schedule.social_post.platform == Platform.TWITTER
        
        # Verify the blog post reference is None
        assert retrieved_schedule.blog_post is None
    
    def test_platform_specific_validation(self, app_context, future_datetime):
        """Test that platform-specific validations work with relationships"""
        # Create a social post for Instagram without media (should fail validation)
        with pytest.raises(ValueError) as excinfo:
            invalid_instagram_post = SocialPost(
                content="This post will fail validation without media",
                platform=Platform.INSTAGRAM,
                topic="Testing"
            )
            invalid_instagram_post.save()
        
        # Verify the validation error
        assert "requires at least one media attachment" in str(excinfo.value)
        
        # Create a valid Instagram post with media
        valid_instagram_post = SocialPost(
            content="This is a valid Instagram post",
            platform=Platform.INSTAGRAM,
            topic="Testing",
            media_urls=["https://example.com/image.jpg"]
        )
        valid_instagram_post.save()
        
        # Create a schedule for the valid post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            social_post_id=valid_instagram_post.id
        )
        schedule.save()
        
        # Verify relationship works
        assert valid_instagram_post.schedules[0].id == schedule.id
        
        # Change platform to one that requires different validation
        valid_instagram_post.platform = Platform.TWITTER
        valid_instagram_post.update()
        
        # Verify relationship still works after platform change
        assert valid_instagram_post.schedules[0].id == schedule.id


class TestComplexRelationshipScenarios:
    """Test more complex relationship scenarios between models"""
    
    def test_multiple_schedules_per_post(self, app_context, sample_blog_post, future_datetime):
        """Test creating multiple schedules for a single post"""
        # Create multiple schedules with different frequencies
        schedule1 = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id,
            frequency=ScheduleFrequency.ONCE
        )
        schedule1.save()
        
        schedule2 = ScheduledItem(
            scheduled_time=future_datetime + timedelta(days=1),
            blog_post_id=sample_blog_post.id,
            frequency=ScheduleFrequency.WEEKLY,
            max_executions=4
        )
        schedule2.save()
        
        schedule3 = ScheduledItem(
            scheduled_time=future_datetime + timedelta(days=2),
            blog_post_id=sample_blog_post.id,
            frequency=ScheduleFrequency.MONTHLY
        )
        schedule3.save()
        
        # Retrieve the blog post
        blog_post = BlogPost.get_by_id(sample_blog_post.id)
        
        # Verify multiple schedules are associated
        assert len(blog_post.schedules) == 3
        
        # Verify schedules have different frequencies
        frequencies = [s.frequency for s in blog_post.schedules]
        assert ScheduleFrequency.ONCE in frequencies
        assert ScheduleFrequency.WEEKLY in frequencies
        assert ScheduleFrequency.MONTHLY in frequencies
        
        # Verify retrieval from schedule side
        weekly_schedules = [s for s in blog_post.schedules if s.frequency == ScheduleFrequency.WEEKLY]
        assert len(weekly_schedules) == 1
        assert weekly_schedules[0].max_executions == 4
    
    def test_cross_model_validations(self, app_context, sample_blog_post, sample_social_post, future_datetime):
        """Test validation constraints across models"""
        # Try to create a schedule with both blog_post_id and social_post_id (should fail)
        with pytest.raises(ValueError) as excinfo:
            invalid_schedule = ScheduledItem(
                scheduled_time=future_datetime,
                blog_post_id=sample_blog_post.id,
                social_post_id=sample_social_post.id
            )
            invalid_schedule.save()
        
        # Verify the validation error
        assert "Cannot schedule both a blog post and a social post" in str(excinfo.value)
        
        # Try to create a schedule without either post type (should fail)
        with pytest.raises(ValueError) as excinfo:
            invalid_schedule = ScheduledItem(
                scheduled_time=future_datetime
            )
            invalid_schedule.save()
        
        # Verify the validation error
        assert "Either blog_post_id or social_post_id must be provided" in str(excinfo.value)
        
        # Create valid schedules for each post type
        blog_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id
        )
        blog_schedule.save()
        
        social_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            social_post_id=sample_social_post.id
        )
        social_schedule.save()
        
        # Verify the correct relationships
        assert blog_schedule.blog_post_id == sample_blog_post.id
        assert blog_schedule.social_post_id is None
        
        assert social_schedule.social_post_id == sample_social_post.id
        assert social_schedule.blog_post_id is None
    
    def test_relationship_constraints(self, app_context, sample_blog_post, future_datetime):
        """Test constraints on relationships"""
        # Create a schedule for the blog post
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=sample_blog_post.id
        )
        schedule.save()
        
        # Try to change the blog post reference to a non-existent ID
        with pytest.raises(Exception):  # This should raise some form of database constraint error
            schedule.blog_post_id = "nonexistent-id"
            schedule.save()
        
        # Reset blog_post_id to valid value
        schedule.blog_post_id = sample_blog_post.id
        schedule.save()
        
        # Test execution state cascades properly
        schedule.mark_completed()
        assert schedule.status == ScheduleStatus.COMPLETED
        assert schedule.last_executed_at is not None
        
        # Run the schedule execute method - should publish the blog post
        before_publish = sample_blog_post.published
        assert before_publish is False
        
        # Get a fresh instance of the schedule
        schedule = ScheduledItem.get_by_id(schedule.id)
        schedule.status = ScheduleStatus.PENDING  # Reset status to pending for execution
        schedule.next_execution = datetime.now() - timedelta(minutes=1)  # Make it due
        db.session.commit()
        
        # Execute the schedule
        result = schedule.execute()
        assert result is True
        
        # Verify the blog post was published
        blog_post = BlogPost.get_by_id(sample_blog_post.id)
        assert blog_post.published is True
        assert blog_post.published_at is not None


if __name__ == "__main__":
    pytest.main(["-v", __file__])

