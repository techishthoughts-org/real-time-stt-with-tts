"""Langraph workflow for speech processing orchestration."""

from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, StateGraph

from ...application.dtos.speech_dtos import (AudioChunkRequest,
                                             CreateSessionRequest,
                                             FinishSessionRequest)
from ...application.use_cases.speech_use_cases import SpeechUseCases


class SpeechWorkflowState(TypedDict):
    """State for the speech processing workflow."""
    session_id: Optional[str]
    audio_data: Optional[bytes]
    transcriptions: List[str]
    final_transcript: Optional[str]
    error: Optional[str]
    status: str


class SpeechProcessingWorkflow:
    """Langraph workflow for speech processing."""

    def __init__(self, speech_use_cases: SpeechUseCases):
        self.speech_use_cases = speech_use_cases
        self.workflow = self._create_workflow()

    def _create_workflow(self) -> StateGraph:
        """Create the Langraph workflow."""
        workflow = StateGraph(SpeechWorkflowState)

        # Add nodes
        workflow.add_node("create_session", self._create_session_node)
        workflow.add_node("process_audio", self._process_audio_node)
        workflow.add_node("finalize_session", self._finalize_session_node)

        # Set entry point
        workflow.set_entry_point("create_session")

        # Add edges
        workflow.add_edge("create_session", "process_audio")
        workflow.add_edge("process_audio", "finalize_session")
        workflow.add_edge("finalize_session", END)

        return workflow.compile()

    async def _create_session_node(
        self, state: SpeechWorkflowState
    ) -> SpeechWorkflowState:
        """Create a new speech session."""
        try:
            request = CreateSessionRequest()
            response = await self.speech_use_cases.create_session(request)

            return {
                **state,
                "session_id": response.session_id,
                "status": "session_created",
            }
        except Exception as e:
            return {
                **state,
                "error": str(e),
                "status": "error",
            }

    async def _process_audio_node(
        self, state: SpeechWorkflowState
    ) -> SpeechWorkflowState:
        """Process audio chunks."""
        if not state.get("session_id") or not state.get("audio_data"):
            return {
                **state,
                "error": "Missing session_id or audio_data",
                "status": "error",
            }

        try:
            request = AudioChunkRequest(
                session_id=state["session_id"],
                audio_data=state["audio_data"],
                sample_rate=16000,
                channels=1,
            )

            transcription_response = await self.speech_use_cases.process_audio_chunk(
                request
            )

            transcriptions = state.get("transcriptions", [])
            if transcription_response and transcription_response.text:
                transcriptions.append(transcription_response.text)

            return {
                **state,
                "transcriptions": transcriptions,
                "status": "audio_processed",
            }
        except Exception as e:
            return {
                **state,
                "error": str(e),
                "status": "error",
            }

    async def _finalize_session_node(
        self, state: SpeechWorkflowState
    ) -> SpeechWorkflowState:
        """Finalize the speech session."""
        if not state.get("session_id"):
            return {
                **state,
                "error": "Missing session_id",
                "status": "error",
            }

        try:
            request = FinishSessionRequest(session_id=state["session_id"])
            session_response = await self.speech_use_cases.finish_session(request)

            return {
                **state,
                "final_transcript": session_response.full_transcript,
                "status": "completed",
            }
        except Exception as e:
            return {
                **state,
                "error": str(e),
                "status": "error",
            }

    async def process_speech(
        self, audio_data: bytes
    ) -> Dict[str, Any]:
        """Process speech using the workflow."""
        initial_state: SpeechWorkflowState = {
            "session_id": None,
            "audio_data": audio_data,
            "transcriptions": [],
            "final_transcript": None,
            "error": None,
            "status": "initialized",
        }

        try:
            result = await self.workflow.ainvoke(initial_state)
            return result
        except Exception as e:
            return {
                **initial_state,
                "error": str(e),
                "status": "workflow_error",
            }
