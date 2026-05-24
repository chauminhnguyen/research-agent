from slowapi import Limiter
from slowapi.util import get_remote_address

# Default limiter for general API endpoints
limiter = Limiter(key_func=get_remote_address)

# Separate limiter for auth endpoints with stricter limits
auth_limiter = Limiter(key_func=get_remote_address)
