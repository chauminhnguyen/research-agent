from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.nodes import router_node, ideas_node, coding_node, paper_node, memory_save_node


def route_to_module(state: AgentState) -> str:
    module = state.get("module", "ideas")
    return module


def build_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("router", router_node)
    workflow.add_node("ideas", ideas_node)
    workflow.add_node("coding", coding_node)
    workflow.add_node("paper", paper_node)
    workflow.add_node("memory_save", memory_save_node)
    
    workflow.set_entry_point("router")
    
    workflow.add_conditional_edges(
        "router",
        route_to_module,
        {
            "ideas": "ideas",
            "coding": "coding",
            "paper": "paper"
        }
    )
    
    workflow.add_edge("ideas", "memory_save")
    workflow.add_edge("coding", "memory_save")
    workflow.add_edge("paper", "memory_save")
    workflow.add_edge("memory_save", END)
    
    return workflow.compile()


graph = build_graph()
