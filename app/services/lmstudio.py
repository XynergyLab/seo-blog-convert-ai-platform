import os
import logging
import json
import time
from typing import Dict, List, Any, Optional, Union
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class LMStudioAPIError(Exception):
    """Custom exception for LM Studio API errors"""
    def __init__(self, message, status_code=None, response=None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class LMStudioClient:
    """Client for interacting with LM Studio API"""
    
    def __init__(self, api_url=None, timeout=None, max_retries=None, 
                 models_url=None, chat_url=None, completions_url=None, embeddings_url=None):
        """
        Initialize the LM Studio API client.
        
        Args:
            api_url (str, optional): The base URL for LM Studio API.
            timeout (int, optional): Request timeout in seconds.
            max_retries (int, optional): Maximum number of retry attempts.
            models_url (str, optional): Specific URL for the models endpoint.
            chat_url (str, optional): Specific URL for the chat completions endpoint.
            completions_url (str, optional): Specific URL for the completions endpoint.
            embeddings_url (str, optional): Specific URL for the embeddings endpoint.
        """
        # Load configuration from environment variables if not provided
        self.api_url = api_url or os.environ.get('LM_STUDIO_API_URL', 'http://169.254.183.119:1240')
        self.timeout = int(timeout or os.environ.get('LM_STUDIO_API_TIMEOUT', 30))
        self.max_retries = int(max_retries or os.environ.get('LM_STUDIO_API_RETRIES', 3))
        
        # Load specific endpoint URLs from environment variables if not provided
        self.models_url = models_url or os.environ.get('LM_STUDIO_MODELS_ENDPOINT') or f"{self.api_url}/v1/models"
        self.chat_url = chat_url or os.environ.get('LM_STUDIO_CHAT_ENDPOINT') or f"{self.api_url}/v1/chat/completions"
        self.completions_url = completions_url or os.environ.get('LM_STUDIO_COMPLETIONS_ENDPOINT') or f"{self.api_url}/v1/completions"
        self.embeddings_url = embeddings_url or os.environ.get('LM_STUDIO_EMBEDDINGS_ENDPOINT') or f"{self.api_url}/v1/embeddings"
        
        # Validate configuration
        self._validate_config()
        
        logger.info(f"LM Studio client initialized with API URL: {self.api_url}")
        logger.info(f"Using models endpoint: {self.models_url}")
        logger.info(f"Using chat completions endpoint: {self.chat_url}")
        logger.info(f"Using completions endpoint: {self.completions_url}")
        logger.info(f"Using embeddings endpoint: {self.embeddings_url}")
    
    def _validate_config(self) -> None:
        """
        Validate the client configuration.
        
        Raises:
            ValueError: If any configuration parameter is invalid.
        """
        if not self.api_url or not isinstance(self.api_url, str):
            raise ValueError("Invalid API URL. Please check your LM_STUDIO_API_URL setting.")
        
        if not isinstance(self.timeout, int) or self.timeout <= 0:
            raise ValueError("Timeout must be a positive integer.")
        
        if not isinstance(self.max_retries, int) or self.max_retries < 0:
            raise ValueError("Max retries must be a non-negative integer.")
        
        # Validate endpoint URLs
        for name, url in [
            ("Models", self.models_url),
            ("Chat completions", self.chat_url),
            ("Completions", self.completions_url),
            ("Embeddings", self.embeddings_url),
        ]:
            if not url or not isinstance(url, str):
                raise ValueError(f"Invalid {name} URL. Please check your LM Studio endpoint settings.")
    
    def _make_request(self, method: str, url: str, data: dict = None, params: dict = None) -> dict:
        """
        Make an HTTP request to the LM Studio API with retry logic.
        
        Args:
            method (str): HTTP method ('GET', 'POST', etc.)
            url (str): Full API URL
            data (dict, optional): Request payload
            params (dict, optional): URL parameters
            
        Returns:
            dict: The JSON response from the API
            
        Raises:
            LMStudioAPIError: If the request fails after retries
        """
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        retries = 0
        last_error = None
        
        while retries <= self.max_retries:
            try:
                logger.debug(f"Making {method} request to {url}, attempt {retries + 1}/{self.max_retries + 1}")
                
                if method.upper() == 'GET':
                    response = requests.get(url, params=params, headers=headers, timeout=self.timeout)
                elif method.upper() == 'POST':
                    response = requests.post(url, json=data, headers=headers, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Check if the request was successful
                response.raise_for_status()
                
                try:
                    return response.json()
                except ValueError:
                    raise LMStudioAPIError(f"Failed to parse JSON response: {response.text}")
                    
            except ConnectionError as e:
                last_error = f"Connection error: {str(e)}"
                logger.warning(f"Connection error: {str(e)}. Retrying in {2 ** retries} seconds...")
            except Timeout as e:
                last_error = f"Request timeout: {str(e)}"
                logger.warning(f"Request timeout: {str(e)}. Retrying in {2 ** retries} seconds...")
            except RequestException as e:
                if hasattr(e, 'response') and e.response:
                    status_code = e.response.status_code
                    try:
                        error_data = e.response.json()
                        error_message = error_data.get('error', {}).get('message', str(e))
                    except ValueError:
                        error_message = e.response.text or str(e)
                    
                    last_error = f"API error ({status_code}): {error_message}"
                    logger.warning(f"API error ({status_code}): {error_message}. Retrying in {2 ** retries} seconds...")
                else:
                    last_error = f"Request error: {str(e)}"
                    logger.warning(f"Request error: {str(e)}. Retrying in {2 ** retries} seconds...")
            
            # Exponential backoff
            if retries < self.max_retries:
                time.sleep(2 ** retries)
            
            retries += 1
        
        # If we get here, all retries have failed
        logger.error(f"Request failed after {self.max_retries + 1} attempts: {last_error}")
        raise LMStudioAPIError(
            f"Failed to connect to LM Studio API after {self.max_retries + 1} attempts: {last_error}"
        )
    
    def list_models(self) -> List[Dict[str, Any]]:
        """
        List available models in LM Studio.
        
        Returns:
            List[Dict[str, Any]]: List of available models
            
        Raises:
            LMStudioAPIError: If the request fails
        """
        try:
            response = self._make_request('GET', self.models_url)
            return response.get('data', [])
        except Exception as e:
            logger.error(f"Error listing models: {str(e)}")
            raise LMStudioAPIError(f"Failed to list models: {str(e)}")
    
    def create_chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "default",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a chat completion using the LM Studio API.
        
        Args:
            messages (List[Dict[str, str]]): List of message objects
            model (str, optional): Model to use for completion
            temperature (float, optional): Sampling temperature
            max_tokens (int, optional): Maximum number of tokens to generate
            stream (bool, optional): Whether to stream the response
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            Dict[str, Any]: The completion response
            
        Raises:
            LMStudioAPIError: If the request fails
        """
        data = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs
        }
        
        try:
            logger.info(f"Creating chat completion with {len(messages)} messages using model: {model}")
            response = self._make_request('POST', self.chat_url, data=data)
            return response
        except Exception as e:
            logger.error(f"Error creating chat completion: {str(e)}")
            raise LMStudioAPIError(f"Failed to create chat completion: {str(e)}")
    
    def create_completion(
        self, 
        prompt: str, 
        model: str = "default",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a text completion using the LM Studio API.
        
        Args:
            prompt (str): Text prompt
            model (str, optional): Model to use for completion
            temperature (float, optional): Sampling temperature
            max_tokens (int, optional): Maximum number of tokens to generate
            stream (bool, optional): Whether to stream the response
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            Dict[str, Any]: The completion response
            
        Raises:
            LMStudioAPIError: If the request fails
        """
        data = {
            "model": model,
            "prompt": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs
        }
        
        try:
            logger.info(f"Creating text completion with prompt length {len(prompt)} using model: {model}")
            response = self._make_request('POST', self.completions_url, data=data)
            return response
        except Exception as e:
            logger.error(f"Error creating text completion: {str(e)}")
            raise LMStudioAPIError(f"Failed to create text completion: {str(e)}")
    
    def create_embeddings(
        self, 
        input: Union[str, List[str]], 
        model: str = "default",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create embeddings for the given input using the LM Studio API.
        
        Args:
            input (Union[str, List[str]]): Input text(s) to embed
            model (str, optional): Model to use for embeddings
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            Dict[str, Any]: The embeddings response
            
        Raises:
            LMStudioAPIError: If the request fails
        """
        # Handle both string and list inputs
        if isinstance(input, str):
            input = [input]
        
        data = {
            "model": model,
            "input": input,
            **kwargs
        }
        
        try:
            logger.info(f"Creating embeddings for {len(input)} text(s) using model: {model}")
            response = self._make_request('POST', self.embeddings_url, data=data)
            return response
        except Exception as e:
            logger.error(f"Error creating embeddings: {str(e)}")
            raise LMStudioAPIError(f"Failed to create embeddings: {str(e)}")
    
    def check_connection(self) -> bool:
        """
        Check if the LM Studio API is accessible.
        
        Returns:
            bool: True if connection is successful, False otherwise
        """
        try:
            self.list_models()
            return True
        except Exception as e:
            logger.warning(f"LM Studio API connection check failed: {str(e)}")
            return False

