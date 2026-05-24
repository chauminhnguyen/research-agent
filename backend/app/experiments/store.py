"""In-memory experiment store with deterministic user assignment."""

import hashlib
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.experiments.config import EXPERIMENTS, FeatureFlags


@dataclass
class UserAssignment:
    """Cached user assignment for a specific experiment."""
    experiment_id: str
    enabled: bool
    assigned_at: datetime = field(default_factory=datetime.utcnow)


class ExperimentStore:
    """
    Thread-safe in-memory store for A/B test assignments.
    
    Uses deterministic hashing to ensure consistent user assignment
    across requests without requiring sticky sessions.
    """
    
    def __init__(self):
        self._lock = threading.RLock()
        # user_id -> {experiment_id: enabled}
        self._assignments: dict[str, dict[str, bool]] = {}
        # user_id -> {flag_name: enabled}
        self._flag_cache: dict[str, dict[str, bool]] = {}
    
    def is_enabled(self, user_id: str, flag: str) -> bool:
        """
        Check if a feature flag is enabled for a user.
        
        Uses deterministic assignment based on hash(user_id + flag + experiment_id)
        to ensure consistent behavior without storing per-user assignments.
        """
        if not user_id:
            return False
        
        with self._lock:
            # Check cache first
            if user_id in self._flag_cache and flag in self._flag_cache[user_id]:
                return self._flag_cache[user_id][flag]
            
            # Find which experiments contain this flag
            for exp_id, exp in EXPERIMENTS.items():
                if flag in exp["flags"]:
                    enabled = self._check_assignment(user_id, exp_id, exp["traffic_percentage"])
                    self._cache_flag(user_id, flag, enabled)
                    return enabled
            
            # Flag not in any experiment, check if it's a general feature flag
            default_flags = [
                FeatureFlags.NEW_CHAT_STREAMING,
                FeatureFlags.ENHANCED_MEMORY_RECALL,
                FeatureFlags.VECTOR_SEARCH_V2,
            ]
            if flag in default_flags:
                self._cache_flag(user_id, flag, False)
                return False
            
            # Unknown flag
            return False
    
    def _check_assignment(self, user_id: str, experiment_id: str, traffic_percentage: int) -> bool:
        """
        Deterministically assign user to experiment based on hash.
        
        Same user will always get the same assignment for the same experiment.
        """
        combined = f"{user_id}:{experiment_id}"
        hash_val = int(hashlib.md5(combined.encode()).hexdigest(), 16)
        return (hash_val % 100) < traffic_percentage
    
    def _cache_flag(self, user_id: str, flag: str, enabled: bool) -> None:
        """Cache a flag result for a user."""
        if user_id not in self._flag_cache:
            self._flag_cache[user_id] = {}
        self._flag_cache[user_id][flag] = enabled
    
    def get_user_flags(self, user_id: str) -> dict[str, bool]:
        """Get all active flags for a user."""
        if not user_id:
            return {}
        
        with self._lock:
            if user_id in self._flag_cache:
                return self._flag_cache[user_id].copy()
            
            flags = {}
            for exp_id, exp in EXPERIMENTS.items():
                for flag in exp["flags"]:
                    if flag not in flags:  # First experiment wins
                        flags[flag] = self._check_assignment(user_id, exp_id, exp["traffic_percentage"])
            
            self._flag_cache[user_id] = flags
            return flags.copy()
    
    def set_user_override(self, user_id: str, flag: str, enabled: bool) -> None:
        """Manually override a flag for a specific user (admin use)."""
        with self._lock:
            self._cache_flag(user_id, flag, enabled)
    
    def clear_user_cache(self, user_id: str) -> None:
        """Clear cached flags for a user (useful for testing)."""
        with self._lock:
            self._flag_cache.pop(user_id, None)
            self._assignments.pop(user_id, None)
    
    def clear_all_cache(self) -> None:
        """Clear all cached assignments (useful for testing)."""
        with self._lock:
            self._flag_cache.clear()
            self._assignments.clear()
    
    def get_experiment_stats(self) -> dict[str, dict]:
        """Get assignment statistics for all experiments."""
        with self._lock:
            stats = {}
            for exp_id, exp in EXPERIMENTS.items():
                stats[exp_id] = {
                    "description": exp["description"],
                    "traffic_percentage": exp["traffic_percentage"],
                    "enabled": exp["enabled"],
                    "flags": exp["flags"],
                }
            return stats


# Global singleton instance
experiment_store = ExperimentStore()
