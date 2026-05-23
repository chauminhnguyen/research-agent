from typing import Literal
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import ToolNode

from app.agent.state import AgentState
from app.agent.tools import get_llm, TOOLS, TOOL_LIST
from app.memory.agent_memory import AgentMemory

memory = AgentMemory()
llm = get_llm()
tool_node = ToolNode(TOOL_LIST)


def build_system_prompt(module: str, memory_context: list[dict]) -> str:
    context_text = ""
    if memory_context:
        context_text = "\n\nRelevant context from memory:\n"
        for hit in memory_context[:3]:
            context_text += f"- {hit.get('content', '')[:200]}...\n"
    
    prompts = {
        "ideas": f"""You are an Ideas Agent specialized in research ideation and literature exploration.
Your role is to help users generate and refine research ideas, find relevant literature, and develop hypotheses.
Be creative, critical, and thorough in your analysis.{context_text}

Always cite sources when discussing research findings.""",
        
        "coding": f"""You are a Coding Agent specialized in software development and code generation.
Your role is to help users write, debug, and explain code across multiple programming languages.
Provide clean, well-documented, and efficient code solutions.{context_text}

When writing code, always consider best practices and maintainability.""",
        
        "paper": f"""You are a Paper Writing Agent specialized in academic writing and publication.
Your role is to help users draft, revise, and polish academic papers and research documents.
Follow academic writing conventions and proper citation formats.{context_text}

Focus on clarity, rigor, and scholarly tone."""
    }
    
    return prompts.get(module, prompts["ideas"])


async def router_node(state: AgentState) -> dict:
    messages = state.get("messages", [])
    if not messages:
        return {"module": "ideas"}
    
    last_message = messages[-1]
    if isinstance(last_message, HumanMessage):
        content = last_message.content.lower()
        
        coding_keywords = ["code", "python", "javascript", "function", "debug", "implement", "programming", "script"]
        paper_keywords = ["paper", "write", "draft", "introduction", "conclusion", "abstract", "section", "cite", "citation"]
        
        coding_score = sum(1 for kw in coding_keywords if kw in content)
        paper_score = sum(1 for kw in paper_keywords if kw in content)
        
        if coding_score > paper_score:
            return {"module": "coding"}
        elif paper_score > coding_score:
            return {"module": "paper"}
    
    return {"module": "ideas"}


async def ideas_node(state: AgentState) -> dict:
    memory_context = memory.recall(state["active_topic"], session_id=state["session_id"], limit=3)
    
    system_prompt = build_system_prompt("ideas", memory_context)
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in state.get("messages", []):
        if isinstance(msg, HumanMessage):
            chat_messages.append(msg)
        elif isinstance(msg, AIMessage):
            chat_messages.append(msg)
    
    response = await llm.ainvoke(chat_messages)
    
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="user",
        message=state["messages"][-1].content if state["messages"] else ""
    )
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="assistant",
        message=response.content
    )
    
    return {
        "messages": [response],
        "memory_context": memory_context
    }


async def coding_node(state: AgentState) -> dict:
    memory_context = memory.recall(state["active_topic"], session_id=state["session_id"], limit=3)
    
    system_prompt = build_system_prompt("coding", memory_context)
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in state.get("messages", []):
        if isinstance(msg, HumanMessage):
            chat_messages.append(msg)
        elif isinstance(msg, AIMessage):
            chat_messages.append(msg)
    
    response = await llm.ainvoke(chat_messages)
    
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="user",
        message=state["messages"][-1].content if state["messages"] else ""
    )
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="assistant",
        message=response.content
    )
    
    return {
        "messages": [response],
        "memory_context": memory_context
    }


async def paper_node(state: AgentState) -> dict:
    memory_context = memory.recall(state["active_topic"], session_id=state["session_id"], limit=5)
    
    system_prompt = build_system_prompt("paper", memory_context)
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in state.get("messages", []):
        if isinstance(msg, HumanMessage):
            chat_messages.append(msg)
        elif isinstance(msg, AIMessage):
            chat_messages.append(msg)
    
    response = await llm.ainvoke(chat_messages)
    
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="user",
        message=state["messages"][-1].content if state["messages"] else ""
    )
    memory.save_chat_turn(
        session_id=state["session_id"],
        role="assistant",
        message=response.content
    )
    
    return {
        "messages": [response],
        "memory_context": memory_context
    }


async def memory_save_node(state: AgentState) -> dict:
    return {}
