from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_manager_or_admin
from app.models.user import User
from app.models.maintenance import MaintenanceRecord, MaintenanceStatus, ServiceType
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceResponse,
    MaintenanceSummaryStats,
    MaintenanceStatusUpdate
)

router = APIRouter(prefix="/maintenance", tags=["Maintenance & Workshop Management"])

def enrich_maintenance(m: MaintenanceRecord) -> dict:
    v_plate = m.vehicle.license_plate if m.vehicle else None
    v_model = f"{m.vehicle.make} {m.vehicle.model}" if m.vehicle else None

    return {
        "id": m.id,
        "vehicle_id": m.vehicle_id,
        "service_type": m.service_type,
        "status": m.status,
        "description": m.description,
        "cost": m.cost,
        "service_center": m.service_center,
        "odometer_at_service": m.odometer_at_service,
        "service_date": m.service_date,
        "completed_date": m.completed_date,
        "next_service_due_date": m.next_service_due_date,
        "next_service_due_odometer": m.next_service_due_odometer,
        "parts_replaced": m.parts_replaced,
        "technician_notes": m.technician_notes,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
        "vehicle_plate": v_plate,
        "vehicle_model": v_model,
    }

@router.get("/stats/summary", response_model=MaintenanceSummaryStats)
def get_maintenance_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(MaintenanceRecord).all()
    total_cost = sum(r.cost for r in records)
    in_prog = db.query(MaintenanceRecord).filter(MaintenanceRecord.status == MaintenanceStatus.IN_PROGRESS).count()
    sched = db.query(MaintenanceRecord).filter(MaintenanceRecord.status == MaintenanceStatus.SCHEDULED).count()
    comp = db.query(MaintenanceRecord).filter(MaintenanceRecord.status == MaintenanceStatus.COMPLETED).count()

    today = date.today()
    due_count = 0
    for r in records:
        if r.status == MaintenanceStatus.SCHEDULED:
            due_by_date = bool(r.next_service_due_date and r.next_service_due_date <= today)
            due_by_odo = bool(r.vehicle and r.next_service_due_odometer and r.vehicle.odometer_km >= r.next_service_due_odometer)
            if due_by_date or due_by_odo:
                due_count += 1

    return {
        "total_maintenance_cost_inr": round(total_cost, 2),
        "total_services_count": len(records),
        "in_progress_count": in_prog,
        "scheduled_count": sched,
        "completed_count": comp,
        "vehicles_due_for_service": due_count
    }

@router.get("", response_model=List[MaintenanceResponse])
def list_maintenance_records(
    vehicle_id: Optional[int] = Query(None),
    status: Optional[MaintenanceStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaintenanceRecord)
    if vehicle_id:
        query = query.filter(MaintenanceRecord.vehicle_id == vehicle_id)
    if status:
        query = query.filter(MaintenanceRecord.status == status)
    records = query.order_by(MaintenanceRecord.id.desc()).all()
    return [enrich_maintenance(r) for r in records]

@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_record(
    rec_in: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == rec_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    record = MaintenanceRecord(
        vehicle_id=rec_in.vehicle_id,
        service_type=rec_in.service_type,
        status=rec_in.status,
        description=rec_in.description.strip(),
        cost=rec_in.cost,
        service_center=rec_in.service_center.strip(),
        odometer_at_service=rec_in.odometer_at_service,
        service_date=rec_in.service_date,
        completed_date=rec_in.completed_date,
        next_service_due_date=rec_in.next_service_due_date,
        next_service_due_odometer=rec_in.next_service_due_odometer,
        parts_replaced=rec_in.parts_replaced,
        technician_notes=rec_in.technician_notes
    )

    if record.status == MaintenanceStatus.IN_PROGRESS:
        vehicle.status = VehicleStatus.IN_MAINTENANCE

    db.add(record)
    db.commit()
    db.refresh(record)
    return enrich_maintenance(record)

@router.patch("/{record_id}/status", response_model=MaintenanceResponse)
def update_maintenance_status(
    record_id: int,
    status_update: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Update maintenance record status. Uses Pydantic schema for validation (422 on invalid status)."""
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    new_status = status_update.status
    if new_status:
        record.status = new_status
        vehicle = record.vehicle
        if vehicle:
            if record.status == MaintenanceStatus.IN_PROGRESS:
                vehicle.status = VehicleStatus.IN_MAINTENANCE
            elif record.status == MaintenanceStatus.COMPLETED:
                vehicle.status = VehicleStatus.AVAILABLE
                record.completed_date = date.today()

    db.commit()
    db.refresh(record)
    return enrich_maintenance(record)
