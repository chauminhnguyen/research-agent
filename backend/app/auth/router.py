from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.clerk_auth import get_current_user, decode_jwt_manually
from app.auth.schemas import UserResponse
from app.config import get_settings

security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    """
    Get the current authenticated user.
    Supports Clerk JWT tokens.
    """
    return UserResponse(
        id=current_user["id"],
        email=current_user.get("email", "")
    )


@router.get("/verify")
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify the current JWT token and return claims.
    Useful for debugging and testing.
    """
    if credentials is None:
        return {"valid": False, "error": "No token provided"}
    
    token = credentials.credentials
    settings = get_settings()
    
    # Try Clerk verification
    if settings.clerk_secret_key:
        try:
            clerk = get_clerk_client()
            if clerk:
                claims = clerk.jwt.verify(token)
                if claims:
                    return {
                        "valid": True,
                        "provider": "clerk",
                        "user_id": claims.subject,
                    }
        except Exception:
            pass
    
    # Manual decode (development)
    payload = decode_jwt_manually(token)
    if payload:
        user_id = payload.get("sub") or payload.get("user_id")
        if user_id:
            return {
                "valid": True,
                "provider": "clerk_jwt",
                "user_id": user_id,
            }
    
    return {"valid": False, "error": "Invalid token"}
