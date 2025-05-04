"""
Database configuration and SQLAlchemy setup
"""
import os
import json
import sqlite3
from app.extensions import db
from sqlalchemy.dialects.postgresql import JSON as PostgresJSON
from sqlalchemy.ext.mutable import MutableDict, Mutable
from sqlalchemy import JSON, TypeDecorator, event, engine
from sqlalchemy.engine import Engine
import copy

# Create a base model class
class Base(db.Model):
    """Base model class that all models will inherit from"""
    __abstract__ = True

# Custom JSON type handling for SQLite/PostgreSQL compatibility
class JSONType(TypeDecorator):
    impl = JSON
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresJSON())
        else:
            return dialect.type_descriptor(JSON())
    
    def process_bind_param(self, value, dialect):
        if dialect.name == 'sqlite' and value is not None:
            return json.dumps(value)
        return value
    
    def process_result_value(self, value, dialect):
        if dialect.name == 'sqlite' and value is not None:
            return json.loads(value)
        return value

# Define a mutable dictionary type for JSON fields
MutableJSONDict = MutableDict.as_mutable(JSONType)


# Define a mutable list type for JSON list fields
class MutableList(Mutable, list):
    """Mutable list type for SQLAlchemy
    
    This class allows SQLAlchemy to properly track changes to lists stored 
    in JSON fields and trigger appropriate database updates.
    """
    
    def __init__(self, values=None):
        Mutable.__init__(self)
        list.__init__(self, values or [])
    
    @classmethod
    def coerce(cls, key, value):
        """Convert plain list to MutableList"""
        if isinstance(value, cls):
            return value
        if isinstance(value, list):
            return cls(value)
        if value is None:
            return cls([])
        return cls([value])
    
    def __setitem__(self, index, value):
        """Detect list item assignment"""
        list.__setitem__(self, index, value)
        self.changed()
    
    def __delitem__(self, index):
        """Detect list item deletion"""
        list.__delitem__(self, index)
        self.changed()
    
    def append(self, value):
        """Detect item appended to list"""
        list.append(self, value)
        self.changed()
    
    def pop(self, *args, **kw):
        """Detect item popped from list"""
        value = list.pop(self, *args, **kw)
        self.changed()
        return value
    
    def extend(self, iterable):
        """Detect list extension"""
        list.extend(self, iterable)
        self.changed()
    
    def insert(self, index, value):
        """Detect item insertion"""
        list.insert(self, index, value)
        self.changed()
    
    def remove(self, value):
        """Detect item removal"""
        list.remove(self, value)
        self.changed()
    
    def clear(self):
        """Detect list clearing"""
        list.clear(self)
        self.changed()
    
    def sort(self, *args, **kw):
        """Detect list sorting"""
        list.sort(self, *args, **kw)
        self.changed()
    
    def reverse(self):
        """Detect list reversal"""
        list.reverse(self)
        self.changed()
    
    def __copy__(self):
        """Provide proper copying"""
        return MutableList(self)
    
    def __deepcopy__(self, memo):
        """Provide proper deep copying"""
        return MutableList(copy.deepcopy(list(self), memo))


# Create usable type for list fields stored as JSON
MutableJSONList = MutableList.as_mutable(JSONType)

# Enable SQLite foreign key enforcement
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db_config_for_app(app):
    """Configure Flask app's database settings"""
    # Check environment
    env = os.environ.get('FLASK_ENV', os.environ.get('ENV', 'development')).lower()
    is_production = env == 'production'
    
    if is_production:
        # PostgreSQL for production
        db_user = os.environ.get('DB_USER', 'user')
        db_password = os.environ.get('DB_PASSWORD', 'password')
        db_host = os.environ.get('DB_HOST', 'database')
        db_port = os.environ.get('DB_PORT', '5432')
        db_name = os.environ.get('DB_NAME', 'lm_studio_agents')
        
        db_uri = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        
        # Production connection pooling settings
        engine_options = {
            'pool_size': int(os.environ.get('DB_POOL_SIZE', 10)),
            'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', 20)),
            'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 1800)),
            'pool_pre_ping': True
        }
        
        app.logger.info("Using PostgreSQL database for production")
    else:
        # SQLite for development
        db_path = os.path.join(app.instance_path, 'lmstudio_agents.sqlite')
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        db_uri = f"sqlite:///{db_path}"
        
        # Development connection pooling settings
        engine_options = {
            'pool_pre_ping': True,
            'connect_args': {'check_same_thread': False}  # Allow multi-threaded access
        }
        
        app.logger.info(f"Using SQLite database for development at {db_path}")
    
    # Configure Flask app
    app.config.update(
        SQLALCHEMY_DATABASE_URI=db_uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS=engine_options
    )

def create_tables(app):
    """Create all database tables"""
    with app.app_context():
        db.create_all()
