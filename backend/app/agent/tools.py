from typing import Annotated, Literal, Union
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from app.config import get_settings

settings = get_settings()


@tool
def search_literature(query: str, max_results: int = 5) -> dict:
    """Search academic literature for relevant papers and sources.
    
    Args:
        query: The search query for finding relevant literature
        max_results: Maximum number of results to return (default 5)
    
    Returns:
        dict: Search results containing papers and their metadata
    """
    return {
        "query": query,
        "results": [
            {"title": "Sample Paper 1", "abstract": "Relevant research on the topic", "url": "https://example.com/paper1"},
            {"title": "Sample Paper 2", "abstract": "Another relevant work", "url": "https://example.com/paper2"}
        ],
        "total": 2
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
    "search_literature": search_literature,
    "generate_code": generate_code,
    "draft_section": draft_section
}

TOOL_LIST = [search_literature, generate_code, draft_section]
