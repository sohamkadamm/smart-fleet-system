from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.models.base import Base

class RouteCache(Base):
    __tablename__ = "route_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, index=True, nullable=False)
    origin_name = Column(String, nullable=True)
    dest_name = Column(String, nullable=True)
    distance_km = Column(Float, nullable=False)
    duration_hours = Column(Float, nullable=False)
    geometry_json = Column(String, nullable=False) # JSON serialized list of [lat, lng] pairs
    is_estimated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<RouteCache {self.cache_key}: {self.distance_km}km ({self.duration_hours}h)>"
