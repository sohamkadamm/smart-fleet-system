import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum, Boolean
from app.models.base import Base

class VehicleType(str, enum.Enum):
    TRUCK = "TRUCK"
    VAN = "VAN"
    TRAILER = "TRAILER"
    PICKUP = "PICKUP"
    CONTAINER = "CONTAINER"

class FuelType(str, enum.Enum):
    DIESEL = "DIESEL"
    PETROL = "PETROL"
    ELECTRIC = "ELECTRIC"
    CNG = "CNG"
    HYBRID = "HYBRID"

class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    DECOMMISSIONED = "DECOMMISSIONED"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String, unique=True, index=True, nullable=False)
    vin = Column(String, unique=True, index=True, nullable=False)
    make = Column(String, nullable=False)        # e.g. "Volvo", "Ford", "Mercedes"
    model = Column(String, nullable=False)       # e.g. "FH16", "Transit", "Sprinter"
    year = Column(Integer, nullable=False)        # e.g. 2023
    
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.TRUCK, nullable=False)
    fuel_type = Column(Enum(FuelType), default=FuelType.DIESEL, nullable=False)
    fuel_capacity = Column(Float, default=100.0, nullable=False)  # Liters or kWh
    max_payload_kg = Column(Float, default=5000.0, nullable=False) # kg
    odometer_km = Column(Float, default=0.0, nullable=False)      # km
    
    status = Column(Enum(VehicleStatus), default=VehicleStatus.AVAILABLE, nullable=False)
    
    # Compliance & Regulatory Records
    insurance_number = Column(String, nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    puc_number = Column(String, nullable=True)
    puc_expiry = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Vehicle {self.license_plate} - {self.make} {self.model} ({self.status})>"
