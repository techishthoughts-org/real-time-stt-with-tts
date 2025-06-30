"""RAG (Retrieval-Augmented Generation) service for knowledge-based responses."""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from openai import AsyncOpenAI
from sentence_transformers import SentenceTransformer

from ...infrastructure.observability.logger import observability


class RAGService:
    """Service for Retrieval-Augmented Generation responses."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-3.5-turbo",
        embedding_model: str = "all-MiniLM-L6-v2",
        local_llm_service: Optional[Any] = None
    ):
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None
        self.model = model
        self.local_llm_service = local_llm_service
        self.logger = observability.get_logger("rag_service")

        # Initialize embedding model for semantic search
        self.embedding_model = SentenceTransformer(embedding_model)

        # Knowledge base storage
        self.knowledge_base: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None

        # Conversation history
        self.conversation_history: List[Dict[str, str]] = []

        # Initialization state
        self._initialized = False
        self._initialization_lock = asyncio.Lock()

    async def _initialize_knowledge_base(self):
        """Initialize the knowledge base with default information."""
        try:
            # Load knowledge from file if it exists
            knowledge_file = Path("knowledge_base.json")
            if knowledge_file.exists():
                await self._load_knowledge_from_file(knowledge_file)
            else:
                # Create default knowledge base
                await self._create_default_knowledge()

            self.logger.info(f"Knowledge base initialized with {len(self.knowledge_base)} entries")

        except Exception as e:
            self.logger.error(f"Failed to initialize knowledge base: {e}")
            await self._create_minimal_knowledge()

    async def _create_default_knowledge(self):
        """Create a default knowledge base with useful information."""
        default_knowledge = [
            {
                "topic": "RealtimeSTT Project",
                "content": "RealtimeSTT is a real-time speech-to-text system that provides live transcription with AI-powered responses. It features audio device selection, keyboard shortcuts, and text-to-speech capabilities.",
                "category": "project",
                "tags": ["speech", "transcription", "ai", "realtime"]
            },
            {
                "topic": "Audio Device Management",
                "content": "The system supports audio device selection for both input (microphone) and output (speakers). Device 0 is typically the MacBook Pro Microphone, and Device 1 is the MacBook Pro Speakers. You can list available devices and test them before starting conversations.",
                "category": "audio",
                "tags": ["audio", "devices", "microphone", "speakers"]
            },
            {
                "topic": "Keyboard Shortcuts",
                "content": "Available keyboard shortcuts include: 'q' to quit, 'h' to toggle help, 'd' to show devices, 'c' to show configuration, 's' to save settings, space to pause/resume, and 'a' to toggle AI reasoning.",
                "category": "controls",
                "tags": ["keyboard", "shortcuts", "controls"]
            },
            {
                "topic": "AI and TTS",
                "content": "The system uses AI reasoning services for intelligent responses and text-to-speech (TTS) for voice output. On macOS, it uses the built-in 'say' command for TTS. AI responses are generated based on conversation context.",
                "category": "ai",
                "tags": ["ai", "tts", "voice", "responses"]
            },
            {
                "topic": "Configuration",
                "content": "Settings are stored in .realtime_stt_config.json file. This includes audio device preferences, AI settings, and user customizations. Configuration can be saved and loaded automatically.",
                "category": "configuration",
                "tags": ["config", "settings", "preferences"]
            },
            {
                "topic": "Python and Dependencies",
                "content": "The project uses Python with dependencies managed by uv. Key libraries include RealtimeSTT for speech recognition, OpenAI for AI responses, Rich for UI, and various audio processing libraries.",
                "category": "technical",
                "tags": ["python", "dependencies", "libraries"]
            },
            {
                "topic": "Current Date and Time",
                "content": f"Today's date is {datetime.now().strftime('%Y-%m-%d')} and the current time is {datetime.now().strftime('%H:%M:%S')}. The system can provide real-time information about the current date and time.",
                "category": "time",
                "tags": ["date", "time", "current"]
            }
        ]

        await self._add_knowledge_entries(default_knowledge)

    async def _create_minimal_knowledge(self):
        """Create minimal knowledge base as fallback."""
        minimal_knowledge = [
            {
                "topic": "General Assistant",
                "content": "I am an AI assistant that can help answer questions and have conversations. I use retrieval-augmented generation to provide informed responses.",
                "category": "general",
                "tags": ["assistant", "ai", "help"]
            }
        ]

        await self._add_knowledge_entries(minimal_knowledge)

    async def _add_knowledge_entries(self, entries: List[Dict[str, Any]]):
        """Add knowledge entries and compute embeddings."""
        self.knowledge_base.extend(entries)

        # Compute embeddings for all knowledge entries
        texts = [entry["content"] for entry in self.knowledge_base]
        embeddings = self.embedding_model.encode(texts)

        if self.embeddings is None:
            self.embeddings = embeddings
        else:
            self.embeddings = np.vstack([self.embeddings, embeddings])

    async def add_knowledge(self, topic: str, content: str, category: str = "user", tags: List[str] = None):
        """Add new knowledge to the knowledge base."""
        entry = {
            "topic": topic,
            "content": content,
            "category": category,
            "tags": tags or [],
            "added_at": datetime.now().isoformat()
        }

        await self._add_knowledge_entries([entry])

        # Save to file
        await self._save_knowledge_to_file()

        self.logger.info(f"Added knowledge entry: {topic}")

    async def _retrieve_relevant_knowledge(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve the most relevant knowledge entries for a query."""
        if not self.knowledge_base or self.embeddings is None:
            return []

        try:
            # Encode the query
            query_embedding = self.embedding_model.encode([query])

            # Compute similarities
            similarities = np.dot(query_embedding, self.embeddings.T).flatten()

            # Get top-k most similar entries
            top_indices = np.argsort(similarities)[-top_k:][::-1]

            relevant_entries = []
            for idx in top_indices:
                if similarities[idx] > 0.3:  # Minimum similarity threshold
                    entry = self.knowledge_base[idx].copy()
                    entry["similarity"] = float(similarities[idx])
                    relevant_entries.append(entry)

            return relevant_entries

        except Exception as e:
            self.logger.error(f"Error retrieving knowledge: {e}")
            return []

    async def generate_rag_response(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a response using retrieval-augmented generation."""

        # Ensure initialization is complete
        async with self._initialization_lock:
            if not self._initialized:
                await self._initialize_knowledge_base()
                self._initialized = True

        with observability.trace_span("rag_generation", {"query_length": len(query)}):
            observability.log_event("rag_query_started", query=query[:100])

            try:
                # Retrieve relevant knowledge
                relevant_knowledge = await self._retrieve_relevant_knowledge(query, top_k=3)

                # Add user message to conversation
                self.conversation_history.append({
                    "role": "user",
                    "content": query
                })

                if self.client and relevant_knowledge:
                    # Generate response with OpenAI using retrieved knowledge
                    response = await self._generate_openai_response(query, relevant_knowledge, context)
                elif self.local_llm_service and relevant_knowledge:
                    # Generate response with local LLM using retrieved knowledge
                    response = await self._generate_local_llm_response(query, relevant_knowledge, context)
                else:
                    # Fallback to knowledge-based response
                    response = await self._generate_knowledge_response(query, relevant_knowledge)

                # Add AI response to conversation
                self.conversation_history.append({
                    "role": "assistant",
                    "content": response
                })

                observability.log_event(
                    "rag_response_generated",
                    response_length=len(response),
                    knowledge_entries_used=len(relevant_knowledge)
                )

                return response

            except Exception as e:
                self.logger.error(f"Error generating RAG response: {e}")
                return "I'm sorry, I encountered an error while processing your question. Could you please try again?"

    async def _generate_openai_response(
        self,
        query: str,
        knowledge_entries: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate response using OpenAI with retrieved knowledge."""

        # Create knowledge context
        knowledge_context = "\n\n".join([
            f"**{entry['topic']}**: {entry['content']}"
            for entry in knowledge_entries
        ])

        system_prompt = f"""You are an intelligent AI assistant with access to a knowledge base. Use the provided knowledge to answer the user's question accurately and helpfully.

**Available Knowledge:**
{knowledge_context}

**Instructions:**
1. Use the provided knowledge to answer the user's question
2. If the knowledge doesn't contain the answer, say so honestly
3. Be conversational and natural
4. Keep responses concise but informative
5. If asked about current time/date, provide the current information
6. For technical questions, be specific and helpful

**Current Context:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

        if context:
            system_prompt += f"\n\n**Additional Context:** {context}"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *self.conversation_history[-6:]  # Keep last 6 exchanges
                ],
                max_tokens=200,
                temperature=0.7
            )

            return response.choices[0].message.content

        except Exception as e:
            self.logger.error(f"OpenAI API error: {e}")
            return await self._generate_knowledge_response(query, knowledge_entries)

    async def _generate_local_llm_response(
        self,
        query: str,
        knowledge_entries: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate response using local LLM with retrieved knowledge."""

        # Create knowledge context
        knowledge_context = "\n\n".join([
            f"**{entry['topic']}**: {entry['content']}"
            for entry in knowledge_entries
        ])

        system_prompt = f"""You are an intelligent AI assistant with access to a knowledge base. Use the provided knowledge to answer the user's question accurately and helpfully.

Available Knowledge:
{knowledge_context}

Instructions:
1. Use the provided knowledge to answer the user's question
2. If the knowledge doesn't contain the answer, say so honestly
3. Be conversational and natural
4. Keep responses concise but informative
5. If asked about current time/date, provide the current information
6. For technical questions, be specific and helpful

Current Context: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

        if context:
            system_prompt += f"\n\nAdditional Context: {context}"

        try:
            response = await self.local_llm_service.generate_response(
                query,
                knowledge_context,
                system_prompt
            )

            return response

        except Exception as e:
            self.logger.error(f"Local LLM error: {e}")
            return await self._generate_knowledge_response(query, knowledge_entries)

    async def _generate_knowledge_response(
        self,
        query: str,
        knowledge_entries: List[Dict[str, Any]]
    ) -> str:
        """Generate response using only retrieved knowledge (fallback)."""

        if not knowledge_entries:
            return await self._generate_fallback_response(query)

        # Use the most relevant knowledge entry
        best_entry = knowledge_entries[0]

        query_lower = query.lower()

        # Check for specific question types
        if any(word in query_lower for word in ["what", "how", "why", "when", "where"]):
            return f"Based on what I know about {best_entry['topic']}: {best_entry['content']}"
        elif any(word in query_lower for word in ["time", "date", "today", "now"]):
            current_time = datetime.now()
            return f"The current date and time is {current_time.strftime('%Y-%m-%d %H:%M:%S')}."
        else:
            return f"Regarding {best_entry['topic']}: {best_entry['content']}"

    async def _generate_fallback_response(self, query: str) -> str:
        """Generate a fallback response when no relevant knowledge is found."""
        query_lower = query.lower()

        if any(word in query_lower for word in ["hello", "hi", "hey"]):
            return "Hello! I'm an AI assistant with access to a knowledge base. How can I help you today?"
        elif any(word in query_lower for word in ["time", "date", "today", "now"]):
            current_time = datetime.now()
            return f"The current date and time is {current_time.strftime('%Y-%m-%d %H:%M:%S')}."
        elif "?" in query:
            return "I don't have specific information about that in my knowledge base. Could you ask about something else, or would you like me to add this information for future reference?"
        else:
            return "I understand you're asking about something, but I don't have relevant information in my knowledge base. How can I help you with something else?"

    async def _save_knowledge_to_file(self):
        """Save knowledge base to file."""
        try:
            knowledge_file = Path("knowledge_base.json")
            with open(knowledge_file, 'w') as f:
                json.dump(self.knowledge_base, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save knowledge base: {e}")

    async def _load_knowledge_from_file(self, file_path: Path):
        """Load knowledge base from file."""
        try:
            with open(file_path, 'r') as f:
                self.knowledge_base = json.load(f)

            # Recompute embeddings
            if self.knowledge_base:
                texts = [entry["content"] for entry in self.knowledge_base]
                self.embeddings = self.embedding_model.encode(texts)

        except Exception as e:
            self.logger.error(f"Failed to load knowledge base: {e}")
            await self._create_default_knowledge()

    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base."""
        categories = {}
        for entry in self.knowledge_base:
            category = entry.get("category", "unknown")
            categories[category] = categories.get(category, 0) + 1

        return {
            "total_entries": len(self.knowledge_base),
            "categories": categories,
            "conversation_exchanges": len(self.conversation_history) // 2
        }

    def clear_conversation(self):
        """Clear conversation history."""
        self.conversation_history.clear()
        observability.log_event("rag_conversation_cleared")
