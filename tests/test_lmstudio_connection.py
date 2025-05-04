#!/usr/bin/env python
"""
LM Studio Connection Test Script

This script tests the connection to LM Studio API and verifies all endpoints are working.
Run this script to check if your LM Studio server is properly configured and accessible.
"""

import os
import sys
import logging
from typing import Optional, Dict, Any, List

# Add parent directory to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.lmstudio import LMStudioClient, LMStudioAPIError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("lmstudio-test")

def test_connection() -> bool:
    """Test basic connection to LM Studio API"""
    print("\n----- Testing LM Studio Connection -----")
    
    try:
        client = LMStudioClient()
        logger.info(f"Testing connection to models endpoint: {client.models_url}")
        
        if client.check_connection():
            print("✅ Connection successful!")
            return True
        else:
            print("❌ Connection failed!")
            print(f"  Could not connect to {client.models_url}")
            print("  Please check that LM Studio server is running and accessible.")
            return False
    except Exception as e:
        print(f"❌ Error initializing LM Studio client: {str(e)}")
        return False

def test_list_models(client: LMStudioClient) -> List[Dict[str, Any]]:
    """Test listing available models"""
    print("\n----- Testing List Models Endpoint -----")
    
    try:
        logger.info(f"Requesting models from: {client.models_url}")
        models = client.list_models()
        
        if not models:
            print("⚠️ No models found. Is LM Studio running with a loaded model?")
            return []
        
        print(f"✅ Successfully retrieved {len(models)} models:")
        for i, model in enumerate(models):
            print(f"  {i+1}. ID: {model.get('id', 'unknown')}")
            
        return models
    except LMStudioAPIError as e:
        print(f"❌ API Error: {str(e)}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return []

def find_model(models: List[Dict[str, Any]], preferred_models: List[str]) -> Optional[str]:
    """Find the first available model from a list of preferred models"""
    model_ids = [model.get('id', '') for model in models]
    
    for model_id in preferred_models:
        if model_id in model_ids:
            return model_id
    
    return None

def test_chat_completion(client: LMStudioClient, models: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Test chat completion generation"""
    print("\n----- Testing Chat Completion Endpoint -----")
    
    # Find a suitable model for chat completion - prioritize YI Coder which is specifically for chat
    preferred_models = ["yi-coder-9b-chat", "qwen2.5-7b-instruct-1m", "hermes-3-llama-3.2-3b", "mistral-7b-instruct-v0.3"]
    model_id = find_model(models, preferred_models)
    
    if not model_id:
        print("❌ No suitable model found for chat completion.")
        print(f"  Please load one of these models in LM Studio: {', '.join(preferred_models)}")
        return None
    
    print(f"  Using model: {model_id}")
    
    # Use a simple, standard message format without extra parameters
    messages = [
        {"role": "user", "content": "Define artificial intelligence in one sentence."}
    ]
    
    # Don't use any extra parameters for now
    extra_params = {}
    
    try:
        logger.info(f"Sending chat completion request to: {client.chat_url}")
        
        # Prepare the request payload
        payload = {
            "messages": messages,
            "model": model_id,
            "max_tokens": 100,
            "temperature": 0.7,
            **extra_params
        }
        
        # Log the exact payload for debugging
        logger.info(f"Request payload: {payload}")
        print(f"  Request payload: {payload}")
        
        # For debugging, try with simplified parameters first
        simplified_payload = {
            "model": model_id,
            "messages": messages,
        }
        
        print(f"  Trying simplified payload: {simplified_payload}")
        
        try:
            response = client.create_chat_completion(**simplified_payload)
        except Exception as e:
            print(f"  Simplified request failed, trying with full parameters...")
            response = client.create_chat_completion(**payload)
        
        if response and 'choices' in response:
            # Extract content based on response format
            choice = response['choices'][0]
            
            # Some LLMs return different formats
            if 'message' in choice and 'content' in choice['message']:
                content = choice['message']['content'].strip()
            elif 'text' in choice:
                content = choice['text'].strip()
            else:
                # Try to extract from the raw response if standard fields aren't found
                print(f"  Warning: Unexpected response format. Raw choice data: {choice}")
                content = str(choice).strip()
                
            print("✅ Chat completion successful!")
            print(f"  Response: {content}")
            
            # Print additional debug info
            print(f"  Model used: {response.get('model', 'unknown')}")
            usage = response.get('usage', {})
            if usage:
                print(f"  Tokens: {usage.get('completion_tokens', 0)} completion, {usage.get('prompt_tokens', 0)} prompt")
                
            return response
        else:
            print("❌ Invalid response format from chat completion endpoint")
            print(f"  Response: {response}")
            return None
    except LMStudioAPIError as e:
        print(f"❌ API Error: {str(e)}")
        
        # Try to extract more detailed error information
        error_details = str(e)
        status_code = None
        response_text = None
        
        if hasattr(e, 'status_code'):
            status_code = e.status_code
            
        if hasattr(e, 'response'):
            response = e.response
            if hasattr(response, 'text'):
                response_text = response.text
                print(f"  Error response text: {response_text}")
                
            if hasattr(response, 'json'):
                try:
                    error_json = response.json()
                    print(f"  Error JSON: {error_json}")
                except:
                    pass
        
        print(f"  Status code: {status_code}")
        print(f"  Response text: {response_text}")
        
        # Try alternative approach - direct POST to the endpoint
        try:
            print("\n  Attempting direct request to endpoint...")
            import requests
            import json
            
            direct_url = client.chat_url
            headers = {'Content-Type': 'application/json'}
            direct_payload = {
                "model": model_id,
                "messages": [{"role": "user", "content": "Hello, please respond with one word."}]
            }
            
            print(f"  Direct request to: {direct_url}")
            print(f"  Payload: {direct_payload}")
            
            response = requests.post(
                direct_url, 
                headers=headers,
                json=direct_payload,
                timeout=10
            )
            
            print(f"  Direct request status: {response.status_code}")
            if response.ok:
                result = response.json()
                print(f"  Direct request success: {result}")
                return result
            else:
                print(f"  Direct request failed: {response.text}")
        except Exception as direct_error:
            print(f"  Direct request exception: {str(direct_error)}")
            
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return None

def test_text_completion(client: LMStudioClient, models: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Test text completion generation"""
    print("\n----- Testing Text Completion Endpoint -----")
    
    # Find a suitable model for text completion
    preferred_models = ["mistral-7b-instruct-v0.3", "qwen2.5-7b-instruct-1m", "hermes-3-llama-3.2-3b"]
    model_id = find_model(models, preferred_models)
    
    if not model_id:
        print("❌ No suitable model found for text completion.")
        print(f"  Please load one of these models in LM Studio: {', '.join(preferred_models)}")
        return None
    
    print(f"  Using model: {model_id}")
    
    prompt = "Complete this sentence: Artificial intelligence is"
    
    try:
        logger.info(f"Sending text completion request to: {client.completions_url}")
        response = client.create_completion(
            prompt=prompt,
            model=model_id,
            max_tokens=50,
            temperature=0.7
        )
        
        if response and 'choices' in response:
            content = response['choices'][0].get('text', '').strip()
            print("✅ Text completion successful!")
            print(f"  Prompt: {prompt}")
            print(f"  Response: {content}")
            return response
        else:
            print("❌ Invalid response format from text completion endpoint")
            print(f"  Response: {response}")
            return None
    except LMStudioAPIError as e:
        print(f"❌ API Error: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return None

def test_embeddings(client: LMStudioClient, models: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Test embedding generation"""
    print("\n----- Testing Embeddings Endpoint -----")
    
    # Find a suitable model for embeddings
    preferred_models = [
        "text-embedding-nomic-embed-text-v1.5", 
        "text-embedding-granite-embedding-107m-multilingual",
        "jina-embeddings-v2-base-en"
    ]
    model_id = find_model(models, preferred_models)
    
    if not model_id:
        print("❌ No suitable model found for embeddings.")
        print(f"  Please load one of these models in LM Studio: {', '.join(preferred_models)}")
        return None
    
    print(f"  Using model: {model_id}")
    
    text = "This is a test sentence for embedding generation."
    
    try:
        logger.info(f"Sending embeddings request to: {client.embeddings_url}")
        response = client.create_embeddings(
            input=text,
            model=model_id
        )
        
        if response and 'data' in response:
            embedding = response['data'][0]['embedding']
            embedding_length = len(embedding)
            print("✅ Embedding generation successful!")
            print(f"  Generated embedding with {embedding_length} dimensions")
            print(f"  First 5 values: {embedding[:5]}")
            return response
        else:
            print("❌ Invalid response format from embeddings endpoint")
            print(f"  Response: {response}")
            return None
    except LMStudioAPIError as e:
        print(f"❌ API Error: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return None

def run_all_tests():
    """Run all LM Studio API tests"""
    print("\n===== LM Studio API Connection Test =====")
    print(f"Time: {__import__('datetime').datetime.now()}")
    
    # First test connection
    if not test_connection():
        print("\n❌ Connection test failed. Aborting further tests.")
        return False
    
    try:
        client = LMStudioClient()
        
        # First get available models
        models = test_list_models(client)
        models_ok = len(models) > 0
        
        if not models_ok:
            print("\n❌ Failed to retrieve any models. Aborting further tests.")
            return False
        
        # Test other endpoints with appropriate models
        chat_ok = test_chat_completion(client, models) is not None
        text_ok = test_text_completion(client, models) is not None
        embeddings_ok = test_embeddings(client, models) is not None
        
        # Print summary
        print("\n===== Test Summary =====")
        print(f"Connection: ✅")
        print(f"List Models: {'✅' if models_ok else '❌'}")
        print(f"Chat Completion: {'✅' if chat_ok else '❌'}")
        print(f"Text Completion: {'✅' if text_ok else '❌'}")
        print(f"Embeddings: {'✅' if embeddings_ok else '❌'}")
        
        if all([models_ok, chat_ok, text_ok, embeddings_ok]):
            print("\n✅ All tests passed! LM Studio API is working correctly.")
            return True
        else:
            print("\n⚠️ Some tests failed. Check the logs for details.")
            return False
            
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

