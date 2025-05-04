"""
Tests for the configuration model and operations.
"""
import os
import pytest
import json
from datetime import datetime
from flask import Flask
from app import create_app
from app.database import db
from app.models.configuration import Configuration, ConfigValueType


@pytest.fixture(scope="function")
def app():
    """Create and configure a Flask app for testing"""
    # Set environment variables for testing
    os.environ["FLASK_ENV"] = "testing"
    os.environ["TESTING"] = "True"
    
    # Create the app with a test configuration
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    
    # Create the database tables
    with app.app_context():
        db.create_all()
    
    yield app
    
    # Clean up after the test
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="function")
def client(app):
    """A test client for the app"""
    return app.test_client()


@pytest.fixture(scope="function")
def app_context(app):
    """Application context for tests"""
    with app.app_context():
        yield


class TestBasicConfigOperations:
    """Test basic CRUD operations and type handling for configuration items"""
    
    def test_create_string_config(self, app_context):
        """Test creating and retrieving a string configuration value"""
        # Create a config item
        config = Configuration(
            key="test.string", 
            value="test value",
            description="A test string config"
        )
        config.save()
        
        # Retrieve it from the database
        retrieved = Configuration.get("test.string")
        
        # Verify it was retrieved correctly
        assert retrieved is not None
        assert retrieved.key == "test.string"
        assert retrieved.value == "test value"
        assert retrieved.value_type == ConfigValueType.STRING
        assert retrieved.description == "A test string config"
    
    def test_create_integer_config(self, app_context):
        """Test creating and retrieving an integer configuration value"""
        # Create a config item
        config = Configuration(
            key="test.integer", 
            value=42,
            description="A test integer config"
        )
        config.save()
        
        # Retrieve it from the database
        retrieved = Configuration.get("test.integer")
        
        # Verify it was retrieved correctly
        assert retrieved is not None
        assert retrieved.key == "test.integer"
        assert retrieved.value == 42
        assert retrieved.value_type == ConfigValueType.INTEGER
        assert isinstance(retrieved.value, int)
    
    def test_create_float_config(self, app_context):
        """Test creating and retrieving a float configuration value"""
        # Create a config item
        config = Configuration(
            key="test.float", 
            value=3.14159,
            description="A test float config"
        )
        config.save()
        
        # Retrieve it from the database
        retrieved = Configuration.get("test.float")
        
        # Verify it was retrieved correctly
        assert retrieved is not None
        assert retrieved.key == "test.float"
        assert retrieved.value == pytest.approx(3.14159)
        assert retrieved.value_type == ConfigValueType.FLOAT
        assert isinstance(retrieved.value, float)
    
    def test_create_boolean_config(self, app_context):
        """Test creating and retrieving a boolean configuration value"""
        # Create a config item
        config = Configuration(
            key="test.boolean", 
            value=True,
            description="A test boolean config"
        )
        config.save()
        
        # Retrieve it from the database
        retrieved = Configuration.get("test.boolean")
        
        # Verify it was retrieved correctly
        assert retrieved is not None
        assert retrieved.key == "test.boolean"
        assert retrieved.value is True
        assert retrieved.value_type == ConfigValueType.BOOLEAN
        assert isinstance(retrieved.value, bool)
    
    def test_create_json_config(self, app_context):
        """Test creating and retrieving a JSON configuration value"""
        # Create a config item with JSON value
        json_value = {
            "name": "Test", 
            "values": [1, 2, 3], 
            "nested": {"key": "value"}
        }
        config = Configuration(
            key="test.json", 
            value=json_value,
            description="A test JSON config"
        )
        config.save()
        
        # Retrieve it from the database
        retrieved = Configuration.get("test.json")
        
        # Verify it was retrieved correctly
        assert retrieved is not None
        assert retrieved.key == "test.json"
        assert retrieved.value == json_value
        assert retrieved.value_type == ConfigValueType.JSON
        assert isinstance(retrieved.value, dict)
        assert retrieved.value["name"] == "Test"
        assert retrieved.value["values"] == [1, 2, 3]
        assert retrieved.value["nested"]["key"] == "value"
    
    def test_update_config(self, app_context):
        """Test updating a configuration value"""
        # Create an initial config
        config = Configuration(key="test.update", value="initial value")
        config.save()
        
        # Update it
        Configuration.set("test.update", "updated value")
        
        # Retrieve it
        retrieved = Configuration.get("test.update")
        
        # Verify it was updated
        assert retrieved.value == "updated value"
        assert retrieved.value_type == ConfigValueType.STRING
        
        # Update to a different type
        Configuration.set("test.update", 100)
        
        # Verify the type changed too
        retrieved = Configuration.get("test.update")
        assert retrieved.value == 100
        assert retrieved.value_type == ConfigValueType.INTEGER
    
    def test_delete_config(self, app_context):
        """Test deleting a configuration value"""
        # Create a config
        config = Configuration(key="test.delete", value="to be deleted")
        config.save()
        
        # Verify it exists
        assert Configuration.get("test.delete") is not None
        
        # Delete it
        Configuration.delete("test.delete")
        
        # Verify it's gone
        assert Configuration.get("test.delete") is None
    
    def test_default_value(self, app_context):
        """Test getting configuration with default value fallback"""
        # Get non-existent config with default
        value = Configuration.get_value("nonexistent.key", default="default value")
        
        # Verify the default is returned
        assert value == "default value"
        
        # Create a config and check get_value returns actual value
        Configuration(key="existing.key", value="actual value").save()
        value = Configuration.get_value("existing.key", default="default value")
        
        # Verify it returns the actual value, not the default
        assert value == "actual value"
    
    def test_configuration_groups(self, app_context):
        """Test retrieving configuration items by group prefix"""
        # Create several configs with different prefixes
        Configuration(key="group1.item1", value="value1").save()
        Configuration(key="group1.item2", value="value2").save()
        Configuration(key="group2.item1", value="value3").save()
        Configuration(key="standalone", value="value4").save()
        
        # Get configs for group1
        group1_configs = Configuration.get_by_prefix("group1")
        
        # Verify correct configs were returned
        assert len(group1_configs) == 2
        keys = [config.key for config in group1_configs]
        assert "group1.item1" in keys
        assert "group1.item2" in keys
        assert "group2.item1" not in keys
        assert "standalone" not in keys


class TestLMStudioConfiguration:
    """Test LM Studio specific configuration settings"""
    
    def test_lm_studio_api_settings(self, app_context):
        """Test setting and retrieving LM Studio API configuration"""
        # Create LM Studio API configuration
        lm_studio_configs = {
            "lm_studio.api.host": "10.0.0.140",
            "lm_studio.api.port": 1240,
            "lm_studio.api.timeout": 30.5,
            "lm_studio.api.max_retries": 3,
            "lm_studio.api.enabled": True
        }
        
        # Save configs
        for key, value in lm_studio_configs.items():
            Configuration(key=key, value=value).save()
        
        # Retrieve configs
        api_host = Configuration.get_value("lm_studio.api.host")
        api_port = Configuration.get_value("lm_studio.api.port")
        api_timeout = Configuration.get_value("lm_studio.api.timeout")
        api_max_retries = Configuration.get_value("lm_studio.api.max_retries")
        api_enabled = Configuration.get_value("lm_studio.api.enabled")
        
        # Verify retrieved values
        assert api_host == "10.0.0.140"
        assert api_port == 1240
        assert api_timeout == 30.5
        assert api_max_retries == 3
        assert api_enabled is True
        
        # Get all LM Studio configs
        lm_studio_group = Configuration.get_by_prefix("lm_studio")
        assert len(lm_studio_group) == 5
    
    def test_model_configurations(self, app_context):
        """Test LM Studio model configurations"""
        # Set up model configurations
        model_config = {
            "name": "mistral-7b-instruct-v0.3",
            "type": "chat",
            "parameters": {
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 2000,
                "repetition_penalty": 1.1
            }
        }
        
        # Save model configuration
        Configuration(
            key="lm_studio.models.blog_generator",
            value=model_config
        ).save()
        
        # Retrieve and verify
        retrieved = Configuration.get("lm_studio.models.blog_generator")
        assert retrieved.value_type == ConfigValueType.JSON
        assert retrieved.value["name"] == "mistral-7b-instruct-v0.3"
        assert retrieved.value["parameters"]["temperature"] == 0.7
        assert retrieved.value["parameters"]["max_tokens"] == 2000
    
    def test_endpoint_validations(self, app_context):
        """Test validating endpoint configurations"""
        # Set up endpoints
        Configuration(key="lm_studio.endpoints.chat", value="/v1/chat/completions").save()
        Configuration(key="lm_studio.endpoints.completions", value="/v1/completions").save()
        Configuration(key="lm_studio.endpoints.embeddings", value="/v1/embeddings").save()
        
        # Set up endpoint-to-model mappings
        endpoint_models = {
            "chat": "mistral-7b-instruct-v0.3",
            "completions": "yi-coder-9b-chat",
            "embeddings": "text-embedding-nomic-embed-text-v1.5"
        }
        Configuration(key="lm_studio.endpoint_models", value=endpoint_models).save()
        
        # Retrieve configurations
        chat_endpoint = Configuration.get_value("lm_studio.endpoints.chat")
        endpoint_model_map = Configuration.get_value("lm_studio.endpoint_models")
        
        # Verify configurations
        assert chat_endpoint == "/v1/chat/completions"
        assert endpoint_model_map["chat"] == "mistral-7b-instruct-v0.3"
        assert endpoint_model_map["embeddings"] == "text-embedding-nomic-embed-text-v1.5"


class TestSocialMediaConfiguration:
    """Test social media platform configurations"""
    
    def test_platform_settings(self, app_context):
        """Test social media platform settings"""
        # Create platform specific settings
        twitter_settings = {
            "char_limit": 280,
            "hashtag_limit": 10,
            "media_types": ["image", "video", "gif"],
            "requires_media": False
        }
        
        instagram_settings = {
            "char_limit": 2200,
            "hashtag_limit": 30,
            "media_types": ["image", "video", "carousel"],
            "requires_media": True
        }
        
        # Save configurations
        Configuration(key="social.platforms.twitter", value=twitter_settings).save()
        Configuration(key="social.platforms.instagram", value=instagram_settings).save()
        
        # Retrieve and verify
        twitter_config = Configuration.get("social.platforms.twitter").value
        instagram_config = Configuration.get("social.platforms.instagram").value
        
        assert twitter_config["char_limit"] == 280
        assert twitter_config["requires_media"] is False
        
        assert instagram_config["char_limit"] == 2200
        assert instagram_config["requires_media"] is True
        assert "carousel" in instagram_config["media_types"]
    
    def test_api_credentials(self, app_context):
        """Test social media API credentials storage and retrieval"""
        # Create API credentials
        twitter_creds = {
            "api_key": "twitter_key_123",
            "api_secret": "twitter_secret_456",
            "access_token": "twitter_token_789",
            "token_secret": "twitter_secret_012"
        }
        
        # Save credentials
        Configuration(key="social.credentials.twitter", value=twitter_creds).save()
        
        # Retrieve and verify
        retrieved_creds = Configuration.get("social.credentials.twitter").value
        assert retrieved_creds["api_key"] == "twitter_key_123"
        assert retrieved_creds["token_secret"] == "twitter_secret_012"
    
    def test_validation_rules(self, app_context):
        """Test social media validation rules configuration"""
        # Create validation rules
        validation_rules = {
            "twitter": {
                "min_length": 10,
                "max_hashtags": 5,
                "disallowed_terms": ["spam", "inappropriate"]
            },
            "facebook": {
                "min_length": 20,
                "max_hashtags": 10,
                "disallowed_terms": ["spam", "scam", "fake"]
            }
        }
        
        # Save configuration
        Configuration(key="social.validation_rules", value=validation_rules).save()
        
        # Retrieve and verify
        rules = Configuration.get("social.validation_rules").value
        
        assert rules["twitter"]["min_length"] == 10
        assert rules["twitter"]["max_hashtags"] == 5
        assert "inappropriate" in rules["twitter"]["disallowed_terms"]
        
        assert rules["facebook"]["min_length"] == 20
        assert "scam" in rules["facebook"]["disallowed_terms"]



def test_configuration_set_group_method(app_context):
    """Test the set_group method for batch configuration setting"""
    # Define group data
    group_data = {
        "key1": "value1",
        "key2": 42,
        "key3": True,
        "key4": {"nested": "data"}
    }
    
    # Use set_group to create multiple configurations
    Configuration.set_group("test.batch.", group_data)
    
    # Verify all were created properly
    assert Configuration.get_value("test.batch.key1") == "value1"
    assert Configuration.get_value("test.batch.key2") == 42
    assert Configuration.get_value("test.batch.key3") is True
    assert Configuration.get_value("test.batch.key4") == {"nested": "data"}
    
    # Test overwriting existing values
    new_group_data = {
        "key1": "updated",
        "key5": "new value"
    }
    Configuration.set_group("test.batch.", new_group_data)
    
    # Verify updates worked correctly
    assert Configuration.get_value("test.batch.key1") == "updated"
    assert Configuration.get_value("test.batch.key5") == "new value"
    assert Configuration.get_value("test.batch.key2") == 42  # Unchanged


def test_get_typed_method(app_context):
    """Test get_typed method for type conversion"""
    # Create string values that can be converted to other types
    Configuration.set("test.convertible.number", "42")
    Configuration.set("test.convertible.decimal", "3.14")
    Configuration.set("test.convertible.true", "true")
    Configuration.set("test.convertible.false", "false")
    
    # Test integer conversion
    value = Configuration.get_typed("test.convertible.number", int, 0)
    assert value == 42
    assert isinstance(value, int)
    
    # Test float conversion
    value = Configuration.get_typed("test.convertible.decimal", float, 0.0)
    assert value == pytest.approx(3.14)
    assert isinstance(value, float)
    
    # Test boolean conversion
    value = Configuration.get_typed("test.convertible.true", bool, False)
    assert value is True
    assert isinstance(value, bool)
    
    value = Configuration.get_typed("test.convertible.false", bool, True)
    assert value is False
    assert isinstance(value, bool)
    
    # Test type conversion for nonexistent keys (should return default)
    assert Configuration.get_typed("nonexistent.key", int, 99) == 99
    assert Configuration.get_typed("nonexistent.key", bool, True) is True
    
    # Test conversion failure handling
    Configuration.set("test.not.number", "not-a-number")
    value = Configuration.get_typed("test.not.number", int, 100)
    assert value == 100  # Should return default when conversion fails


def test_none_value_handling(app_context):
    """Test storing and retrieving None values"""
    # Set a None value
    Configuration.set("test.none.value", None)
    
    # Retrieve it
    config = Configuration.get("test.none.value")
    
    # Verify it was handled correctly
    assert config is not None  # The config object exists
    assert config.value is None  # But its value is None
    
    # Test get_value with None
    value = Configuration.get_value("test.none.value")
    assert value is None
    
    # Test default value when the stored value is None
    value = Configuration.get_value("test.none.value", default="default")
    assert value is None  # Stored None should override default
    
    # Test updating from None to a value
    Configuration.set("test.none.value", "now has value")
    assert Configuration.get_value("test.none.value") == "now has value"
    
    # Test updating from a value to None
    Configuration.set("test.with.value", "initial")
    assert Configuration.get_value("test.with.value") == "initial"
    Configuration.set("test.with.value", None)
    assert Configuration.get_value("test.with.value") is None


def test_configuration_edge_cases(app_context):
    """Test edge cases in Configuration value handling"""
    # Test boolean conversion from SQLite integers
    config = Configuration(key="test.bool", value=True)
    config.save()
    
    # Simulate SQLite storing as 1
    config.value_bool = 1
    db.session.commit()
    
    # Should still return as Python bool
    retrieved = Configuration.get("test.bool")
    assert isinstance(retrieved.value, bool)
    assert retrieved.value is True
    
    # Test with integer 0
    config.value_bool = 0
    db.session.commit()
    retrieved = Configuration.get("test.bool")
    assert isinstance(retrieved.value, bool)
    assert retrieved.value is False
    
    # Test default values with specific types
    assert Configuration.get_value("nonexistent.int", default=42) == 42
    assert isinstance(Configuration.get_value("nonexistent.int", default=42), int)
    
    assert Configuration.get_value("nonexistent.float", default=3.14) == 3.14
    assert isinstance(Configuration.get_value("nonexistent.float", default=3.14), float)
    
    assert Configuration.get_value("nonexistent.bool", default=True) is True
    assert isinstance(Configuration.get_value("nonexistent.bool", default=True), bool)


if __name__ == "__main__":
    pytest.main(["-v", __file__])

