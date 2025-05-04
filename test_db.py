# test_db.py
from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Test raw connection
        result = db.session.execute(text('SELECT 1')).scalar()
        print(f"Database connection test result: {result}")
        
        # Import models
        from app.models import blog, social, scheduling, configuration
        
        # Try to create tables
        db.create_all()
        print("Database tables created successfully")
        
    except Exception as e:
        print(f"Error: {str(e)}")

