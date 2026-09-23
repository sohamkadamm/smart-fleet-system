from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class MaintenancePredictionRequest(BaseModel):
    vehicle_id: int

class FuelForecastRequest(BaseModel):
    distance_km: float
    cargo_weight_kg: float
    vehicle_type: str = "TRUCK"
    fuel_type: str = "DIESEL"
    avg_speed_kmh: float = 65.0

class RouteOptimizationRequest(BaseModel):
    origin: str
    destination: str
    distance_km: float
    cargo_weight_kg: float
    fuel_type: str = "DIESEL"

class MaintenancePredictionResponse(BaseModel):
    vehicle_id: int
    license_plate: str
    make_model: str
    health_score: float
    failure_probability_pct: float
    risk_level: str
    predicted_days_to_service: int
    critical_component: str
    recommendation: str
    factors: Dict[str, float]

class AIInsightsSummary(BaseModel):
    fleet_health_index: float
    high_risk_vehicles_count: int
    estimated_monthly_fuel_savings_inr: float
    avg_driver_safety_rating: float
    ai_recommendations: List[str]
