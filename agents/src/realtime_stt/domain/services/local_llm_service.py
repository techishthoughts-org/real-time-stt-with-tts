"""Local LLM service for open-source models."""

import asyncio
from typing import Any, Dict, List, Optional

import httpx
import ollama
from transformers import AutoTokenizer, pipeline

from ...infrastructure.observability.logger import observability


class LocalLLMService:
    """Service for local open-source language models."""

    def __init__(
        self,
        model_type: str = "ollama",  # "ollama", "huggingface", or "auto"
        model_name: str = "llama3.2:3b",  # Default Ollama model
        hf_model_name: str = "microsoft/DialoGPT-medium",  # Fallback HF model
        max_tokens: int = 200,
        temperature: float = 0.7
    ):
        self.model_type = model_type
        self.model_name = model_name
        self.hf_model_name = hf_model_name
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.logger = observability.get_logger("local_llm")

        # Model instances
        self.ollama_client = None
        self.hf_pipeline = None
        self.hf_tokenizer = None

        # Available models cache
        self.available_models = {"ollama": [], "huggingface": []}

        # Initialization state
        self._initialized = False
        self._initialization_lock = asyncio.Lock()

    async def _initialize_models(self):
        """Initialize the local models."""
        try:
            if self.model_type == "auto":
                # Try Ollama first, fallback to Hugging Face
                if await self._check_ollama_available():
                    self.model_type = "ollama"
                    await self._initialize_ollama()
                else:
                    self.model_type = "huggingface"
                    await self._initialize_huggingface()
            elif self.model_type == "ollama":
                await self._initialize_ollama()
            elif self.model_type == "huggingface":
                await self._initialize_huggingface()

            self.logger.info(f"Local LLM service initialized with {self.model_type}")

        except Exception as e:
            self.logger.error(f"Failed to initialize local LLM: {e}")
            # Fallback to simple responses
            self.model_type = "fallback"

    async def _check_ollama_available(self) -> bool:
        """Check if Ollama is available and running."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://localhost:11434/api/tags", timeout=5.0
                )
                return response.status_code == 200
        except Exception:
            return False

    async def _initialize_ollama(self):
        """Initialize Ollama client and models."""
        try:
            # Check if Ollama is running
            if not await self._check_ollama_available():
                raise Exception("Ollama server not running on localhost:11434")

            self.ollama_client = ollama.AsyncClient()

            # Get available models
            models = await self.ollama_client.list()
            self.available_models["ollama"] = [
                model.model for model in models.models
            ]

            # Check if our preferred model is available
            if self.model_name not in self.available_models["ollama"]:
                if self.available_models["ollama"]:
                    # Use the first available model
                    self.model_name = self.available_models["ollama"][0]
                    self.logger.info(f"Using available Ollama model: {self.model_name}")
                else:
                    # Try to pull a small model
                    self.logger.info(f"Pulling Ollama model: {self.model_name}")
                    await self.ollama_client.pull(self.model_name)

            self.logger.info(f"Ollama initialized with model: {self.model_name}")

        except Exception as e:
            self.logger.error(f"Failed to initialize Ollama: {e}")
            raise

    async def _initialize_huggingface(self):
        """Initialize Hugging Face transformers."""
        try:
            self.logger.info(f"Loading Hugging Face model: {self.hf_model_name}")

            # Initialize tokenizer and model
            self.hf_tokenizer = AutoTokenizer.from_pretrained(self.hf_model_name)

            # Add padding token if it doesn't exist
            if self.hf_tokenizer.pad_token is None:
                self.hf_tokenizer.pad_token = self.hf_tokenizer.eos_token

            # Initialize text generation pipeline
            self.hf_pipeline = pipeline(
                "text-generation",
                model=self.hf_model_name,
                tokenizer=self.hf_tokenizer,
                max_length=self.max_tokens,
                temperature=self.temperature,
                do_sample=True,
                pad_token_id=self.hf_tokenizer.eos_token_id
            )

            self.logger.info(f"Hugging Face model loaded: {self.hf_model_name}")

        except Exception as e:
            self.logger.error(f"Failed to initialize Hugging Face model: {e}")
            raise

    async def generate_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate a response using the local LLM."""

        # Ensure initialization is complete
        async with self._initialization_lock:
            if not self._initialized:
                await self._initialize_models()
                self._initialized = True

        with observability.trace_span("local_llm_generation", {"prompt_length": len(prompt)}):
            observability.log_event("local_llm_query_started", model_type=self.model_type)

            try:
                if self.model_type == "ollama":
                    response = await self._generate_ollama_response(prompt, context, system_prompt)
                elif self.model_type == "huggingface":
                    response = await self._generate_hf_response(prompt, context, system_prompt)
                else:
                    response = await self._generate_fallback_response(prompt)

                observability.log_event(
                    "local_llm_response_generated",
                    response_length=len(response),
                    model_type=self.model_type
                )

                return response

            except Exception as e:
                self.logger.error(f"Error generating response: {e}")
                return await self._generate_fallback_response(prompt)

    async def _generate_ollama_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate response using Ollama."""
        try:
            # Construct the full prompt
            full_prompt = self._construct_prompt(prompt, context, system_prompt)

            # Generate response
            response = await self.ollama_client.generate(
                model=self.model_name,
                prompt=full_prompt,
                options={
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                    "stop": ["\n\n", "Human:", "User:"]
                }
            )

            return response['response'].strip()

        except Exception as e:
            self.logger.error(f"Ollama generation error: {e}")
            raise

    async def _generate_hf_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate response using Hugging Face transformers."""
        try:
            # Construct the full prompt
            full_prompt = self._construct_prompt(prompt, context, system_prompt)

            # Generate response in a thread to avoid blocking
            loop = asyncio.get_event_loop()

            def generate():
                outputs = self.hf_pipeline(
                    full_prompt,
                    max_length=len(full_prompt.split()) + self.max_tokens,
                    num_return_sequences=1,
                    temperature=self.temperature,
                    do_sample=True
                )
                return outputs[0]['generated_text']

            generated_text = await loop.run_in_executor(None, generate)

            # Extract only the new part (remove the input prompt)
            response = generated_text[len(full_prompt):].strip()

            # Clean up the response
            response = self._clean_response(response)

            return response

        except Exception as e:
            self.logger.error(f"Hugging Face generation error: {e}")
            raise

    def _construct_prompt(
        self,
        prompt: str,
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Construct the full prompt for the model."""

        parts = []

        if system_prompt:
            parts.append(f"System: {system_prompt}")

        if context:
            parts.append(f"Context: {context}")

        parts.append(f"Human: {prompt}")
        parts.append("Assistant:")

        return "\n\n".join(parts)

    def _clean_response(self, response: str) -> str:
        """Clean up the generated response."""
        # Remove common artifacts
        response = response.strip()

        # Stop at common conversation endings
        stop_phrases = ["\nHuman:", "\nUser:", "\nSystem:", "Human:", "User:", "System:"]
        for phrase in stop_phrases:
            if phrase in response:
                response = response.split(phrase)[0]

        # Limit length
        words = response.split()
        if len(words) > 50:  # Reasonable response length
            response = " ".join(words[:50])

        return response.strip()

    async def _generate_fallback_response(self, prompt: str) -> str:
        """Generate a simple fallback response."""
        prompt_lower = prompt.lower()

        # Simple pattern matching for fallback
        if any(word in prompt_lower for word in ["hello", "hi", "hey"]):
            return "Hello! I'm an AI assistant. How can I help you today?"
        elif any(word in prompt_lower for word in ["math", "calculate", "+"]):
            return "I can help with basic questions, but I don't have a calculator built in."
        elif "?" in prompt:
            return "That's an interesting question. I'm running on a local model and doing my best to help."
        else:
            return "I understand. Is there anything specific I can help you with?"

    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model."""
        info = {
            "model_type": self.model_type,
            "status": "active" if self.model_type != "fallback" else "fallback",
            "available_models": self.available_models
        }

        if self.model_type == "ollama":
            info["current_model"] = self.model_name
            info["ollama_running"] = await self._check_ollama_available()
        elif self.model_type == "huggingface":
            info["current_model"] = self.hf_model_name
            info["model_loaded"] = self.hf_pipeline is not None

        return info

    async def list_available_models(self) -> Dict[str, List[str]]:
        """List all available models."""
        # Update Ollama models if available
        if await self._check_ollama_available():
            try:
                if not self.ollama_client:
                    self.ollama_client = ollama.AsyncClient()
                models = await self.ollama_client.list()
                self.available_models["ollama"] = [model.model for model in models.models]
            except Exception as e:
                self.logger.error(f"Error listing Ollama models: {e}")

        # Add some popular HF models
        self.available_models["huggingface"] = [
            "microsoft/DialoGPT-medium",
            "microsoft/DialoGPT-large",
            "distilgpt2",
            "gpt2",
            "facebook/blenderbot-400M-distill"
        ]

        return self.available_models

    async def switch_model(self, model_type: str, model_name: str) -> bool:
        """Switch to a different model."""
        try:
            self.model_type = model_type

            if model_type == "ollama":
                self.model_name = model_name
                await self._initialize_ollama()
            elif model_type == "huggingface":
                self.hf_model_name = model_name
                await self._initialize_huggingface()

            self.logger.info(f"Switched to {model_type} model: {model_name}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to switch model: {e}")
            return False
