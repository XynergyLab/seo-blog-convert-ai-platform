# AI Agent MVP

An AI-powered content generation application that leverages local LLMs through LM Studio to create blog posts and social media content. This MVP demonstrates how to build agents that can generate, schedule, and manage content across platforms.

![AI Agent MVP](docs/screenshots/placeholder.png)

## Features

- **Blog Post Generation**: Create high-quality blog posts with AI
  - Customizable topics, tones, and lengths
  - Edit and refine generated content
  - Preview and publish functionality
  
- **Social Media Content Creation**: Generate platform-specific social media posts
  - Support for Twitter, Facebook, Instagram, and LinkedIn
  - Platform-aware character limits and formatting
  - Hashtag generation and management
  
- **Content Scheduling**: Schedule posts for future publishing
  - Calendar-based scheduling interface
  - Status tracking (draft, scheduled, published)
  
- **Local LLM Integration**: Connect to LM Studio running locally
  - No dependency on external API services
  - Compatible with any model loaded in LM Studio
  - Resilient connection handling

## Installation

### Prerequisites

- Python 3.11+
- LM Studio (with a running local server)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/lm-studio-agents.git
cd lm-studio-agents
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

Create a `.env` file in the root directory with the following configuration:

```
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
   - Automatic retry mechanism (configurable via .env)
   - Timeout handling
   - Error reporting and user feedback
   - Connection status indicators

3. Configuration in `.env`:
   - `LM_STUDIO_API_URL`: The URL of your LM Studio API server
   - `LM_STUDIO_API_TIMEOUT`: Request timeout in seconds
   - `LM_STUDIO_API_RETRIES`: Number of retry attempts on failure

## Development and Testing

### Project Structure

```
/lm-studio-agents
  /app
    /models        # Data models
    /routes        # Route definitions
    /services      # Business logic and integrations
    /static        # CSS and static assets
    /templates     # HTML templates
    __init__.py    # App initialization
  /tests           # Test files
  app.py           # Application entry point
  requirements.txt # Dependencies
  .env             # Environment configuration
```

### Running Tests

```bash
pytest
```

For coverage report:

```bash
pytest --cov=app tests/
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

