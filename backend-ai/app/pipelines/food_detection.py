"""
On-Demand Food Detection Pipeline (YOLO)

ARCHITECTURE NOTE: This is a SEPARATE pipeline from the real-time workout loop.
It processes a single uploaded photo, not a continuous stream.
It is NOT latency-sensitive and is NOT part of the live fusion loop.
"""

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List

router = APIRouter()


class DetectedFood(BaseModel):
    name: str
    confidence: float
    proteins_grams: float
    carbs_grams: float
    fats_grams: float
    calories: float


class FoodDetectionResponse(BaseModel):
    detected_foods: List[DetectedFood]
    total_calories: float
    total_proteins: float
    total_carbs: float
    total_fats: float


@router.post("/detect", response_model=FoodDetectionResponse)
async def detect_food(image: UploadFile = File(...)):
    """
    Receives a meal photo and runs YOLO object detection to identify foods.
    
    Production pipeline:
      1. YOLOv8 detects bounding boxes around food items
      2. Classification maps each box to a food category
      3. Portion estimation based on bounding box area ratios
      4. Nutrient lookup via USDA FoodData Central or local DB
    
    Currently returns mock data — YOLO model will be integrated in Sprint 4.
    """
    # Read file to validate it's a real image
    contents = await image.read()
    file_size_kb = len(contents) / 1024

    # TODO (Sprint 4): Run YOLOv8 inference on the image bytes
    # For now, return structured mock data to validate the API contract

    mock_foods = [
        DetectedFood(
            name="Grilled Chicken Breast",
            confidence=0.94,
            proteins_grams=31.0,
            carbs_grams=0.0,
            fats_grams=3.6,
            calories=165.0,
        ),
        DetectedFood(
            name="Brown Rice",
            confidence=0.88,
            proteins_grams=5.0,
            carbs_grams=45.0,
            fats_grams=1.8,
            calories=216.0,
        ),
        DetectedFood(
            name="Steamed Broccoli",
            confidence=0.91,
            proteins_grams=3.7,
            carbs_grams=7.0,
            fats_grams=0.4,
            calories=55.0,
        ),
    ]

    total = lambda attr: round(sum(getattr(f, attr) for f in mock_foods), 1)

    return FoodDetectionResponse(
        detected_foods=mock_foods,
        total_calories=total("calories"),
        total_proteins=total("proteins_grams"),
        total_carbs=total("carbs_grams"),
        total_fats=total("fats_grams"),
    )
