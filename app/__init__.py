import os
import requests
import time
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import text, create_engine
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app.extensions import db, migrate
import logging
from logging.config import dictConfig

# Load environment variables from .env file in the config directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', '.env')
load_dotenv(dotenv_path=dotenv_path)

def create_app(test_config=None):
    # Create and configure the app
    # Note: instance_relative_config=True is less useful now as we set instance_path manually
    app = Flask(__name__, instance_relative_config=False)
    # Explicitly set the instance path relative to the project root (one level up from app)
    app.instance_path = os.path.join(app.root_path, '..', 'config', 'instance')

    # Initialize CORS
    cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '*')
    if cors_origins != '*':
        cors_origins = [origin.strip() for origin in cors_origins.split(',')]
    CORS(app, resources={r"/*": {"origins": cors_origins}})
    
    # Set environment configuration
    env = os.environ.get('FLASK_ENV', os.environ.get('ENV', 'development')).lower()
    app.config['ENV'] = env
    app.config['DEBUG'] = env != 'production' and os.environ.get('DEBUG', 'True').lower() in ('true', 't', '1', 'yes')
    
    # Default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        LM_STUDIO_API_URL=os.environ.get('LM_STUDIO_API_URL', 'http://10.0.0.140:1240'),
        LM_STUDIO_MODELS_ENDPOINT=os.environ.get('LM_STUDIO_MODELS_ENDPOINT'),
        LM_STUDIO_CHAT_ENDPOINT=os.environ.get('LM_STUDIO_CHAT_ENDPOINT'),
        LM_STUDIO_COMPLETIONS_ENDPOINT=os.environ.get('LM_STUDIO_COMPLETIONS_ENDPOINT'),
        LM_STUDIO_EMBEDDINGS_ENDPOINT=os.environ.get('LM_STUDIO_EMBEDDINGS_ENDPOINT'),
        LM_STUDIO_API_TIMEOUT=int(os.environ.get('LM_STUDIO_API_TIMEOUT', 30)),
        LM_STUDIO_API_RETRIES=int(os.environ.get('LM_STUDIO_API_RETRIES', 3)),
        WSL_HOST_IP=os.environ.get('WSL_HOST_IP', '172.22.178.90'),
    )
    
    # Import and configure database
    from app.database import get_db_config_for_app
    get_db_config_for_app(app)
    
    if test_config is None:
        # Load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)
    
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # Initialize extensions with app
    db.init_app(app)
    # Specify the path to the migrations directory relative to the project root
    migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'migrations')
    migrate.init_app(app, db, directory=migrations_dir)

    # Basic logging config to ensure output goes to stderr
    dictConfig({
        'version': 1,
        'formatters': {'default': {
            'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        }},
        'handlers': {'wsgi': {
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stderr',
            'formatter': 'default'
        }},
        'root': {
            'level': 'INFO', # Or DEBUG for more verbosity
            'handlers': ['wsgi']
        }
    })

    # Ensure Flask uses this logger
    app.logger.handlers.clear() # Remove default handlers if any
    # Find the root handler we just configured
    handler = logging.getLogger().handlers[0]
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO) # Match root level or set explicitly

    app.logger.info("Flask logger configured for stderr output.")

    # Database connection retry mechanism
    def init_db_with_retry(max_retries=5, retry_interval=2):
        retries = 0
        while retries < max_retries:
            try:
                with app.app_context():
                    # Test database connection
                    db.session.execute(text("SELECT 1")).scalar()
                    app.logger.info("Database connection established successfully")
                    
                    # Create tables for testing/development if needed
                    if app.config.get('ENV') != 'production':
                        db.create_all()
                        app.logger.info("Database tables created successfully")
                return True
            except OperationalError as e:
                retries += 1
                app.logger.warning(f"Database connection attempt {retries}/{max_retries} failed: {e}")
                if retries < max_retries:
                    time.sleep(retry_interval)
                else:
                    app.logger.error(f"Failed to connect to database after {max_retries} attempts")
                    return False
            except Exception as e:
                app.logger.error(f"Unexpected error during database initialization: {e}")
                return False
    
    # Initialize database with retry mechanism
    init_db_with_retry()
    
    # Register error handlers
    # Helper function to determine if request is for API
    def is_api_request():
        return request.path.startswith('/api')

    @app.errorhandler(404)
    def page_not_found(e):
        if is_api_request():
            return jsonify({"error": "Not found", "message": "The requested resource does not exist"}), 404
        else:
            return render_template('error.html', error="404 - Page Not Found"), 404

    @app.errorhandler(500)
    def server_error(e):
        if is_api_request():
            return jsonify({"error": "Server error", "message": "Internal server error occurred"}), 500
        else:
            return render_template('error.html', error="500 - Internal Server Error"), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Log the error
        app.logger.error(f"Unhandled exception: {str(e)}")
        if is_api_request():
            return jsonify({"error": "Server error", "message": str(e)}), 500
        else:
            return render_template('error.html', error="An unexpected error occurred"), 500

    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            "name": "LM Studio Agents API",
            "version": "1.0.0",
            "status": "online",
            "endpoints": {
                "health": "/health",
                "api": "/api",
                "blog": "/api/blog",
                "social": "/api/social"
            }
        })

    # A comprehensive health check that includes LM Studio connectivity
    @app.route('/health')
    def health_check():
        health_data = {
            "status": "ok",
            "components": {
                "api": "ok",
                "database": "ok",
                "lm_studio": "unknown"
            }
        }
        
        # Check database connection
        try:
            result = db.session.execute(text('SELECT 1 AS is_alive')).scalar()
            if result == 1:
                health_data["components"]["database"] = "ok"
            else:
                raise Exception(f"Unexpected result from database: {result}")
            db.session.commit()
        except Exception as e:
            app.logger.error(f"Database health check failed: {str(e)}")
            health_data["components"]["database"] = "error"
            health_data["database_error"] = str(e)
            health_data["status"] = "degraded"

        # Check LM Studio API connection
        try:
            models_endpoint = app.config.get('LM_STUDIO_MODELS_ENDPOINT') or f"{app.config['LM_STUDIO_API_URL']}/v1/models"
            response = requests.get(
                models_endpoint, 
                timeout=app.config['LM_STUDIO_API_TIMEOUT']
            )
            if response.status_code == 200:
                health_data["components"]["lm_studio"] = "ok"
                # Add models information
                try:
                    models_data = response.json()
                    if "data" in models_data:
                        health_data["lm_studio_models"] = [model.get("id") for model in models_data["data"]]
                except:
                    pass
            else:
                health_data["components"]["lm_studio"] = "error"
                health_data["lm_studio_error"] = f"Status code: {response.status_code}"
                health_data["status"] = "degraded"
        except Exception as e:
            app.logger.error(f"LM Studio health check failed: {str(e)}")
            health_data["components"]["lm_studio"] = "error"
            health_data["lm_studio_error"] = str(e)
            health_data["status"] = "degraded"

        return jsonify(health_data)

    # Register blueprints and import models within app context
    with app.app_context():
        from app.routes.blog import bp as blog_bp
        from app.routes.social import bp as social_bp
        from app.routes.api import bp as api_bp # Import the new api blueprint
        
        # Register blueprints with proper URL prefixes
        app.register_blueprint(blog_bp, url_prefix='/api/blog')
        app.register_blueprint(social_bp, url_prefix='/api/social')
        app.register_blueprint(api_bp, url_prefix='/api') # Register the new api blueprint
        
        # Import models to ensure they're registered with SQLAlchemy
        from app.models import blog, social, scheduling, configuration

    return app
