"""Base agent builder for all three folder types with LangGraph ReAct agents."""

from typing import Optional, Annotated, Literal, Callable
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.callbacks import BaseCallbackHandler

from app.agent.state import AgentState
from app.agent.tools import TOOL_LIST
from app.config import get_settings


def build_agent(
    system_prompt: str,
    tools: Optional[list[BaseTool]] = None,
    model_name: str = "gpt-4o-mini",
    callbacks: Optional[list[BaseCallbackHandler]] = None
) -> StateGraph:
    """
    Build a LangGraph ReAct agent with tools.

    Graph structure: START -> agent -> END (with tool calls handled automatically)
    Uses create_react_agent for proper tool-calling with bound tools.

    Args:
        system_prompt: System prompt for the agent
        tools: List of tools to give the agent (default: TOOL_LIST)
        model_name: LLM model to use (default: gpt-4o-mini)
        callbacks: Optional list of callback handlers for tracing
    """
    settings = get_settings()

    # Determine which tools to use
    agent_tools = tools if tools is not None else TOOL_LIST

    # Create the LLM with tools bound
    llm = ChatOpenAI(
        model=model_name,
        temperature=0.3,
        streaming=True,
        api_key=settings.openai_api_key
    )

    # Bind tools to the model
    llm_with_tools = llm.bind_tools(agent_tools)

    # Create the ReAct agent graph
    graph = create_react_agent(
        model=llm_with_tools,
        tools=agent_tools,
        state_schema=AgentState,
        prompt=system_prompt,
        debug=settings.environment == "development"
    )

    return graph


def create_traced_agent(
    system_prompt: str,
    session_id: str,
    folder_type: str,
    user_id: Optional[str] = None,
    tools: Optional[list[BaseTool]] = None,
    model_name: str = "gpt-4o-mini"
) -> tuple[StateGraph, list[BaseCallbackHandler]]:
    """
    Create an agent with LangSmith tracing enabled.

    Args:
        system_prompt: System prompt for the agent
        session_id: Current session ID for tracing
        folder_type: Current folder type (ideas/code/paper)
        user_id: Current user ID for tracing
        tools: List of tools to give the agent
        model_name: LLM model to use

    Returns:
        Tuple of (compiled graph, callbacks list)
    """
    from app.observability.langsmith import get_langsmith_callbacks

    callbacks = get_langsmith_callbacks(
        session_id=session_id,
        folder_type=folder_type,
        user_id=user_id
    )

    graph = build_agent(
        system_prompt=system_prompt,
        tools=tools,
        model_name=model_name,
        callbacks=callbacks
    )

    return graph, callbacks


def build_agent_with_tools(
    system_prompt: str,
    tools: list[BaseTool],
    model_name: str = "gpt-4o-mini"
) -> StateGraph:
    """
    Build an agent with a specific set of tools.

    Alias for build_agent with explicit tools parameter.
    """
    return build_agent(system_prompt, tools=tools, model_name=model_name)
