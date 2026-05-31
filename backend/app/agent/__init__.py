# Agent module - lazy loaded on first use

def get_ideas_agent():
    from app.agent.ideas_agent import IDEAS_AGENT
    return IDEAS_AGENT

def get_code_agent():
    from app.agent.code_agent import CODE_AGENT
    return CODE_AGENT

def get_paper_agent():
    from app.agent.paper_agent import PAPER_AGENT
    return PAPER_AGENT
