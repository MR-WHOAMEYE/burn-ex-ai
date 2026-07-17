from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_calorie_estimation_base():
    """Verify that a basic squat calorie estimation works using the base MET lookup (MET = 5.0)."""
    # Men: BMR TDEE target is separate, workout calories are calculated via MET formula:
    # Calories = (MET * 3.5 * weight_kg) / 200 * duration_minutes
    # Squat MET = 5.0, Weight = 80kg, Duration = 10 mins
    # Calories per min = (5.0 * 3.5 * 80) / 200 = 1400 / 200 = 7.0
    # Total calories for 10 mins = 70.0
    response = client.post(
        "/api/calories/estimate",
        json={
            "exercise_type": "squat",
            "weight_kg": 80.0,
            "duration_minutes": 10.0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["exercise_type"] == "squat"
    assert data["base_met"] == 5.0
    assert data["adjusted_met"] == 5.0
    assert data["calories_burned"] == 70.0


def test_calorie_estimation_with_intensity():
    """Verify that movement intensity scales the MET and calorie calculation appropriately."""
    # Squat base MET = 5.0
    # Intensity = 1.0 (maximum effort)
    # Adjusted MET = 5.0 * (0.8 + 0.4 * 1.0) = 5.0 * 1.2 = 6.0
    # Calories per min = (6.0 * 3.5 * 80) / 200 = 1680 / 200 = 8.4
    # Total calories for 10 mins = 84.0
    response = client.post(
        "/api/calories/estimate",
        json={
            "exercise_type": "squat",
            "weight_kg": 80.0,
            "duration_minutes": 10.0,
            "movement_intensity": 1.0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["adjusted_met"] == 6.0
    assert data["calories_burned"] == 84.0


def test_calorie_estimation_fallback():
    """Verify that an unknown exercise falls back to a base MET of 5.0 gracefully."""
    response = client.post(
        "/api/calories/estimate",
        json={
            "exercise_type": "unknown_exercise_type",
            "weight_kg": 80.0,
            "duration_minutes": 10.0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["base_met"] == 5.0
    assert data["calories_burned"] == 70.0
