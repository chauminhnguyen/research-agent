"""Papers router - paper search, fetch, parse, enrich, and save to wiki."""

import json
import re
import asyncio
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
import httpx

from app.db.supabase import sb, is_supabase_available
from app.config import get_settings

router = APIRouter(prefix="/api/papers", tags=["papers"])

settings = get_settings()

# ── Search Models ──────────────────────────────────────────────────────────────


class SearchRequest(BaseModel):
    query: str
    sources: list[str] = Field(default_factory=lambda: ["arxiv", "tavily", "semantic_scholar"])
    max_results: int = Field(default=20, ge=1, le=100)


class PaperCard(BaseModel):
    id: str
    title: str
    authors: list[str]
    abstract: str
    source: str
    openAccessPdf: Optional[str] = None
    url: str
    year: Optional[int] = None
    score: float = 1.0


# ── Fetch & Parse Models ───────────────────────────────────────────────────────


class FetchResult(BaseModel):
    paper_id: str
    status: str  # 'downloaded' | 'paywall_detected' | 'upload_required'
    chunks_count: int
    index_summary: dict


# ── Enrich Models ──────────────────────────────────────────────────────────────


class EnrichRequest(BaseModel):
    highlight_text: str
    highlight_chunk_idx: int
    highlight_end_char: int
    window: int = Field(default=3, ge=0, le=10)
    fetch_abstracts: bool = False


class Chunk(BaseModel):
    idx: int
    text: str
    page: int
    bbox: Optional[list[float]] = None
    chunk_type: str = "body"


class EnrichedContext(BaseModel):
    highlight_text: str
    expanded_chunks: list[dict]
    boundary_text: str
    boundary_type: str
    resolved_refs: list[tuple[str, str, str]]


# ── Save Models ────────────────────────────────────────────────────────────────


class SaveRequest(BaseModel):
    enriched_context: EnrichedContext
    node_type: str = Field(
        pattern="^(concept|method|result|insight|research_question|idea|experiment)$"
    )
    custom_title: Optional[str] = None


class WikiNode(BaseModel):
    id: str
    node_type: str
    title: str
    content: str
    source_paper: str
    raw_highlight: str


# ── Search Implementations ─────────────────────────────────────────────────────


async def search_tavily(query: str, max_results: int) -> list[PaperCard]:
    """Search using Tavily API."""
    api_key = getattr(settings, "tavily_api_key", None)
    if not api_key:
        return []
    
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
                return []
            data = resp.json()
        
        papers = []
        for item in data.get("results", []):
            papers.append(PaperCard(
                id=f"tavily_{hash(item['url'])}",
                title=item.get("title", "Untitled"),
                authors=[],
                abstract=item.get("description", ""),
                source="tavily",
                url=item.get("url", ""),
                score=0.8,
            ))
        return papers
    except Exception:
        return []


async def search_semantic_scholar(query: str, max_results: int) -> list[PaperCard]:
    """Search using Semantic Scholar API (free, no auth)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": max_results,
                    "fields": "title,authors,abstract,year,openAccessPdf,url,externalIds",
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
        
        papers = []
        for item in data.get("data", []):
            authors = [a.get("name", "") for a in item.get("authors", [])[:5]]
            oa = item.get("openAccessPdf")
            papers.append(PaperCard(
                id=item.get("paperId", f"s2_{hash(item.get('title', ''))}"),
                title=item.get("title", "Untitled"),
                authors=authors,
                abstract=item.get("abstract", ""),
                source="semantic_scholar",
                openAccessPdf=oa.get("url") if oa else None,
                url=item.get("url", ""),
                year=item.get("year"),
                score=0.9,
            ))
        return papers
    except Exception:
        return []


async def search_arxiv(query: str, max_results: int) -> list[PaperCard]:
    """Search arXiv via Semantic Scholar (arXiv papers indexed there)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": f"{query} arxiv",
                    "limit": max_results,
                    "fields": "title,authors,abstract,year,openAccessPdf,url,externalIds",
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
        
        papers = []
        for item in data.get("data", []):
            ext_ids = item.get("externalIds", {})
            arxiv_id = ext_ids.get("ArXiv")
            if not arxiv_id:
                continue
            
            authors = [a.get("name", "") for a in item.get("authors", [])[:5]]
            oa = item.get("openAccessPdf")
            
            papers.append(PaperCard(
                id=f"arxiv_{arxiv_id}",
                title=item.get("title", "Untitled"),
                authors=authors,
                abstract=item.get("abstract", ""),
                source="arxiv",
                openAccessPdf=oa.get("url") if oa else None,
                url=f"https://arxiv.org/abs/{arxiv_id}",
                year=item.get("year"),
                score=0.95,
            ))
        return papers
    except Exception:
        return []


def deduplicate_and_rank(papers: list[PaperCard], query: str) -> list[PaperCard]:
    """Remove duplicates by URL and boost by keyword match."""
    seen_urls = set()
    unique = []
    query_terms = set(query.lower().split())
    
    for p in papers:
        if p.url in seen_urls:
            continue
        seen_urls.add(p.url)
        
        # Boost score if title contains query terms
        title_terms = set(p.title.lower().split())
        overlap = len(query_terms & title_terms)
        p.score = p.score + (overlap * 0.1)
        
        unique.append(p)
    
    return sorted(unique, key=lambda x: x.score, reverse=True)


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.post("/search", response_model=list[PaperCard])
async def search_papers(req: SearchRequest) -> list[PaperCard]:
    """Search papers from Tavily, Semantic Scholar, and arXiv in parallel."""
    tasks = []
    if "tavily" in req.sources:
        tasks.append(search_tavily(req.query, req.max_results))
    if "semantic_scholar" in req.sources:
        tasks.append(search_semantic_scholar(req.query, req.max_results))
    if "arxiv" in req.sources:
        tasks.append(search_arxiv(req.query, req.max_results))
    
    if not tasks:
        return []
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    papers = []
    for r in results:
        if isinstance(r, list):
            papers.extend(r)
    
    return deduplicate_and_rank(papers, req.query)


@router.get("/{paper_id}")
async def get_paper(paper_id: str) -> dict:
    """Get paper details by ID."""
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Handle different ID formats
    source = None
    external_id = paper_id
    if paper_id.startswith("arxiv_"):
        source = "arxiv"
        external_id = paper_id.replace("arxiv_", "")
    elif paper_id.startswith("tavily_"):
        source = "tavily"
    
    query = sb.table("papers").select("*")
    if source:
        query = query.eq("source", source).eq("external_id", external_id)
    else:
        query = query.eq("id", paper_id)
    
    result = query.execute()
    
    if result.data:
        return result.data[0]
    
    raise HTTPException(status_code=404, detail="Paper not found")


@router.post("/{paper_id}/fetch", response_model=FetchResult)
async def fetch_paper(paper_id: str, background_tasks: BackgroundTasks) -> FetchResult:
    """
    Fetch and parse a paper (download PDF, extract chunks + document index).
    Returns immediately; actual parsing happens in background for large papers.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Get paper metadata
    paper = await get_paper(paper_id)
    
    if paper.get("chunks_json") or paper.get("chunks_url"):
        # Already parsed
        chunks = paper.get("chunks_json") or []
        return FetchResult(
            paper_id=paper["id"],
            status="already_parsed",
            chunks_count=len(chunks),
            index_summary=paper.get("document_index", {}),
        )
    
    # Check access
    pdf_url = paper.get("pdf_url") or paper.get("open_access")
    
    if not pdf_url:
        return FetchResult(
            paper_id=paper["id"],
            status="upload_required",
            chunks_count=0,
            index_summary={},
        )
    
    # TODO: Implement actual PDF fetching + Docling parsing
    # For now, return placeholder indicating paper needs parsing
    return FetchResult(
        paper_id=paper["id"],
        status="downloaded",
        chunks_count=0,
        index_summary={},
    )


@router.get("/{paper_id}/chunks")
async def get_chunks(paper_id: str) -> dict:
    """
    Get parsed chunks and document index for a paper.
    Single query: loads chunks_json from papers table (or fetches from chunks_url if offloaded).
    """
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    paper = await get_paper(paper_id)
    
    # Check if chunks are offloaded to storage
    chunks_url = paper.get("chunks_url")
    if chunks_url:
        # Fetch from Supabase Storage
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(chunks_url)
                if resp.status_code == 200:
                    chunks = resp.json()
                else:
                    raise HTTPException(status_code=500, detail="Failed to fetch chunks from storage")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch chunks: {str(e)}")
    else:
        chunks = paper.get("chunks_json") or []
    
    return {
        "chunks": chunks,
        "index": paper.get("document_index") or {},
    }


@router.post("/{paper_id}/enrich", response_model=EnrichedContext)
async def enrich_highlight(paper_id: str, req: EnrichRequest) -> EnrichedContext:
    """
    3-step enrichment: window expansion → semantic boundary → cross-ref resolution.
    All deterministic — no LLM calls.
    """
    # Load chunks from DB (single query)
    chunks_data = await get_chunks(paper_id)
    chunks = chunks_data["chunks"]
    index_data = chunks_data["index"]
    
    # Import enrichment service
    from app.services.paper_enrichment import (
        Chunk as EnrichChunk,
        DocumentIndex,
        expand_window,
        apply_semantic_boundary,
        resolve_references,
    )
    
    # Convert to enrichment types
    enrich_chunks = [
        EnrichChunk(
            idx=c.get("idx", i),
            text=c.get("text", ""),
            page=c.get("page", 1),
            bbox=tuple(c["bbox"]) if c.get("bbox") else None,
            chunk_type=c.get("chunk_type", "body"),
        )
        for i, c in enumerate(chunks)
    ]
    
    doc_index = DocumentIndex()
    doc_index.chunks = enrich_chunks
    doc_index.sections = index_data.get("sections", {})
    doc_index.figures = {
        k: EnrichChunk(
            idx=-1,
            text=v if isinstance(v, str) else v.get("text", ""),
            page=1,
            chunk_type="caption",
        )
        for k, v in index_data.get("figures", {}).items()
    }
    doc_index.tables = {
        k: EnrichChunk(
            idx=-1,
            text=v if isinstance(v, str) else v.get("text", ""),
            page=1,
            chunk_type="caption",
        )
        for k, v in index_data.get("tables", {}).items()
    }
    doc_index.equations = {
        k: EnrichChunk(
            idx=-1,
            text=v if isinstance(v, str) else v.get("text", ""),
            page=1,
            chunk_type="equation",
        )
        for k, v in index_data.get("equations", {}).items()
    }
    doc_index.bibliography = index_data.get("bibliography", {})
    
    # Step 1: Window Expansion
    if req.highlight_chunk_idx >= len(enrich_chunks):
        raise HTTPException(status_code=400, detail="Invalid chunk index")
    
    expanded = expand_window(doc_index, req.highlight_chunk_idx, window=req.window)
    
    # Step 2: Semantic Boundary
    highlight_chunk = enrich_chunks[req.highlight_chunk_idx]
    boundary_text, boundary_type = apply_semantic_boundary(
        highlight_chunk, req.highlight_end_char
    )
    
    # Step 3: Cross-Reference Resolution
    full_text = req.highlight_text
    for c in expanded:
        if c.idx != req.highlight_chunk_idx:
            full_text += " " + c.text
    
    resolved = await resolve_references(full_text, doc_index, req.fetch_abstracts)
    
    return EnrichedContext(
        highlight_text=req.highlight_text,
        expanded_chunks=[c.model_dump() for c in expanded],
        boundary_text=boundary_text,
        boundary_type=boundary_type,
        resolved_refs=resolved,
    )


@router.post("/{paper_id}/save", response_model=WikiNode)
async def save_to_wiki(paper_id: str, req: SaveRequest) -> WikiNode:
    """
    Save enriched context as a wiki node.
    Calls LLM for completion pass to refine the content.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Build completion prompt
    prompt = _build_save_prompt(req.enriched_context, req.node_type)
    
    # Call LLM for completion
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=settings.openai_api_key
        )
        response = await llm.ainvoke(prompt)
        completion = response.content
    except Exception:
        # Fallback: use boundary text directly
        completion = req.enriched_context.boundary_text
    
    # Parse completion
    result = _parse_completion(completion, req.node_type)
    
    # Get paper info for source tracking
    try:
        paper = await get_paper(paper_id)
        source_paper = paper.get("title", paper_id)
    except Exception:
        source_paper = paper_id
    
    # Save to wiki_nodes table
    wiki_node = sb.table("wiki_nodes").insert({
        "node_type": req.node_type,
        "title": req.custom_title or result.get("title", ""),
        "content": result.get("content", req.enriched_context.boundary_text),
        "source_paper_id": paper_id if paper_id.startswith(str(UUID("0" * 32))) else None,
        "raw_highlight": req.enriched_context.highlight_text,
        "derived_from": {},
    }).execute()
    
    if wiki_node.data:
        return WikiNode(
            id=wiki_node.data[0]["id"],
            node_type=wiki_node.data[0]["node_type"],
            title=wiki_node.data[0]["title"],
            content=wiki_node.data[0]["content"],
            source_paper=source_paper,
            raw_highlight=wiki_node.data[0]["raw_highlight"],
        )
    
    raise HTTPException(status_code=500, detail="Failed to save wiki node")


def _build_save_prompt(context: EnrichedContext, node_type: str) -> str:
    """Build LLM prompt for completion pass."""
    refs_text = ""
    for ref_type, ref_id, content in context.resolved_refs:
        refs_text += f"\n- [{ref_type.upper()} {ref_id}]: {content[:200]}"
    
    type_hints = {
        "concept": "a definition or theoretical concept",
        "method": "a technical method or algorithm",
        "result": "an experimental result or benchmark",
        "insight": "an observation or research insight",
        "research_question": "a research question",
        "idea": "a novel idea or contribution",
        "experiment": "an experiment description",
    }
    
    return f"""You are helping save a highlighted passage from an academic paper as a {node_type}.

TYPE: {type_hints.get(node_type, 'knowledge item')}

HIGHLIGHTED TEXT:
{context.highlight_text}

SEMANTIC CONTEXT (expanded with surrounding text):
{context.boundary_text}

CROSS-REFERENCES FOUND:
{refs_text or 'No references found.'}

Please provide:
1. A concise title for this {node_type} (max 10 words)
2. Refined content that incorporates the context and resolves any unclear references

Format your response as:
TITLE: <your title>
CONTENT: <your refined content>"""


def _parse_completion(text: str, node_type: str) -> dict:
    """Parse LLM completion response."""
    title_match = re.search(r"TITLE:\s*(.+?)(?:\n|CONTENT:|$)", text, re.IGNORECASE | re.DOTALL)
    content_match = re.search(r"CONTENT:\s*(.+)$", text, re.IGNORECASE | re.DOTALL)
    
    return {
        "title": title_match.group(1).strip() if title_match else "",
        "content": content_match.group(1).strip() if content_match else text,
    }
