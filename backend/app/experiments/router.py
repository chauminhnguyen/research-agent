"""API router for experiments and feature flags."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.router import get_current_user
from app.experiments.store import experiment_store
from app.experiments.schemas import (
    UserExperimentsResponse,
    ExperimentListResponse,
    ExperimentInfo,
    FlagOverride,
    FlagOverrideResponse,
    FlagState,
)
from app.experiments.config import EXPERIMENTS


router = APIRouter(prefix="/v1/experiments", tags=["experiments"])


@router.get("", response_model=UserExperimentsResponse)
async def get_my_experiments(user: dict = Depends(get_current_user)) -> UserExperimentsResponse:
    """
    Get all active experiment flags for the current user.
    
    Returns a list of flags with their enabled status based on
    the user's deterministic assignment to each experiment.
    """
    flags = experiment_store.get_user_flags(user["id"])
    flag_states = [FlagState(flag=flag, enabled=enabled) for flag, enabled in flags.items()]
    
    # Also return which experiments the user is enrolled in
    experiments_status = {}
    for exp_id, exp in EXPERIMENTS.items():
        is_enrolled = any(
            experiment_store._check_assignment(user["id"], exp_id, exp["traffic_percentage"])
            for _ in [1]  # Force evaluation
        ) if exp["enabled"] else False
        experiments_status[exp_id] = is_enrolled
    
    return UserExperimentsResponse(flags=flag_states, experiments=experiments_status)


@router.get("/all", response_model=ExperimentListResponse)
async def list_experiments() -> ExperimentListResponse:
    """
    List all available experiments (admin/info endpoint).
    
    Does not require authentication as this is public information
    about the experiments running.
    """
    experiments = [
        ExperimentInfo(
            id=exp_id,
            description=exp["description"],
            traffic_percentage=exp["traffic_percentage"],
            enabled=exp["enabled"],
            flags=exp["flags"],
        )
        for exp_id, exp in EXPERIMENTS.items()
    ]
    return ExperimentListResponse(experiments=experiments)


@router.post("/flags/override", response_model=FlagOverrideResponse)
async def override_flag(
    override: FlagOverride,
    current_user: dict = Depends(get_current_user)
) -> FlagOverrideResponse:
    """
    Override a flag for a specific user (admin endpoint).
    
    This allows forcing a flag on/off for a specific user for testing.
    In production, this would be restricted to admin users only.
    """
    # TODO(skill): Add admin role check before allowing overrides
    # For now, we'll allow any authenticated user (restrict in production)
    
    experiment_store.set_user_override(override.user_id, override.flag, override.enabled)
    
    return FlagOverrideResponse(
        success=True,
        user_id=override.user_id,
        flag=override.flag,
        enabled=override.enabled,
        message=f"Flag '{override.flag}' for user '{override.user_id}' set to {override.enabled}"
    )


@router.post("/flags/clear-cache", status_code=status.HTTP_204_NO_CONTENT)
async def clear_flag_cache(user: dict = Depends(get_current_user)) -> None:
    """
    Clear the flag cache for the current user.
    
    Useful for testing or when experiment assignments change.
    """
    experiment_store.clear_user_cache(user["id"])
    return None


@router.get("/check/{flag_name}")
async def check_flag(
    flag_name: str,
    user: dict = Depends(get_current_user)
) -> dict:
    """
    Check if a specific flag is enabled for the current user.
    
    Convenience endpoint for checking a single flag status.
    """
    is_enabled = experiment_store.is_enabled(user["id"], flag_name)
    return {
        "flag": flag_name,
        "enabled": is_enabled,
        "user_id": user["id"],
    }
