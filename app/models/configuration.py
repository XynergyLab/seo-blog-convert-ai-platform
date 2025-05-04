import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Type, TypeVar
from sqlalchemy import String, Text, Boolean, DateTime, Integer, Float, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db
from app.database import Base, MutableJSONDict

T = TypeVar('T')


class ConfigValueType(Enum):
    """Type of configuration value"""
    STRING = "string"
    INTEGER = "int"
    FLOAT = "float"
    BOOLEAN = "bool"
    JSON = "json"

class Configuration(Base):
    """Model for storing application configuration settings"""
    
    __tablename__ = 'configurations'
    
    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value_string: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    value_int: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    value_float: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_bool: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    value_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(MutableJSONDict, nullable=True)
    value_type: Mapped[ConfigValueType] = mapped_column(SQLEnum(ConfigValueType), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    @property
    def value(self) -> Any:
        """Get the current value with appropriate type"""
        return self.get_value()

    @value.setter
    def value(self, value: Any) -> None:
        """Set the value with appropriate type detection"""
        self.set_value(value)
    
    def __init__(self, key: str, value: Any = None, description: Optional[str] = None):
        """
        Initialize a new configuration.
        
        Args:
            key: The configuration key
            value: The configuration value
            description: Optional description of the configuration
        """
        self.key = key
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.description = description
        
        # Set value with appropriate type detection
        if value is not None:
            self.set_value(value)
        else:
            # Default initialization
            self.value_type = ConfigValueType.STRING
            self.value_string = None
            self.value_int = None
            self.value_float = None
            self.value_bool = None
            self.value_json = None
    
    @classmethod
    def get_value(cls, key: str, default: Any = None) -> Any:
        """
        Get a configuration value by key with default fallback.
        
        Args:
            key: The configuration key
            default: Default value if the key doesn't exist
            
        Returns:
            The configuration value or the default value
        """
        config = cls.get(key)
        if config is None:
            return default
        value = config.get_value()
        return value if value is not None else default
    
    @classmethod
    def get(cls, key: str) -> Optional['Configuration']:
        """Get a configuration by key.

        Args:
            key: The configuration key

        Returns:
            The configuration object or None if not found
        """
        return db.session.get(cls, key)
    
    def save(self) -> 'Configuration':
        """Save the configuration to the database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    @classmethod
    def set(cls, key: str, value: Any, description: Optional[str] = None) -> 'Configuration':
        """Set a configuration value.
        
        Args:
            key: The configuration key
            value: The value to set
            description: Optional description
            
        Returns:
            The updated configuration object
        """
        config = cls.get(key) or cls(key=key)
        config.set_value(value)
        
        if description:
            config.description = description
            
        return config.save()
    
    @classmethod
    def delete(cls, key: str) -> bool:
        """
        Delete a configuration value.
        
        Args:
            key: The configuration key
            
        Returns:
            True if the configuration was deleted, False otherwise
        """
        config = db.session.get(cls, key)
        if not config:
            return False
            
        db.session.delete(config)
        db.session.commit()
        
        return True
    
    @classmethod
    def get_all(cls) -> List['Configuration']:
        """
        Get all configuration values.
        
        Returns:
            A list of all configuration objects
        """
        return db.session.query(cls).all()
        
    @classmethod
    def get_all_dict(cls) -> Dict[str, Any]:
        """
        Get all configuration values as a dictionary.
        
        Returns:
            A dictionary of all configuration values
        """
        configs = cls.get_all()
        return {config.key: config.value for config in configs}
    
    @classmethod
    def get_by_prefix(cls, prefix: str) -> List['Configuration']:
        """
        Get all configuration objects with a specific prefix.
        
        Args:
            prefix: The prefix to filter by
            
        Returns:
            A list of configuration objects with the specified prefix
        """
        return db.session.query(cls).filter(cls.key.startswith(prefix)).all()
        
    @classmethod
    def get_by_prefix_dict(cls, prefix: str) -> Dict[str, Any]:
        """
        Get all configuration values with a specific prefix as a dictionary.
        
        Args:
            prefix: The prefix to filter by
            
        Returns:
            A dictionary of configuration values with the specified prefix
        """
        configs = cls.get_by_prefix(prefix)
        return {config.key: config.value for config in configs}
    
    @classmethod
    def get_typed(cls, key: str, type_: Type[T], default: Optional[T] = None) -> Optional[T]:
        """
        Get a configuration value with a specific type.
        
        Args:
            key: The configuration key
            type_: The expected type
            default: Default value if the key doesn't exist or has the wrong type
            
        Returns:
            The configuration value or the default value
        """
        config = cls.get(key)
        if config is None:
            return default
            
        value = config.value
        if value is None:
            return default
            
        try:
            if type_ == bool and isinstance(value, str):
                # Handle string to bool conversion
                return value.lower() in ('true', 'yes', 'y', '1', 'on')
            
            # Try regular type conversion
            return type_(value)
        except (ValueError, TypeError):
            return default
    
    def get_value(self) -> Any:
        """Get the value with the appropriate type"""
        if self.value_type == ConfigValueType.STRING:
            return self.value_string
        elif self.value_type == ConfigValueType.INTEGER:
            return self.value_int
        elif self.value_type == ConfigValueType.FLOAT:
            return self.value_float
        elif self.value_type == ConfigValueType.BOOLEAN:
            # Convert integer to bool for SQLite compatibility
            return bool(self.value_bool) if self.value_bool is not None else None
        elif self.value_type == ConfigValueType.JSON:
            return self.value_json if self.value_json else {}
        else:
            # Default to string
            return self.value_string
    
    def set_value(self, value: Any) -> None:
        """Set the value with the appropriate type"""
        # Reset all value fields
        self.value_string = None
        self.value_int = None
        self.value_float = None
        self.value_bool = None
        self.value_json = None
        
        # Set the value based on its type
        if value is None:
            self.value_type = ConfigValueType.STRING
            self.value_string = None
        elif isinstance(value, str):
            self.value_type = ConfigValueType.STRING
            self.value_string = value
        elif isinstance(value, int):
            self.value_type = ConfigValueType.INTEGER
            self.value_int = value
        elif isinstance(value, float):
            self.value_type = ConfigValueType.FLOAT
            self.value_float = value
        elif isinstance(value, bool):
            self.value_type = ConfigValueType.BOOLEAN
            self.value_bool = bool(value)  # Ensure it's stored as a proper boolean
        elif isinstance(value, (dict, list)):
            self.value_type = ConfigValueType.JSON
            self.value_json = value
        else:
            # Try to convert to string if no other type matches
            self.value_type = ConfigValueType.STRING
            self.value_string = str(value)

    @classmethod
    def get_group(cls, group_prefix: str, remove_prefix: bool = True) -> Dict[str, Any]:
        """Get a group of configuration values by prefix.
        
        Args:
            group_prefix: The prefix to filter by
            remove_prefix: If True, removes the prefix from the keys in the result
            
        Returns:
            A dictionary of configuration values in the specified group
        """
        configs = cls.get_by_prefix(group_prefix)
        result = {config.key: config.value for config in configs}
        
        if not remove_prefix:
            return result
            
        # Remove the prefix from the keys
        prefix_len = len(group_prefix)
        return {
            key[prefix_len:] if key.startswith(group_prefix) else key: value
            for key, value in result.items()
        }
    
    @classmethod
    def set_group(cls, group_prefix: str, values: Dict[str, Any], description: Optional[str] = None) -> Dict[str, Any]:
        """
        Set a group of configuration values with a common prefix.
        
        Args:
            group_prefix: The prefix to prepend to all keys
            values: A dictionary of configuration values
            description: Optional description to apply to all items
            
        Returns:
            A dictionary of the created/updated configuration objects
        """
        result = {}
        for key, value in values.items():
            # Ensure the prefix ends with a separator
            if group_prefix and not group_prefix.endswith('.'):
                group_prefix += '.'
                
            # Create the full key
            full_key = f"{group_prefix}{key}"
            
            # Set the configuration
            config = cls.set(full_key, value, description)
            result[full_key] = config
            
        return result
    
    @classmethod
    def delete_group(cls, group_prefix: str) -> int:
        """
        Delete a group of configuration values by prefix.
        
        Args:
            group_prefix: The group prefix to filter by
            
        Returns:
            The number of deleted configuration items
        """
        configs = db.session.query(cls).filter(cls.key.startswith(group_prefix)).all()
        count = len(configs)
        
        for config in configs:
            db.session.delete(config)
            
        db.session.commit()
        return count

