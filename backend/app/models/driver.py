import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base

class DriverStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"
    SUSPENDED = "SUSPENDED"

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    license_number = Column(String, unique=True, index=True, nullable=False)
    license_type = Column(String, default="Commercial Heavy Vehicle (CDL)", nullable=False)
    license_expiry = Column(Date, nullable=False)
    experience_years = Column(Integer, default=3, nullable=False)
    emergency_contact = Column(String, nullable=True)
    
    status = Column(Enum(DriverStatus), default=DriverStatus.AVAILABLE, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    
    # Performance metric aggregators
    total_trips = Column(Integer, default=0, nullable=False)
    on_time_trips = Column(Integer, default=0, nullable=False)
    safety_score = Column(Float, default=95.0, nullable=False)        # 0 - 100
    fuel_efficiency_score = Column(Float, default=90.0, nullable=False) # 0 - 100
    rating = Column(Float, default=4.8, nullable=False)              # 1 - 5 stars

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    assigned_vehicle = relationship("Vehicle", foreign_keys=[assigned_vehicle_id])

    def __repr__(self):
        return f"<Driver {self.full_name} ({self.license_number}) - Status: {self.status}>"
