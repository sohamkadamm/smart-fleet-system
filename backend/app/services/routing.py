import os
import json
import math
import httpx
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.route_cache import RouteCache
from app.core.hubs import haversine_distance_km, LOGISTICS_HUBS, get_hub_by_name

OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "http://router.project-osrm.org")
OSRM_TIMEOUT_SECONDS = float(os.getenv("OSRM_TIMEOUT_SECONDS", "6.0"))

class RoutingService:
    """
    OpenStreetMap / OSRM Routing Service with Persistent Cache and Heavy Truck Calibration:
    - Queries OSRM for driving routes, distances, and GeoJSON LineStrings.
    - Applies a 1.30x heavy commercial truck speed factor (ghat sections, state borders, FASTag toll plazas).
    - Caches all routes in database (`route_cache`) to minimize external network requests.
    - Fallback: Robust mathematical Haversine * 1.25 winding road interpolation when network is offline.
    """

    @staticmethod
    def get_route(
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        db: Optional[Session] = None,
        get_alternatives: bool = False,
        origin_name: Optional[str] = None,
        dest_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates route distance, truck duration, and road geometry."""
        cache_key = f"{origin_lat:.4f},{origin_lng:.4f}:{dest_lat:.4f},{dest_lng:.4f}"

        # 1. Check persistent database cache first
        if db is not None:
            cached = db.query(RouteCache).filter(RouteCache.cache_key == cache_key).first()
            if cached:
                try:
                    coords = json.loads(cached.geometry_json)
                    return {
                        "distance_km": round(cached.distance_km, 1),
                        "duration_hours": round(cached.duration_hours, 2),
                        "geometry": coords,
                        "is_estimated": cached.is_estimated,
                        "source": "DB_CACHE",
                        "alternatives": []
                    }
                except Exception:
                    pass

        # 2. Query OSRM API (Note: OSRM uses {lng},{lat} parameter order)
        url = (
            f"{OSRM_BASE_URL}/route/v1/driving/"
            f"{origin_lng:.5f},{origin_lat:.5f};{dest_lng:.5f},{dest_lat:.5f}"
            f"?overview=full&geometries=geojson&alternatives={'true' if get_alternatives else 'false'}"
        )

        try:
            with httpx.Client(timeout=OSRM_TIMEOUT_SECONDS) as client:
                resp = client.get(
                    url,
                    headers={"User-Agent": "SmartFleetLogistics/1.0 (academic-project; contact: soham.kadam24@vit.edu)"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        routes_data = data["routes"]
                        primary = routes_data[0]
                        dist_km = round(primary["distance"] / 1000.0, 1)
                        # Commercial truck duration factor: duration * 1.30
                        dur_hrs = round((primary["duration"] / 3600.0) * 1.30, 2)
                        
                        # Convert [lng, lat] GeoJSON to [lat, lng] for Leaflet
                        raw_coords = primary["geometry"]["coordinates"]
                        coords = [[round(pt[1], 5), round(pt[0], 5)] for pt in raw_coords]

                        # Parse alternatives if requested
                        alternatives = []
                        if get_alternatives and len(routes_data) > 1:
                            for idx, alt in enumerate(routes_data[1:], start=1):
                                alt_dist = round(alt["distance"] / 1000.0, 1)
                                alt_dur = round((alt["duration"] / 3600.0) * 1.30, 2)
                                alt_coords = [[round(pt[1], 5), round(pt[0], 5)] for pt in alt["geometry"]["coordinates"]]
                                alternatives.append({
                                    "route_id": f"OSRM_ALT_{idx}",
                                    "distance_km": alt_dist,
                                    "duration_hours": alt_dur,
                                    "geometry": alt_coords
                                })

                        # Save to cache
                        if db is not None:
                            try:
                                cache_entry = RouteCache(
                                    cache_key=cache_key,
                                    origin_name=origin_name,
                                    dest_name=dest_name,
                                    distance_km=dist_km,
                                    duration_hours=dur_hrs,
                                    geometry_json=json.dumps(coords),
                                    is_estimated=False
                                )
                                db.add(cache_entry)
                                db.commit()
                            except Exception:
                                db.rollback()

                        return {
                            "distance_km": dist_km,
                            "duration_hours": dur_hrs,
                            "geometry": coords,
                            "is_estimated": False,
                            "source": "OSRM_ONLINE",
                            "alternatives": alternatives
                        }
        except Exception as e:
            # Silently fall back to robust mathematical approximation
            pass

        # 3. Fallback: Haversine with 1.25 winding factor + interpolated road line
        h_dist = haversine_distance_km(origin_lat, origin_lng, dest_lat, dest_lng)
        road_dist = round(max(15.0, h_dist * 1.25), 1)
        # Average commercial truck speed across national corridors ~45 km/h
        dur_hrs = round(road_dist / 45.0, 2)

        # Interpolate 30 points between origin and destination with slight realistic curve
        coords = []
        n_points = max(10, min(50, int(road_dist / 15)))
        for i in range(n_points + 1):
            t = i / float(n_points)
            lat = origin_lat + t * (dest_lat - origin_lat)
            lng = origin_lng + t * (dest_lng - origin_lng)
            # Add subtle natural curve in the middle
            curvature = math.sin(t * math.pi) * 0.04
            coords.append([round(lat + curvature, 5), round(lng - curvature, 5)])

        # Save estimated route to cache
        if db is not None:
            try:
                cache_entry = RouteCache(
                    cache_key=cache_key,
                    origin_name=origin_name,
                    dest_name=dest_name,
                    distance_km=road_dist,
                    duration_hours=dur_hrs,
                    geometry_json=json.dumps(coords),
                    is_estimated=True
                )
                db.add(cache_entry)
                db.commit()
            except Exception:
                db.rollback()

        return {
            "distance_km": road_dist,
            "duration_hours": dur_hrs,
            "geometry": coords,
            "is_estimated": True,
            "source": "HAVERSINE_ESTIMATED",
            "alternatives": []
        }

    @staticmethod
    def precompute_hub_matrix(csv_output_path: str, db: Optional[Session] = None):
        """Precomputes pairwise hub distances and saves to CSV for rapid seeding."""
        import pandas as pd
        hubs_list = list(LOGISTICS_HUBS.values())
        rows = []

        for h1 in hubs_list:
            for h2 in hubs_list:
                if h1["id"] == h2["id"]:
                    continue
                route = RoutingService.get_route(
                    h1["latitude"], h1["longitude"],
                    h2["latitude"], h2["longitude"],
                    db=db,
                    origin_name=h1["name"],
                    dest_name=h2["name"]
                )
                rows.append({
                    "origin_id": h1["id"],
                    "origin_name": h1["name"],
                    "origin_lat": h1["latitude"],
                    "origin_lng": h1["longitude"],
                    "dest_id": h2["id"],
                    "dest_name": h2["name"],
                    "dest_lat": h2["latitude"],
                    "dest_lng": h2["longitude"],
                    "distance_km": route["distance_km"],
                    "truck_duration_hours": route["duration_hours"],
                    "is_estimated": route["is_estimated"]
                })

        os.makedirs(os.path.dirname(csv_output_path), exist_ok=True)
        df = pd.DataFrame(rows)
        df.to_csv(csv_output_path, index=False)
        print(f"[RoutingService] Precomputed {len(rows)} hub pairs saved to {csv_output_path}")

routing_service = RoutingService()
