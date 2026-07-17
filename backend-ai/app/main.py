"""
Burn-Ex AI — FastAPI Main Entry Point

This service handles:
  1. Sensor fusion (pose landmarks + IMU time-alignment)
  2. Exercise recognition via LSTM classifier
  3. Rep counting via XGBoost + peak detection
  4. Calorie estimation via MET-based formula
  5. On-demand YOLO food recognition (separate pipeline)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.pipelines.fusion import router as fusion_router
from app.pipelines.food_detection import router as food_router
from app.services.calorie_engine import router as calorie_router

app = FastAPI(
    title="Burn-Ex AI Service",
    description="AI inference engine for sensor fusion, exercise recognition, and nutrition analysis",
    version="1.0.0",
)

# CORS — allows the Express gateway to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service; gateway handles external CORS
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Service health probe for load balancers and monitoring."""
    return {"status": "ok", "service": "burn-ex-ai-service"}


# ── Route Registration ────────────────────────────────────────
app.include_router(fusion_router, prefix="/api/fusion", tags=["Sensor Fusion"])
app.include_router(food_router, prefix="/api/food", tags=["Food Detection"])
app.include_router(calorie_router, prefix="/api/calories", tags=["Calorie Estimation"])
