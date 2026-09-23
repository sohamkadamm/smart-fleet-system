from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    
    fuel_quantity = Column(Float, nullable=False)  # Liters or kWh
    unit_cost = Column(Float, default=1.5, nullable=False) # $ per L/kWh
    total_cost = Column(Float, nullable=False)     # fuel_quantity * unit_cost
    odometer_km = Column(Float, nullable=False)    # Odometer reading at refill
    
    station_name = Column(String, default="Shell Central Fleet Depot", nullable=False)
    invoice_number = Column(String, nullable=True)
    fuel_type = Column(String, default="DIESEL", nullable=False)
    
    # Calculated efficiency (km per unit from previous log)
    efficiency_km_per_unit = Column(Float, nullable=True)
    
    refill_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    driver = relationship("Driver", foreign_keys=[driver_id])

    def __repr__(self):
        return f"<FuelLog Vehicle {self.vehicle_id}: {self.fuel_quantity} units at ${self.total_cost}>"
