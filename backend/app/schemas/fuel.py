from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class FuelLogBase(BaseModel):
    vehicle_id: int
    driver_id: Optional[int] = None
    fuel_quantity: float = Field(..., gt=0, description="Fuel quantity must be greater than 0")
    unit_cost: float = Field(1.5, gt=0, description="Unit cost must be greater than 0")
    odometer_km: float = Field(..., ge=0, description="Odometer reading must be non-negative")
    station_name: str = "Central Fleet Depot"
    invoice_number: Optional[str] = None
    fuel_type: str = "DIESEL"
    refill_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FuelLogCreate(FuelLogBase):
    pass

class FuelLogResponse(FuelLogBase):
    id: int
    total_cost: float
    efficiency_km_per_unit: Optional[float] = None
    created_at: datetime
    vehicle_plate: Optional[str] = None
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True

class FuelSummaryStats(BaseModel):
    total_fuel_spent_inr: float
    total_fuel_units_consumed: float
    average_fuel_cost_per_liter: float
    average_fleet_efficiency_km_per_unit: float
    total_logs_count: int
