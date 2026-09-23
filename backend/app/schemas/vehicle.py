from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel
from app.models.vehicle import VehicleType, FuelType, VehicleStatus

class VehicleBase(BaseModel):
    license_plate: str
    vin: str
    make: str
    model: str
    year: int
    vehicle_type: VehicleType = VehicleType.TRUCK
    fuel_type: FuelType = FuelType.DIESEL
    fuel_capacity: float = 100.0
    max_payload_kg: float = 5000.0
    odometer_km: float = 0.0
    status: VehicleStatus = VehicleStatus.AVAILABLE
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[date] = None
    puc_number: Optional[str] = None
    puc_expiry: Optional[date] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    fuel_type: Optional[FuelType] = None
    fuel_capacity: Optional[float] = None
    max_payload_kg: Optional[float] = None
    odometer_km: Optional[float] = None
    status: Optional[VehicleStatus] = None
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[date] = None
    puc_number: Optional[str] = None
    puc_expiry: Optional[date] = None

class VehicleStatusUpdate(BaseModel):
    status: VehicleStatus

class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_insurance_expired: Optional[bool] = False
    is_puc_expired: Optional[bool] = False
    is_compliance_warning: Optional[bool] = False

    class Config:
        from_attributes = True

class VehicleSummaryStats(BaseModel):
    total_vehicles: int
    available_vehicles: int
    on_trip_vehicles: int
    in_maintenance_vehicles: int
    decommissioned_vehicles: int
    compliance_alerts: int
