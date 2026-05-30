"""Paper agent - specializes in academic writing."""

from app.agent.base import build_agent
from app.agent.prompts import PAPER_PROMPT


# Compiled graph for the Paper agent
PAPER_AGENT = build_agent(PAPER_PROMPT)
