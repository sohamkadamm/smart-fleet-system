from typing import List, Dict, Any
from pydantic import BaseModel

class FleetAnalyticsOverview(BaseModel):
    total_vehicles: int
    active_fleet_count: int
    fleet_utilization_pct: float
    total_completed_trips: int
    total_cargo_delivered_kg: float
    total_distance_km: float
    total_fuel_expenditure_inr: float
    total_maintenance_expenditure_inr: float
    average_driver_score: float
    
    monthly_deliveries_trend: List[Dict[str, Any]]
    fuel_consumption_by_type: List[Dict[str, Any]]
    vehicle_status_distribution: List[Dict[str, Any]]
    maintenance_cost_by_service: List[Dict[str, Any]]
    top_performing_drivers: List[Dict[str, Any]]
