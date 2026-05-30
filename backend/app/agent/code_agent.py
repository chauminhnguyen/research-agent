"""Code agent - specializes in coding and implementation."""

from app.agent.base import build_agent
from app.agent.prompts import CODE_PROMPT


# Compiled graph for the Code agent
CODE_AGENT = build_agent(CODE_PROMPT)
