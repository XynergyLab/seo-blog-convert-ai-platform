# Seo-Blog-Conversion AI Platform

A cutting-edge AI-powered platform designed to revolutionize content creation, SEO optimization, and blog conversion strategies. Leveraging local Large Language Models (LLMs) through LM Studio, this platform generates high-quality, SEO-optimized content that drives organic traffic and engagement.

![Seo-Blog-Conversion AI Platform](docs/screenshots/platform-overview.png)

## Key Differentiators

- **AI-Driven SEO Content Generation**: Create search-engine optimized blog posts that align with current SEO best practices
- **Intelligent Keyword Integration**: Automatically identify and strategically place high-value keywords
- **Content Performance Prediction**: Use AI to forecast potential article performance and engagement metrics
- **Multi-Platform Content Adaptation**: Generate content tailored for different platforms and audience segments

## Advanced Features

### 🚀 SEO-Optimized Content Generation
- Advanced AI-powered blog post creation
- Real-time SEO scoring and optimization
- Automatic metadata and snippet generation
- Content gap analysis and recommendation

### 🔍 Intelligent Keyword Strategy
- Semantic keyword research
- Long-tail keyword identification
- Keyword density optimization
- Contextual keyword placement

### 📊 Content Performance Analytics
- AI-driven engagement prediction
- Competitive content benchmarking
- Automated content improvement suggestions
- Performance tracking and insights

### 🌐 Multi-Platform Content Adaptation
- Cross-platform content generation
- Platform-specific content optimization
- Adaptive tone and style matching
- Social media snippet generation

### 🤖 Advanced LLM Integration
- Local LLM support via LM Studio
- Model agnostic architecture
- Advanced prompt engineering
- Configurable AI creativity levels

## Installation

### Prerequisites

- Python 3.11+
- LM Studio (with a running local server)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/XynergyLab/seo-blog-convert-ai-platform.git
cd seo-blog-convert-ai-platform
```

### Step 2: Create and Activate Virtual Environment

#### Windows
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### macOS/Linux
```bash
python -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

## Environment Setup
Create a `.env` file in the `config/` directory with the following configuration:

```
# Place this file in the config/ directory
# Flask application settings
# Flask application settings
SECRET_KEY=your_secure_secret_key
FLASK_APP=app.py
FLASK_ENV=development
DEBUG=True

# LM Studio API configuration
LM_STUDIO_API_URL=http://localhost:1234
LM_STUDIO_API_TIMEOUT=30
LM_STUDIO_API_RETRIES=3

# Social Media API credentials (for production use)
# Twitter / X
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Content storage settings
CONTENT_STORAGE_PATH=content_storage
```

Replace the values with your actual configuration. For the MVP, the social media credentials are not required as actual posting is simulated.

## Running the Application

### Starting LM Studio

1. Open LM Studio application
2. Load your preferred model
3. Start the local server (usually at http://localhost:1234)

### Running the Flask Application

```bash
python app.py
```

The application will be available at http://localhost:5000

## LM Studio Integration

This application connects to a local LM Studio instance for content generation. Here's how it works:

1. The application sends requests to the LM Studio API endpoints:
   - GET /v1/models - Lists available models
   - POST /v1/chat/completions - Creates chat completions
   - POST /v1/completions - Creates text completions
   - POST /v1/embeddings - Creates embeddings

2. Connection handling includes:
   - Automatic retry mechanism (configurable via config/.env)
   - Timeout handling
   - Error reporting and user feedback
   - Connection status indicators

3. Configuration in `config/.env`:
   - `LM_STUDIO_API_URL`: The URL of your LM Studio API server
   - `LM_STUDIO_API_TIMEOUT`: Request timeout in seconds
   - `LM_STUDIO_API_RETRIES`: Number of retry attempts on failure

## Development and Testing

### Project Structure

```
/lm-studio-agents
  /app             # Backend Flask application
    /models
    /routes
    /services
    /static
    /templates
    /tests         # Backend tests
    __init__.py
  /src             # Frontend Vue application source
    /components
    /router
    /services
    /store
    /tests         # Frontend tests
    /views
    main.ts
  /config          # Configuration files
    .env           # Environment variables (ignored)
    /instance      # Instance config (ignored)
    /secrets       # Secret files (ignored)
  /database        # Database related files
    /migrations    # Alembic migrations (ignored)
    db_init.py
  /docker          # Docker related files
    /builds        # Docker build artifacts (ignored)
    start.sh
  /docs            # Documentation
  app.py           # Application entry point (legacy? wsgi.py seems used)
  wsgi.py          # WSGI entry point for Gunicorn
  migrate.py       # Migration script helper
  requirements.txt # Backend dependencies
  package.json     # Frontend dependencies
  Dockerfile.backend
  Dockerfile.frontend
  docker-compose.yml
  README.md
  ... other config files (vue.config.js, tsconfig.json etc.)
```

### Running Tests

```bash
pytest
```

For coverage report:

```bash
pytest --cov=app app/tests/
```
## API Endpoints

### Blog Post Generation

- `GET /blog/` - Blog post generation form
- `POST /blog/generate` - Generate a new blog post
- `GET /blog/preview/<post_id>` - Preview/edit a blog post
- `POST /blog/edit/<post_id>` - Edit a blog post
- `POST /blog/publish/<post_id>` - Publish a blog post
- `GET /blog/list` - List all blog posts

### Social Media Content

- `GET /social/` - Social media post generation form
- `POST /social/generate` - Generate a new social media post
- `GET /social/preview/<post_id>` - Preview/edit a social media post
- `POST /social/edit/<post_id>` - Edit a social media post
- `POST /social/schedule/<post_id>` - Schedule a social media post
- `POST /social/publish/<post_id>` - Publish a social media post
- `GET /social/list` - List all social media posts

### System

- `GET /health` - API health check endpoint

## Screenshots

_[Add screenshots of the application here]_

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

Please ensure your code passes all tests and follows the project's coding style.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- LM Studio for providing the local LLM server
- Flask and its ecosystem for the web framework
- All open-source contributors whose libraries made this project possible

