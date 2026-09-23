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

