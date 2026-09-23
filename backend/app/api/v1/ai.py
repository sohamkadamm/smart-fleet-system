from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.ai_engine import ai_engine
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.maintenance import MaintenanceRecord, ServiceType
from app.models.fuel import FuelLog
from app.schemas.ai import (
    MaintenancePredictionRequest,
    MaintenancePredictionResponse,
    FuelForecastRequest,
    RouteOptimizationRequest,
    AIInsightsSummary,
    ModelMetricsResponse,
    VRPOptimizationRequest,
    VRPOptimizationResponse,
    CargoPackingRequest,
    CargoPackingResponse
)

router = APIRouter(prefix="/ai", tags=["AI & Predictive Analytics Engine"])

@router.get("/model-metrics", response_model=ModelMetricsResponse)
def get_predictive_model_metrics(
    current_user: User = Depends(get_current_user)
):
    """Returns verified academic test set evaluation metrics for the ML model (ROC-AUC, Precision, Recall, Confusion Matrix)."""
    return ai_engine.get_model_metrics()

@router.post("/predict-maintenance", response_model=MaintenancePredictionResponse)
def predict_vehicle_maintenance(
    req: MaintenancePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Predict failure risk and remaining days to maintenance using Scikit-Learn Random Forest model with rule-based baseline comparison."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    # Calculate days since last service from the vehicle's actual maintenance records
    last_service = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.vehicle_id == vehicle.id
    ).order_by(MaintenanceRecord.service_date.desc()).first()

    today = date.today()
    if last_service and last_service.service_date:
        days_gap = max(1, (today - last_service.service_date).days)
    else:
        days_gap = 120  # Baseline default when no maintenance record exists

    # Query vehicle historical emergency repairs and total repair costs
    past_repairs_count = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.vehicle_id == vehicle.id,
        MaintenanceRecord.service_type == ServiceType.EMERGENCY_REPAIR
    ).count()

    total_repair_cost = db.query(func.sum(MaintenanceRecord.cost)).filter(
        MaintenanceRecord.vehicle_id == vehicle.id
    ).scalar() or 0.0

    prediction = ai_engine.predict_maintenance_risk(
        odometer_km=vehicle.odometer_km,
        year=vehicle.year,
        days_since_last_service=days_gap,
        vehicle_type=vehicle.vehicle_type.value,
        fuel_type=vehicle.fuel_type.value,
        past_emergency_repairs=past_repairs_count,
        cumulative_cost_inr=float(total_repair_cost)
    )

    return {
        "vehicle_id": vehicle.id,
        "license_plate": vehicle.license_plate,
        "make_model": f"{vehicle.make} {vehicle.model}",
        "health_score": prediction["health_score"],
        "failure_probability_pct": prediction["failure_probability_pct"],
        "risk_level": prediction["risk_level"],
        "predicted_days_to_service": prediction["predicted_days_to_service"],
        "critical_component": prediction["critical_component"],
        "recommendation": prediction["recommendation"],
        "factors": prediction["factors"],
        "ml_failure_probability": prediction.get("ml_failure_probability"),
        "ml_risk_level": prediction.get("ml_risk_level"),
        "rule_based_baseline_probability": prediction.get("rule_based_baseline_probability"),
        "model_confidence": prediction.get("model_confidence"),
        "top_contributing_factors": prediction.get("top_contributing_factors"),
        "model_info": prediction.get("model_info")
    }

@router.get("/fleet-health-overview", response_model=AIInsightsSummary)
def get_fleet_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns AI executive health index and optimization suggestions for the fleet.
    All values are computed from actual database records."""
    vehicles = db.query(Vehicle).all()
    if not vehicles:
        return {
            "fleet_health_index": 0.0,
            "high_risk_vehicles_count": 0,
            "estimated_monthly_fuel_savings_inr": 0.0,
            "avg_driver_safety_rating": 0.0,
            "ai_recommendations": ["No vehicles registered yet. Add vehicles to see AI insights."]
        }

    today = date.today()
    total_health = 0.0
    high_risk_count = 0

    for v in vehicles:
        # Use each vehicle's REAL last maintenance record (not a hardcoded 90)
        last_service = db.query(MaintenanceRecord).filter(
            MaintenanceRecord.vehicle_id == v.id
        ).order_by(MaintenanceRecord.service_date.desc()).first()

        if last_service and last_service.service_date:
            days_gap = max(1, (today - last_service.service_date).days)
        else:
            days_gap = 120

        pred = ai_engine.predict_maintenance_risk(
            v.odometer_km,
            v.year,
            days_since_last_service=days_gap,
            vehicle_type=v.vehicle_type.value,
            fuel_type=v.fuel_type.value
        )
        total_health += pred["health_score"]
        if pred["risk_level"] == "CRITICAL":
            high_risk_count += 1

    fleet_health_avg = round(total_health / len(vehicles), 1)

    # Compute avg_driver_safety_rating from actual driver records
    drivers = db.query(Driver).all()
    if drivers:
        avg_safety = round(sum(d.safety_score for d in drivers) / len(drivers), 1)
    else:
        avg_safety = 0.0

    # Compute estimated fuel savings from actual fuel spend (10% of avg monthly spend)
    fuel_logs = db.query(FuelLog).all()
    if fuel_logs:
        total_fuel_cost = sum(f.total_cost for f in fuel_logs)
        # Estimate monthly spend: total / number of months spanned
        dates = [f.refill_date for f in fuel_logs if f.refill_date]
        if len(dates) >= 2:
            min_date = min(dates)
            max_date = max(dates)
            # Handle both datetime and date objects
            if hasattr(min_date, 'date'):
                min_date = min_date.date()
            if hasattr(max_date, 'date'):
                max_date = max_date.date()
            span_days = max(1, (max_date - min_date).days)
            months_span = max(1, span_days / 30.0)
            monthly_spend = total_fuel_cost / months_span
            estimated_savings = round(monthly_spend * 0.10, 2)  # 10% optimization potential
        else:
            estimated_savings = 0.0
    else:
        estimated_savings = 0.0

    # Generate dynamic recommendations from actual fleet data
    recommendations = []
    if high_risk_count > 0:
        recommendations.append(
            f"⚠️ {high_risk_count} vehicle(s) have CRITICAL maintenance risk. Schedule immediate workshop inspection."
        )

    # Check for overdue maintenance
    overdue_count = 0
    for v in vehicles:
        last_maint = db.query(MaintenanceRecord).filter(
            MaintenanceRecord.vehicle_id == v.id
        ).order_by(MaintenanceRecord.service_date.desc()).first()
        if last_maint and last_maint.next_service_due_date and last_maint.next_service_due_date <= today:
            overdue_count += 1
    if overdue_count > 0:
        recommendations.append(
            f"🔧 {overdue_count} vehicle(s) have overdue service dates. Review maintenance schedule."
        )

    if estimated_savings > 0:
        recommendations.append(
            f"⚡ Route optimization could save approximately ₹{estimated_savings:,.0f}/month on fuel costs."
        )

    if not recommendations:
        recommendations.append("✅ Fleet is in good health. Continue regular preventive maintenance schedules.")

    return {
        "fleet_health_index": fleet_health_avg,
        "high_risk_vehicles_count": high_risk_count,
        "estimated_monthly_fuel_savings_inr": estimated_savings,
        "avg_driver_safety_rating": avg_safety,
        "ai_recommendations": recommendations
    }

@router.post("/forecast-fuel")
def forecast_fuel(
    req: FuelForecastRequest,
    current_user: User = Depends(get_current_user)
):
    """Forecast fuel/energy requirements, carbon footprint, and cost for a trip."""
    return ai_engine.forecast_trip_fuel_consumption(
        distance_km=req.distance_km,
        cargo_weight_kg=req.cargo_weight_kg,
        vehicle_type=req.vehicle_type,
        fuel_type=req.fuel_type,
        avg_speed_kmh=req.avg_speed_kmh
    )

@router.post("/optimize-route")
def optimize_route(
    req: RouteOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate multi-criteria AI route comparison with efficiency scoring."""
    return ai_engine.recommend_optimized_routes(
        origin=req.origin,
        destination=req.destination,
        distance_km=req.distance_km,
        cargo_weight_kg=req.cargo_weight_kg,
        fuel_type=req.fuel_type,
        db=db
    )

@router.post("/optimize-vrp", response_model=VRPOptimizationResponse)
def optimize_capacitated_vehicle_routing(
    req: VRPOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Phase 4: Multi-stop Capacitated Vehicle Routing Problem (CVRP) optimization using Google OR-Tools.
    Evaluates optimal vehicle routes, capacities, and compares against a Naive Greedy Dispatch Baseline.
    """
    from app.services.vrp_solver import VRPSolver
    from app.core.hubs import get_hub_by_name

    # 1. Resolve Depot Location
    depot_name = req.depot_name or "Mumbai (JNPT)"
    dep_hub = get_hub_by_name(depot_name)
    depot_lat = req.depot_lat or (dep_hub["latitude"] if dep_hub else 18.9496)
    depot_lng = req.depot_lng or (dep_hub["longitude"] if dep_hub else 72.9525)

    depot = {
        "name": depot_name,
        "latitude": depot_lat,
        "longitude": depot_lng
    }

    # 2. Resolve Customer Stops
    resolved_stops = []
    for idx, s in enumerate(req.stops):
        s_hub = get_hub_by_name(s.name)
        s_lat = s.latitude or (s_hub["latitude"] if s_hub else depot_lat + 0.5)
        s_lng = s.longitude or (s_hub["longitude"] if s_hub else depot_lng + 0.5)
        resolved_stops.append({
            "stop_id": s.stop_id or f"STOP_{idx+1:02d}",
            "name": s.name,
            "latitude": s_lat,
            "longitude": s_lng,
            "cargo_weight_kg": s.cargo_weight_kg
        })

    # 3. Resolve Vehicles
    if req.vehicle_ids:
        vehicles_db = db.query(Vehicle).filter(Vehicle.id.in_(req.vehicle_ids)).all()
    else:
        vehicles_db = db.query(Vehicle).filter(
            getattr(Vehicle, "is_deleted", False) == False
        ).limit(4).all()

    if not vehicles_db:
        # Fallback dummy vehicles if fleet is empty
        vehicles_data = [
            {"id": 1, "license_plate": "MH-12-TRK-01", "make_model": "Tata Prima 4028", "max_payload_kg": 8000.0},
            {"id": 2, "license_plate": "MH-12-TRK-02", "make_model": "Ashok Leyland 3520", "max_payload_kg": 8000.0}
        ]
    else:
        vehicles_data = [
            {
                "id": v.id,
                "license_plate": v.license_plate,
                "make_model": f"{v.make} {v.model}",
                "max_payload_kg": float(v.max_payload_kg)
            }
            for v in vehicles_db
        ]

    result = VRPSolver.solve_cvrp(
        depot=depot,
        stops=resolved_stops,
        vehicles=vehicles_data,
        db=db
    )

    return result

@router.post("/cargo-packing", response_model=CargoPackingResponse)
def pack_cargo_3d(
    req: CargoPackingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Phase 4: 3D Cargo / Bin Packing Heuristic Engine (First-Fit Decreasing).
    Calculates volumetric efficiency, payload capacity utilization, and 3D spatial layout.
    """
    from app.services.cargo_packer import CargoPacker

    container_dims = req.container

    if req.vehicle_id and not container_dims:
        vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
        if vehicle:
            # Calibrate container size by vehicle type
            v_type = vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else str(vehicle.vehicle_type)
            if v_type in ["TRUCK", "CONTAINER", "TRAILER"]:
                container_dims = {
                    "name": f"{vehicle.make} {vehicle.model} (Heavy Container)",
                    "length_cm": 600.0,
                    "width_cm": 240.0,
                    "height_cm": 240.0,
                    "max_payload_kg": float(vehicle.max_payload_kg)
                }
            else:
                container_dims = {
                    "name": f"{vehicle.make} {vehicle.model} (Medium Bay)",
                    "length_cm": 420.0,
                    "width_cm": 200.0,
                    "height_cm": 200.0,
                    "max_payload_kg": float(vehicle.max_payload_kg)
                }

    boxes_data = [b.model_dump() for b in req.boxes]
    return CargoPacker.pack_cargo(boxes_data, container_dims=container_dims)

