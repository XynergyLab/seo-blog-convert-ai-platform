import os
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
import json

from app import create_app
from app.models.blog import BlogPost

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = create_app({
        'TESTING': True,
        'SECRET_KEY': 'test_key',
        'SERVER_NAME': 'localhost'
    })
    
    # Create app context
    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    """Test client for our Flask app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Test CLI runner for our Flask app."""
    return app.test_cli_runner()

@pytest.fixture
def sample_blog_post():
    """Create a sample blog post for testing."""
    post = BlogPost(
        title="Test Blog Post",
        content="This is a test blog post content.",
        topic="Testing",
        keywords="test, blog, pytest",
        metadata={
            "model": "test-model",
            "prompt_tokens": 10,
            "completion_tokens": 50,
            "total_tokens": 60,
            "tone": "professional",
            "requested_length": "medium"
        }
    ).save()
    
    yield post
    
    # Cleanup
    BlogPost.clear_all()

@pytest.fixture
def mock_lm_studio_response():
    """Mock response from LM Studio API."""
    return {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1684683464,
        "model": "gpt-3.5-turbo-0125",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "# Test Blog Post\n\nThis is a generated blog post about testing. It covers various aspects of testing in software development.\n\n## Why Testing is Important\n\nTesting ensures that your code works as expected. It helps catch bugs early in the development cycle.\n\n## Types of Testing\n\n1. Unit Testing\n2. Integration Testing\n3. End-to-End Testing\n\nIn conclusion, testing is a critical part of software development."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 42,
            "completion_tokens": 95,
            "total_tokens": 137
        }
    }


# Model Tests
class TestBlogPostModel:
    def test_create_blog_post(self):
        """Test creating a new blog post."""
        post = BlogPost(
            title="Test Post",
            content="Test content",
            topic="Testing"
        ).save()
        
        assert post.id is not None
        assert post.title == "Test Post"
        assert post.content == "Test content"
        assert post.topic == "Testing"
        assert post.published is False
        
        # Cleanup
        BlogPost.clear_all()
    
    def test_update_blog_post(self):
        """Test updating a blog post."""
        post = BlogPost(
            title="Original Title",
            content="Original content",
            topic="Original topic"
        ).save()
        
        post_id = post.id
        
        # Update the post
        post.update(
            title="Updated Title",
            content="Updated content"
        )
        
        # Retrieve the post again to verify updates
        updated_post = BlogPost.get_by_id(post_id)
        
        assert updated_post.title == "Updated Title"
        assert updated_post.content == "Updated content"
        assert updated_post.topic == "Original topic"  # Unchanged
        
        # Cleanup
        BlogPost.clear_all()
    
    def test_delete_blog_post(self):
        """Test deleting a blog post."""
        post = BlogPost(
            title="Post to Delete",
            content="This post will be deleted",
            topic="Deletion"
        ).save()
        
        post_id = post.id
        
        # Verify post exists
        assert BlogPost.get_by_id(post_id) is not None
        
        # Delete post
        result = post.delete()
        
        # Verify deletion was successful
        assert result is True
        assert BlogPost.get_by_id(post_id) is None
        
        # Cleanup
        BlogPost.clear_all()
    
    def test_publish_blog_post(self):
        """Test publishing a blog post."""
        post = BlogPost(
            title="Draft Post",
            content="This is a draft post",
            topic="Publishing"
        ).save()
        
        assert post.published is False
        assert post.published_at is None
        
        # Publish the post
        post.publish()
        
        assert post.published is True
        assert post.published_at is not None
        
        # Cleanup
        BlogPost.clear_all()
    
    def test_get_all_posts(self):
        """Test retrieving all blog posts."""
        # Clear all existing posts
        BlogPost.clear_all()
        
        # Create several posts
        for i in range(3):
            BlogPost(
                title=f"Post {i}",
                content=f"Content {i}",
                topic=f"Topic {i}"
            ).save()
        
        # Get all posts
        posts = BlogPost.get_all()
        
        assert len(posts) == 3
        assert set(post.title for post in posts) == {"Post 0", "Post 1", "Post 2"}
        
        # Cleanup
        BlogPost.clear_all()
    
    def test_get_published_and_drafts(self):
        """Test retrieving published posts and drafts separately."""
        # Clear all existing posts
        BlogPost.clear_all()
        
        # Create posts with mixed publication status
        for i in range(4):
            post = BlogPost(
                title=f"Post {i}",
                content=f"Content {i}",
                topic=f"Topic {i}"
            ).save()
            
            # Publish every second post
            if i % 2 == 0:
                post.publish()
        
        # Get published posts
        published = BlogPost.get_published()
        
        # Get draft posts
        drafts = BlogPost.get_drafts()
        
        assert len(published) == 2
        assert len(drafts) == 2
        
        # Verify correct posts in each category
        published_titles = {post.title for post in published}
        draft_titles = {post.title for post in drafts}
        
        assert published_titles == {"Post 0", "Post 2"}
        assert draft_titles == {"Post 1", "Post 3"}
        
        # Cleanup
        BlogPost.clear_all()


# Route Tests
class TestBlogRoutes:
    def test_index_route(self, client):
        """Test blog index route."""
        response = client.get('/blog/')
        
        assert response.status_code == 200
        assert b'Blog Post Generator' in response.data
    
    @patch('app.routes.blog.LMStudioClient')
    def test_generate_route(self, mock_lm_studio_client, client, mock_lm_studio_response):
        """Test blog generation route."""
        # Set up the mock
        mock_client_instance = MagicMock()
        mock_client_instance.check_connection.return_value = True
        mock_client_instance.create_chat_completion.return_value = mock_lm_studio_response
        mock_lm_studio_client.return_value = mock_client_instance
        
        # Make request to generate a blog post
        response = client.post('/blog/generate', data={
            'title': 'My Test Blog',
            'topic': 'Unit Testing',
            'tone': 'professional',
            'length': 'medium',
            'keywords': 'tests, pytest, mocking'
        }, follow_redirects=True)
        
        # Check successful generation and redirect to preview
        assert response.status_code == 200
        assert b'Blog Post Preview' in response.data
        assert b'My Test Blog' in response.data
        
        # Verify the mock was called
        mock_client_instance.create_chat_completion.assert_called_once()
    
    @patch('app.routes.blog.LMStudioClient')
    def test_generate_with_api_error(self, mock_lm_studio_client, client):
        """Test blog generation with API error."""
        # Set up the mock to simulate API error
        mock_client_instance = MagicMock()
        mock_client_instance.check_connection.return_value = False
        mock_lm_studio_client.return_value = mock_client_instance
        
        # Make request to generate a blog post
        response = client.post('/blog/generate', data={
            'title': 'My Test Blog',
            'topic': 'Unit Testing',
            'tone': 'professional',
            'length': 'medium',
            'keywords': 'tests, pytest, mocking'
        }, follow_redirects=True)
        
        # Check error message
        assert response.status_code == 200
        assert b'Cannot connect to LM Studio API' in response.data
    
    def test_preview_route(self, client, sample_blog_post):
        """Test blog preview route."""
        response = client.get(f'/blog/preview/{sample_blog_post.id}')
        
        assert response.status_code == 200
        assert b'Test Blog Post' in response.data
        assert b'This is a test blog post content.' in response.data
    
    def test_preview_nonexistent_post(self, client):
        """Test preview for nonexistent post."""
        response = client.get('/blog/preview/nonexistent-id', follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Blog post not found' in response.data
    
    def test_edit_route(self, client, sample_blog_post):
        """Test blog edit route."""
        response = client.post(
            f'/blog/edit/{sample_blog_post.id}',
            data={
                'title': 'Updated Test Title',
                'content': 'Updated test content.'
            },
            follow_redirects=True
        )
        
        assert response.status_code == 200
        assert b'Blog post updated successfully' in response.data
        assert b'Updated Test Title' in response.data
        assert b'Updated test content.' in response.data
    
    def test_publish_route(self, client, sample_blog_post):
        """Test blog publish route."""
        response = client.post(
            f'/blog/publish/{sample_blog_post.id}',
            follow_redirects=True
        )
        
        assert response.status_code == 200
        assert b'Blog post published successfully' in response.data
        
        # Check that post shows as published
        updated_post = BlogPost.get_by_id(sample_blog_post.id)
        assert updated_post.published is True
    
    def test_delete_route(self, client, sample_blog_post):
        """Test blog delete route."""
        post_id = sample_blog_post.id
        
        response = client.post(
            f'/blog/delete/{post_id}',
            follow_redirects=True
        )
        
        assert response.status_code == 200
        assert b'Blog post deleted successfully' in response.data
        
        # Verify post no longer exists
        assert BlogPost.get_by_id(post_id) is None
    
    def test_list_posts_route(self, client, sample_blog_post):
        """Test blog list route."""
        response = client.get('/blog/list')
        
        assert response.status_code == 200
        assert b'Test Blog Post' in response.data
        assert b'Testing' in response.data


# Integration Tests
class TestLMStudioIntegration:
    @patch('app.services.lmstudio.requests.get')
    def test_lm_studio_models_endpoint(self, mock_get, app):
        """Test integration with LM Studio models endpoint."""
        # Mock response for the models endpoint
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "model1",
                    "object": "model",
                    "created": 1677649963,
                    "owned_by": "lm-studio"
                },
                {
                    "id": "model2",
                    "object": "model",
                    "created": 1677649963,
                    "owned_by": "lm-studio"
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Create LM Studio client
        from app.services.lmstudio import LMStudioClient
        client = LMStudioClient()
        
        # Call the list_models method
        models = client.list_models()
        
        # Verify the request was made correctly
        mock_get.assert_called_once_with(
            f"{client.api_url}/v1/models",
            params=None,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout=client.timeout
        )
        
        # Verify the response was processed correctly
        assert len(models) == 2
        assert models[0]['id'] == 'model1'
        assert models[1]['id'] == 'model2'
    
    @patch('app.services.lmstudio.requests.post')
    def test_chat_completion_generation(self, mock_post, app):
        """Test chat completion generation."""
        # Mock response for the chat completions endpoint
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "id": "chatcmpl-456",
            "object": "chat.completion",
            "created": 1677858242,
            "model": "test-model",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "This is a test response from the assistant."
                    },
                    "finish_reason": "stop",
                    "index": 0
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
        mock_post.return_value = mock_response
        
        # Create LM Studio client
        from app.services.lmstudio import LMStudioClient
        client = LMStudioClient()
        
        # Test data
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me something interesting."}
        ]
        
        # Call the chat completion method
        response = client.create_chat_completion(messages=messages, model="test-model")
        
        # Verify the request was made correctly
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == f"{client.api_url}/v1/chat/completions"
        
        # Verify the json data contains expected values
        json_data = call_args[1]['json']
        assert json_data['model'] == 'test-model'
        assert json_data['messages'] == messages
        
        # Verify the response was processed correctly
        assert response['choices'][0]['message']['content'] == "This is a test response from the assistant."
    
    @patch('app.services.lmstudio.requests.post')
    @patch('app.services.lmstudio.time.sleep')  # Mock sleep to avoid waiting during tests
    def test_error_handling_and_retries(self, mock_sleep, mock_post, app):
        """Test error handling and retry logic."""
        # Set up mock to fail twice and succeed on third attempt
        connection_error = requests.exceptions.ConnectionError("Connection refused")
        timeout_error = requests.exceptions.Timeout("Request timed out")
        
        # Success response for the final attempt
        success_response = MagicMock()
        success_response.status_code = 200
        success_response.raise_for_status.return_value = None
        success_response.json.return_value = {
            "id": "chatcmpl-789",
            "object": "chat.completion",
            "created": 1677858242,
            "model": "test-model",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Success after retries!"
                    },
                    "finish_reason": "stop",
                    "index": 0
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
        
        # Configure mock to fail twice then succeed
        mock_post.side_effect = [connection_error, timeout_error, success_response]
        
        # Create LM Studio client with 2 retries
        from app.services.lmstudio import LMStudioClient
        client = LMStudioClient(max_retries=2)
        
        # Test data
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me something interesting."}
        ]
        
        # Call the chat completion method
        response = client.create_chat_completion(messages=messages)
        
        # Verify number of attempts
        assert mock_post.call_count == 3
        
        # Verify sleep was called for backoff (twice - once after each failure)
        assert mock_sleep.call_count == 2
        
        # Verify the response from the successful attempt
        assert response['choices'][0]['message']['content'] == "Success after retries!"
    
    @patch('app.services.lmstudio.requests.post')
    @patch('app.services.lmstudio.time.sleep')
    def test_max_retries_exceeded(self, mock_sleep, mock_post, app):
        """Test when max retries are exceeded."""
        # Set up mock to always fail with timeout
        timeout_error = requests.exceptions.Timeout("Request timed out")
        mock_post.side_effect = timeout_error
        
        # Create LM Studio client with 2 retries
        from app.services.lmstudio import LMStudioClient, LMStudioAPIError
        client = LMStudioClient(max_retries=2)
        
        # Test data
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me something interesting."}
        ]
        
        # Call the chat completion method - should raise after retries
        with pytest.raises(LMStudioAPIError) as excinfo:
            client.create_chat_completion(messages=messages)
        
        # Verify number of attempts (initial + 2 retries = 3)
        assert mock_post.call_count == 3
        
        # Verify sleep was called for backoff (twice - once after each failure)
        assert mock_sleep.call_count == 2
        
        # Verify the error message indicates retries were attempted
        assert "after 3 attempts" in str(excinfo.value)
        assert "Request timed out" in str(excinfo.value)
    
    @patch('app.services.lmstudio.requests.post')
    def test_api_error_response(self, mock_post, app):
        """Test handling of API error responses."""
        # Create a mock response with a 400 error
        error_response = MagicMock()
        error_response.status_code = 400
        error_response.raise_for_status.side_effect = requests.exceptions.HTTPError("400 Client Error")
        error_response.json.return_value = {
            "error": {
                "message": "Invalid request parameters",
                "type": "invalid_request_error",
                "code": "invalid_model"
            }
        }
        mock_post.return_value = error_response
        
        # Create LM Studio client
        from app.services.lmstudio import LMStudioClient, LMStudioAPIError
        client = LMStudioClient(max_retries=0)  # No retries for this test
        
        # Test data
        messages = [
            {"role": "user", "content": "Tell me something interesting."}
        ]
        
        # Call the chat completion method - should raise API error
        with pytest.raises(LMStudioAPIError) as excinfo:
            client.create_chat_completion(messages=messages)
        
        # Error message should contain the API error details
        assert "API error" in str(excinfo.value)
        assert "Invalid request parameters" in str(excinfo.value)
    
    @patch('app.services.lmstudio.requests.get')
    def test_connection_status_checking(self, mock_get, app):
        """Test checking connection status to LM Studio API."""
        # Set up mock for successful connection
        success_response = MagicMock()
        success_response.status_code = 200
        success_response.raise_for_status.return_value = None
        success_response.json.return_value = {"data": [{"id": "model1"}]}
        
        # Set up mock for failed connection
        connection_error = requests.exceptions.ConnectionError("Connection refused")
        
        # Create LM Studio client
        from app.services.lmstudio import LMStudioClient
        client = LMStudioClient()
        
        # Test 1: Successful connection
        mock_get.return_value = success_response
        assert client.check_connection() is True
        
        # Test 2: Failed connection
        mock_get.side_effect = connection_error
        assert client.check_connection() is False
        
        # Verify get was called twice
        assert mock_get.call_count == 2

