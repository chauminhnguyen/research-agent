"""In-memory token blacklist for logout/revocation support."""

import threading
from datetime import datetime, timedelta
from typing import Optional


class TokenBlacklist:
    """
    Thread-safe in-memory token blacklist.
    
    Stores revoked token JTIs (JWT IDs) with their expiration times.
    Automatically cleans up expired entries to prevent memory leaks.
    """
    
    def __init__(self, ttl_minutes: int = 1440):  # Default 24 hours
        self._lock = threading.RLock()
        self._blacklist: dict[str, datetime] = {}  # jti -> expiration time
        self._ttl_minutes = ttl_minutes
    
    def add(self, jti: str, exp: datetime) -> None:
        """
        Add a token JTI to the blacklist.
        
        Args:
            jti: The JWT ID to blacklist
            exp: The token's expiration time
        """
        if not jti:
            return
        
        with self._lock:
            # Use the token's expiration time or default TTL, whichever is longer
            max_exp = max(exp, datetime.utcnow() + timedelta(minutes=self._ttl_minutes))
            self._blacklist[jti] = max_exp
            self._cleanup_expired()
    
    def is_blacklisted(self, jti: str) -> bool:
        """
        Check if a token JTI is blacklisted.
        
        Args:
            jti: The JWT ID to check
            
        Returns:
            True if the token is blacklisted and not expired, False otherwise
        """
        if not jti:
            return False
        
        with self._lock:
            if jti in self._blacklist:
                exp_time = self._blacklist[jti]
                if datetime.utcnow() < exp_time:
                    return True
                # Token has expired, remove from blacklist
                del self._blacklist[jti]
            return False
    
    def _cleanup_expired(self) -> None:
        """Remove expired entries from the blacklist."""
        now = datetime.utcnow()
        expired = [jti for jti, exp in self._blacklist.items() if now >= exp]
        for jti in expired:
            del self._blacklist[jti]
    
    def size(self) -> int:
        """Return the number of blacklisted tokens."""
        with self._lock:
            return len(self._blacklist)
    
    def clear(self) -> None:
        """Clear all entries from the blacklist."""
        with self._lock:
            self._blacklist.clear()


# Global singleton instance
token_blacklist = TokenBlacklist()
