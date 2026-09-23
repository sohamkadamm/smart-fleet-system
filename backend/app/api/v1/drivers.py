from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_admin, get_current_manager_or_admin
from app.core.ai_engine import ai_engine
from app.models.user import User, UserRole
from app.models.driver import Driver, DriverStatus
from app.models.vehicle import Vehicle
from app.models.trip import Trip, TripStatus
from app.schemas.driver import (
    DriverCreate,
    DriverUpdate,
    DriverResponse,
    DriverSummaryStats
)

router = APIRouter(prefix="/drivers", tags=["Driver Management"])

def enrich_driver(d: Driver) -> dict:
    today = date.today()
    warning_threshold = today + timedelta(days=30)
    is_expired = bool(d.license_expiry < today)
    is_expiring_soon = bool(d.license_expiry <= warning_threshold)

    score_data = ai_engine.calculate_driver_performance(
        d.total_trips,
        d.on_time_trips,
        d.safety_score,
        d.fuel_efficiency_score
    )

    v_plate = d.assigned_vehicle.license_plate if d.assigned_vehicle else None
    v_model = f"{d.assigned_vehicle.make} {d.assigned_vehicle.model}" if d.assigned_vehicle else None

    return {
        "id": d.id,
        "user_id": d.user_id,
        "full_name": d.full_name,
        "email": d.email,
        "phone": d.phone,
        "license_number": d.license_number,
        "license_type": d.license_type,
        "license_expiry": d.license_expiry,
        "experience_years": d.experience_years,
        "emergency_contact": d.emergency_contact,
        "status": d.status,
        "is_active": getattr(d, "is_active", True),
        "assigned_vehicle_id": d.assigned_vehicle_id,
        "assigned_vehicle_plate": v_plate,
        "assigned_vehicle_model": v_model,
        "total_trips": d.total_trips,
        "on_time_trips": d.on_time_trips,
        "safety_score": d.safety_score,
        "fuel_efficiency_score": d.fuel_efficiency_score,
        "rating": d.rating,
        "is_license_expired": is_expired,
        "is_license_expiring_soon": is_expiring_soon,
        "performance_score": score_data["composite_score"],
        "performance_grade": score_data["grade"],
        "created_at": d.created_at,
        "updated_at": d.updated_at
    }

@router.get("/stats/summary", response_model=DriverSummaryStats)
def get_driver_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get driver count and average performance ratings."""
    total = db.query(Driver).filter(Driver.is_active == True).count()
    available = db.query(Driver).filter(Driver.status == DriverStatus.AVAILABLE, Driver.is_active == True).count()
    on_duty = db.query(Driver).filter(Driver.status == DriverStatus.ON_DUTY, Driver.is_active == True).count()
    off_duty = db.query(Driver).filter(Driver.status == DriverStatus.OFF_DUTY, Driver.is_active == True).count()

    drivers = db.query(Driver).filter(Driver.is_active == True).all()
    avg_safety = round(sum(d.safety_score for d in drivers) / max(1, len(drivers)), 1)
    avg_fuel = round(sum(d.fuel_efficiency_score for d in drivers) / max(1, len(drivers)), 1)

    return {
        "total_drivers": total,
        "available_drivers": available,
        "on_duty_drivers": on_duty,
        "off_duty_drivers": off_duty,
        "avg_safety_score": avg_safety,
        "avg_fuel_efficiency": avg_fuel
    }

@router.get("", response_model=List[DriverResponse])
def list_drivers(
    search: Optional[str] = Query(None, description="Search name, email, license"),
    status: Optional[DriverStatus] = Query(None, description="Filter by status"),
    include_inactive: bool = Query(False, description="Include inactive/suspended drivers"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List drivers with optional filtering and search (Admin & Fleet Manager)."""
    # 2.7 Driver role restrictions: Drivers cannot browse driver roster
    if current_user.role == UserRole.DRIVER:
        raise HTTPException(
            status_code=403,
            detail="Drivers do not have permission to view the fleet driver roster."
        )

    query = db.query(Driver)

    # 2.4 Soft delete: Exclude inactive drivers by default
    if not include_inactive:
        query = query.filter(Driver.is_active == True)

    if status:
        query = query.filter(Driver.status == status)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Driver.full_name.ilike(search_fmt)) |
            (Driver.email.ilike(search_fmt)) |
            (Driver.license_number.ilike(search_fmt))
        )
    drivers = query.order_by(Driver.id.desc()).all()
    return [enrich_driver(d) for d in drivers]

@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Create a new driver record."""
    # Check email duplicate
    if db.query(Driver).filter(Driver.email.ilike(driver_in.email.strip())).first():
        raise HTTPException(status_code=400, detail="A driver with this email already exists.")
    # Check license duplicate
    if db.query(Driver).filter(Driver.license_number.ilike(driver_in.license_number.strip())).first():
        raise HTTPException(status_code=400, detail="A driver with this license number already exists.")

    driver = Driver(
        full_name=driver_in.full_name.strip(),
        email=driver_in.email.strip().lower(),
        phone=driver_in.phone.strip(),
        license_number=driver_in.license_number.strip().upper(),
        license_type=driver_in.license_type,
        license_expiry=driver_in.license_expiry,
        experience_years=driver_in.experience_years,
        emergency_contact=driver_in.emergency_contact,
        status=driver_in.status,
        assigned_vehicle_id=driver_in.assigned_vehicle_id,
        user_id=driver_in.user_id
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return enrich_driver(driver)

@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    # 2.7 Driver role restrictions: Driver can only view own profile
    if current_user.role == UserRole.DRIVER:
        if driver.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers may only view their own driver profile."
            )

    return enrich_driver(driver)

@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    driver_in: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    update_data = driver_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(driver, field, val)

    db.commit()
    db.refresh(driver)
    return enrich_driver(driver)

@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Soft delete (suspend/deactivate) a driver (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    active_trip = db.query(Trip).filter(
        Trip.driver_id == driver_id,
        Trip.status == TripStatus.IN_TRANSIT
    ).first()
    if active_trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend/deactivate a driver currently assigned to an active IN_TRANSIT trip."
        )

    driver.is_active = False
    driver.status = DriverStatus.SUSPENDED
    db.commit()
    return None
