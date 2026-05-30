"""Ideas agent - specializes in research ideation and shareable ideas."""

from app.agent.base import build_agent
from app.agent.prompts import IDEAS_PROMPT


# Compiled graph for the Ideas agent
IDEAS_AGENT = build_agent(IDEAS_PROMPT)
