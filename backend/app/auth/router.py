from jose import jwt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.models import UserModel
from app.auth.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, LogoutResponse
from app.auth.utils import hash_password, verify_password, create_access_token, decode_token
from app.auth.blacklist import token_blacklist
from app.config import get_settings

settings = get_settings()
auth_limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/v1/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="v1/auth/login")
user_model = UserModel()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
) -> dict:
    try:
        user_id, _ = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    
    user = user_model.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@auth_limiter.limit(f"{settings.auth_rate_limit_per_minute}/minute")
async def register(body: UserCreate, request: Request) -> TokenResponse:
    password_hash = hash_password(body.password)
    user = user_model.create(body.email, password_hash)
    access_token, _, _ = create_access_token(user["id"])
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
@auth_limiter.limit(f"{settings.auth_rate_limit_per_minute}/minute")
async def login(body: UserLogin, request: Request) -> TokenResponse:
    user = user_model.get_by_email(body.email)
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    access_token, _, _ = create_access_token(user["id"])
    return TokenResponse(access_token=access_token)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
) -> LogoutResponse:
    """
    Logout by revoking the current token.
    
    Adds the token's JTI to the blacklist, preventing future use.
    """
    try:
        # Decode token to get jti and exp
        payload = jwt.decode(
            credentials.credentials, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        jti = payload.get("jti", "")
        exp_timestamp = payload.get("exp", 0)
        
        if jti:
            exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
            token_blacklist.add(jti, exp_datetime)
    except jwt.InvalidTokenError:
        # Token is invalid anyway, consider logout successful
        pass
    
    return LogoutResponse()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user["id"], email=current_user["email"])
