"""
Paper Enrichment Service - 3-step enrichment pipeline.
Ports logic from pdf_pipeline_test.py for production use.
"""

import re
import json
from dataclasses import dataclass, field
from typing import Optional
import httpx


# ── Data Classes ────────────────────────────────────────────────────────────────


@dataclass
class Chunk:
    """A parsed text unit from a PDF."""
    idx: int
    text: str
    page: int
    bbox: Optional[tuple] = None
    chunk_type: str = "body"  # body | heading | caption | code | equation

    def __repr__(self):
        preview = self.text[:60].replace("\n", " ")
        return f"Chunk(idx={self.idx}, page={self.page}, type={self.chunk_type}, text=\"{preview}...\")"


@dataclass
class DocumentIndex:
    """Document structure parsed from PDF."""
    chunks: list[Chunk] = field(default_factory=list)
    sections: dict[str, int] = field(default_factory=dict)  # "3.1" → chunk_idx
    figures: dict[str, Chunk] = field(default_factory=dict)  # "2" → caption chunk
    tables: dict[str, Chunk] = field(default_factory=dict)  # "1" → table chunk
    equations: dict[str, Chunk] = field(default_factory=dict)  # "4" → equation chunk
    bibliography: dict[str, dict] = field(default_factory=dict)  # "14" → {title, authors, year}

    def resolve(self, ref_type: str, ref_id: str) -> Optional[str]:
        """O(1) lookup for cross-references."""
        store = getattr(self, ref_type + "s", {})
        result = store.get(ref_id)
        if result is None:
            return None
        if isinstance(result, Chunk):
            return result.text
        if isinstance(result, dict):
            return json.dumps(result)
        return str(result)

    def stats(self):
        return {
            "chunks": len(self.chunks),
            "sections": len(self.sections),
            "figures": len(self.figures),
            "tables": len(self.tables),
            "equations": len(self.equations),
            "bibliography": len(self.bibliography),
        }


# ── Patterns ───────────────────────────────────────────────────────────────────


SECTION_PATTERN = re.compile(r"^(\d+(?:\.\d+)*)\s+(.+)", re.MULTILINE)
FIGURE_PATTERN = re.compile(r"^[Ff]ig(?:ure)?[\s\.]*?(\d+[a-z]?)[\.:](.*)", re.MULTILINE)
TABLE_PATTERN = re.compile(r"^[Tt]able\s+(\d+)[\.:](.*)", re.MULTILINE)
EQUATION_PATTERN = re.compile(r"\\begin\{equation\}|\\\(|\\\[""\\$]")

BIB_PATTERN = re.compile(
    r"\[(\d+)\]\s+([A-Z][^,]+),\s+(.+?\.),\s+(\d{4})",
    re.MULTILINE
)

CROSS_REF_PATTERNS = {
    "section": re.compile(r"[Ss]ections?\s+(\d+(?:\.\d+)*)", re.IGNORECASE),
    "figure": re.compile(r"[Ff]ig(?:ure)?\.?\s*(\d+[a-z]?)", re.IGNORECASE),
    "table": re.compile(r"[Tt]able\s+(\d+)", re.IGNORECASE),
    "equation": re.compile(r"[Ee]q(?:uation)?\.?\s*\(?(\d+)\)?", re.IGNORECASE),
    "citation": re.compile(r"\[(\d+(?:,\s*\d+)*)\]"),
    "appendix": re.compile(r"[Aa]ppendix\s+([A-Z])", re.IGNORECASE),
}

LIST_PATTERN = re.compile(r'^(\s*[\u2022\u2023\u2043\u2219\-\*]|\s*\d+[\.\)])\s+')

CODE_MARKERS = [
    "algorithm", "procedure", "function", "for ", "while ",
    "if ", "return", "input:", "output:", "def ", "class ",
    "then", "end if", "end for", "end while",
]


# ── Chunk Classification ───────────────────────────────────────────────────────


def classify_chunk(text: str) -> str:
    """Classify a chunk by its type based on content patterns."""
    t = text.strip()
    
    if SECTION_PATTERN.match(t) and len(t.split("\n")[0]) < 100:
        return "heading"
    if FIGURE_PATTERN.match(t):
        return "caption"
    if TABLE_PATTERN.match(t):
        return "caption"
    if EQUATION_PATTERN.search(t):
        return "equation"
    if t.startswith("    ") or re.match(r"^(Algorithm|Procedure|function)", t):
        return "code"

    # Detect algorithm/pseudocode: lines starting with number + colon
    algo_lines = [l for l in text.split("\n") if re.match(r"^\s*\d+:\s+", l)]
    if len(algo_lines) >= 2:
        return "code"

    return "body"


# ── Step 1: Window Expansion ────────────────────────────────────────────────────


def expand_window(index: DocumentIndex, highlight_idx: int, window: int = 3) -> list[Chunk]:
    """
    Get chunks around highlight_idx within the window radius.
    Deterministic - no LLM calls.
    """
    chunks = index.chunks
    start = max(0, highlight_idx - window)
    end = min(len(chunks), highlight_idx + window + 1)
    return chunks[start:end]


# ── Step 2: Semantic Boundary Detection ───────────────────────────────────────


def expand_to_sentence_boundary(text: str, highlight_end_char: int) -> str:
    """
    Expand highlight to end of current sentence.
    Uses basic sentence splitting to avoid spaCy dependency in production.
    """
    # Simple sentence boundary: . ! ? followed by space and uppercase
    # Handle common abbreviations
    safe_text = re.sub(r"\b(e\.g|et\.al|i\.e|\.\.\.)\b", lambda m: m.group().replace(".", "\x00"), text)
    
    # Find sentence boundaries
    sentence_end = len(text)
    for match in re.finditer(r"[.!?]\s+(?=[A-Z])", safe_text):
        if match.start() >= highlight_end_char:
            sentence_end = match.end()
            break
    
    # Restore any temporarily masked periods
    return text[:sentence_end].replace("\x00", ".")


def is_inside_code_block(lines: list[str], highlight_line_idx: int, threshold: int = 2) -> bool:
    """Check if highlight is inside a code block."""
    window = lines[max(0, highlight_line_idx - 5):highlight_line_idx + 5]
    score = sum(
        1 for line in window
        if any(m in line.lower() for m in CODE_MARKERS)
        or (line.startswith("    ") and line.strip())
    )
    return score >= threshold


def is_partial_equation(text: str) -> bool:
    """True if text contains an unclosed LaTeX equation."""
    inline_unmatched = text.count("$") % 2 != 0
    block_unmatched = text.count(r"\begin{equation}") != text.count(r"\end{equation}")
    bracket_unmatched = text.count(r"\[") != text.count(r"\]")
    dblock_unmatched = text.count("$$") % 2 != 0
    return inline_unmatched or block_unmatched or bracket_unmatched or dblock_unmatched


def find_list_end(lines: list[str], start_idx: int) -> int:
    """Find the last line of a list."""
    for i in range(start_idx, len(lines)):
        if not lines[i].strip() or not LIST_PATTERN.match(lines[i]):
            return i
    return len(lines)


def _find_algo_end(lines: list[str]) -> int:
    """
    Find the last line of an algorithm block.
    Algorithm ends when encountering a non-algo line after algo lines.
    """
    ALGO_LINE = re.compile(
        r'^\s*(\d+:\s+'
        r'|end\s+(if|for|while)'
        r'|then$'
        r'|break$'
        r'|[!<>]$'
        r'|\s*$'
        r')'
    )
    last_algo_line = 0
    for i, line in enumerate(lines):
        if ALGO_LINE.match(line):
            last_algo_line = i
        elif i > 0 and last_algo_line > 0:
            break
    return last_algo_line + 1


def apply_semantic_boundary(chunk: Chunk, highlight_end_char: int) -> tuple[str, str]:
    """
    Apply semantic boundary based on chunk type.
    Returns (expanded_text, boundary_type).
    Deterministic - no LLM calls.
    """
    text = chunk.text
    lines = text.split("\n")

    algo_lines = [l for l in lines if re.match(r"^\s*\d+:\s+", l)]
    is_code = chunk.chunk_type == "code" or len(algo_lines) >= 2

    if chunk.chunk_type == "equation" or is_partial_equation(text[:highlight_end_char]):
        boundary_type = "equation"
        result = text  # equations always take full chunk

    elif is_code:
        boundary_type = "code"
        end_line = _find_algo_end(lines)
        result = "\n".join(lines[:end_line])

    elif LIST_PATTERN.match(lines[0] if text.strip() else ""):
        boundary_type = "list"
        end_line = find_list_end(lines, 0)
        result = "\n".join(lines[:end_line])

    else:
        boundary_type = "sentence"
        result = expand_to_sentence_boundary(text, highlight_end_char)

    return result, boundary_type


# ── Step 3: Cross-Reference Resolution ─────────────────────────────────────────


def detect_references(text: str) -> dict[str, list[str]]:
    """Find all cross-references in text."""
    found = {}
    for ref_type, pattern in CROSS_REF_PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            if ref_type == "citation":
                ids = []
                for m in matches:
                    ids.extend(x.strip() for x in m.split(","))
                found[ref_type] = list(dict.fromkeys(ids))
            else:
                found[ref_type] = list(dict.fromkeys(matches))
    return found


async def fetch_abstract_from_s2(title: str) -> Optional[str]:
    """Fetch abstract from Semantic Scholar API (free, no auth)."""
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {"query": title, "fields": "abstract,year,authors", "limit": 1}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        papers = data.get("data", [])
        if papers:
            return papers[0].get("abstract")
    except Exception:
        pass
    return None


async def resolve_references(
    text: str,
    index: DocumentIndex,
    fetch_abstracts: bool = False
) -> list[tuple[str, str, str]]:
    """
    Detect and resolve all cross-references in text.
    Returns list of (ref_type, ref_id, resolved_content).
    May call Semantic Scholar API if fetch_abstracts=True.
    """
    refs = detect_references(text)
    results = []

    for ref_type, ids in refs.items():
        for ref_id in ids:
            if ref_type == "citation":
                bib = index.bibliography.get(ref_id)
                if bib:
                    content = f"{bib.get('authors', '')} ({bib.get('year', '')}): {bib.get('title', '')}"
                    if fetch_abstracts:
                        abstract = await fetch_abstract_from_s2(bib.get("title", ""))
                        if abstract:
                            content += f" | Abstract: {abstract[:200]}..."
                    results.append((ref_type, ref_id, content))
                else:
                    results.append((ref_type, ref_id, "[bibliography entry not found]"))

            else:
                resolved = index.resolve(ref_type, ref_id)
                if resolved:
                    results.append((ref_type, ref_id, resolved[:300]))
                else:
                    results.append((ref_type, ref_id, f"[{ref_type} {ref_id} not found in document]"))

    return results


# ── Unified Pipeline ───────────────────────────────────────────────────────────


@dataclass
class HighlightContext:
    """Result of 3-step enrichment pipeline."""
    highlight_text: str
    expanded_chunks: list[Chunk]
    boundary_text: str
    boundary_type: str
    resolved_refs: list[tuple[str, str, str]]


async def process_highlight(
    index: DocumentIndex,
    highlight_text: str,
    highlight_chunk_idx: int,
    highlight_end_char: int,
    window: int = 3,
    fetch_abstracts: bool = False,
) -> HighlightContext:
    """
    Full enrichment pipeline: window expansion → semantic boundary → cross-ref resolution.
    Deterministic except for optional Semantic Scholar API calls for citation abstracts.
    """
    # Step 1: Window Expansion
    expanded = expand_window(index, highlight_chunk_idx, window=window)

    # Step 2: Semantic Boundary
    highlight_chunk = index.chunks[highlight_chunk_idx]
    boundary_text, boundary_type = apply_semantic_boundary(
        highlight_chunk, highlight_end_char
    )

    # Step 3: Cross-Reference Resolution
    full_text = highlight_text
    for c in expanded:
        if c.idx != highlight_chunk_idx:
            full_text += " " + c.text

    resolved = await resolve_references(full_text, index, fetch_abstracts)

    return HighlightContext(
        highlight_text=highlight_text,
        expanded_chunks=expanded,
        boundary_text=boundary_text,
        boundary_type=boundary_type,
        resolved_refs=resolved,
    )
