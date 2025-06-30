"""AI reasoning service for intelligent responses."""

import asyncio
import os
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

from ...infrastructure.observability.logger import observability
from .local_llm_service import LocalLLMService
from .rag_service import RAGService


class AIReasoningService:
    """Service for AI-powered reasoning and responses with minimal latency."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-3.5-turbo",
        local_model_type: str = "auto",
        local_model_name: str = "llama3.2:3b",
        prefer_local: bool = True,
        max_conversation_history: int = 10
    ):
        # OpenAI client (fallback)
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        self.model = model
        self.prefer_local = prefer_local
        self.max_conversation_history = max_conversation_history

        self.logger = observability.get_logger("ai_reasoning")
        self.conversation_history: List[Dict[str, str]] = []

        # Initialize local LLM service for low latency
        self.local_llm = LocalLLMService(
            model_type=local_model_type,
            model_name=local_model_name,
            max_tokens=150,  # Shorter responses for real-time
            temperature=0.7
        )

        # Initialize RAG service with local LLM support
        self.rag_service = RAGService(
            api_key=self.api_key,
            model=model,
            local_llm_service=self.local_llm
        )

        # Performance tracking
        self.response_stats = {
            "total_requests": 0,
            "local_llm_used": 0,
            "openai_used": 0,
            "rag_used": 0,
            "fallback_used": 0,
            "avg_response_time": 0.0
        }

    async def reason_and_respond(
        self,
        transcribed_text: str,
        context: Optional[Dict[str, Any]] = None,
        use_rag: bool = True,
        max_response_length: int = 150
    ) -> str:
        """Analyze transcribed text and generate intelligent response with minimal latency."""

        start_time = asyncio.get_event_loop().time()
        self.response_stats["total_requests"] += 1

        with observability.trace_span("ai_reasoning", {"text_length": len(transcribed_text)}):
            observability.log_event(
                "reasoning_started",
                text=transcribed_text[:100] + "..." if len(transcribed_text) > 100 else transcribed_text,
                context=context,
                prefer_local=self.prefer_local
            )

            # Add to conversation history
            self._add_to_conversation("user", transcribed_text)

            try:
                # Strategy 1: Try local LLM first for minimal latency
                if self.prefer_local:
                    response = await self._try_local_llm_response(
                        transcribed_text, context, max_response_length
                    )
                    if response:
                        self.response_stats["local_llm_used"] += 1
                        self._add_to_conversation("assistant", response)
                        self._update_response_time(start_time)
                        return response

                # Strategy 2: Try RAG with knowledge base
                if use_rag:
                    response = await self._try_rag_response(
                        transcribed_text, context, max_response_length
                    )
                    if response:
                        self.response_stats["rag_used"] += 1
                        self._add_to_conversation("assistant", response)
                        self._update_response_time(start_time)
                        return response

                # Strategy 3: Try OpenAI as fallback
                if self.client:
                    response = await self._try_openai_response(
                        transcribed_text, context, max_response_length
                    )
                    if response:
                        self.response_stats["openai_used"] += 1
                        self._add_to_conversation("assistant", response)
                        self._update_response_time(start_time)
                        return response

                # Strategy 4: Simple rule-based fallback
                response = await self._simple_reasoning(transcribed_text)
                self.response_stats["fallback_used"] += 1
                self._add_to_conversation("assistant", response)
                self._update_response_time(start_time)
                return response

            except Exception as e:
                observability.log_error(e, {"transcribed_text": transcribed_text})
                # Final fallback
                response = await self._simple_reasoning(transcribed_text)
                self.response_stats["fallback_used"] += 1
                self._add_to_conversation("assistant", response)
                self._update_response_time(start_time)
                return response

    async def _try_local_llm_response(
        self, text: str, context: Optional[Dict[str, Any]], max_length: int
    ) -> Optional[str]:
        """Try to get response from local LLM."""
        try:
            # Create context-aware prompt
            system_prompt = self._create_system_prompt(context, for_local=True)
            conversation_context = self._get_conversation_context(max_entries=3)

            full_prompt = f"{system_prompt}\n\n{conversation_context}\nUser: {text}\nAssistant:"

            response = await self.local_llm.generate_response(
                full_prompt,
                context=conversation_context,
                system_prompt=system_prompt
            )

            if response and len(response.strip()) > 0:
                # Truncate if too long
                if len(response) > max_length:
                    response = response[:max_length-3] + "..."

                self.logger.info(f"Local LLM response generated: {response[:50]}...")
                return response.strip()

        except Exception as e:
            self.logger.warning(f"Local LLM failed: {e}")

        return None

    async def _try_rag_response(
        self, text: str, context: Optional[Dict[str, Any]], max_length: int
    ) -> Optional[str]:
        """Try to get response using RAG system."""
        try:
            response = await self.rag_service.generate_rag_response(text, context)

            if response and len(response.strip()) > 0:
                # Truncate if too long
                if len(response) > max_length:
                    response = response[:max_length-3] + "..."

                self.logger.info(f"RAG response generated: {response[:50]}...")
                return response.strip()

        except Exception as e:
            self.logger.warning(f"RAG system failed: {e}")

        return None

    async def _try_openai_response(
        self, text: str, context: Optional[Dict[str, Any]], max_length: int
    ) -> Optional[str]:
        """Try to get response from OpenAI."""
        if not self.client:
            return None

        try:
            system_prompt = self._create_system_prompt(context, for_local=False)
            conversation_context = self._get_conversation_context(max_entries=5)

            messages = [
                {"role": "system", "content": system_prompt}
            ]

            # Add conversation history
            for entry in conversation_context:
                messages.append(entry)

            # Add current message
            messages.append({"role": "user", "content": text})

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_length,
                temperature=0.7,
                timeout=5.0  # Quick timeout for real-time
            )

            if response.choices and response.choices[0].message.content:
                content = response.choices[0].message.content.strip()
                self.logger.info(f"OpenAI response generated: {content[:50]}...")
                return content

        except Exception as e:
            self.logger.warning(f"OpenAI API failed: {e}")

        return None

    def _create_system_prompt(self, context: Optional[Dict[str, Any]] = None, for_local: bool = False) -> str:
        """Create system prompt optimized for real-time responses."""
        if for_local:
            # Shorter, more direct prompt for local models
            base_prompt = """You are a helpful voice assistant. Respond briefly and naturally to what the user says. Keep responses under 2 sentences."""
        else:
            # More detailed prompt for cloud models
            base_prompt = """You are an intelligent voice assistant. You receive real-time speech transcriptions and should:

1. Respond naturally and conversationally
2. Keep responses concise (under 150 words)
3. Ask clarifying questions when helpful
4. Be friendly and engaging
5. Focus on being helpful

Respond as if in a real-time conversation."""

        if context:
            base_prompt += f"\n\nAdditional context: {context}"

        return base_prompt

    async def _simple_reasoning(self, text: str) -> str:
        """Enhanced fallback reasoning with pattern matching."""
        text_lower = text.lower().strip()

        # Greeting patterns
        if any(word in text_lower for word in ["hello", "hi", "hey", "good morning", "good evening"]):
            return "Hello! How can I help you today?"

        # How are you patterns
        elif any(phrase in text_lower for phrase in ["how are you", "how's it going", "how do you do"]):
            return "I'm doing well, thank you for asking! What can I help you with?"

        # Thank you patterns
        elif any(phrase in text_lower for phrase in ["thank you", "thanks", "appreciate"]):
            return "You're very welcome! Is there anything else I can help with?"

        # Question patterns
        elif text.endswith("?") or any(word in text_lower for word in ["what", "how", "when", "where", "why", "who"]):
            return f"That's a great question about '{text}'. Let me think about that and help you find an answer."

        # Help patterns
        elif any(word in text_lower for word in ["help", "assist", "support"]):
            return "I'm here to help! What would you like assistance with?"

        # Goodbye patterns
        elif any(word in text_lower for word in ["goodbye", "bye", "see you", "talk later"]):
            return "Goodbye! Have a great day!"

        # Default response
        else:
            return f"I heard you say: '{text}'. How would you like me to respond to that?"

    def _add_to_conversation(self, role: str, content: str):
        """Add message to conversation history with length management."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": observability.get_current_timestamp()
        })

        # Keep conversation history manageable
        if len(self.conversation_history) > self.max_conversation_history * 2:
            # Remove oldest entries but keep last max_conversation_history
            self.conversation_history = self.conversation_history[-self.max_conversation_history:]

    def _get_conversation_context(self, max_entries: int = 5) -> List[Dict[str, str]]:
        """Get recent conversation context for AI models."""
        if not self.conversation_history:
            return []

        # Get last max_entries messages
        recent_history = self.conversation_history[-max_entries*2:]  # *2 for user+assistant pairs

        # Convert to format expected by AI models
        context = []
        for entry in recent_history:
            if entry["role"] in ["user", "assistant"]:
                context.append({
                    "role": entry["role"],
                    "content": entry["content"]
                })

        return context

    def _update_response_time(self, start_time: float):
        """Update average response time statistics."""
        end_time = asyncio.get_event_loop().time()
        response_time = end_time - start_time

        # Update running average
        total_requests = self.response_stats["total_requests"]
        current_avg = self.response_stats["avg_response_time"]
        new_avg = ((current_avg * (total_requests - 1)) + response_time) / total_requests
        self.response_stats["avg_response_time"] = new_avg

        observability.log_event(
            "reasoning_completed",
            response_time=response_time,
            avg_response_time=new_avg
        )

    def clear_conversation(self):
        """Clear conversation history."""
        self.conversation_history.clear()
        observability.log_event("conversation_cleared")

    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get conversation statistics and performance metrics."""
        rag_stats = self.rag_service.get_knowledge_stats()
        return {
            "total_exchanges": len(self.conversation_history) // 2,
            "total_messages": len(self.conversation_history),
            "conversation_active": len(self.conversation_history) > 0,
            "recent_messages": self.conversation_history[-6:] if self.conversation_history else [],
            "knowledge_base": rag_stats,
            "performance": self.response_stats,
            "local_llm_preferred": self.prefer_local
        }

    async def add_knowledge(self, topic: str, content: str, category: str = "user", tags: List[str] = None):
        """Add knowledge to the RAG system."""
        await self.rag_service.add_knowledge(topic, content, category, tags)

    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        return self.rag_service.get_knowledge_stats()

    async def set_local_preference(self, prefer_local: bool):
        """Change preference for local vs cloud AI."""
        self.prefer_local = prefer_local
        observability.log_event("ai_preference_changed", prefer_local=prefer_local)

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance and usage statistics."""
        return self.response_stats.copy()
