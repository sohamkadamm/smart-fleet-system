from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field
from app.models.maintenance import ServiceType, MaintenanceStatus

class MaintenanceBase(BaseModel):
    vehicle_id: int
    service_type: ServiceType = ServiceType.SCHEDULED_GENERAL
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    description: str
    cost: float = Field(0.0, ge=0, description="Cost must be non-negative")
    service_center: str = "Fleet Master Service Depot"
    odometer_at_service: float = Field(..., ge=0)
    service_date: date = Field(default_factory=date.today)
    completed_date: Optional[date] = None
    next_service_due_date: Optional[date] = None
    next_service_due_odometer: Optional[float] = Field(None, ge=0)
    parts_replaced: Optional[str] = None
    technician_notes: Optional[str] = None

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    service_type: Optional[ServiceType] = None
    status: Optional[MaintenanceStatus] = None
    description: Optional[str] = None
    cost: Optional[float] = Field(None, ge=0)
    service_center: Optional[str] = None
    odometer_at_service: Optional[float] = Field(None, ge=0)
    service_date: Optional[date] = None
    completed_date: Optional[date] = None
    next_service_due_date: Optional[date] = None
    next_service_due_odometer: Optional[float] = Field(None, ge=0)
    parts_replaced: Optional[str] = None
    technician_notes: Optional[str] = None

class MaintenanceResponse(MaintenanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    vehicle_plate: Optional[str] = None
    vehicle_model: Optional[str] = None

    class Config:
        from_attributes = True

class MaintenanceSummaryStats(BaseModel):
    total_maintenance_cost_inr: float
    total_services_count: int
    in_progress_count: int
    scheduled_count: int
    completed_count: int
    vehicles_due_for_service: int

class MaintenanceStatusUpdate(BaseModel):
    """Schema for updating maintenance record status. Validates that status is a valid MaintenanceStatus enum value."""
    status: MaintenanceStatus
