"""
Tests for individual model operations and behaviors.
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
def future_datetime():
    """Return a datetime in the future for scheduling"""
    return datetime.now() + timedelta(days=1)


class TestBlogPostModel:
    """Test BlogPost model operations and behaviors"""
    
    def test_blog_post_creation(self, app_context):
        """Test creating a new blog post"""
        # Create a blog post
        blog_post = BlogPost(
            title="Test Blog Title",
            content="This is the content of the test blog post. It should be long enough to test.",
            topic="Testing",
            keywords="test,blog,creation"
        )
        blog_post.save()
        
        # Verify it was saved correctly
        assert blog_post.id is not None
        assert len(blog_post.id) == 36  # UUID length
        
        # Verify default values
        assert blog_post.published is False
        assert blog_post.published_at is None
        assert isinstance(blog_post.created_at, datetime)
        assert isinstance(blog_post.generation_metadata, dict)
        assert len(blog_post.generation_metadata) == 0
    
    def test_blog_post_retrieval(self, app_context):
        """Test retrieving blog posts"""
        # Create multiple blog posts
        post1 = BlogPost(
            title="First Blog Post",
            content="Content for the first blog post",
            topic="Testing",
            keywords="first,test"
        )
        post1.save()
        
        post2 = BlogPost(
            title="Second Blog Post",
            content="Content for the second blog post",
            topic="Testing",
            keywords="second,test"
        )
        post2.save()
        
        # Publish the second post
        post2.publish()
        
        # Retrieve individual post
        retrieved_post = BlogPost.get_by_id(post1.id)
        assert retrieved_post is not None
        assert retrieved_post.title == "First Blog Post"
        
        # Retrieve all posts
        all_posts = BlogPost.get_all()
        assert len(all_posts) == 2
        
        # Retrieve published posts
        published_posts = BlogPost.get_published()
        assert len(published_posts) == 1
        assert published_posts[0].id == post2.id
        
        # Retrieve draft posts
        draft_posts = BlogPost.get_drafts()
        assert len(draft_posts) == 1
        assert draft_posts[0].id == post1.id
    
    def test_blog_post_update(self, app_context):
        """Test updating a blog post"""
        # Create a blog post
        blog_post = BlogPost(
            title="Original Title",
            content="Original content",
            topic="Original Topic",
            keywords="original,tags"
        )
        blog_post.save()
        
        # Update using method
        blog_post.update(
            title="Updated Title",
            content="Updated content",
            topic="Updated Topic",
            keywords="updated,tags"
        )
        
        # Verify updates were applied
        updated_post = BlogPost.get_by_id(blog_post.id)
        assert updated_post.title == "Updated Title"
        assert updated_post.content == "Updated content"
        assert updated_post.topic == "Updated Topic"
        assert updated_post.keywords == "updated,tags"
    
    def test_blog_post_deletion(self, app_context):
        """Test deleting a blog post"""
        # Create a blog post
        blog_post = BlogPost(
            title="Post to Delete",
            content="This post will be deleted",
            topic="Deletion Test"
        )
        blog_post.save()
        
        # Verify it exists
        post_id = blog_post.id
        assert BlogPost.get_by_id(post_id) is not None
        
        # Delete it
        blog_post.delete()
        
        # Verify it's gone
        assert BlogPost.get_by_id(post_id) is None
    
    def test_blog_publishing_workflow(self, app_context):
        """Test the blog publishing workflow"""
        # Create a blog post
        blog_post = BlogPost(
            title="Unpublished Post",
            content="This post will go through the publishing workflow",
            topic="Publishing Test"
        )
        blog_post.save()
        
        # Verify initial state
        assert blog_post.published is False
        assert blog_post.published_at is None
        
        # Publish it
        blog_post.publish()
        
        # Verify published state
        assert blog_post.published is True
        assert isinstance(blog_post.published_at, datetime)
        
        # Ensure the published_at timestamp is recent
        now = datetime.now()
        time_diff = now - blog_post.published_at
        assert time_diff.total_seconds() < 5  # Within 5 seconds
        
        # Update with unpublish
        blog_post.update(published=False)
        
        # Verify unpublished state
        assert blog_post.published is False
        # published_at timestamp should remain
        assert blog_post.published_at is not None
    
    def test_blog_metadata_handling(self, app_context):
        """Test handling of blog post metadata"""
        # Create a blog post with metadata
        metadata = {
            "model": "mistral-7b-instruct-v0.3",
            "temperature": 0.7,
            "tokens": 1240,
            "prompt_tokens": 150,
            "completion_tokens": 1090,
            "generation_time": 5.2
        }
        
        blog_post = BlogPost(
            title="Metadata Test Post",
            content="This post has generation metadata",
            topic="Metadata Testing",
            generation_metadata=metadata
        )
        blog_post.save()
        
        # Retrieve and verify metadata
        retrieved_post = BlogPost.get_by_id(blog_post.id)
        assert retrieved_post.generation_metadata == metadata
        assert retrieved_post.generation_metadata["model"] == "mistral-7b-instruct-v0.3"
        assert retrieved_post.generation_metadata["tokens"] == 1240
        
        # Update metadata
        updated_metadata = metadata.copy()
        updated_metadata["temperature"] = 0.8
        updated_metadata["additional_info"] = "Added later"
        
        blog_post.update(generation_metadata=updated_metadata)
        
        # Verify updated metadata
        updated_post = BlogPost.get_by_id(blog_post.id)
        assert updated_post.generation_metadata["temperature"] == 0.8
        assert updated_post.generation_metadata["additional_info"] == "Added later"
        assert len(updated_post.generation_metadata) == len(metadata) + 1


class TestSocialPostModel:
    """Test SocialPost model operations and behaviors"""
    
    def test_social_post_creation(self, app_context):
        """Test creating social posts for different platforms"""
        # Twitter post
        twitter_post = SocialPost(
            content="This is a test tweet #testing",
            platform=Platform.TWITTER,
            topic="Testing"
        )
        twitter_post.save()
        
        # LinkedIn post
        linkedin_post = SocialPost(
            content="This is a professional test post for LinkedIn #professional #testing",
            platform=Platform.LINKEDIN,
            topic="Professional Testing"
        )
        linkedin_post.save()
        
        # Facebook post
        facebook_post = SocialPost(
            content="This is a longer test post for Facebook with more detailed content. " * 5,
            platform=Platform.FACEBOOK,
            topic="Detailed Testing"
        )
        facebook_post.save()
        
        # Verify basic attributes
        assert twitter_post.id is not None
        assert linkedin_post.platform == Platform.LINKEDIN
        assert facebook_post.topic == "Detailed Testing"
        
        # Verify default values
        assert twitter_post.status == PostStatus.DRAFT
        assert linkedin_post.published_at is None
        assert isinstance(facebook_post.created_at, datetime)
        assert isinstance(twitter_post.generation_metadata, dict)
    
    def test_platform_specific_validation(self, app_context):
        """Test platform-specific validation rules"""
        # Test character limits
        long_content = "This is a very long post that exceeds Twitter's character limit. " * 10
        
        # Should pass for Facebook
        facebook_post = SocialPost(
            content=long_content,
            platform=Platform.FACEBOOK,
            topic="Character Limits"
        )
        facebook_post.save()  # Should work fine
        
        # Should fail for Twitter
        with pytest.raises(ValueError) as excinfo:
            twitter_post = SocialPost(
                content=long_content,
                platform=Platform.TWITTER,
                topic="Character Limits"
            )
            twitter_post.save()
        
        assert "exceeds character limit for twitter" in str(excinfo.value).lower()
        
        # Test Instagram requiring media
        with pytest.raises(ValueError) as excinfo:
            instagram_post = SocialPost(
                content="This is an Instagram post without media",
                platform=Platform.INSTAGRAM,
                topic="Media Requirement"
            )
            instagram_post.save()
        
        assert "requires at least one media attachment" in str(excinfo.value)
        
        # Valid Instagram post with media
        instagram_post = SocialPost(
            content="This is an Instagram post with media",
            platform=Platform.INSTAGRAM,
            topic="Media Requirement",
            media_urls=["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        )
        instagram_post.save()  # Should work fine
        
        # Test too many media attachments
        with pytest.raises(ValueError) as excinfo:
            too_many_media = SocialPost(
                content="This post has too many images",
                platform=Platform.TWITTER,
                topic="Media Limits",
                media_urls=["https://example.com/img1.jpg", "https://example.com/img2.jpg", 
                           "https://example.com/img3.jpg", "https://example.com/img4.jpg", 
                           "https://example.com/img5.jpg"]
            )
            too_many_media.save()
        
        assert "too many media attachments" in str(excinfo.value).lower()
    
    def test_social_post_status_transitions(self, app_context):
        """Test social post status transitions"""
        # Create a social post
        post = SocialPost(
            content="Status transition test post",
            platform=Platform.TWITTER,
            topic="Status Testing"
        )
        post.save()
        
        # Verify initial status
        assert post.status == PostStatus.DRAFT
        assert post.is_draft is True
        
        # Schedule the post
        scheduled_time = datetime.now() + timedelta(days=1)
        post.schedule(scheduled_time)
        
        # Verify scheduled status
        assert post.status == PostStatus.SCHEDULED
        assert post.is_scheduled is True
        assert post.scheduled_at == scheduled_time
        
        # Publish the post
        post.publish()
        
        # Verify published status
        assert post.status == PostStatus.PUBLISHED
        assert post.is_published is True
        assert isinstance(post.published_at, datetime)
        
        # Mark as failed
        post.mark_failed("Test failure reason")
        
        # Verify failed status
        assert post.status == PostStatus.FAILED
        assert post.is_failed is True
        assert "failure_reason" in post.generation_metadata
        assert post.generation_metadata["failure_reason"] == "Test failure reason"
    
    def test_social_post_media_handling(self, app_context):
        """Test social post media handling"""
        # Create post with multiple media items
        post = SocialPost(
            content="Media handling test post",
            platform=Platform.FACEBOOK,
            topic="Media Testing",
            media_urls=[
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/video1.mp4"
            ]
        )
        post.save()
        
        # Verify media was saved
        assert len(post.media_urls) == 3
        assert "image1.jpg" in post.media_urls[0]
        
        # Update media
        post.update(media_urls=["https://example.com/new_image.jpg"])
        
        # Verify media was updated
        assert len(post.media_urls) == 1
        assert "new_image.jpg" in post.media_urls[0]
        
        # Clear media
        post.update(media_urls=[])
        
        # Verify media was cleared
        assert len(post.media_urls) == 0
    
    def test_hashtag_management(self, app_context):
        """Test social post hashtag management"""
        # Create post with hashtags
        post = SocialPost(
            content="Post with #hashtags in the content",
            platform=Platform.TWITTER,
            topic="Hashtag Testing",
            hashtags=["testing", "socialmedia", "python"]
        )
        post.save()
        
        # Verify hashtags
        assert len(post.hashtags) == 3
        assert "testing" in post.hashtags
        assert "socialmedia" in post.hashtags
        
        # Update hashtags
        post.update(hashtags=["updated", "tags"])
        
        # Verify hashtags were updated
        assert len(post.hashtags) == 2
        assert "updated" in post.hashtags
        assert "testing" not in post.hashtags
    
    def test_social_post_retrieval(self, app_context):
        """Test retrieving social posts by various criteria"""
        # Create posts with different platforms and statuses
        twitter_draft = SocialPost(
            content="Twitter draft post",
            platform=Platform.TWITTER,
            topic="Retrieval Testing"
        )
        twitter_draft.save()
        
        facebook_published = SocialPost(
            content="Facebook published post",
            platform=Platform.FACEBOOK,
            topic="Retrieval Testing"
        )
        facebook_published.save()
        facebook_published.publish()
        
        linkedin_scheduled = SocialPost(
            content="LinkedIn scheduled post",
            platform=Platform.LINKEDIN,
            topic="Retrieval Testing"
        )
        linkedin_scheduled.save()
        linkedin_scheduled.schedule(datetime.now() + timedelta(days=1))
        
        # Test get_all
        all_posts = SocialPost.get_all()
        assert len(all_posts) == 3
        
        # Test get_by_platform
        twitter_posts = SocialPost.get_by_platform(Platform.TWITTER)
        assert len(twitter_posts) == 1
        assert twitter_posts[0].id == twitter_draft.id
        
        # Test get_by_status
        published_posts = SocialPost.get_by_status(PostStatus.PUBLISHED)
        assert len(published_posts) == 1
        assert published_posts[0].id == facebook_published.id
        
        scheduled_posts = SocialPost.get_by_status(PostStatus.SCHEDULED)
        assert len(scheduled_posts) == 1
        assert scheduled_posts[0].id == linkedin_scheduled.id
        
        # Test convenience methods
        drafts = SocialPost.get_draft_posts()
        assert len(drafts) == 1
        assert drafts[0].platform == Platform.TWITTER
        
        scheduled = SocialPost.get_scheduled_posts()
        assert len(scheduled) == 1
        assert scheduled[0].platform == Platform.LINKEDIN
        
        published = SocialPost.get_published_posts()
        assert len(published) == 1
        assert published[0].platform == Platform.FACEBOOK
    
    def test_social_post_deletion(self, app_context):
        """Test deleting a social post"""
        # Create a social post
        post = SocialPost(
            content="This post will be deleted",
            platform=Platform.TWITTER,
            topic="Deletion Test"
        )
        post.save()
        
        # Verify it exists
        post_id = post.id
        assert SocialPost.get_by_id(post_id) is not None
        
        # Delete it
        post.delete()
        
        # Verify it's gone
        assert SocialPost.get_by_id(post_id) is None


class TestScheduledItemModel:
    """Test ScheduledItem model operations and behaviors"""
    
    def test_schedule_creation_validation(self, app_context):
        """Test creating scheduled items with validation"""
        # Create a blog post to schedule
        blog_post = BlogPost(
            title="Scheduled Blog Post",
            content="This blog post will be scheduled",
            topic="Scheduling Test"
        )
        blog_post.save()
        
        # Create a social post to schedule
        social_post = SocialPost(
            content="This social post will be scheduled",
            platform=Platform.TWITTER,
            topic="Scheduling Test"
        )
        social_post.save()
        
        # Valid schedule for blog post
        schedule_time = datetime.now() + timedelta(days=1)
        blog_schedule = ScheduledItem(
            scheduled_time=schedule_time,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.ONCE
        )
        blog_schedule.save()
        
        # Valid schedule for social post
        social_schedule = ScheduledItem(
            scheduled_time=schedule_time + timedelta(hours=2),
            social_post_id=social_post.id,
            frequency=ScheduleFrequency.WEEKLY,
            max_executions=4
        )
        social_schedule.save()
        
        # Verify schedules were created correctly
        assert blog_schedule.id is not None
        assert social_schedule.id is not None
        assert blog_schedule.blog_post_id == blog_post.id
        assert social_schedule.social_post_id == social_post.id
        
        # Verify default values
        assert blog_schedule.status == ScheduleStatus.PENDING
        assert blog_schedule.next_execution == schedule_time
        assert blog_schedule.execution_count == 0
        assert isinstance(blog_schedule.schedule_metadata, dict)
        
        # Test invalid schedule time (in the past)
        with pytest.raises(ValueError) as excinfo:
            past_schedule = ScheduledItem(
                scheduled_time=datetime.now() - timedelta(days=1),
                blog_post_id=blog_post.id
            )
            past_schedule.save()
        
        assert "must be in the future" in str(excinfo.value)
        
        # Test missing both post types
        with pytest.raises(ValueError) as excinfo:
            invalid_schedule = ScheduledItem(
                scheduled_time=schedule_time
            )
            invalid_schedule.save()
        
        assert "Either blog_post_id or social_post_id must be provided" in str(excinfo.value)
        
        # Test specifying both post types
        with pytest.raises(ValueError) as excinfo:
            invalid_schedule = ScheduledItem(
                scheduled_time=schedule_time,
                blog_post_id=blog_post.id,
                social_post_id=social_post.id
            )
            invalid_schedule.save()
        
        assert "Cannot schedule both a blog post and a social post" in str(excinfo.value)
    
    def test_recurrence_patterns(self, app_context, future_datetime):
        """Test schedule recurrence patterns"""
        # Create a blog post to schedule
        blog_post = BlogPost(
            title="Recurring Blog Post",
            content="This blog post will have recurring schedules",
            topic="Recurrence Test"
        )
        blog_post.save()
        
        # One-time schedule
        once_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.ONCE
        )
        once_schedule.save()
        
        # Daily schedule with 5 executions
        daily_schedule = ScheduledItem(
            scheduled_time=future_datetime + timedelta(hours=1),
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.DAILY,
            max_executions=5
        )
        daily_schedule.save()
        
        # Weekly schedule with unlimited executions
        weekly_schedule = ScheduledItem(
            scheduled_time=future_datetime + timedelta(hours=2),
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.WEEKLY
        )
        weekly_schedule.save()
        
        # Monthly schedule with 3 executions
        monthly_schedule = ScheduledItem(
            scheduled_time=future_datetime + timedelta(hours=3),
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.MONTHLY,
            max_executions=3
        )
        monthly_schedule.save()
        
        # Verify recurrence settings
        assert once_schedule.is_recurring is False
        assert daily_schedule.is_recurring is True
        assert weekly_schedule.is_recurring is True
        assert monthly_schedule.is_recurring is True
        
        assert daily_schedule.max_executions == 5
        assert weekly_schedule.max_executions is None
        assert monthly_schedule.max_executions == 3
        
        # Test completing a one-time schedule
        once_schedule.mark_completed()
        assert once_schedule.status == ScheduleStatus.COMPLETED
        assert once_schedule.execution_count == 1
        assert once_schedule.next_execution is None
        
        # Test completing a recurring daily schedule
        daily_schedule.mark_completed()
        assert daily_schedule.status == ScheduleStatus.PENDING
        assert daily_schedule.execution_count == 1
        assert daily_schedule.next_execution is not None
        
        # Verify next execution is scheduled for the next day
        expected_date = daily_schedule.scheduled_time + timedelta(days=1)
        assert daily_schedule.next_execution.date() == expected_date.date()
        
        # Complete the remaining executions
        for _ in range(4):
            daily_schedule.mark_completed()
        
        # After 5 executions, it should be completed
        assert daily_schedule.status == ScheduleStatus.COMPLETED
        assert daily_schedule.execution_count == 5
        assert daily_schedule.next_execution is None
    
    def test_execution_handling(self, app_context, future_datetime):
        """Test schedule execution handling"""
        # Create blog and social posts
        blog_post = BlogPost(
            title="Execution Test Blog",
            content="This blog will be published by the schedule execution",
            topic="Execution Test"
        )
        blog_post.save()
        
        social_post = SocialPost(
            content="This social post will be published by schedule execution",
            platform=Platform.TWITTER,
            topic="Execution Test"
        )
        social_post.save()
        
        # Create schedules
        blog_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id
        )
        blog_schedule.save()
        
        social_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            social_post_id=social_post.id
        )
        social_schedule.save()
        
        # Test execute when not due yet
        assert blog_schedule.execute() is False
        
        # Make the schedule due
        blog_schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        # Now execute should work
        assert blog_schedule.execute() is True
        
        # Verify the blog post was published
        updated_blog = BlogPost.get_by_id(blog_post.id)
        assert updated_blog.published is True
        assert updated_blog.published_at is not None
        
        # Verify the schedule was marked completed
        assert blog_schedule.status == ScheduleStatus.COMPLETED
        assert blog_schedule.last_executed_at is not None
        assert blog_schedule.execution_count == 1
        
        # Do the same for social post
        social_schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        assert social_schedule.execute() is True
        
        # Verify the social post was published
        updated_social = SocialPost.get_by_id(social_post.id)
        assert updated_social.status == PostStatus.PUBLISHED
        assert updated_social.published_at is not None
        
        # Try to execute an already completed schedule
        assert blog_schedule.execute() is False
    
    def test_error_handling_and_retries(self, app_context, future_datetime):
        """Test schedule error handling and retry logic"""
        # Create a valid blog post first
        blog_post = BlogPost(
            title="Test Post for Error Handling",
            content="This blog post will be used to test error handling in schedules",
            topic="Error Handling"
        )
        blog_post.save()
        
        # Create a schedule with the valid blog post ID
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id,
            max_retries=3
        )
        schedule.save()
        
        # Make it due for execution
        schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        # Mock the execute method to simulate a failure during execution
        original_execute = schedule.execute
        
        def mock_execute_failure():
            # Simulate a database or network error during execution
            schedule.mark_failed("Simulated database error during execution")
            return False
        
        # Replace the execute method with our mock
        schedule.execute = mock_execute_failure
        
        # Execute will now fail due to our mock
        assert schedule.execute() is False
        
        # Verify error handling
        assert schedule.status == ScheduleStatus.PENDING  # Should be pending for retry
        assert schedule.retry_count == 1
        assert schedule.last_error is not None
        assert "simulated database error" in schedule.last_error.lower()
        assert 'errors' in schedule.schedule_metadata
        assert len(schedule.schedule_metadata['errors']) == 1
        
        # Verify next execution is scheduled with backoff
        assert schedule.next_execution > datetime.now()
        
        # Manually retry maximum times
        for _ in range(2):
            schedule.mark_failed("Simulated failure")
        
        # After max retries, should be marked as failed
        assert schedule.status == ScheduleStatus.FAILED
        assert schedule.retry_count == 3
        assert schedule.next_execution is None
        assert schedule.can_retry is False
        
        # Create another valid blog post for the second test
        blog_post2 = BlogPost(
            title="Test Post for Retry Method",
            content="This blog post will be used to test the retry method",
            topic="Retry Testing"
        )
        blog_post2.save()
        
        # Create another schedule to test retry method
        retry_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post2.id,
            max_retries=3
        )
        retry_schedule.save()
        
        # Make it fail once
        retry_schedule.mark_failed("First failure")
        assert retry_schedule.retry_count == 1
        assert retry_schedule.can_retry is True
        
        # Use the retry method
        original_next_execution = retry_schedule.next_execution
        retry_schedule.retry()
        
        # Verify it's pending again with a new execution time
        assert retry_schedule.status == ScheduleStatus.PENDING
        assert retry_schedule.next_execution != original_next_execution
        assert retry_schedule.next_execution > datetime.now()
        
        # Test progressive failures with retry logic
        # Create another blog post and schedule
        blog_post3 = BlogPost(
            title="Test Post for Progressive Retries",
            content="This blog post will be used to test progressive retry failures",
            topic="Progressive Retries"
        )
        blog_post3.save()
        
        progressive_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post3.id,
            max_retries=3
        )
        progressive_schedule.save()
        
        # Set it as due
        progressive_schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        # Create a mock that fails for the first 2 attempts, then succeeds
        original_execute = progressive_schedule.execute
        failure_count = 0
        
        def mock_progressive_execute():
            nonlocal failure_count
            failure_count += 1
            if failure_count <= 2:
                progressive_schedule.mark_failed(f"Simulated failure #{failure_count}")
                return False
            # On third attempt, mark as completed and return success
            progressive_schedule.mark_completed()
            return True
        
        progressive_schedule.execute = mock_progressive_execute
        
        # First execution should fail
        assert progressive_schedule.execute() is False
        assert progressive_schedule.retry_count == 1
        assert "simulated failure #1" in progressive_schedule.last_error.lower()
        
        # Reset next_execution to simulate passage of time
        progressive_schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        # Second execution should fail
        assert progressive_schedule.execute() is False
        assert progressive_schedule.retry_count == 2
        assert "simulated failure #2" in progressive_schedule.last_error.lower()
        
        # Reset next_execution to simulate passage of time
        progressive_schedule.next_execution = datetime.now() - timedelta(minutes=1)
        db.session.commit()
        
        # Third execution should succeed
        assert progressive_schedule.execute() is True
        assert progressive_schedule.retry_count == 2  # Count remains the same after success
        assert progressive_schedule.status == ScheduleStatus.COMPLETED
    
    def test_status_transitions(self, app_context, future_datetime):
        """Test schedule status transitions"""
        # Create a blog post and schedule
        blog_post = BlogPost(
            title="Status Test Blog",
            content="This blog is for testing status transitions",
            topic="Status Test"
        )
        blog_post.save()
        
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id
        )
        schedule.save()
        
        # Verify initial status
        assert schedule.status == ScheduleStatus.PENDING
        assert schedule.is_pending is True
        
        # Mark completed
        schedule.mark_completed()
        assert schedule.status == ScheduleStatus.COMPLETED
        assert schedule.is_completed is True
        assert schedule.is_pending is False
        
        # Reset for testing other transitions
        schedule.status = ScheduleStatus.PENDING
        db.session.commit()
        
        # Mark failed
        schedule.mark_failed("Test failure")
        assert schedule.status == ScheduleStatus.PENDING  # Still pending for retry
        assert schedule.is_pending is True
        assert schedule.retry_count == 1
        
        # Force max retries to see failed state
        schedule.retry_count = schedule.max_retries
        schedule.mark_failed("Final failure")
        assert schedule.status == ScheduleStatus.FAILED
        assert schedule.is_failed is True
        assert schedule.is_pending is False
        
        # Reset for testing cancel
        schedule.status = ScheduleStatus.PENDING
        db.session.commit()
        
        # Cancel the schedule
        schedule.cancel()
        assert schedule.status == ScheduleStatus.CANCELLED
        assert schedule.is_cancelled is True
        assert schedule.is_pending is False
        assert schedule.next_execution is None
        
        # Test status property methods
        pending_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id
        )
        pending_schedule.save()
        
        # Check status properties
        assert pending_schedule.is_pending is True
        assert pending_schedule.is_completed is False
        assert pending_schedule.is_failed is False
        assert pending_schedule.is_cancelled is False
        
        # Check recurring property
        assert pending_schedule.is_recurring is False
        
        # Change frequency and check again
        pending_schedule.frequency = ScheduleFrequency.WEEKLY
        db.session.commit()
        assert pending_schedule.is_recurring is True
    
    def test_schedule_retrieval_methods(self, app_context, future_datetime):
        """Test methods for retrieving scheduled items"""
        # Create a blog post and social post
        blog_post = BlogPost(
            title="Blog for Schedule Retrieval Test",
            content="Content for testing schedule retrieval",
            topic="Retrieval Test"
        )
        blog_post.save()
        
        social_post = SocialPost(
            content="Social content for schedule retrieval test",
            platform=Platform.TWITTER,
            topic="Retrieval Test"
        )
        social_post.save()
        
        # Create multiple schedules with different statuses
        # Pending schedule for blog
        pending_blog_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id
        )
        pending_blog_schedule.save()
        
        # Completed schedule for blog
        completed_blog_schedule = ScheduledItem(
            scheduled_time=future_datetime - timedelta(hours=1),
            blog_post_id=blog_post.id
        )
        completed_blog_schedule.save()
        completed_blog_schedule.mark_completed()
        
        # Pending schedule for social
        pending_social_schedule = ScheduledItem(
            scheduled_time=future_datetime + timedelta(hours=2),
            social_post_id=social_post.id
        )
        pending_social_schedule.save()
        
        # Failed schedule for social
        failed_social_schedule = ScheduledItem(
            scheduled_time=future_datetime - timedelta(hours=2),
            social_post_id=social_post.id
        )
        failed_social_schedule.save()
        # Force failure
        failed_social_schedule.retry_count = failed_social_schedule.max_retries
        failed_social_schedule.mark_failed("Test failure")
        
        # Test get_all
        all_schedules = ScheduledItem.get_all()
        assert len(all_schedules) == 4
        
        # Test get_by_id
        retrieved_schedule = ScheduledItem.get_by_id(pending_blog_schedule.id)
        assert retrieved_schedule is not None
        assert retrieved_schedule.id == pending_blog_schedule.id
        
        # Test get_pending
        pending_schedules = ScheduledItem.get_pending()
        assert len(pending_schedules) == 2
        
        # Test get_due_items (make one due)
        pending_blog_schedule.next_execution = datetime.now() - timedelta(minutes=5)
        db.session.commit()
        
        due_items = ScheduledItem.get_due_items()
        assert len(due_items) == 1
        assert due_items[0].id == pending_blog_schedule.id
        
        # Test get_by_blog_post
        blog_schedules = ScheduledItem.get_by_blog_post(blog_post.id)
        assert len(blog_schedules) == 2
        
        # Test get_by_social_post
        social_schedules = ScheduledItem.get_by_social_post(social_post.id)
        assert len(social_schedules) == 2
    
    def test_complex_status_transitions(self, app_context, future_datetime):
        """Test more complex status transition scenarios"""
        # Create a blog post to schedule
        blog_post = BlogPost(
            title="Complex Status Test Blog",
            content="Content for testing complex status transitions",
            topic="Status Transitions"
        )
        blog_post.save()
        
        # Create a recurring weekly schedule
        weekly_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.WEEKLY,
            max_executions=3
        )
        weekly_schedule.save()
        
        # Test status flow: pending -> completed (first execution) -> pending (for next execution)
        assert weekly_schedule.status == ScheduleStatus.PENDING
        assert weekly_schedule.execution_count == 0
        
        # First execution
        weekly_schedule.mark_completed()
        assert weekly_schedule.status == ScheduleStatus.PENDING  # Still pending for next execution
        assert weekly_schedule.execution_count == 1
        assert weekly_schedule.next_execution is not None
        
        # Next due date should be one week later
        expected_next_date = future_datetime + timedelta(days=7)
        next_date_diff = abs((weekly_schedule.next_execution - expected_next_date).total_seconds())
        assert next_date_diff < 86400  # Within 24 hours (accounting for DST changes)
        
        # Second execution
        weekly_schedule.mark_completed()
        assert weekly_schedule.status == ScheduleStatus.PENDING  # Still pending for last execution
        assert weekly_schedule.execution_count == 2
        
        # Third and final execution
        weekly_schedule.mark_completed()
        assert weekly_schedule.status == ScheduleStatus.COMPLETED  # Now completed
        assert weekly_schedule.execution_count == 3
        assert weekly_schedule.next_execution is None
        
        # Test failed execution recovery
        retry_schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id,
            max_retries=2
        )
        retry_schedule.save()
        
        # First failure
        retry_schedule.mark_failed("First failure")
        assert retry_schedule.status == ScheduleStatus.PENDING  # Still pending for retry
        assert retry_schedule.retry_count == 1
        
        # Recovery - successful execution after failure
        retry_schedule.next_execution = datetime.now() - timedelta(minutes=1)  # Make it due
        retry_schedule.blog_post_id = blog_post.id  # Make it a valid reference
        db.session.commit()
        
        # Should now execute successfully
        assert retry_schedule.execute() is True
        assert retry_schedule.status == ScheduleStatus.COMPLETED
        assert retry_schedule.retry_count == 1  # Retry count should remain at 1
    
    def test_schedule_metadata_handling(self, app_context, future_datetime):
        """Test handling metadata in scheduled items"""
        # Create a schedule with metadata
        blog_post = BlogPost(
            title="Metadata Test Blog",
            content="Content for testing schedule metadata",
            topic="Metadata Test"
        )
        blog_post.save()
        
        # Create schedule with metadata
        initial_metadata = {
            "source": "test_suite",
            "priority": "high",
            "tags": ["test", "metadata", "scheduling"],
            "notes": "This is a test schedule with metadata"
        }
        
        schedule = ScheduledItem(
            scheduled_time=future_datetime,
            blog_post_id=blog_post.id,
            schedule_metadata=initial_metadata
        )
        schedule.save()
        
        # Retrieve and verify metadata
        retrieved_schedule = ScheduledItem.get_by_id(schedule.id)
        assert retrieved_schedule.schedule_metadata == initial_metadata
        assert retrieved_schedule.schedule_metadata["priority"] == "high"
        assert "test" in retrieved_schedule.schedule_metadata["tags"]
        
        # Update metadata
        updated_metadata = initial_metadata.copy()
        updated_metadata["priority"] = "medium"
        updated_metadata["execution_notes"] = "Added during testing"
        
        schedule.update(schedule_metadata=updated_metadata)
        
        # Verify updated metadata
        updated_schedule = ScheduledItem.get_by_id(schedule.id)
        assert updated_schedule.schedule_metadata["priority"] == "medium"
        assert updated_schedule.schedule_metadata["execution_notes"] == "Added during testing"
        assert len(updated_schedule.schedule_metadata) == len(initial_metadata) + 1
        
        # Test metadata updates during execution flow
        # Failure adds error data
        schedule.mark_failed("Test failure for metadata")
        assert "errors" in schedule.schedule_metadata
        assert len(schedule.schedule_metadata["errors"]) == 1
        assert "Test failure" in schedule.schedule_metadata["errors"][0]["message"]

    def test_monthly_schedule_edge_cases(self, app_context):
        """Test edge cases in monthly schedule recurrence"""
        from datetime import datetime, timedelta
        
        # Create a test blog post for the schedules
        blog_post = BlogPost(
            title="Test Post",
            content="Test content",
            topic="Testing"
        )
        blog_post.save()
        
        # Get next year's January 31st (to ensure it's in the future)
        now = datetime.now()
        next_year = now.year + 1
        start_date = datetime(next_year, 1, 31, 12, 0)
        schedule = ScheduledItem(
            scheduled_time=start_date,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.MONTHLY,
            max_executions=5
        )
        schedule.save()
        
        # Test first execution - January 31st to February 28th/29th
        # The next date should be February 28th (or 29th in leap years)
        schedule.mark_completed()
        
        # Determine if next year is a leap year
        is_leap_year = (next_year % 4 == 0 and next_year % 100 != 0) or (next_year % 400 == 0)
        feb_last_day = 29 if is_leap_year else 28
        
        # Expected February date
        expected_feb_date = datetime(next_year, 2, feb_last_day, 12, 0)
        
        # Compare with a reasonable threshold (1 minute = 60 seconds)
        time_diff = abs((schedule.next_execution - expected_feb_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_feb_date}, got {schedule.next_execution}, diff {time_diff}s"
        
        # Test second execution - February to March 31st
        schedule.mark_completed()
        expected_march_date = datetime(next_year, 3, 31, 12, 0)
        time_diff = abs((schedule.next_execution - expected_march_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_march_date}, got {schedule.next_execution}, diff {time_diff}s"
        
        # Test third execution - March 31st to April 30th
        schedule.mark_completed()
        expected_april_date = datetime(next_year, 4, 30, 12, 0)
        time_diff = abs((schedule.next_execution - expected_april_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_april_date}, got {schedule.next_execution}, diff {time_diff}s"
        
        # Test another case: schedule starting on the 30th of a month
        start_date_30th = datetime(next_year, 4, 30, 12, 0)
        schedule_30th = ScheduledItem(
            scheduled_time=start_date_30th,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.MONTHLY,
            max_executions=3
        )
        schedule_30th.save()
        
        # Test first execution - April 30th to May 30th
        schedule_30th.mark_completed()
        expected_may_date = datetime(next_year, 5, 30, 12, 0)
        time_diff = abs((schedule_30th.next_execution - expected_may_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_may_date}, got {schedule_30th.next_execution}, diff {time_diff}s"
        
        # Test second execution - May 30th to June 30th
        schedule_30th.mark_completed()
        expected_june_date = datetime(next_year, 6, 30, 12, 0)
        time_diff = abs((schedule_30th.next_execution - expected_june_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_june_date}, got {schedule_30th.next_execution}, diff {time_diff}s"
        
        # Test edge case: scheduling from a month with 31 days to a month with 30 days
        start_date_may31 = datetime(next_year, 5, 31, 12, 0)
        schedule_may31 = ScheduledItem(
            scheduled_time=start_date_may31,
            blog_post_id=blog_post.id,
            frequency=ScheduleFrequency.MONTHLY,
            max_executions=2
        )
        schedule_may31.save()
        
        # Test execution - May 31st to June 30th (last day of the month)
        schedule_may31.mark_completed()
        expected_june_date = datetime(next_year, 6, 30, 12, 0)
        time_diff = abs((schedule_may31.next_execution - expected_june_date).total_seconds())
        assert time_diff < 60, f"Expected {expected_june_date}, got {schedule_may31.next_execution}, diff {time_diff}s"
    def test_transaction_rollback_handling(self, app_context):
        """Test handling of transaction rollbacks"""
        from datetime import datetime, timedelta
        from sqlalchemy.exc import IntegrityError
        
        future_time = datetime.now() + timedelta(days=1)
        
        # Create a blog post
        blog_post = BlogPost(
            title="Test Post",
            content="Test content",
            topic="Testing"
        )
        blog_post.save()
        
        # Create a schedule with valid blog post
        schedule = ScheduledItem(
            scheduled_time=future_time,
            blog_post_id=blog_post.id
        )
        schedule.save()
        
        # Try to update with invalid ID using direct DB operation
        with pytest.raises(IntegrityError):
            with db.session.begin_nested():
                schedule.blog_post_id = "nonexistent-id"
                db.session.flush()
        
        # Verify original relationship is maintained
        db.session.refresh(schedule)
        assert schedule.blog_post_id == blog_post.id
    pytest.main(["-v", __file__])
