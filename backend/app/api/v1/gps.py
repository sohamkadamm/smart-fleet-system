import time
import math
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.trip import Trip, TripStatus

router = APIRouter(prefix="/gps", tags=["GPS & Live Fleet Tracking"])

# Major Indian logistics hubs and freight terminals
HUBS = {
    "DELHI_NCR": {"lat": 28.6139, "lng": 77.2090, "name": "Delhi NCR (Gurugram Cargo Hub)"},
    "MUMBAI_JNPT": {"lat": 18.9496, "lng": 72.9510, "name": "Mumbai (JNPT Port Terminal)"},
    "BENGALURU": {"lat": 12.9716, "lng": 77.5946, "name": "Bengaluru (Nelamangala Inland Depot)"},
    "PUNE_CHAKAN": {"lat": 18.7522, "lng": 73.8567, "name": "Pune (Chakan Auto Cluster)"},
    "AHMEDABAD": {"lat": 23.0225, "lng": 72.5714, "name": "Ahmedabad (Sanand Logistics Hub)"},
    "HYDERABAD": {"lat": 17.3850, "lng": 78.4867, "name": "Hyderabad (Shamshabad Cargo Hub)"},
    "CHENNAI": {"lat": 13.0827, "lng": 80.2707, "name": "Chennai (Sriperumbudur Freight Park)"},
    "KOLKATA": {"lat": 22.5726, "lng": 88.3639, "name": "Kolkata (Dankuni Freight Terminal)"}
}

@router.get("/live")
def get_live_fleet_gps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns real-time GPS locations and FASTag/OBD-II telematics for Indian commercial fleet.
    Vehicles marked ON_TRIP simulate dynamic movement along active Indian highway corridors.
    """
    vehicles = db.query(Vehicle).all()
    results = []

    # Dynamic time oscillation for live movement simulation
    t = time.time() * 0.05
    hub_list = list(HUBS.values())

    for idx, v in enumerate(vehicles):
        base_hub = hub_list[idx % len(hub_list)]
        target_hub = hub_list[(idx + 1) % len(hub_list)]

        if v.status == VehicleStatus.ON_TRIP:
            # Linear interpolation with smooth oscillation
            progress = (math.sin(t + idx) + 1.0) / 2.0
            lat = base_hub["lat"] + progress * (target_hub["lat"] - base_hub["lat"])
            lng = base_hub["lng"] + progress * (target_hub["lng"] - base_hub["lng"])
            speed = round(55.0 + math.sin(t * 2) * 10.0, 1)
            heading = 120.0
            location_desc = f"En Route to {target_hub['name']} on National Highway ({round(speed)} km/h)"
        elif v.status == VehicleStatus.IN_MAINTENANCE:
            lat = base_hub["lat"] - 0.015
            lng = base_hub["lng"] - 0.015
            speed = 0.0
            heading = 0.0
            location_desc = f"Parked at {base_hub['name']} Authorized Workshop"
        else:
            lat = base_hub["lat"] + (idx * 0.008)
            lng = base_hub["lng"] + (idx * 0.008)
            speed = 0.0
            heading = 0.0
            location_desc = f"Staged at {base_hub['name']} Dispatch Yard"

        results.append({
            "vehicle_id": v.id,
            "license_plate": v.license_plate,
            "make_model": f"{v.make} {v.model}",
            "vehicle_type": v.vehicle_type,
            "fuel_type": v.fuel_type,
            "status": v.status,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "speed_kmh": speed,
            "heading_degrees": heading,
            "battery_or_fuel_pct": max(20, round(95 - ((v.odometer_km % 100) * 0.35))),
            "location_name": location_desc,
            "ignition_on": v.status == VehicleStatus.ON_TRIP,
            "last_updated": datetime.utcnow().isoformat()
        })

    return results

@router.get("/routes/corridors")
def get_fleet_corridors(current_user: User = Depends(get_current_user)):
    """Returns established logistics waypoints and route polylines across Indian National Highways."""
    return {
        "hubs": HUBS,
        "active_corridors": [
            {
                "name": "NH-48 Western Freight Corridor (Delhi NCR <-> Mumbai)",
                "distance_km": 1420.0,
                "waypoints": [
                    [28.6139, 77.2090], # Delhi
                    [26.9124, 75.7873], # Jaipur
                    [23.0225, 72.5714], # Ahmedabad
                    [21.1702, 72.8311], # Surat
                    [18.9496, 72.9510]  # Mumbai JNPT
                ]
            },
            {
                "name": "NH-48 Deccan Corridor (Mumbai <-> Pune <-> Bengaluru)",
                "distance_km": 980.0,
                "waypoints": [
                    [18.9496, 72.9510], # Mumbai
                    [18.7522, 73.8567], # Pune
                    [16.8524, 74.5815], # Kolhapur
                    [15.8497, 74.4977], # Belagavi
                    [12.9716, 77.5946]  # Bengaluru
                ]
            },
            {
                "name": "NH-44 Tech & Pharma Corridor (Hyderabad <-> Bengaluru)",
                "distance_km": 570.0,
                "waypoints": [
                    [17.3850, 78.4867], # Hyderabad
                    [15.8281, 78.0373], # Kurnool
                    [14.6819, 77.6006], # Anantapur
                    [12.9716, 77.5946]  # Bengaluru
                ]
            }
        ]
    }
