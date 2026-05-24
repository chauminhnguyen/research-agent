"""Middleware for injecting experiment flags into responses."""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.experiments.store import experiment_store


class ExperimentsMiddleware(BaseHTTPMiddleware):
    """
    Middleware that injects experiment flags into JSON responses.
    
    Adds an 'X-Experiments' header to authenticated responses containing
    the user's active feature flags.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get user from request state (set by get_current_user dependency)
        user = getattr(request.state, "user", None)
        user_id = user.get("id") if user else None
        
        response = await call_next(request)
        
        # Only add header to successful JSON responses
        if isinstance(response, JSONResponse) and user_id:
            flags = experiment_store.get_user_flags(user_id)
            if flags:
                # Add as comma-separated flag list
                flag_header = ",".join(f"{k}:{v}" for k, v in flags.items())
                response.headers["X-Experiments"] = flag_header
        
        return response


def inject_experiments_into_response(response: dict, user_id: str) -> dict:
    """
    Helper to inject experiment flags into a response dict.
    
    Use this in routers where you want flags included in the response body.
    """
    if not user_id:
        return response
    
    flags = experiment_store.get_user_flags(user_id)
    response["_experiments"] = {
        "flags": flags,
        "count": len(flags),
    }
    return response
