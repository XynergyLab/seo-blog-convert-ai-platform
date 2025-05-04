#!/usr/bin/env python
"""
Database Initialization Script

This script initializes the database with required tables and initial configuration.
"""
import os
import sys
from flask import Flask
from app import create_app
from app.database import db, init_db
from app.models.configuration import Configuration

# LM Studio default models for different tasks
DEFAULT_MODELS = {
    'blog': 'mistral-7b-instruct-v0.3',
    'social': 'qwen2.5-7b-instruct-1m',
    'code': 'yi-coder-9b-chat',
    'data': 'qwen2.5-coder-14b-instruct',
    'embedding': 'text-embedding-nomic-embed-text-v1.5'
}

# Default LM Studio API settings
DEFAULT_API_SETTINGS = {
    'timeout': 30,
    'retries': 3,
    'host': 'localhost',
    'port': 1240,
}

def init_lm_studio_config(app):
    """Initialize LM Studio configuration"""
    # Set LM Studio API configuration
    api_config = {
        'url': os.environ.get('LM_STUDIO_API_URL', f"http://{DEFAULT_API_SETTINGS['host']}:{DEFAULT_API_SETTINGS['port']}"),
        'timeout': int(os.environ.get('LM_STUDIO_API_TIMEOUT', DEFAULT_API_SETTINGS['timeout'])),
        'retries': int(os.environ.get('LM_STUDIO_API_RETRIES', DEFAULT_API_SETTINGS['retries'])),
    }
    
    # Set default models
    models = {
        'blog': os.environ.get('BLOG_MODEL', DEFAULT_MODELS['blog']),
        'social': os.environ.get('SOCIAL_MODEL', DEFAULT_MODELS['social']),
        'code': os.environ.get('CODE_MODEL', DEFAULT_MODELS['code']),
        'data': os.environ.get('DATA_MODEL', DEFAULT_MODELS['data']),
        'embedding': os.environ.get('EMBEDDING_MODEL', DEFAULT_MODELS['embedding']),
    }
    
    # Initialize LM Studio endpoint configurations
    endpoints = {
        'models': os.environ.get('LM_STUDIO_MODELS_ENDPOINT', f"{api_config['url']}/v1/models"),
        'chat': os.environ.get('LM_STUDIO_CHAT_ENDPOINT', f"{api_config['url']}/v1/chat/completions"),
        'completions': os.environ.get('LM_STUDIO_COMPLETIONS_ENDPOINT', f"{api_config['url']}/v1/completions"),
        'embeddings': os.environ.get('LM_STUDIO_EMBEDDINGS_ENDPOINT', f"{api_config['url']}/v1/embeddings"),
    }
    
    # Save configuration to database
    with app.app_context():
        Configuration.set_group('lm_studio.api', api_config, "LM Studio API configuration")
        Configuration.set_group('lm_studio.models', models, "Default models for different content types")
        Configuration.set_group('lm_studio.endpoints', endpoints, "LM Studio API endpoints")

def init_app_config(app):
    """Initialize application configuration"""
    app_config = {
        'name': 'AI Agent MVP',
        'debug': os.environ.get('DEBUG', 'True').lower() in ('true', 't', '1', 'yes', 'y'),
        'content_storage_path': os.environ.get('CONTENT_STORAGE_PATH', 'content_storage'),
        'log_level': os.environ.get('LOG_LEVEL', 'INFO'),
    }
    
    # Save configuration to database
    with app.app_context():
        Configuration.set_group('app', app_config, "Application configuration")

def init_social_config(app):
    """Initialize social media configuration"""
    # Twitter/X configuration
    twitter_config = {
        'api_key': os.environ.get('TWITTER_API_KEY', ''),
        'api_secret': os.environ.get('TWITTER_API_SECRET', ''),
        'access_token': os.environ.get('TWITTER_ACCESS_TOKEN', ''),
        'access_secret': os.environ.get('TWITTER_ACCESS_SECRET', ''),
        'enabled': bool(os.environ.get('TWITTER_API_KEY', '')),
    }
    
    # Facebook configuration
    facebook_config = {
        'app_id': os.environ.get('FACEBOOK_APP_ID', ''),
        'app_secret': os.environ.get('FACEBOOK_APP_SECRET', ''),
        'access_token': os.environ.get('FACEBOOK_ACCESS_TOKEN', ''),
        'enabled': bool(os.environ.get('FACEBOOK_APP_ID', '')),
    }
    
    # LinkedIn configuration
    linkedin_config = {
        'client_id': os.environ.get('LINKEDIN_CLIENT_ID', ''),
        'client_secret': os.environ.get('LINKEDIN_CLIENT_SECRET', ''),
        'access_token': os.environ.get('LINKEDIN_ACCESS_TOKEN', ''),
        'enabled': bool(os.environ.get('LINKEDIN_CLIENT_ID', '')),
    }
    
    # Save configuration to database
    with app.app_context():
        Configuration.set_group('social.twitter', twitter_config, "Twitter/X API configuration")
        Configuration.set_group('social.facebook', facebook_config, "Facebook API configuration")
        Configuration.set_group('social.linkedin', linkedin_config, "LinkedIn API configuration")

def init_database():
    """Initialize the database with tables and initial configuration"""
    # Create Flask app
    app = create_app()
    
    # Initialize database
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Initialize configuration
        init_lm_studio_config(app)
        init_app_config(app)
        init_social_config(app)
        
        print("Database initialized successfully!")

if __name__ == "__main__":
    # Run database initialization
    init_database()

