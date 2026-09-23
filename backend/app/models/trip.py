import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class TripStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_code = Column(String, unique=True, index=True, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    cargo_type = Column(String, nullable=False)
    cargo_weight_kg = Column(Float, default=1000.0, nullable=False)
    distance_km = Column(Float, default=150.0, nullable=False)
    estimated_duration_hours = Column(Float, default=3.0, nullable=False)
    
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    
    status = Column(Enum(TripStatus), default=TripStatus.SCHEDULED, nullable=False)
    
    scheduled_departure = Column(DateTime, default=datetime.utcnow, nullable=False)
    actual_departure = Column(DateTime, nullable=True)
    estimated_arrival = Column(DateTime, nullable=False)
    actual_arrival = Column(DateTime, nullable=True)
    
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    driver = relationship("Driver", foreign_keys=[driver_id])

    def __repr__(self):
        return f"<Trip {self.trip_code} {self.origin} -> {self.destination} ({self.status})>"
