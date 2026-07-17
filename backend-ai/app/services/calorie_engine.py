"""
Calorie Estimation Engine

Implements the MET-based per-workout calorie burn formula:
  Calories/min = (MET × 3.5 × weight_kg) / 200

MET values are stored in a configurable lookup table — never hardcoded inline.
Movement intensity from IMU can scale the base MET up or down.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ── MET Lookup Table ──────────────────────────────────────────
# Stored as a dictionary so new exercises can be added without code changes.
# Values sourced from the Compendium of Physical Activities.

MET_TABLE: dict[str, float] = {
    "walking": 3.5,
    "squat": 5.0,
    "push_up": 8.0,
    "jumping_jack": 8.0,
    "running": 9.8,
    "burpee": 10.0,
    "plank": 3.0,
    "lunge": 6.0,
    "mountain_climber": 8.0,
    "high_knees": 8.5,
    "rest": 1.0,
}


class CalorieRequest(BaseModel):
    exercise_type: str
    weight_kg: float
    duration_minutes: float
    movement_intensity: Optional[float] = None  # 0.0 to 1.0, from fusion pipeline


class CalorieResponse(BaseModel):
    exercise_type: str
    base_met: float
    adjusted_met: float
    calories_burned: float
    duration_minutes: float


@router.post("/estimate", response_model=CalorieResponse)
async def estimate_calories(request: CalorieRequest):
    """
    Calculates per-workout calorie burn using the MET-based metabolic formula.
    
    The base MET is looked up by exercise type. If movement_intensity is provided
    (derived from IMU acceleration variance in the fusion pipeline), the MET is
    scaled dynamically:
      adjusted_MET = base_MET × (0.8 + 0.4 × intensity)
    
    This allows slow-controlled squats (~4.0 MET) vs. fast HIIT squats (~6.0 MET)
    to be scored differently without training a separate model.
    """
    base_met = MET_TABLE.get(request.exercise_type.lower(), 5.0)

    # Dynamic MET scaling based on movement intensity
    if request.movement_intensity is not None:
        intensity = max(0.0, min(1.0, request.movement_intensity))
        adjusted_met = base_met * (0.8 + 0.4 * intensity)
    else:
        adjusted_met = base_met

    # Core formula: Calories/min = (MET × 3.5 × weight_kg) / 200
    calories_per_minute = (adjusted_met * 3.5 * request.weight_kg) / 200
    total_calories = round(calories_per_minute * request.duration_minutes, 1)

    return CalorieResponse(
        exercise_type=request.exercise_type,
        base_met=base_met,
        adjusted_met=round(adjusted_met, 2),
        calories_burned=total_calories,
        duration_minutes=request.duration_minutes,
    )
