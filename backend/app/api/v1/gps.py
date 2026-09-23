import time
import math
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.trip import Trip, TripStatus
from app.models.gps import GPSLocation
from app.core.hubs import LOGISTICS_HUBS, list_all_hubs, get_hub_by_name
from app.services.routing import RoutingService

router = APIRouter(prefix="/gps", tags=["GPS & Live Fleet Tracking"])

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates compass heading/bearing in degrees (0-360) from point 1 to point 2."""
    dlon = math.radians(lon2 - lon1)
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    x = math.sin(dlon) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - (math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon))
    initial_bearing = math.atan2(x, y)
    compass_bearing = (math.degrees(initial_bearing) + 360) % 360
    return round(compass_bearing, 1)

@router.get("/live")
def get_live_fleet_gps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns real-time GPS locations and telematics for commercial fleet vehicles.
    Vehicles marked ON_TRIP interpolate realistically along real-road OpenStreetMap geometries.
    """
    vehicles = db.query(Vehicle).all()
    hub_list = list(LOGISTICS_HUBS.values())
    results = []

    # Active trips lookup indexed by vehicle_id
    active_trips = db.query(Trip).filter(Trip.status == TripStatus.IN_TRANSIT).all()
    active_trip_map = {t.vehicle_id: t for t in active_trips}

    now = datetime.utcnow()
    cur_time = time.time()

    for idx, v in enumerate(vehicles):
        base_hub = hub_list[idx % len(hub_list)]
        target_hub = hub_list[(idx + 1) % len(hub_list)]

        active_trip = active_trip_map.get(v.id)
        route_coords = []
        progress_pct = 0.0

        if v.status == VehicleStatus.ON_TRIP and active_trip:
            # 1. Parse or retrieve route geometry
            if active_trip.route_geometry:
                try:
                    route_coords = json.loads(active_trip.route_geometry)
                except Exception:
                    route_coords = []

            # If no cached route geometry on trip, fetch or synthesize
            if not route_coords:
                orig_hub = get_hub_by_name(active_trip.origin) or base_hub
                dest_hub = get_hub_by_name(active_trip.destination) or target_hub
                route_res = RoutingService.get_route(
                    orig_hub["latitude"], orig_hub["longitude"],
                    dest_hub["latitude"], dest_hub["longitude"],
                    db=db,
                    origin_name=active_trip.origin,
                    dest_name=active_trip.destination
                )
                route_coords = route_res.get("geometry", [])
                if route_coords:
                    active_trip.route_geometry = json.dumps(route_coords)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

            # 2. Determine vehicle position along route geometry
            if route_coords and len(route_coords) >= 2:
                # Calculate progress based on departure time and duration
                dep_time = active_trip.actual_departure or active_trip.scheduled_departure or now
                dur_hrs = max(active_trip.estimated_duration_hours or 4.0, 0.5)
                elapsed_hrs = (now - dep_time).total_seconds() / 3600.0
                
                # If newly started, use a dynamic simulation offset to demonstrate moving truck on map
                if elapsed_hrs < 0.05:
                    dyn_progress = ((math.sin(cur_time * 0.08 + idx * 1.5) + 1.0) / 2.0) * 0.7 + 0.15
                    progress_ratio = dyn_progress
                else:
                    progress_ratio = min(max(elapsed_hrs / dur_hrs, 0.05), 0.95)

                progress_pct = round(progress_ratio * 100, 1)
                coord_idx = int(progress_ratio * (len(route_coords) - 1))
                lat, lng = route_coords[coord_idx]

                # Bearing to next coordinate
                next_idx = min(coord_idx + 1, len(route_coords) - 1)
                if next_idx != coord_idx:
                    heading = calculate_bearing(lat, lng, route_coords[next_idx][0], route_coords[next_idx][1])
                else:
                    heading = 90.0

                speed = round(52.0 + (math.sin(cur_time * 0.1 + idx) * 8.0), 1)
                location_desc = f"En Route {active_trip.origin} → {active_trip.destination} ({active_trip.trip_code})"
            else:
                # Linear fallback between hubs
                progress = (math.sin(cur_time * 0.05 + idx) + 1.0) / 2.0
                progress_pct = round(progress * 100, 1)
                lat = base_hub["latitude"] + progress * (target_hub["latitude"] - base_hub["latitude"])
                lng = base_hub["longitude"] + progress * (target_hub["longitude"] - base_hub["longitude"])
                heading = calculate_bearing(base_hub["latitude"], base_hub["longitude"], target_hub["latitude"], target_hub["longitude"])
                speed = 55.0
                location_desc = f"En Route to {target_hub['name']}"

            ignition = True

        elif v.status == VehicleStatus.IN_MAINTENANCE:
            lat = base_hub["latitude"] - 0.008
            lng = base_hub["longitude"] - 0.008
            speed = 0.0
            heading = 0.0
            ignition = False
            location_desc = f"Authorized Service Workshop at {base_hub['name']}"
            progress_pct = 0.0

        else: # AVAILABLE / IDLE
            lat = base_hub["latitude"] + (idx * 0.002)
            lng = base_hub["longitude"] + (idx * 0.002)
            speed = 0.0
            heading = 0.0
            ignition = False
            location_desc = f"Staged at Depot ({base_hub['name']})"
            progress_pct = 0.0

        battery_fuel = max(20, round(96 - ((v.odometer_km % 120) * 0.35)))

        # Telemetry record logging (sampled if > 15s since last record)
        try:
            latest_rec = db.query(GPSLocation).filter(GPSLocation.vehicle_id == v.id).order_by(GPSLocation.timestamp.desc()).first()
            if not latest_rec or (now - latest_rec.timestamp).total_seconds() > 20:
                new_point = GPSLocation(
                    vehicle_id=v.id,
                    latitude=round(lat, 6),
                    longitude=round(lng, 6),
                    speed_kmh=speed,
                    heading_degrees=heading,
                    ignition_on=ignition,
                    fuel_level_pct=float(battery_fuel),
                    location_name=location_desc,
                    timestamp=now
                )
                db.add(new_point)
                db.commit()
        except Exception:
            db.rollback()

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
            "battery_or_fuel_pct": battery_fuel,
            "location_name": location_desc,
            "ignition_on": ignition,
            "active_trip_id": active_trip.id if active_trip else None,
            "active_trip_code": active_trip.trip_code if active_trip else None,
            "origin": active_trip.origin if active_trip else base_hub["name"],
            "destination": active_trip.destination if active_trip else None,
            "progress_pct": progress_pct,
            "route_geometry": route_coords if route_coords else None,
            "last_updated": now.isoformat()
        })

    return results

@router.get("/history/{vehicle_id}")
def get_vehicle_gps_history(
    vehicle_id: int = Path(..., description="Vehicle ID to query breadcrumb history"),
    limit: int = Query(50, ge=5, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns chronological GPS breadcrumb history for tracking trail rendering.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    records = (
        db.query(GPSLocation)
        .filter(GPSLocation.vehicle_id == vehicle_id)
        .order_by(GPSLocation.timestamp.asc())
        .limit(limit)
        .all()
    )

    trail = [
        {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "speed_kmh": r.speed_kmh,
            "heading_degrees": r.heading_degrees,
            "timestamp": r.timestamp.isoformat(),
            "location_name": r.location_name
        }
        for r in records
    ]

    return {
        "vehicle_id": vehicle.id,
        "license_plate": vehicle.license_plate,
        "make_model": f"{vehicle.make} {vehicle.model}",
        "total_points": len(trail),
        "history": trail
    }

@router.get("/routes/corridors")
def get_fleet_corridors(current_user: User = Depends(get_current_user)):
    """Returns established logistics freight hubs and major highway corridors across India."""
    return {
        "hubs": LOGISTICS_HUBS,
        "active_corridors": [
            {
                "name": "NH-48 Western Freight Corridor (Delhi NCR <-> Mumbai)",
                "distance_km": 1420.0,
                "waypoints": [
                    [28.5355, 77.2732], # Delhi
                    [26.9124, 75.7873], # Jaipur
                    [22.9868, 72.3804], # Ahmedabad Sanand
                    [21.1702, 72.8311], # Surat
                    [18.9496, 72.9525]  # Mumbai JNPT
                ]
            },
            {
                "name": "NH-48 Deccan Corridor (Mumbai <-> Pune <-> Bengaluru)",
                "distance_km": 980.0,
                "waypoints": [
                    [18.9496, 72.9525], # Mumbai JNPT
                    [18.7606, 73.8636], # Pune Chakan
                    [16.8524, 74.5815], # Kolhapur
                    [15.8497, 74.4977], # Belagavi
                    [13.0285, 77.5195]  # Bengaluru Peenya
                ]
            },
            {
                "name": "NH-44 Tech & Pharma Corridor (Hyderabad <-> Bengaluru)",
                "distance_km": 570.0,
                "waypoints": [
                    [17.2403, 78.4294], # Hyderabad Shamshabad
                    [15.8281, 78.0373], # Kurnool
                    [14.6819, 77.6006], # Anantapur
                    [13.0285, 77.5195]  # Bengaluru Peenya
                ]
            }
        ]
    }
