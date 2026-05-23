from typing import TypedDict, Annotated, Literal
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    user_id: str
    active_topic: str
    module: Literal["ideas", "coding", "paper"]
    tool_results: list[dict]
    memory_context: list[dict]
