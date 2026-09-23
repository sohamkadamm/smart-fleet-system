from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from app.models.trip import TripStatus

class TripBase(BaseModel):
    trip_code: str
    origin: str
    destination: str
    cargo_type: str
    cargo_weight_kg: float = Field(1000.0, gt=0, description="Cargo weight must be greater than 0")
    distance_km: float = Field(150.0, gt=0, description="Distance must be greater than 0")
    estimated_duration_hours: float = Field(3.0, gt=0, description="Duration must be greater than 0")
    vehicle_id: int
    driver_id: int
    status: TripStatus = TripStatus.SCHEDULED
    scheduled_departure: datetime
    estimated_arrival: datetime
    notes: Optional[str] = None
    # 3B OpenStreetMap Coordinates and Route
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    route_geometry: Optional[str] = None

    @model_validator(mode="after")
    def validate_arrival_after_departure(self):
        if self.estimated_arrival and self.scheduled_departure and self.estimated_arrival <= self.scheduled_departure:
            raise ValueError("estimated_arrival must be after scheduled_departure.")
        return self

class TripCreate(TripBase):
    distance_km: Optional[float] = Field(None, gt=0)
    estimated_duration_hours: Optional[float] = Field(None, gt=0)

class HubResponse(BaseModel):
    id: str
    name: str
    full_name: str
    city: str
    state: str
    latitude: float
    longitude: float
    type: str

class TripUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    cargo_type: Optional[str] = None
    cargo_weight_kg: Optional[float] = Field(None, gt=0)
    distance_km: Optional[float] = Field(None, gt=0)
    estimated_duration_hours: Optional[float] = Field(None, gt=0)
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    status: Optional[TripStatus] = None
    scheduled_departure: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    notes: Optional[str] = None

class TripStatusUpdate(BaseModel):
    status: TripStatus

class TripResponse(TripBase):
    id: int
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    vehicle_plate: Optional[str] = None
    vehicle_model: Optional[str] = None
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True

class TripSummaryStats(BaseModel):
    total_trips: int
    scheduled_trips: int
    in_transit_trips: int
    delivered_trips: int
    total_distance_covered_km: float
    total_cargo_delivered_kg: float
