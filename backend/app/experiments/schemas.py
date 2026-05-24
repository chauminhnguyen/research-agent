"""Pydantic schemas for experiments endpoints."""

from typing import TypedDict

from pydantic import BaseModel, Field


class FlagState(BaseModel):
    """Current state of a feature flag for a user."""
    flag: str
    enabled: bool


class UserExperimentsResponse(BaseModel):
    """Response containing user's active experiment flags."""
    flags: list[FlagState]
    experiments: dict[str, bool]


class ExperimentInfo(BaseModel):
    """Information about an experiment."""
    id: str
    description: str
    traffic_percentage: int
    enabled: bool
    flags: list[str]


class ExperimentListResponse(BaseModel):
    """Response listing all available experiments."""
    experiments: list[ExperimentInfo]


class FlagOverride(BaseModel):
    """Request to override a flag for a specific user."""
    user_id: str = Field(..., min_length=1, description="User ID to override")
    flag: str = Field(..., min_length=1, description="Flag name")
    enabled: bool = Field(..., description="Enable or disable the flag")


class FlagOverrideResponse(BaseModel):
    """Response after flag override."""
    success: bool
    user_id: str
    flag: str
    enabled: bool
    message: str
