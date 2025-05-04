import os
from app import create_app

# Create app instance that can be imported by Gunicorn
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment variables
    debug_mode = os.environ.get('DEBUG', 'False').lower() in ('true', 't', '1', 'yes', 'y')
    port = int(os.environ.get('PORT', 5000))
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
    
    print(f"Server started on port {port} with debug mode {'enabled' if debug_mode else 'disabled'}")
