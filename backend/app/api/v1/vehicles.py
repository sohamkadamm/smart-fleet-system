from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_admin, get_current_manager_or_admin
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleStatus, FuelType, VehicleType
from app.models.trip import Trip, TripStatus
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleUpdate,
    VehicleStatusUpdate,
    VehicleResponse,
    VehicleSummaryStats
)

router = APIRouter(prefix="/vehicles", tags=["Vehicle Management"])

def enrich_vehicle_compliance(v: Vehicle) -> dict:
    """Calculate compliance expiry warnings for vehicle."""
    today = date.today()
    warning_threshold = today + timedelta(days=30)
    
    is_ins_expired = bool(v.insurance_expiry and v.insurance_expiry < today)
    is_puc_expired = bool(v.puc_expiry and v.puc_expiry < today)
    
    is_ins_warning = bool(v.insurance_expiry and v.insurance_expiry <= warning_threshold)
    is_puc_warning = bool(v.puc_expiry and v.puc_expiry <= warning_threshold)

    return {
        "id": v.id,
        "license_plate": v.license_plate,
        "vin": v.vin,
        "make": v.make,
        "model": v.model,
        "year": v.year,
        "vehicle_type": v.vehicle_type,
        "fuel_type": v.fuel_type,
        "fuel_capacity": v.fuel_capacity,
        "max_payload_kg": v.max_payload_kg,
        "odometer_km": v.odometer_km,
        "status": v.status,
        "insurance_number": v.insurance_number,
        "insurance_expiry": v.insurance_expiry,
        "puc_number": v.puc_number,
        "puc_expiry": v.puc_expiry,
        "created_at": v.created_at,
        "updated_at": v.updated_at,
        "is_insurance_expired": is_ins_expired,
        "is_puc_expired": is_puc_expired,
        "is_compliance_warning": is_ins_warning or is_puc_warning
    }

@router.get("/stats/summary", response_model=VehicleSummaryStats)
def get_vehicle_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated vehicle counts and compliance alert metrics."""
    today = date.today()
    warning_threshold = today + timedelta(days=30)

    total = db.query(Vehicle).count()
    available = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.AVAILABLE).count()
    on_trip = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.ON_TRIP).count()
    in_maintenance = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.IN_MAINTENANCE).count()
    decommissioned = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.DECOMMISSIONED).count()

    # Vehicles needing attention for Insurance or PUC
    vehicles = db.query(Vehicle).all()
    compliance_alerts = 0
    for v in vehicles:
        if (v.insurance_expiry and v.insurance_expiry <= warning_threshold) or \
           (v.puc_expiry and v.puc_expiry <= warning_threshold):
            compliance_alerts += 1

    return {
        "total_vehicles": total,
        "available_vehicles": available,
        "on_trip_vehicles": on_trip,
        "in_maintenance_vehicles": in_maintenance,
        "decommissioned_vehicles": decommissioned,
        "compliance_alerts": compliance_alerts
    }

@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    search: Optional[str] = Query(None, description="Search license plate, VIN, make or model"),
    status: Optional[VehicleStatus] = Query(None, description="Filter by operational status"),
    fuel_type: Optional[FuelType] = Query(None, description="Filter by fuel type"),
    vehicle_type: Optional[VehicleType] = Query(None, description="Filter by vehicle type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all vehicles with optional search and filters."""
    query = db.query(Vehicle)

    if status:
        query = query.filter(Vehicle.status == status)
    else:
        # Exclude decommissioned vehicles from normal lists by default (Phase 2.4)
        query = query.filter(Vehicle.status != VehicleStatus.DECOMMISSIONED)

    if fuel_type:
        query = query.filter(Vehicle.fuel_type == fuel_type)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Vehicle.license_plate.ilike(search_fmt)) |
            (Vehicle.vin.ilike(search_fmt)) |
            (Vehicle.make.ilike(search_fmt)) |
            (Vehicle.model.ilike(search_fmt))
        )

    vehicles = query.order_by(Vehicle.id.desc()).all()
    return [enrich_vehicle_compliance(v) for v in vehicles]

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Register a new vehicle in the fleet (Admin & Fleet Manager)."""
    # Check duplicate license plate
    existing_plate = db.query(Vehicle).filter(
        Vehicle.license_plate.ilike(vehicle_in.license_plate.strip())
    ).first()
    if existing_plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A vehicle with License Plate '{vehicle_in.license_plate}' already exists."
        )

    # Check duplicate VIN
    existing_vin = db.query(Vehicle).filter(
        Vehicle.vin.ilike(vehicle_in.vin.strip())
    ).first()
    if existing_vin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A vehicle with VIN '{vehicle_in.vin}' already exists."
        )

    vehicle = Vehicle(
        license_plate=vehicle_in.license_plate.strip().upper(),
        vin=vehicle_in.vin.strip().upper(),
        make=vehicle_in.make.strip(),
        model=vehicle_in.model.strip(),
        year=vehicle_in.year,
        vehicle_type=vehicle_in.vehicle_type,
        fuel_type=vehicle_in.fuel_type,
        fuel_capacity=vehicle_in.fuel_capacity,
        max_payload_kg=vehicle_in.max_payload_kg,
        odometer_km=vehicle_in.odometer_km,
        status=vehicle_in.status,
        insurance_number=vehicle_in.insurance_number.strip() if vehicle_in.insurance_number else None,
        insurance_expiry=vehicle_in.insurance_expiry,
        puc_number=vehicle_in.puc_number.strip() if vehicle_in.puc_number else None,
        puc_expiry=vehicle_in.puc_expiry,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return enrich_vehicle_compliance(vehicle)

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single vehicle details."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
    return enrich_vehicle_compliance(vehicle)

@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Update vehicle specifications and compliance records."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    update_data = vehicle_in.model_dump(exclude_unset=True)

    # Check unique constraints if updating license plate or VIN
    if "license_plate" in update_data and update_data["license_plate"]:
        plate_str = update_data["license_plate"].strip().upper()
        conflict = db.query(Vehicle).filter(
            Vehicle.license_plate.ilike(plate_str),
            Vehicle.id != vehicle_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="License Plate already in use by another vehicle.")
        vehicle.license_plate = plate_str

    if "vin" in update_data and update_data["vin"]:
        vin_str = update_data["vin"].strip().upper()
        conflict = db.query(Vehicle).filter(
            Vehicle.vin.ilike(vin_str),
            Vehicle.id != vehicle_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="VIN already in use by another vehicle.")
        vehicle.vin = vin_str

    for field, val in update_data.items():
        if field not in ["license_plate", "vin"]:
            setattr(vehicle, field, val)

    db.commit()
    db.refresh(vehicle)
    return enrich_vehicle_compliance(vehicle)

@router.patch("/{vehicle_id}/status", response_model=VehicleResponse)
def update_vehicle_status(
    vehicle_id: int,
    status_update: VehicleStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Quick update of vehicle operational status."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    # G.2 Cannot manually set ON_TRIP
    if status_update.status == VehicleStatus.ON_TRIP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot manually set vehicle status to ON_TRIP. Status is automatically managed during trip dispatch."
        )

    # G.2 Cannot change status of vehicle with active IN_TRANSIT trip
    active_trip = db.query(Trip).filter(
        Trip.vehicle_id == vehicle_id,
        Trip.status == TripStatus.IN_TRANSIT
    ).first()
    if active_trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of a vehicle currently assigned to an active IN_TRANSIT trip."
        )

    vehicle.status = status_update.status
    db.commit()
    db.refresh(vehicle)
    return enrich_vehicle_compliance(vehicle)

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Soft delete (decommission) a vehicle from the fleet (Admin only)."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    active_trip = db.query(Trip).filter(
        Trip.vehicle_id == vehicle_id,
        Trip.status == TripStatus.IN_TRANSIT
    ).first()
    if active_trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot decommission a vehicle currently assigned to an active IN_TRANSIT trip."
        )

    vehicle.status = VehicleStatus.DECOMMISSIONED
    db.commit()
    return None
