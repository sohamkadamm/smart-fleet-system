import json
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_manager_or_admin
from app.models.user import User, UserRole
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.driver import Driver, DriverStatus
from app.core.hubs import get_hub_by_name, list_all_hubs
from app.services.routing import RoutingService
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripStatusUpdate,
    TripResponse,
    TripSummaryStats,
    HubResponse
)

router = APIRouter(prefix="/trips", tags=["Trip & Delivery Management"])

def enrich_trip(t: Trip) -> dict:
    v_plate = t.vehicle.license_plate if t.vehicle else None
    v_model = f"{t.vehicle.make} {t.vehicle.model}" if t.vehicle else None
    d_name = t.driver.full_name if t.driver else None

    return {
        "id": t.id,
        "trip_code": t.trip_code,
        "origin": t.origin,
        "destination": t.destination,
        "cargo_type": t.cargo_type,
        "cargo_weight_kg": t.cargo_weight_kg,
        "distance_km": t.distance_km,
        "estimated_duration_hours": t.estimated_duration_hours,
        "vehicle_id": t.vehicle_id,
        "driver_id": t.driver_id,
        "status": t.status,
        "scheduled_departure": t.scheduled_departure,
        "actual_departure": t.actual_departure,
        "estimated_arrival": t.estimated_arrival,
        "actual_arrival": t.actual_arrival,
        "notes": t.notes,
        "origin_lat": t.origin_lat,
        "origin_lng": t.origin_lng,
        "dest_lat": t.dest_lat,
        "dest_lng": t.dest_lng,
        "route_geometry": t.route_geometry,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "vehicle_plate": v_plate,
        "vehicle_model": v_model,
        "driver_name": d_name,
    }

@router.get("/hubs", response_model=List[HubResponse])
def get_hubs(
    current_user: User = Depends(get_current_user)
):
    """List verified Indian logistics freight hubs with coordinates."""
    return list_all_hubs()

@router.get("/stats/summary", response_model=TripSummaryStats)
def get_trip_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(Trip).count()
    scheduled = db.query(Trip).filter(Trip.status == TripStatus.SCHEDULED).count()
    in_transit = db.query(Trip).filter(Trip.status == TripStatus.IN_TRANSIT).count()
    delivered = db.query(Trip).filter(Trip.status == TripStatus.DELIVERED).count()

    trips = db.query(Trip).all()
    total_dist = sum(t.distance_km for t in trips if t.status == TripStatus.DELIVERED)
    total_cargo = sum(t.cargo_weight_kg for t in trips if t.status == TripStatus.DELIVERED)

    return {
        "total_trips": total,
        "scheduled_trips": scheduled,
        "in_transit_trips": in_transit,
        "delivered_trips": delivered,
        "total_distance_covered_km": round(total_dist, 1),
        "total_cargo_delivered_kg": round(total_cargo, 1)
    }
@router.get("/my", response_model=List[TripResponse])
def get_my_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Driver Only / Self) Get trips assigned to the currently logged in driver."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        return []
    trips = db.query(Trip).filter(Trip.driver_id == driver.id).order_by(Trip.id.desc()).all()
    return [enrich_trip(t) for t in trips]

@router.get("", response_model=List[TripResponse])
def list_trips(
    status: Optional[TripStatus] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Trip)
    if status:
        query = query.filter(Trip.status == status)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Trip.trip_code.ilike(search_fmt)) |
            (Trip.origin.ilike(search_fmt)) |
            (Trip.destination.ilike(search_fmt)) |
            (Trip.cargo_type.ilike(search_fmt))
        )
    trips = query.order_by(Trip.id.desc()).all()
    return [enrich_trip(t) for t in trips]

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_in: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    # 2.3 Trip double-booking prevention: Check vehicle availability and payload
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Selected vehicle not found.")
    if vehicle.status != VehicleStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected vehicle {vehicle.license_plate} is not available (current status: {vehicle.status.value})."
        )
    if trip_in.cargo_weight_kg > vehicle.max_payload_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cargo weight ({trip_in.cargo_weight_kg} kg) exceeds vehicle max payload capacity ({vehicle.max_payload_kg} kg)."
        )

    # 2.3 Check driver availability, active status, and license validity
    driver = db.query(Driver).filter(Driver.id == trip_in.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Selected driver not found.")
    if driver.status != DriverStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected driver {driver.full_name} is not available (current status: {driver.status.value})."
        )
    if not getattr(driver, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected driver {driver.full_name} is inactive/suspended."
        )
    if driver.license_expiry < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected driver {driver.full_name}'s license expired on {driver.license_expiry}."
        )

    # Resolve coordinates if not provided
    orig_lat = trip_in.origin_lat
    orig_lng = trip_in.origin_lng
    dest_lat = trip_in.dest_lat
    dest_lng = trip_in.dest_lng

    if orig_lat is None or orig_lng is None:
        hub = get_hub_by_name(trip_in.origin)
        if hub:
            orig_lat = hub["latitude"]
            orig_lng = hub["longitude"]

    if dest_lat is None or dest_lng is None:
        hub = get_hub_by_name(trip_in.destination)
        if hub:
            dest_lat = hub["latitude"]
            dest_lng = hub["longitude"]

    dist_km = trip_in.distance_km
    dur_hrs = trip_in.estimated_duration_hours
    geom_str = trip_in.route_geometry

    if orig_lat is not None and orig_lng is not None and dest_lat is not None and dest_lng is not None:
        try:
            route_res = RoutingService.get_route(
                orig_lat, orig_lng, dest_lat, dest_lng,
                db=db,
                origin_name=trip_in.origin,
                dest_name=trip_in.destination
            )
            if dist_km is None:
                dist_km = route_res.get("distance_km", 150.0)
            if dur_hrs is None:
                dur_hrs = route_res.get("duration_hours", 3.0)
            if not geom_str and route_res.get("geometry"):
                geom_str = json.dumps(route_res["geometry"])
        except Exception:
            pass

    if dist_km is None:
        dist_km = 150.0
    if dur_hrs is None:
        dur_hrs = 3.0

    trip = Trip(
        trip_code=trip_in.trip_code.strip().upper(),
        origin=trip_in.origin.strip(),
        destination=trip_in.destination.strip(),
        cargo_type=trip_in.cargo_type.strip(),
        cargo_weight_kg=trip_in.cargo_weight_kg,
        distance_km=dist_km,
        estimated_duration_hours=dur_hrs,
        vehicle_id=trip_in.vehicle_id,
        driver_id=trip_in.driver_id,
        status=trip_in.status,
        scheduled_departure=trip_in.scheduled_departure,
        estimated_arrival=trip_in.estimated_arrival,
        notes=trip_in.notes,
        origin_lat=orig_lat,
        origin_lng=orig_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        route_geometry=geom_str
    )

    if trip.status == TripStatus.IN_TRANSIT:
        trip.actual_departure = datetime.utcnow()
        vehicle.status = VehicleStatus.ON_TRIP
        driver.status = DriverStatus.ON_DUTY

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)

@router.patch("/{trip_id}/status", response_model=TripResponse)
def update_trip_status(
    trip_id: int,
    status_in: TripStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    # 2.1 Ownership check: Driver may only update their own assigned trips
    if current_user.role == UserRole.DRIVER:
        if not trip.driver or trip.driver.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers may only update status of their own assigned trips."
            )

    old_status = trip.status
    new_status = status_in.status

    # 2.1 Enforce allowed status transitions
    allowed_transitions = {
        TripStatus.SCHEDULED: [TripStatus.IN_TRANSIT, TripStatus.CANCELLED],
        TripStatus.IN_TRANSIT: [TripStatus.DELIVERED],
        TripStatus.DELIVERED: [],
        TripStatus.CANCELLED: []
    }

    if new_status != old_status and new_status not in allowed_transitions.get(old_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {old_status.value} to {new_status.value}."
        )

    trip.status = new_status
    vehicle = trip.vehicle
    driver = trip.driver

    if new_status == TripStatus.IN_TRANSIT and old_status != TripStatus.IN_TRANSIT:
        trip.actual_departure = datetime.utcnow()
        if vehicle:
            vehicle.status = VehicleStatus.ON_TRIP
        if driver:
            driver.status = DriverStatus.ON_DUTY

    elif new_status == TripStatus.DELIVERED and old_status != TripStatus.DELIVERED:
        trip.actual_arrival = datetime.utcnow()
        if vehicle:
            vehicle.status = VehicleStatus.AVAILABLE
            vehicle.odometer_km += trip.distance_km
        if driver:
            driver.status = DriverStatus.AVAILABLE
            driver.total_trips += 1
            # 2.2 On-time metric fix: only increment if delivered on or before estimated arrival
            if trip.actual_arrival <= trip.estimated_arrival:
                driver.on_time_trips += 1

    elif new_status == TripStatus.CANCELLED:
        if vehicle and vehicle.status == VehicleStatus.ON_TRIP:
            vehicle.status = VehicleStatus.AVAILABLE
        if driver and driver.status == DriverStatus.ON_DUTY:
            driver.status = DriverStatus.AVAILABLE

    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)
