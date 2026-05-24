"""Dataclasses for experiment models."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Experiment:
    """Represents an A/B test experiment."""
    id: str
    description: str
    flags: list[str]
    traffic_percentage: int
    enabled: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class UserExperimentAssignment:
    """Records a user's assignment to an experiment."""
    user_id: str
    experiment_id: str
    is_enabled: bool
    assigned_at: datetime = field(default_factory=datetime.utcnow)
    override: Optional[bool] = None  # If manually overridden by admin
