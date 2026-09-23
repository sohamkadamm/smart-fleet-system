from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_manager_or_admin
from app.models.user import User, UserRole
from app.models.fuel import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.schemas.fuel import (
    FuelLogCreate,
    FuelLogResponse,
    FuelSummaryStats
)

router = APIRouter(prefix="/fuel", tags=["Fuel & Energy Management"])

def enrich_fuel_log(f: FuelLog) -> dict:
    v_plate = f.vehicle.license_plate if f.vehicle else None
    d_name = f.driver.full_name if f.driver else None

    return {
        "id": f.id,
        "vehicle_id": f.vehicle_id,
        "driver_id": f.driver_id,
        "fuel_quantity": f.fuel_quantity,
        "unit_cost": f.unit_cost,
        "total_cost": f.total_cost,
        "odometer_km": f.odometer_km,
        "station_name": f.station_name,
        "invoice_number": f.invoice_number,
        "fuel_type": f.fuel_type,
        "efficiency_km_per_unit": f.efficiency_km_per_unit,
        "refill_date": f.refill_date,
        "created_at": f.created_at,
        "vehicle_plate": v_plate,
        "driver_name": d_name,
    }

@router.get("/stats/summary", response_model=FuelSummaryStats)
def get_fuel_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(FuelLog).all()
    total_spent = sum(l.total_cost for l in logs)
    total_units = sum(l.fuel_quantity for l in logs)
    avg_cost = round(total_spent / max(0.1, total_units), 2)
    
    valid_eff = [l.efficiency_km_per_unit for l in logs if l.efficiency_km_per_unit]
    avg_eff = round(sum(valid_eff) / max(1, len(valid_eff)), 2) if valid_eff else 3.8

    return {
        "total_fuel_spent_inr": round(total_spent, 2),
        "total_fuel_units_consumed": round(total_units, 1),
        "average_fuel_cost_per_liter": avg_cost,
        "average_fleet_efficiency_km_per_unit": avg_eff,
        "total_logs_count": len(logs)
    }

@router.get("", response_model=List[FuelLogResponse])
def list_fuel_logs(
    vehicle_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FuelLog)
    if vehicle_id:
        query = query.filter(FuelLog.vehicle_id == vehicle_id)
    logs = query.order_by(FuelLog.id.desc()).all()
    return [enrich_fuel_log(f) for f in logs]

@router.post("", response_model=FuelLogResponse, status_code=status.HTTP_201_CREATED)
def create_fuel_log(
    log_in: FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == log_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    # Driver role restrictions: Driver may only log fuel for their assigned vehicle
    if current_user.role == UserRole.DRIVER:
        driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
        if not driver or driver.assigned_vehicle_id != log_in.vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers may only log fuel for their assigned vehicle."
            )
        log_in.driver_id = driver.id

    # Odometer validation: reject odometer lower than vehicle's current recorded odometer
    if log_in.odometer_km < vehicle.odometer_km:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Odometer reading ({log_in.odometer_km} km) cannot be lower than the vehicle's current recorded odometer ({vehicle.odometer_km} km)."
        )

    # Calculate efficiency from previous fuel log if odometer advanced
    prev_log = db.query(FuelLog).filter(
        FuelLog.vehicle_id == log_in.vehicle_id
    ).order_by(FuelLog.odometer_km.desc()).first()

    efficiency = None
    if prev_log and log_in.odometer_km > prev_log.odometer_km and log_in.fuel_quantity > 0:
        km_diff = log_in.odometer_km - prev_log.odometer_km
        efficiency = round(km_diff / log_in.fuel_quantity, 2)

    total_cost = round(log_in.fuel_quantity * log_in.unit_cost, 2)

    # Update vehicle's current odometer if greater
    if log_in.odometer_km > vehicle.odometer_km:
        vehicle.odometer_km = log_in.odometer_km

    fuel_log = FuelLog(
        vehicle_id=log_in.vehicle_id,
        driver_id=log_in.driver_id,
        fuel_quantity=log_in.fuel_quantity,
        unit_cost=log_in.unit_cost,
        total_cost=total_cost,
        odometer_km=log_in.odometer_km,
        station_name=log_in.station_name,
        invoice_number=log_in.invoice_number,
        fuel_type=log_in.fuel_type or vehicle.fuel_type.value,
        efficiency_km_per_unit=efficiency,
        refill_date=log_in.refill_date
    )
    db.add(fuel_log)
    db.commit()
    db.refresh(fuel_log)
    return enrich_fuel_log(fuel_log)
