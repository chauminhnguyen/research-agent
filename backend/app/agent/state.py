from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """State for the research agent."""
    messages: Annotated[list, add_messages]
    folder_type: str          # "ideas" | "code" | "paper"
    folder_id: str
    session_id: str
    pinned_contexts: list[str]  # summaries from shared_contexts
