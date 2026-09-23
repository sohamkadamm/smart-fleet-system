from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.ai_engine import ai_engine
from app.models.user import User
from app.models.driver import Driver
from app.models.trip import Trip, TripStatus

router = APIRouter(prefix="/performance", tags=["Driver Performance & Scoring"])

@router.get("/leaderboard")
def get_driver_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Returns ranked driver performance leaderboard with composite ratings."""
    drivers = db.query(Driver).all()
    leaderboard = []

    for d in drivers:
        score_data = ai_engine.calculate_driver_performance(
            total_trips=d.total_trips,
            on_time_trips=d.on_time_trips,
            safety_score=d.safety_score,
            fuel_efficiency_score=d.fuel_efficiency_score,
            experience_years=getattr(d, "experience_years", 1) or 1
        )

        completed_trips_count = db.query(Trip).filter(
            Trip.driver_id == d.id,
            Trip.status == TripStatus.DELIVERED
        ).count()

        leaderboard.append({
            "driver_id": d.id,
            "full_name": d.full_name,
            "license_number": d.license_number,
            "status": d.status,
            "total_trips": max(d.total_trips, completed_trips_count),
            "on_time_rate_pct": score_data["on_time_rate_pct"],
            "safety_score": d.safety_score,
            "fuel_efficiency_score": d.fuel_efficiency_score,
            "experience_score": score_data["experience_score"],
            "composite_score": score_data["composite_score"],
            "grade": score_data["grade"],
            "tier": score_data["tier"],
            "badge": score_data["badge"],
            "coaching_tips": score_data["coaching_tips"],
            "strengths": score_data["strengths"],
            "rating": d.rating,
            "experience_years": d.experience_years
        })

    # Sort descending by composite score
    leaderboard.sort(key=lambda x: x["composite_score"], reverse=True)
    for idx, item in enumerate(leaderboard, start=1):
        item["rank"] = idx

    return leaderboard

@router.get("/my")
def get_my_driver_scorecard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Driver Only / Self) Get scorecard for the currently authenticated driver."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="No driver profile associated with your user account.")
    return get_driver_scorecard(driver.id, db, current_user)

@router.get("/driver/{driver_id}")
def get_driver_scorecard(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    score_data = ai_engine.calculate_driver_performance(
        total_trips=driver.total_trips,
        on_time_trips=driver.on_time_trips,
        safety_score=driver.safety_score,
        fuel_efficiency_score=driver.fuel_efficiency_score,
        experience_years=getattr(driver, "experience_years", 1) or 1
    )

    return {
        "driver_id": driver.id,
        "full_name": driver.full_name,
        "scorecard": score_data,
        "assigned_vehicle": driver.assigned_vehicle.license_plate if driver.assigned_vehicle else "None",
        "total_deliveries": driver.total_trips,
        "star_rating": driver.rating
    }
