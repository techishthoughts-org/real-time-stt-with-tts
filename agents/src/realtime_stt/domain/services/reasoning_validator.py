"""
Reasoning Validator Service

This service validates the logical consistency and appropriateness of AI responses
given user inputs. It implements contextual and sequential thinking validation.
"""

import asyncio
import re
import time
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union

from ...infrastructure.observability.logger import observability
from ..entities.audio import AudioChunk


class ReasoningCategory(Enum):
    """Categories of reasoning to validate."""
    FACTUAL = "factual"           # Factual accuracy
    LOGICAL = "logical"           # Logical consistency
    CONTEXTUAL = "contextual"     # Context awareness
    EMOTIONAL = "emotional"       # Emotional appropriateness
    SEQUENTIAL = "sequential"     # Sequential conversation flow
    CREATIVE = "creative"         # Creative responses
    PROBLEM_SOLVING = "problem_solving"  # Problem solving approach


class ValidationResult(Enum):
    """Validation results."""
    EXCELLENT = "excellent"       # 90-100% quality
    GOOD = "good"                # 70-89% quality
    ACCEPTABLE = "acceptable"     # 50-69% quality
    POOR = "poor"                # 30-49% quality
    FAILED = "failed"            # 0-29% quality


@dataclass
class ReasoningTest:
    """A single reasoning validation test."""
    question: str
    expected_reasoning_type: ReasoningCategory
    context: Optional[Dict] = None
    follow_up_questions: Optional[List[str]] = None
    validation_criteria: Optional[List[str]] = None


@dataclass
class ValidationScore:
    """Scoring for a validation test."""
    overall_score: float
    category_scores: Dict[ReasoningCategory, float]
    reasoning_quality: ValidationResult
    detailed_feedback: str
    response_time_ms: float


class ReasoningValidator:
    """Service for validating AI reasoning quality and consistency."""

    def __init__(self, ai_service=None):
        """Initialize the reasoning validator."""
        self.logger = observability.get_logger("reasoning_validator")
        self.ai_service = ai_service
        self.validation_history: List[Dict] = []

        # Test categories with their validation patterns
        self.validation_patterns = self._initialize_validation_patterns()

        observability.log_event("reasoning_validator_initialized")

    def _initialize_validation_patterns(self) -> Dict[ReasoningCategory, Dict]:
        """Initialize validation patterns for different reasoning categories."""
        return {
            ReasoningCategory.FACTUAL: {
                "positive_indicators": [
                    "according to", "based on", "research shows", "studies indicate",
                    "it is known that", "evidence suggests", "data shows"
                ],
                "negative_indicators": [
                    "i think", "maybe", "probably", "i guess", "i'm not sure"
                ],
                "required_elements": ["specific information", "accuracy"]
            },

            ReasoningCategory.LOGICAL: {
                "positive_indicators": [
                    "therefore", "because", "as a result", "consequently",
                    "this leads to", "due to", "given that", "since"
                ],
                "negative_indicators": [
                    "randomly", "without reason", "just because"
                ],
                "required_elements": ["cause and effect", "logical flow"]
            },

            ReasoningCategory.CONTEXTUAL: {
                "positive_indicators": [
                    "building on", "referring to", "as mentioned", "following up",
                    "in relation to", "considering your"
                ],
                "negative_indicators": [
                    "ignoring context", "unrelated"
                ],
                "required_elements": ["context awareness", "relevance"]
            },

            ReasoningCategory.EMOTIONAL: {
                "positive_indicators": [
                    "understand", "empathy", "feelings", "emotional",
                    "sorry to hear", "congratulations", "that's great"
                ],
                "negative_indicators": [
                    "i don't care", "whatever", "that's stupid"
                ],
                "required_elements": ["emotional awareness", "appropriate tone"]
            },

            ReasoningCategory.SEQUENTIAL: {
                "positive_indicators": [
                    "first", "then", "next", "finally", "step by step",
                    "following that", "in sequence"
                ],
                "negative_indicators": [
                    "jumping around", "random order"
                ],
                "required_elements": ["logical sequence", "clear progression"]
            }
        }

    async def validate_reasoning(
        self,
        user_question: str,
        ai_response: str,
        expected_category: ReasoningCategory = ReasoningCategory.LOGICAL,
        context: Optional[Dict] = None
    ) -> ValidationScore:
        """Validate the reasoning quality of an AI response."""

        start_time = time.time()

        observability.log_event(
            "reasoning_validation_started",
            question_length=len(user_question),
            response_length=len(ai_response),
            category=expected_category.value
        )

        try:
            # Perform different types of validation
            category_scores = {}

            # 1. Category-specific validation
            category_scores[expected_category] = await self._validate_category(
                user_question, ai_response, expected_category, context
            )

            # 2. General logical consistency
            category_scores[ReasoningCategory.LOGICAL] = await self._validate_logical_consistency(
                user_question, ai_response
            )

            # 3. Contextual appropriateness
            category_scores[ReasoningCategory.CONTEXTUAL] = await self._validate_contextual_appropriateness(
                user_question, ai_response, context
            )

            # 4. Sequential thinking (if applicable)
            if self._requires_sequential_thinking(user_question):
                category_scores[ReasoningCategory.SEQUENTIAL] = await self._validate_sequential_thinking(
                    user_question, ai_response
                )

            # Calculate overall score
            overall_score = sum(category_scores.values()) / len(category_scores)

            # Determine quality level
            reasoning_quality = self._determine_quality_level(overall_score)

            # Generate detailed feedback
            detailed_feedback = self._generate_detailed_feedback(
                user_question, ai_response, category_scores, expected_category
            )

            response_time = (time.time() - start_time) * 1000

            validation_score = ValidationScore(
                overall_score=overall_score,
                category_scores=category_scores,
                reasoning_quality=reasoning_quality,
                detailed_feedback=detailed_feedback,
                response_time_ms=response_time
            )

            # Store in history
            self.validation_history.append({
                "timestamp": time.time(),
                "question": user_question,
                "response": ai_response,
                "score": validation_score,
                "category": expected_category.value
            })

            observability.log_event(
                "reasoning_validation_completed",
                overall_score=overall_score,
                quality=reasoning_quality.value,
                response_time_ms=response_time
            )

            return validation_score

        except Exception as e:
            self.logger.error(f"Error in reasoning validation: {e}")
            observability.log_error(e, {
                "question": user_question[:100],
                "response": ai_response[:100]
            })

            # Return minimal score on error
            return ValidationScore(
                overall_score=0.0,
                category_scores={},
                reasoning_quality=ValidationResult.FAILED,
                detailed_feedback=f"Validation failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000
            )

    async def _validate_category(
        self,
        question: str,
        response: str,
        category: ReasoningCategory,
        context: Optional[Dict] = None
    ) -> float:
        """Validate response against specific reasoning category."""

        if category not in self.validation_patterns:
            return 0.5  # Default neutral score

        pattern = self.validation_patterns[category]
        score = 0.5  # Start with neutral

        # Check for positive indicators
        positive_count = 0
        for indicator in pattern["positive_indicators"]:
            if indicator.lower() in response.lower():
                positive_count += 1

        # Check for negative indicators
        negative_count = 0
        for indicator in pattern["negative_indicators"]:
            if indicator.lower() in response.lower():
                negative_count += 1

        # Calculate score based on indicators
        indicator_score = min(positive_count * 0.2, 1.0) - min(negative_count * 0.3, 0.5)
        score += indicator_score

        # Category-specific validation
        if category == ReasoningCategory.FACTUAL:
            score += await self._validate_factual_accuracy(question, response)
        elif category == ReasoningCategory.LOGICAL:
            score += await self._validate_logical_structure(question, response)
        elif category == ReasoningCategory.CONTEXTUAL:
            score += await self._validate_context_usage(question, response, context)
        elif category == ReasoningCategory.EMOTIONAL:
            score += await self._validate_emotional_intelligence(question, response)

        return max(0.0, min(1.0, score))

    async def _validate_logical_consistency(self, question: str, response: str) -> float:
        """Validate logical consistency of the response."""
        score = 0.5

        # Check for logical connectors
        logical_connectors = [
            "because", "therefore", "since", "as a result", "consequently",
            "due to", "given that", "this means", "which leads to"
        ]

        connector_count = sum(1 for connector in logical_connectors
                            if connector in response.lower())
        score += min(connector_count * 0.1, 0.3)

        # Check for contradictions (simple heuristic)
        contradiction_patterns = [
            (r"\bnot\b.*\bis\b", r"\bis\b.*\bnot\b"),
            (r"\byes\b.*\bno\b", r"\bno\b.*\byes\b"),
            (r"\balways\b.*\bnever\b", r"\bnever\b.*\balways\b")
        ]

        for pattern1, pattern2 in contradiction_patterns:
            if re.search(pattern1, response.lower()) and re.search(pattern2, response.lower()):
                score -= 0.2

        return max(0.0, min(1.0, score))

    async def _validate_contextual_appropriateness(
        self,
        question: str,
        response: str,
        context: Optional[Dict] = None
    ) -> float:
        """Validate contextual appropriateness of the response."""
        score = 0.5

        # Check if response addresses the question
        question_keywords = set(question.lower().split())
        response_keywords = set(response.lower().split())

        # Remove common words
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were"}
        question_keywords -= common_words
        response_keywords -= common_words

        if question_keywords:
            keyword_overlap = len(question_keywords & response_keywords) / len(question_keywords)
            score += keyword_overlap * 0.3

        # Check response length appropriateness
        if len(response.split()) > 5:  # Not too short
            score += 0.1
        if len(response.split()) < 100:  # Not too long
            score += 0.1

        return max(0.0, min(1.0, score))

    async def _validate_sequential_thinking(self, question: str, response: str) -> float:
        """Validate sequential thinking in the response."""
        score = 0.5

        # Check for sequential indicators
        sequential_patterns = [
            r"\b(first|1st|step one)\b",
            r"\b(second|2nd|then|next)\b",
            r"\b(third|3rd|after that)\b",
            r"\b(finally|last|lastly)\b"
        ]

        pattern_matches = sum(1 for pattern in sequential_patterns
                            if re.search(pattern, response.lower()))

        if pattern_matches >= 2:
            score += 0.3
        elif pattern_matches >= 1:
            score += 0.1

        # Check for numbered lists
        if re.search(r'\d+\.', response):
            score += 0.2

        return max(0.0, min(1.0, score))

    async def _validate_factual_accuracy(self, question: str, response: str) -> float:
        """Validate factual accuracy (basic heuristics)."""
        score = 0.0

        # Check for confidence indicators
        confidence_indicators = [
            "according to", "research shows", "studies indicate",
            "it is known", "evidence suggests"
        ]

        for indicator in confidence_indicators:
            if indicator in response.lower():
                score += 0.1

        # Check for uncertainty when appropriate
        uncertainty_indicators = ["might", "could", "possibly", "potentially"]
        if any(indicator in response.lower() for indicator in uncertainty_indicators):
            score += 0.05

        return min(score, 0.3)  # Cap at 0.3 for this heuristic

    async def _validate_logical_structure(self, question: str, response: str) -> float:
        """Validate logical structure of the response."""
        score = 0.0

        # Check for clear structure
        if ". " in response:  # Multiple sentences
            score += 0.1

        # Check for reasoning words
        reasoning_words = ["because", "since", "therefore", "however", "although"]
        for word in reasoning_words:
            if word in response.lower():
                score += 0.05

        return min(score, 0.2)

    async def _validate_context_usage(self, question: str, response: str, context: Optional[Dict]) -> float:
        """Validate usage of provided context."""
        score = 0.0

        if context:
            # Check if context elements are referenced
            for key, value in context.items():
                if str(value).lower() in response.lower():
                    score += 0.1

        return min(score, 0.2)

    async def _validate_emotional_intelligence(self, question: str, response: str) -> float:
        """Validate emotional intelligence in the response."""
        score = 0.0

        # Detect emotional cues in question
        emotional_cues = {
            "sad": ["sorry", "understand", "difficult"],
            "happy": ["congratulations", "great", "wonderful"],
            "angry": ["understand", "frustrating", "sorry"],
            "confused": ["let me explain", "clarify", "help"]
        }

        question_lower = question.lower()
        response_lower = response.lower()

        for emotion, appropriate_responses in emotional_cues.items():
            if emotion in question_lower:
                for appropriate in appropriate_responses:
                    if appropriate in response_lower:
                        score += 0.1

        return min(score, 0.2)

    def _requires_sequential_thinking(self, question: str) -> bool:
        """Check if question requires sequential thinking."""
        sequential_keywords = [
            "how to", "steps", "process", "procedure", "method",
            "first", "then", "order", "sequence"
        ]

        return any(keyword in question.lower() for keyword in sequential_keywords)

    def _determine_quality_level(self, score: float) -> ValidationResult:
        """Determine quality level based on score."""
        if score >= 0.9:
            return ValidationResult.EXCELLENT
        elif score >= 0.7:
            return ValidationResult.GOOD
        elif score >= 0.5:
            return ValidationResult.ACCEPTABLE
        elif score >= 0.3:
            return ValidationResult.POOR
        else:
            return ValidationResult.FAILED

    def _generate_detailed_feedback(
        self,
        question: str,
        response: str,
        category_scores: Dict[ReasoningCategory, float],
        expected_category: ReasoningCategory
    ) -> str:
        """Generate detailed feedback for the validation."""

        feedback_parts = []

        # Overall assessment
        overall_score = sum(category_scores.values()) / len(category_scores)
        quality = self._determine_quality_level(overall_score)

        feedback_parts.append(f"Overall Quality: {quality.value.upper()} ({overall_score:.2f})")

        # Category-specific feedback
        for category, score in category_scores.items():
            feedback_parts.append(f"{category.value.title()}: {score:.2f}")

        # Specific recommendations
        if overall_score < 0.7:
            feedback_parts.append("\nRecommendations:")

            if category_scores.get(ReasoningCategory.LOGICAL, 0) < 0.6:
                feedback_parts.append("- Improve logical flow and reasoning")

            if category_scores.get(ReasoningCategory.CONTEXTUAL, 0) < 0.6:
                feedback_parts.append("- Better address the specific question")

            if expected_category in category_scores and category_scores[expected_category] < 0.6:
                feedback_parts.append(f"- Focus more on {expected_category.value} reasoning")

        return "\n".join(feedback_parts)

    def get_validation_statistics(self) -> Dict:
        """Get statistics from validation history."""
        if not self.validation_history:
            return {"message": "No validation history available"}

        scores = [entry["score"].overall_score for entry in self.validation_history]
        categories = [entry["category"] for entry in self.validation_history]

        return {
            "total_validations": len(self.validation_history),
            "average_score": sum(scores) / len(scores),
            "score_distribution": {
                ValidationResult.EXCELLENT.value: sum(1 for s in scores if s >= 0.9),
                ValidationResult.GOOD.value: sum(1 for s in scores if 0.7 <= s < 0.9),
                ValidationResult.ACCEPTABLE.value: sum(1 for s in scores if 0.5 <= s < 0.7),
                ValidationResult.POOR.value: sum(1 for s in scores if 0.3 <= s < 0.5),
                ValidationResult.FAILED.value: sum(1 for s in scores if s < 0.3),
            },
            "category_usage": {cat: categories.count(cat) for cat in set(categories)},
            "latest_validations": self.validation_history[-5:] if len(self.validation_history) >= 5 else self.validation_history
        }

    async def run_comprehensive_reasoning_tests(self, ai_service) -> Dict:
        """Run a comprehensive set of reasoning validation tests."""
        self.ai_service = ai_service

        # Define comprehensive test suite
        test_suite = [
            # Factual reasoning tests
            ReasoningTest(
                question="What is the capital of Brazil?",
                expected_reasoning_type=ReasoningCategory.FACTUAL,
                validation_criteria=["factual accuracy", "confidence"]
            ),

            # Logical reasoning tests
            ReasoningTest(
                question="If all birds can fly, and penguins are birds, can penguins fly?",
                expected_reasoning_type=ReasoningCategory.LOGICAL,
                validation_criteria=["logical consistency", "reasoning chain"]
            ),

            # Contextual reasoning tests
            ReasoningTest(
                question="I just told you I'm feeling sad. How can you help?",
                expected_reasoning_type=ReasoningCategory.CONTEXTUAL,
                context={"user_emotion": "sad", "previous_context": "personal issue"},
                validation_criteria=["context awareness", "empathy"]
            ),

            # Sequential reasoning tests
            ReasoningTest(
                question="How do I make a cup of coffee?",
                expected_reasoning_type=ReasoningCategory.SEQUENTIAL,
                validation_criteria=["step-by-step process", "logical order"]
            ),

            # Problem-solving tests
            ReasoningTest(
                question="My computer won't start. What should I do?",
                expected_reasoning_type=ReasoningCategory.PROBLEM_SOLVING,
                validation_criteria=["systematic approach", "multiple solutions"]
            ),

            # Emotional intelligence tests
            ReasoningTest(
                question="I got promoted at work today!",
                expected_reasoning_type=ReasoningCategory.EMOTIONAL,
                validation_criteria=["emotional recognition", "appropriate response"]
            ),

            # Portuguese/Brazilian context tests
            ReasoningTest(
                question="Qual é a melhor época para visitar o Brasil?",
                expected_reasoning_type=ReasoningCategory.CONTEXTUAL,
                context={"language": "pt-br", "cultural_context": "Brazil"},
                validation_criteria=["cultural awareness", "relevant information"]
            ),
        ]

        results = []

        for test in test_suite:
            try:
                # Get AI response
                ai_response = await ai_service.reason_and_respond(
                    test.question,
                    context=test.context
                )

                # Validate the response
                validation_score = await self.validate_reasoning(
                    test.question,
                    ai_response,
                    test.expected_reasoning_type,
                    test.context
                )

                results.append({
                    "test": test,
                    "ai_response": ai_response,
                    "validation": validation_score
                })

            except Exception as e:
                self.logger.error(f"Error in test '{test.question}': {e}")
                results.append({
                    "test": test,
                    "ai_response": f"ERROR: {str(e)}",
                    "validation": ValidationScore(
                        overall_score=0.0,
                        category_scores={},
                        reasoning_quality=ValidationResult.FAILED,
                        detailed_feedback=f"Test failed: {str(e)}",
                        response_time_ms=0.0
                    )
                })

        return {
            "test_results": results,
            "summary": self._generate_test_summary(results)
        }

    def _generate_test_summary(self, results: List[Dict]) -> Dict:
        """Generate summary of comprehensive test results."""
        total_tests = len(results)
        if total_tests == 0:
            return {"message": "No tests completed"}

        scores = [r["validation"].overall_score for r in results]
        qualities = [r["validation"].reasoning_quality for r in results]

        return {
            "total_tests": total_tests,
            "average_score": sum(scores) / len(scores),
            "pass_rate": sum(1 for s in scores if s >= 0.5) / total_tests,
            "quality_distribution": {
                quality.value: sum(1 for q in qualities if q == quality)
                for quality in ValidationResult
            },
            "top_scoring_tests": sorted(
                [(r["test"].question, r["validation"].overall_score) for r in results],
                key=lambda x: x[1],
                reverse=True
            )[:3],
            "lowest_scoring_tests": sorted(
                [(r["test"].question, r["validation"].overall_score) for r in results],
                key=lambda x: x[1]
            )[:3]
        }
