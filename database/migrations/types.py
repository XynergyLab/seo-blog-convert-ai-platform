"""
Shared SQLAlchemy type definitions for use in migrations
"""
import json
from sqlalchemy.dialects.postgresql import JSON as PostgresJSON
from sqlalchemy import JSON, TypeDecorator

# Custom JSON type handling for SQLite/PostgreSQL compatibility
class JSONType(TypeDecorator):
    """
    Custom JSON type that handles both SQLite and PostgreSQL databases.
    
    In SQLite, JSON is stored as a string and needs to be deserialized.
    In PostgreSQL, the native JSON type is used.
    """
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

