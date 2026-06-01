from typing import Annotated, Literal, Union, Optional
import logging
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.memory.agent_memory import AgentMemory
from app.db.supabase import sb, is_supabase_available

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize memory
agent_memory = AgentMemory()


@tool
def search_memory(
    query: str,
    session_id: Optional[str] = None,
    max_results: int = 5,
    user_id: Optional[str] = None
) -> dict:
    """Search the research agent's memory for relevant past context, papers, hypotheses, and decisions.

    Use this when you need to recall:
    - Previously discussed papers or research
    - Past hypotheses or ideas generated
    - Code implementations saved earlier
    - Key decisions made in this research session
    - Chat context from earlier in the conversation

    Args:
        query: Semantic search query to find relevant memory content
        session_id: Optional session ID to scope the search. If not provided, searches across all user sessions
        max_results: Maximum number of results to return (default 5, max 20)
        user_id: User ID for access control (optional, auto-populated from session if not provided)

    Returns:
        dict: Search results with relevant memories, including event type, content, and relevance score
    """
    try:
        hits = agent_memory.recall(query, session_id, max_results, user_id)

        if not hits:
            return {
                "query": query,
                "results": [],
                "total": 0,
                "message": "No relevant memories found for this query."
            }

        formatted_results = []
        for hit in hits:
            formatted_results.append({
                "id": hit.get("id"),
                "content": hit.get("content"),
                "event_type": hit.get("metadata", {}).get("event_type", "unknown"),
                "title": hit.get("metadata", {}).get("title", ""),
                "relevance_score": 1.0 - hit.get("distance", 0.0)  # Convert distance to similarity
            })

        return {
            "query": query,
            "results": formatted_results,
            "total": len(formatted_results)
        }
    except Exception as e:
        logger.error(f"Memory search failed: {e}")
        return {
            "query": query,
            "results": [],
            "total": 0,
            "error": str(e)
        }


@tool
def search_knowledge_base(
    query: str,
    node_types: Optional[list[str]] = None,
    session_id: Optional[str] = None,
    max_results: int = 5,
    user_id: Optional[str] = None
) -> dict:
    """Search the research knowledge base for ideas, concepts, methods, results, insights, and research questions.

    Use this when you need to find:
    - Ideas and hypotheses related to a topic
    - Concepts and definitions from papers
    - Methods or techniques to implement
    - Results or benchmarks from experiments
    - Insights or observations
    - Open research questions

    Args:
        query: Text search query
        node_types: Optional list of node types to filter by. Options: ideas, concepts, methods, results, insights, research_questions
        session_id: Optional session ID to scope the search
        max_results: Maximum number of results to return (default 5)
        user_id: User ID for access control

    Returns:
        dict: Search results with nodes, their types, and metadata
    """
    if not is_supabase_available():
        return {
            "query": query,
            "results": [],
            "total": 0,
            "error": "Knowledge base not available"
        }

    try:
        table_mapping = {
            "ideas": "ideas",
            "concepts": "concepts",
            "methods": "methods",
            "results": "results",
            "insights": "insights",
            "research_questions": "research_questions"
        }

        if node_types:
            valid_types = [t for t in node_types if t in table_mapping]
        else:
            valid_types = list(table_mapping.keys())

        all_results = []

        for node_type in valid_types:
            table_name = table_mapping[node_type]

            # Build query based on table structure
            try:
                result = sb.table(table_name).select("*")

                if session_id:
                    result = result.eq("session_id", session_id)

                result = result.ilike("title", f"%{query}%").limit(max_results).execute()

                for row in result.data or []:
                    row["node_type"] = node_type
                    all_results.append(row)
            except Exception as e:
                logger.warning(f"Error searching {table_name}: {e}")
                continue

        # Sort by created_at if available, then limit
        all_results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        all_results = all_results[:max_results]

        formatted = []
        for item in all_results:
            formatted.append({
                "id": item.get("id"),
                "node_type": item.get("node_type"),
                "title": item.get("title"),
                "subtitle": item.get("subtitle") or item.get("description") or "",
                "content": item.get("content") or item.get("description") or "",
                "created_at": item.get("created_at")
            })

        return {
            "query": query,
            "results": formatted,
            "total": len(formatted)
        }

    except Exception as e:
        logger.error(f"Knowledge base search failed: {e}")
        return {
            "query": query,
            "results": [],
            "total": 0,
            "error": str(e)
        }


@tool
def get_session_context(session_id: str, user_id: str) -> dict:
    """Get a summary of the research session context including recent activity and shared ideas.

    Use this when you need to understand the current state of a research session before responding.

    Args:
        session_id: The session ID to get context for
        user_id: User ID for access control

    Returns:
        dict: Session context including summary, recent activity, and shared contexts
    """
    try:
        # Get session info
        session = agent_memory.get_session(session_id)

        if not session:
            return {
                "session_id": session_id,
                "found": False,
                "error": "Session not found"
            }

        if session.get("user_id") != user_id:
            return {
                "session_id": session_id,
                "found": False,
                "error": "Access denied"
            }

        # Get recent history
        events, total = agent_memory.get_session_history(session_id, limit=10)

        recent_activity = []
        for event in events:
            recent_activity.append({
                "event_type": event.event_type,
                "content": event.content,
                "created_at": event.created_at.isoformat() if hasattr(event.created_at, 'isoformat') else str(event.created_at)
            })

        return {
            "session_id": session_id,
            "found": True,
            "topic": session.get("topic", ""),
            "module": session.get("module", ""),
            "created_at": session.get("created_at"),
            "recent_activity": recent_activity,
            "total_events": total
        }

    except Exception as e:
        logger.error(f"Failed to get session context: {e}")
        return {
            "session_id": session_id,
            "found": False,
            "error": str(e)
        }


@tool
def save_to_memory(
    event_type: str,
    content: str,
    session_id: str,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> dict:
    """Save important research content to memory for future recall.

    Use this to persist:
    - Key insights or observations
    - Important decisions made
    - New hypotheses generated
    - Papers discussed
    - Code implementations

    Args:
        event_type: Type of event (paper_read, hypothesis, code_saved, decision, chat_turn, insight)
        content: The content to save (can be the full message or structured content)
        session_id: The session ID to save under
        user_id: User ID for access control
        metadata: Optional additional metadata

    Returns:
        dict: Confirmation of save with event ID
    """
    try:
        import json
        metadata = metadata or {}

        if event_type == "paper_read":
            # Try to parse as JSON if it's structured
            try:
                content_data = json.loads(content)
                event = agent_memory.save_paper(
                    session_id=session_id,
                    title=content_data.get("title", "Untitled"),
                    summary=content_data.get("summary", content),
                    url=content_data.get("url"),
                    user_id=user_id
                )
            except json.JSONDecodeError:
                event = agent_memory.save_paper(session_id=session_id, title="Untitled", summary=content, user_id=user_id)

        elif event_type == "hypothesis":
            try:
                content_data = json.loads(content)
                event = agent_memory.save_hypothesis(
                    session_id=session_id,
                    hypothesis=content_data.get("hypothesis", content),
                    supporting_evidence=content_data.get("evidence"),
                    user_id=user_id
                )
            except json.JSONDecodeError:
                event = agent_memory.save_hypothesis(session_id=session_id, hypothesis=content, user_id=user_id)

        elif event_type == "code_saved":
            try:
                content_data = json.loads(content)
                event = agent_memory.save_code(
                    session_id=session_id,
                    description=content_data.get("description", ""),
                    code=content_data.get("code", content),
                    language=content_data.get("language", "python"),
                    user_id=user_id
                )
            except json.JSONDecodeError:
                event = agent_memory.save_code(session_id=session_id, description=content, code=content, user_id=user_id)

        elif event_type == "decision":
            try:
                content_data = json.loads(content)
                event = agent_memory.save_decision(
                    session_id=session_id,
                    decision=content_data.get("decision", content),
                    reason=content_data.get("reason", ""),
                    alternatives=content_data.get("alternatives"),
                    user_id=user_id
                )
            except json.JSONDecodeError:
                event = agent_memory.save_decision(session_id=session_id, decision=content, reason="", user_id=user_id)

        elif event_type == "insight":
            # Treat as a chat turn with insight metadata
            event = agent_memory.save_chat_turn(session_id=session_id, role="insight", message=content, user_id=user_id)

        else:
            # Default to chat turn
            event = agent_memory.save_chat_turn(session_id=session_id, role=event_type, message=content, user_id=user_id)

        return {
            "success": True,
            "event_id": event.event_id,
            "event_type": event.event_type,
            "message": f"Content saved to {event_type} successfully"
        }

    except Exception as e:
        logger.error(f"Failed to save to memory: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@tool
async def search_papers_tavily(
    query: str,
    session_id: str,
    max_results: int = 10
) -> dict:
    """Search for academic papers using Tavily, check if already saved, and save new papers to the research database.

    Use this when the user asks about literature, papers, related research, or wants to discover
    papers on a topic. This tool will:
    1. Search Tavily for relevant papers/sources
    2. Check which papers are already in the database
    3. Save new papers automatically
    4. Return both new and existing papers

    Args:
        query: Search query for finding relevant papers (e.g., "transformer attention mechanisms")
        session_id: The current session ID to associate papers with
        max_results: Maximum number of papers to search for (default 10, max 20)

    Returns:
        dict: Results including new papers saved and papers already in database
    """
    import httpx
    import hashlib
    from app.db.supabase import insert_paper, get_paper_by_url, is_supabase_available

    settings = get_settings()
    api_key = getattr(settings, 'tavily_api_key', None)

    if not api_key:
        return {
            "query": query,
            "new_papers": [],
            "existing_papers": [],
            "error": "Tavily API key not configured"
        }

    # Call Tavily API
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "query": query,
                    "max_results": max_results,
                    "include_answer": False,
                    "include_raw_content": False,
                },
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                return {
                    "query": query,
                    "new_papers": [],
                    "existing_papers": [],
                    "error": f"Tavily API error: {resp.status_code}"
                }
            data = resp.json()
    except Exception as e:
        return {
            "query": query,
            "new_papers": [],
            "existing_papers": [],
            "error": f"Failed to call Tavily: {str(e)}"
        }

    new_papers = []
    existing_papers = []
    supabase_available = is_supabase_available()
    papers_table_available = True  # Assume available unless proven otherwise

    for item in data.get("results", []):
        url = item.get("url", "")
        title = item.get("title", "Untitled")
        description = item.get("description", "")

        if not url:
            continue

        # Generate external ID from URL hash
        external_id = hashlib.md5(url.encode()).hexdigest()[:16]

        # Check if paper already exists (only if papers table is available)
        if supabase_available and papers_table_available:
            try:
                existing = get_paper_by_url(url, session_id)
                if existing:
                    existing_papers.append({
                        "id": existing.get("id"),
                        "title": existing.get("title"),
                        "url": existing.get("url"),
                        "source": existing.get("source")
                    })
                    continue

                # Save new paper
                paper = insert_paper(
                    session_id=session_id,
                    source="tavily",
                    external_id=external_id,
                    title=title,
                    authors=[],
                    abstract=description,
                    url=url,
                )
                new_papers.append({
                    "id": paper.get("id"),
                    "title": title,
                    "url": url,
                    "abstract": description[:200] + "..." if len(description) > 200 else description
                })
            except Exception as e:
                # Papers table might not exist yet
                if "PGRST205" in str(e) or "Could not find the table" in str(e):
                    papers_table_available = False
                    logger.warning("Papers table not found - skipping database operations")
                else:
                    logger.warning(f"Failed to save paper: {e}")
                # Add paper to results anyway
                new_papers.append({
                    "title": title,
                    "url": url,
                    "abstract": description[:200] + "..." if len(description) > 200 else description,
                    "note": "From Tavily search"
                })
        else:
            # Supabase or papers table not available - just return results
            new_papers.append({
                "title": title,
                "url": url,
                "abstract": description[:200] + "..." if len(description) > 200 else description
            })

    return {
        "query": query,
        "new_papers": new_papers,
        "existing_papers": existing_papers,
        "total_new": len(new_papers),
        "total_existing": len(existing_papers),
        "message": f"Found {len(new_papers)} new papers and {len(existing_papers)} already in database"
    }


@tool
def generate_code(description: str, language: str = "python") -> dict:
    """Generate code based on a description.
    
    Args:
        description: Detailed description of the code to generate
        language: Programming language (default python)
    
    Returns:
        dict: Generated code and explanation
    """
    return {
        "code": f"# Generated {language} code based on: {description}\n\ndef solution():\n    pass",
        "language": language,
        "explanation": "Code generated based on the provided description."
    }


@tool
def draft_section(topic: str, section_type: str, context: str = "") -> dict:
    """Draft a section of an academic paper.
    
    Args:
        topic: The main topic of the paper
        section_type: Type of section (introduction, methodology, results, conclusion)
        context: Additional context for the section
    
    Returns:
        dict: Drafted content for the section
    """
    return {
        "section_type": section_type,
        "content": f"Draft for {section_type} section on {topic}.\n\n{context}",
        "suggestions": ["Consider adding more citations", "Define key terms"]
    }


def get_llm():
    return ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        temperature=0.7,
        streaming=True
    )


TOOLS = {
    "search_memory": search_memory,
    "search_knowledge_base": search_knowledge_base,
    "search_papers_tavily": search_papers_tavily,
    "get_session_context": get_session_context,
    "save_to_memory": save_to_memory,
    "generate_code": generate_code,
    "draft_section": draft_section
}

TOOL_LIST = [
    search_memory,
    search_knowledge_base,
    search_papers_tavily,
    get_session_context,
    save_to_memory,
    generate_code,
    draft_section
]
