import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class ServiceType(str, enum.Enum):
    OIL_CHANGE = "OIL_CHANGE"
    BRAKE_INSPECTION = "BRAKE_INSPECTION"
    TIRE_ROTATION = "TIRE_ROTATION"
    BATTERY_CHECK = "BATTERY_CHECK"
    ENGINE_OVERHAUL = "ENGINE_OVERHAUL"
    TRANSMISSION = "TRANSMISSION"
    SCHEDULED_GENERAL = "SCHEDULED_GENERAL"
    EMERGENCY_REPAIR = "EMERGENCY_REPAIR"

class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    service_type = Column(Enum(ServiceType), default=ServiceType.SCHEDULED_GENERAL, nullable=False)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.SCHEDULED, nullable=False)
    
    description = Column(String, nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    service_center = Column(String, default="Fleet Master Service Depot", nullable=False)
    
    odometer_at_service = Column(Float, nullable=False)
    service_date = Column(Date, default=date.today, nullable=False)
    completed_date = Column(Date, nullable=True)
    
    next_service_due_date = Column(Date, nullable=True)
    next_service_due_odometer = Column(Float, nullable=True)
    
    parts_replaced = Column(String, nullable=True) # comma separated
    technician_notes = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])

    def __repr__(self):
        return f"<MaintenanceRecord Vehicle {self.vehicle_id} - {self.service_type} (${self.cost})>"
