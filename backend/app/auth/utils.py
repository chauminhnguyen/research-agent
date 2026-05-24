import uuid
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Tuple

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> Tuple[str, str, datetime]:
    """
    Create a new JWT access token with a unique JTI.
    
    Returns:
        Tuple of (token, jti, expiration_datetime)
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    jti = str(uuid.uuid4())
    payload = {"sub": user_id, "exp": expire, "jti": jti}
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, jti, expire


def decode_token(token: str) -> Tuple[str, Optional[str]]:
    """
    Decode and validate a JWT token.
    
    Returns:
        Tuple of (user_id, jti) if valid
        Raises jwt.InvalidTokenError or jwt.ExpiredSignatureError if invalid
    """
    from app.auth.blacklist import token_blacklist
    
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    jti = payload.get("jti", "")
    
    # Check if token is blacklisted
    if jti and token_blacklist.is_blacklisted(jti):
        raise jwt.InvalidTokenError("Token has been revoked")
    
    return payload["sub"], jti
