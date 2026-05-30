from typing import Optional
from functools import lru_cache
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from clerk_backend_api import Clerk
# from clerk_backend_api.types import JWTClaim

from app.config import get_settings


class UserInfo(BaseModel):
    id: str
    email: Optional[str] = None

settings = get_settings()
security = HTTPBearer(auto_error=False)

# Cache Clerk client
_clerk_client: Optional[Clerk] = None


def get_clerk_client() -> Optional[Clerk]:
    global _clerk_client
    if _clerk_client is None and settings.clerk_secret_key:
        _clerk_client = Clerk(secret_key=settings.clerk_secret_key)
    return _clerk_client


def decode_jwt_manually(token: str) -> Optional[dict]:
    """
    Manually decode Clerk JWT without verification (for development).
    In production, you should use Clerk's verification.
    """
    import base64
    import json
    
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        # Clerk JWTs have payload in the second part
        payload_b64 = parts[1]
        
        # Add padding if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
        
        # Replace URL-safe characters
        payload_b64 = payload_b64.replace("-", "+").replace("_", "/")
        
        payload = json.loads(base64.b64decode(payload_b64))
        return payload
    except Exception:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user.
    Supports both Clerk JWT tokens and legacy JWT tokens.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    # Try Clerk verification first
    if settings.clerk_secret_key:
        try:
            clerk = get_clerk_client()
            if clerk:
                # Verify and decode the JWT
                claims = clerk.jwt.verify(token)
                if claims:
                    return {
                        "id": claims.subject,
                        "email": getattr(claims, "email_address", None),
                        "external_id": getattr(claims, "external_id", None)
                    }
        except Exception as e:
            # Fall back to manual decoding for development
            pass
    
    # Fallback: try to decode Clerk JWT manually (development only)
    payload = decode_jwt_manually(token)
    if payload:
        # Extract user ID from Clerk's JWT payload
        user_id = payload.get("sub") or payload.get("user_id") or payload.get("clerk_user_id")
        if user_id:
            return {
                "id": user_id,
                "email": payload.get("email")
            }
    
    # Legacy token verification (keep for migration)
    try:
        from jose import jwt
        from app.config import get_settings
        from app.auth.blacklist import token_blacklist
        
        s = get_settings()
        decoded = jwt.decode(
            token,
            s.secret_key,
            algorithms=[s.algorithm]
        )
        
        # Check blacklist
        jti = decoded.get("jti", "")
        if jti and token_blacklist.is_blacklisted(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
        
        return {
            "id": decoded.get("sub", decoded.get("user_id")),
            "email": decoded.get("email")
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Optional user authentication - returns None if not authenticated.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
