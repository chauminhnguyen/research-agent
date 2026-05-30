"""Base agent builder for all three folder types."""

from typing import Optional
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage

from app.agent.state import AgentState
from app.config import get_settings


settings = get_settings()


def build_agent(system_prompt: str):
    """
    Build a simple ReAct agent graph with the given system prompt.
    
    Graph structure: START -> call_model -> END
    No tools for MVP.
    """
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        streaming=True,
        api_key=settings.openai_api_key
    )

    def call_model(state: AgentState) -> dict:
        pinned = state.get("pinned_contexts", [])
        
        # Build context block from pinned ideas
        context_block = ""
        if pinned:
            items = "\n".join(f"- {s}" for s in pinned)
            context_block = f"\n\n[PINNED IDEAS - accepted by user]\n{items}\n"

        full_system = SystemMessage(content=system_prompt + context_block)
        
        # Build message list with system prompt first
        chat_messages = [full_system] + list(state["messages"])
        response = llm.invoke(chat_messages)
        
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    
    return graph.compile()
