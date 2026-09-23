from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class GPSLocation(Base):
    __tablename__ = "gps_locations"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0, nullable=False)
    heading_degrees = Column(Float, default=0.0, nullable=False)
    
    ignition_on = Column(Boolean, default=True, nullable=False)
    fuel_level_pct = Column(Float, default=85.0, nullable=False)
    location_name = Column(String, default="Highway 90 Corridor", nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])

    def __repr__(self):
        return f"<GPS Vehicle {self.vehicle_id}: ({self.latitude}, {self.longitude}) @ {self.speed_kmh} km/h>"
