"""
Sensor Fusion Pipeline

Receives time-aligned pose landmarks + IMU data from the Express gateway,
performs feature engineering, and runs exercise classification + rep counting.

ARCHITECTURE NOTE: MediaPipe BlazePose runs CLIENT-SIDE in the browser.
This service receives extracted landmark coordinates (33 joints × 4 values),
NOT raw video frames.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class IMUSample(BaseModel):
    accel: List[float]  # [ax, ay, az]
    gyro: List[float]   # [wx, wy, wz]
    orientation: List[float]  # [alpha, beta, gamma]


class FusedFrame(BaseModel):
    """A single time-aligned frame combining pose and IMU data."""
    timestamp: float
    landmarks: List[LandmarkPoint]
    imu: IMUSample


class FusionRequest(BaseModel):
    """A window of fused frames for exercise classification."""
    session_id: str
    user_id: str
    weight_kg: float
    frames: List[FusedFrame]


class FusionResponse(BaseModel):
    exercise_type: str
    confidence: float
    reps_detected: int
    calories_burned: float
    posture_score: float
    intensity: float
    smoothness: float
    alert: Optional[str] = None


# ── Feature Engineering ───────────────────────────────────────

def compute_joint_angle(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint) -> float:
    """
    Computes the angle at joint B formed by points A-B-C using the dot product formula.
    Used for knee flexion, hip extension, and shoulder abduction angles.
    """
    ba = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    bc = np.array([c.x - b.x, c.y - b.y, c.z - b.z])

    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle_rad = np.arccos(np.clip(cos_angle, -1.0, 1.0))
    return float(np.degrees(angle_rad))


def extract_features(frames: List[FusedFrame]) -> np.ndarray:
    """
    Extracts a feature matrix from a window of fused frames.
    Each frame produces joint angles + IMU kinematics.
    
    BlazePose landmark indices used:
      Hip: 23 (left), 24 (right)
      Knee: 25 (left), 26 (right)
      Ankle: 27 (left), 28 (right)
      Shoulder: 11 (left), 12 (right)
      Elbow: 13 (left), 14 (right)
    """
    feature_vectors = []

    for frame in frames:
        lm = frame.landmarks

        # Guard against incomplete landmark sets
        if len(lm) < 33:
            continue

        # Joint angles
        left_knee_angle = compute_joint_angle(lm[23], lm[25], lm[27])
        right_knee_angle = compute_joint_angle(lm[24], lm[26], lm[28])
        left_hip_angle = compute_joint_angle(lm[11], lm[23], lm[25])
        right_hip_angle = compute_joint_angle(lm[12], lm[24], lm[26])
        left_shoulder_angle = compute_joint_angle(lm[23], lm[11], lm[13])
        right_shoulder_angle = compute_joint_angle(lm[24], lm[12], lm[14])

        # IMU raw values
        accel = frame.imu.accel
        gyro = frame.imu.gyro

        feature_vec = [
            left_knee_angle, right_knee_angle,
            left_hip_angle, right_hip_angle,
            left_shoulder_angle, right_shoulder_angle,
            *accel, *gyro,
        ]

        feature_vectors.append(feature_vec)

    return np.array(feature_vectors) if feature_vectors else np.empty((0, 12))


# ── Endpoint ──────────────────────────────────────────────────

@router.post("/analyze", response_model=FusionResponse)
async def analyze_fusion_window(request: FusionRequest):
    """
    Receives a sliding window of fused frames and returns exercise analysis.
    
    In the production pipeline:
      1. extract_features() builds the feature matrix
      2. LSTM model predicts exercise type
      3. Peak detection counts reps
      4. MET formula estimates calories
    
    Currently returns mock data — models will be trained in Sprint 3.
    """
    features = extract_features(request.frames)

    # TODO (Sprint 3): Replace with trained LSTM + XGBoost inference
    # For now, return a structured placeholder to validate the pipeline
    return FusionResponse(
        exercise_type="squat",
        confidence=0.92,
        reps_detected=len(request.frames) // 30,  # Rough estimate: 1 rep per second
        calories_burned=round(request.weight_kg * 0.05 * len(request.frames) / 30, 1),
        posture_score=85.0,
        intensity=72.0,
        smoothness=78.0,
        alert=None,
    )
