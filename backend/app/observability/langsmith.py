"""LangSmith integration for tracing and monitoring agent runs."""

import os
from typing import Optional, Any
from functools import lru_cache

from langchain_core.outputs import LLMResult
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.tracers.langchain import LangChainTracer

from app.config import get_settings

settings = get_settings()


class AgentCallbackHandler(BaseCallbackHandler):
    """Custom callback handler for agent-specific metadata."""

    def __init__(self, session_id: str, folder_type: str, user_id: Optional[str] = None):
        self.session_id = session_id
        self.folder_type = folder_type
        self.user_id = user_id
        super().__init__()

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list],
        **kwargs
    ) -> None:
        """Called when a chat model starts running."""
        pass

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        """Called when an LLM ends running."""
        pass

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        **kwargs
    ) -> None:
        """Called when a tool starts running."""
        pass

    def on_tool_end(self, output: str, **kwargs) -> None:
        """Called when a tool ends running."""
        pass


@lru_cache
def get_langsmith_tracer(
    project_name: Optional[str] = None,
    session_id: Optional[str] = None,
    folder_type: Optional[str] = None,
    user_id: Optional[str] = None
) -> Optional[LangChainTracer]:
    """
    Get a LangSmith tracer configured for the project.

    Args:
        project_name: LangSmith project name (defaults to settings.langsmith_project)
        session_id: Current session ID for tracing
        folder_type: Current folder type (ideas/code/paper)
        user_id: Current user ID for tracing

    Returns:
        LangChainTracer if configured, None otherwise
    """
    settings = get_settings()

    if not settings.langsmith_configured:
        return None

    project = project_name or settings.langsmith_project

    try:
        tracer = LangChainTracer(
            project_name=project,
            client=None  # Uses environment variables automatically
        )
        return tracer
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to initialize LangSmith tracer: {e}")
        return None


def get_langsmith_callbacks(
    session_id: Optional[str] = None,
    folder_type: Optional[str] = None,
    user_id: Optional[str] = None
) -> list:
    """
    Get a list of LangSmith callbacks for use with chat models and agents.

    Args:
        session_id: Current session ID for tracing metadata
        folder_type: Current folder type (ideas/code/paper)
        user_id: Current user ID for tracing

    Returns:
        List of callback handlers
    """
    settings = get_settings()

    if not settings.langsmith_callback_enabled or not settings.langsmith_configured:
        return []

    callbacks = []

    # Add LangSmith tracer
    tracer = get_langsmith_tracer(
        project_name=settings.langsmith_project,
        session_id=session_id,
        folder_type=folder_type,
        user_id=user_id
    )
    if tracer:
        callbacks.append(tracer)

    # Add custom agent callback for additional metadata
    if session_id and folder_type:
        callbacks.append(AgentCallbackHandler(
            session_id=session_id,
            folder_type=folder_type,
            user_id=user_id
        ))

    return callbacks


def configure_langsmith_environment() -> None:
    """
    Configure environment variables for LangSmith from settings.
    Call this at application startup if using LangSmith.
    """
    settings = get_settings()

    # Support legacy LANGSMITH_TRACING env var
    if settings.langsmith_tracing and not settings.langsmith_callback_enabled:
        settings.langsmith_callback_enabled = True

    if settings.langsmith_api_key:
        os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key

    if settings.langsmith_project:
        os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project

    if settings.langsmith_callback_enabled:
        os.environ["LANGSMITH_TRACING_V2"] = "true"
