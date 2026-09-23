from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator
from app.models.driver import DriverStatus

class DriverBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    license_number: str
    license_type: str = "Commercial Heavy Vehicle (CDL)"
    license_expiry: date
    experience_years: int = 3
    emergency_contact: Optional[str] = None
    status: DriverStatus = DriverStatus.AVAILABLE
    assigned_vehicle_id: Optional[int] = None

class DriverCreate(DriverBase):
    user_id: Optional[int] = None

    @field_validator("license_expiry")
    @classmethod
    def validate_future_expiry(cls, v: date) -> date:
        if v <= date.today():
            raise ValueError("Driver license expiry must be in the future.")
        return v

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None
    license_expiry: Optional[date] = None
    experience_years: Optional[int] = None
    emergency_contact: Optional[str] = None
    status: Optional[DriverStatus] = None
    is_active: Optional[bool] = None
    assigned_vehicle_id: Optional[int] = None

class DriverResponse(DriverBase):
    id: int
    user_id: Optional[int] = None
    is_active: bool = True
    total_trips: int
    on_time_trips: int
    safety_score: float
    fuel_efficiency_score: float
    rating: float
    created_at: datetime
    updated_at: datetime
    assigned_vehicle_plate: Optional[str] = None
    assigned_vehicle_model: Optional[str] = None
    is_license_expired: Optional[bool] = False
    is_license_expiring_soon: Optional[bool] = False
    performance_score: Optional[float] = None
    performance_grade: Optional[str] = None

    class Config:
        from_attributes = True

class DriverSummaryStats(BaseModel):
    total_drivers: int
    available_drivers: int
    on_duty_drivers: int
    off_duty_drivers: int
    avg_safety_score: float
    avg_fuel_efficiency: float
