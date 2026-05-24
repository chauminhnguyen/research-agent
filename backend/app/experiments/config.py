"""Feature flag and experiment definitions."""

from dataclasses import dataclass
from typing import TypedDict


class FeatureFlags:
    """Available feature flags for A/B testing."""
    
    # Chat & UI flags
    NEW_CHAT_STREAMING = "new_chat_streaming"
    ENHANCED_MEMORY_RECALL = "enhanced_memory_recall"
    VECTOR_SEARCH_V2 = "vector_search_v2"
    IMPROVED_SESSION_LIST = "improved_session_list"
    REAL_TIME_TYPING_INDICATOR = "real_time_typing_indicator"
    
    # Performance flags
    PARALLEL_TOOL_EXECUTION = "parallel_tool_execution"
    CACHED_EMBEDDINGS = "cached_embeddings"
    
    # Beta flags
    BETA_DARK_MODE = "beta_dark_mode"
    BETA_EXPORT_SESSIONS = "beta_export_sessions"


class Experiment(TypedDict):
    """Experiment definition structure."""
    flags: list[str]
    description: str
    traffic_percentage: int
    enabled: bool


EXPERIMENTS: dict[str, Experiment] = {
    "chat_ux_v2": {
        "flags": [FeatureFlags.NEW_CHAT_STREAMING],
        "description": "New chat interface with improved streaming and typing indicators",
        "traffic_percentage": 20,
        "enabled": True,
    },
    "memory_improvements": {
        "flags": [FeatureFlags.ENHANCED_MEMORY_RECALL],
        "description": "Better semantic search for memory recall using hybrid search",
        "traffic_percentage": 50,
        "enabled": True,
    },
    "vector_v2": {
        "flags": [FeatureFlags.VECTOR_SEARCH_V2],
        "description": "Use updated embedding model for better recall accuracy",
        "traffic_percentage": 30,
        "enabled": False,  # Not yet active
    },
}


@dataclass
class FlagInfo:
    """Information about a feature flag."""
    name: str
    description: str
    is_enabled_by_default: bool = False
