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
    # Phase 5 ML Inference enhancements
    ml_failure_probability: Optional[float] = None
    ml_risk_level: Optional[str] = None
    rule_based_baseline_probability: Optional[float] = None
    model_confidence: Optional[float] = None
    top_contributing_factors: Optional[List[str]] = None
    model_info: Optional[Dict[str, Any]] = None

class AIInsightsSummary(BaseModel):
    fleet_health_index: float
    high_risk_vehicles_count: int
    estimated_monthly_fuel_savings_inr: float
    avg_driver_safety_rating: float
    ai_recommendations: List[str]

class ModelMetricsResponse(BaseModel):
    model_name: str
    dataset_name: str
    benchmark_id: str
    test_samples: int
    class_balance_test: Dict[str, int]
    metrics: Dict[str, Any]
    confusion_matrix: Dict[str, int]
    baseline_comparisons: Dict[str, Any]
    feature_importances: List[Dict[str, Any]]

# Phase 4: OR-Tools CVRP & Cargo Packing Schemas

class VRPStopInput(BaseModel):
    stop_id: Optional[str] = None
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cargo_weight_kg: float = 500.0

class VRPOptimizationRequest(BaseModel):
    depot_name: str = "Mumbai (JNPT)"
    depot_lat: Optional[float] = None
    depot_lng: Optional[float] = None
    stops: List[VRPStopInput]
    vehicle_ids: Optional[List[int]] = None

class VehicleRouteStop(BaseModel):
    stop_index: int
    location_name: str
    latitude: float
    longitude: float
    cargo_demand_kg: float
    cumulative_load_kg: float
    is_depot: bool

class VehicleRouteResult(BaseModel):
    vehicle_id: int
    license_plate: str
    make_model: str
    max_payload_kg: float
    payload_utilized_kg: float
    payload_utilization_pct: float
    total_distance_km: float
    total_duration_hours: float
    stops_count: int
    stops: List[VehicleRouteStop]
    route_geometry: Optional[List[List[float]]] = None

class VRPAcademicComparison(BaseModel):
    solver_algorithm: str
    baseline_algorithm: str
    or_tools_total_distance_km: float
    baseline_total_distance_km: float
    distance_saved_km: float
    distance_saved_pct: float
    diesel_saved_liters: float
    operating_cost_saved_inr: float
    carbon_emissions_prevented_kg: float
    viva_talking_point: str

class VRPOptimizationResponse(BaseModel):
    status: str
    total_fleet_distance_km: float
    total_stops_serviced: int
    active_vehicles_utilized: int
    vehicle_routes: List[VehicleRouteResult]
    academic_comparison: Optional[VRPAcademicComparison] = None

class CargoBoxInput(BaseModel):
    item_id: Optional[str] = None
    label: str
    length_cm: float = 50.0
    width_cm: float = 40.0
    height_cm: float = 40.0
    weight_kg: float = 25.0
    fragile: bool = False

class ContainerProfile(BaseModel):
    name: str
    length_cm: float
    width_cm: float
    height_cm: float
    total_volume_m3: float
    max_payload_kg: float

class CargoPackingRequest(BaseModel):
    vehicle_id: Optional[int] = None
    container: Optional[Dict[str, Any]] = None
    boxes: List[CargoBoxInput]

class CargoPackingResponse(BaseModel):
    status: str
    container_profile: ContainerProfile
    summary: Dict[str, Any]
    packed_items: List[Dict[str, Any]]
    unpacked_items: List[Dict[str, Any]]


