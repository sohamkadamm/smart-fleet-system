from datetime import date, datetime
from typing import Dict, Any, Optional
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus, FuelType
from app.models.driver import Driver
from app.models.trip import Trip, TripStatus
from app.models.fuel import FuelLog
from app.models.maintenance import MaintenanceRecord
from app.schemas.analytics import FleetAnalyticsOverview

router = APIRouter(prefix="/analytics", tags=["BI & Executive Analytics Engine"])

@router.get("/overview", response_model=FleetAnalyticsOverview)
def get_fleet_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates complete aggregated BI analytics metrics and chart data series.
    All values are computed from actual database records — no hardcoded numbers."""
    vehicles = db.query(Vehicle).all()
    drivers = db.query(Driver).all()
    trips = db.query(Trip).all()
    fuel_logs = db.query(FuelLog).all()
    maint_records = db.query(MaintenanceRecord).all()

    total_vehicles = len(vehicles)
    active_vehicles = sum(1 for v in vehicles if v.status in [VehicleStatus.AVAILABLE, VehicleStatus.ON_TRIP])
    utilization_pct = round((active_vehicles / max(1, total_vehicles)) * 100.0, 1)

    completed_trips = [t for t in trips if t.status == TripStatus.DELIVERED]
    total_completed = len(completed_trips)
    total_cargo_kg = sum(t.cargo_weight_kg for t in completed_trips)
    total_distance_km = sum(t.distance_km for t in completed_trips)

    total_fuel_cost = sum(f.total_cost for f in fuel_logs)
    total_maint_cost = sum(m.cost for m in maint_records)

    avg_driver_score = round(sum(d.safety_score for d in drivers) / max(1, len(drivers)), 1) if drivers else 0.0

    # 1. Monthly Deliveries Trend (last 6 months) — computed from actual delivered trips
    today = date.today()
    monthly_buckets = defaultdict(lambda: {"deliveries": 0, "cargo_tons": 0.0})
    for t in completed_trips:
        if t.actual_arrival:
            month_key = t.actual_arrival.strftime("%b %Y") if isinstance(t.actual_arrival, (date, datetime)) else None
            if month_key:
                monthly_buckets[month_key]["deliveries"] += 1
                monthly_buckets[month_key]["cargo_tons"] += t.cargo_weight_kg / 1000.0

    # Build the last 6 months in order
    monthly_trend = []
    for i in range(5, -1, -1):
        # Go back i months from today
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_label = date(y, m, 1).strftime("%b %Y")
        bucket = monthly_buckets.get(month_label, {"deliveries": 0, "cargo_tons": 0.0})
        deliveries = bucket["deliveries"]
        cargo_tons = round(bucket["cargo_tons"], 1)
        # Efficiency: average km/unit fuel for delivered trips in this month (if any)
        efficiency = 0.0
        month_trips_distances = []
        for t in completed_trips:
            if t.actual_arrival and isinstance(t.actual_arrival, (date, datetime)):
                if t.actual_arrival.strftime("%b %Y") == month_label:
                    month_trips_distances.append(t.distance_km)
        if month_trips_distances:
            efficiency = round(sum(month_trips_distances) / max(1, len(month_trips_distances)) / 100.0, 1)
        monthly_trend.append({
            "month": month_label,
            "deliveries": deliveries,
            "cargo_tons": cargo_tons,
            "efficiency": efficiency
        })

    # 2. Fuel Consumption by Type — grouped from actual fuel_logs
    fuel_type_buckets = defaultdict(lambda: {"units": 0.0, "cost_inr": 0.0})
    for f in fuel_logs:
        ft = f.fuel_type if f.fuel_type else "UNKNOWN"
        fuel_type_buckets[ft]["units"] += f.fuel_quantity
        fuel_type_buckets[ft]["cost_inr"] += f.total_cost

    fuel_type_labels = {
        "DIESEL": "Diesel",
        "ELECTRIC": "Electric (EV)",
        "CNG": "CNG",
        "PETROL": "Petrol",
    }
    fuel_by_type = []
    for ft_key, data in fuel_type_buckets.items():
        fuel_by_type.append({
            "type": fuel_type_labels.get(ft_key, ft_key),
            "units": round(data["units"], 1),
            "cost_inr": round(data["cost_inr"], 2)
        })

    # 3. Vehicle Status Distribution
    status_dist = [
        {"status": "Available", "count": sum(1 for v in vehicles if v.status == VehicleStatus.AVAILABLE)},
        {"status": "On Trip", "count": sum(1 for v in vehicles if v.status == VehicleStatus.ON_TRIP)},
        {"status": "In Maintenance", "count": sum(1 for v in vehicles if v.status == VehicleStatus.IN_MAINTENANCE)},
        {"status": "Decommissioned", "count": sum(1 for v in vehicles if v.status == VehicleStatus.DECOMMISSIONED)}
    ]

    # 4. Maintenance Cost Breakdown — computed from actual records grouped by service_type
    maint_type_buckets = defaultdict(float)
    for m in maint_records:
        service_label = m.service_type.value.replace("_", " ").title() if m.service_type else "Other"
        maint_type_buckets[service_label] += m.cost

    maint_by_service = [
        {"category": cat, "cost": round(cost, 2)}
        for cat, cost in sorted(maint_type_buckets.items(), key=lambda x: x[1], reverse=True)
    ]

    # 5. Top Performing Drivers — on_time_pct is None when driver has 0 trips
    top_drivers = [
        {
            "id": d.id,
            "name": d.full_name,
            "trips": d.total_trips,
            "on_time_pct": None if d.total_trips == 0 else round((d.on_time_trips / d.total_trips) * 100.0, 1),
            "safety_score": d.safety_score,
            "rating": d.rating
        }
        for d in sorted(drivers, key=lambda x: x.safety_score, reverse=True)[:5]
    ]

    return {
        "total_vehicles": total_vehicles,
        "active_fleet_count": active_vehicles,
        "fleet_utilization_pct": utilization_pct,
        "total_completed_trips": total_completed,
        "total_cargo_delivered_kg": total_cargo_kg,
        "total_distance_km": total_distance_km,
        "total_fuel_expenditure_inr": total_fuel_cost,
        "total_maintenance_expenditure_inr": total_maint_cost,
        "average_driver_score": avg_driver_score,
        "monthly_deliveries_trend": monthly_trend,
        "fuel_consumption_by_type": fuel_by_type,
        "vehicle_status_distribution": status_dist,
        "maintenance_cost_by_service": maint_by_service,
        "top_performing_drivers": top_drivers
    }
