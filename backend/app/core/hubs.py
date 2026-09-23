from typing import Dict, List, Optional, Any
import math

LOGISTICS_HUBS = {
    "Mumbai (JNPT)": {
        "id": "HUB_BOM",
        "name": "Mumbai (JNPT Port)",
        "full_name": "Jawaharlal Nehru Port Trust (JNPT), Nhava Sheva, Navi Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 18.9496,
        "longitude": 72.9525,
        "type": "PORT_CONTAINER_TERMINAL"
    },
    "Pune (Chakan)": {
        "id": "HUB_PNQ",
        "name": "Pune (Chakan Auto Corridor)",
        "full_name": "Chakan MIDC Industrial & Logistics Park, Pune",
        "city": "Pune",
        "state": "Maharashtra",
        "latitude": 18.7606,
        "longitude": 73.8636,
        "type": "AUTO_MANUFACTURING_HUB"
    },
    "Delhi (NCR)": {
        "id": "HUB_DEL",
        "name": "Delhi NCR (Gurugram Depot)",
        "full_name": "Delhi-NCR Logistics Hub, Bilaspur-Tauru Corridor, Gurugram",
        "city": "Delhi NCR",
        "state": "Haryana",
        "latitude": 28.5355,
        "longitude": 77.2732,
        "type": "CENTRAL_DISTRIBUTION_DEPOT"
    },
    "Bengaluru (Peenya)": {
        "id": "HUB_BLR",
        "name": "Bengaluru (Peenya Logistics Park)",
        "full_name": "Peenya Industrial Area & Logistics Terminal, Bengaluru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 13.0285,
        "longitude": 77.5195,
        "type": "TECH_CONSUMER_ELECTRONICS"
    },
    "Chennai (Sriperumbudur)": {
        "id": "HUB_MAA",
        "name": "Chennai (Sriperumbudur Auto Cluster)",
        "full_name": "SIPCOT Industrial Corridor, Sriperumbudur, Chennai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "latitude": 12.9699,
        "longitude": 79.9405,
        "type": "EXPORT_AUTOMOTIVE_HUB"
    },
    "Hyderabad (Shamshabad)": {
        "id": "HUB_HYD",
        "name": "Hyderabad (Shamshabad Cargo Terminal)",
        "full_name": "GMR Aerospace & Logistics Park, Shamshabad, Hyderabad",
        "city": "Hyderabad",
        "state": "Telangana",
        "latitude": 17.2403,
        "longitude": 78.4294,
        "type": "PHARMA_AIR_CARGO"
    },
    "Ahmedabad (Sanand)": {
        "id": "HUB_AMD",
        "name": "Ahmedabad (Sanand GIDC)",
        "full_name": "Sanand Industrial Zone & Multi-Modal Logistics Hub",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "latitude": 22.9868,
        "longitude": 72.3804,
        "type": "HEAVY_ENGINEERING"
    },
    "Kolkata (Dankuni)": {
        "id": "HUB_CCU",
        "name": "Kolkata (Dankuni Freight Hub)",
        "full_name": "Dankuni Eastern Freight Terminal & Multi-Modal Hub",
        "city": "Kolkata",
        "state": "West Bengal",
        "latitude": 22.6868,
        "longitude": 88.2936,
        "type": "EASTERN_GATEWAY"
    }
}

def get_hub_by_name(query: str) -> Optional[Dict[str, Any]]:
    """Lookup hub by exact key or case-insensitive partial match."""
    if not query:
        return None
    q = query.strip().lower()
    for key, hub in LOGISTICS_HUBS.items():
        if q == key.lower():
            return hub
        if q in hub["name"].lower() or q in hub["city"].lower() or q in hub["full_name"].lower():
            return hub
    return None

def list_all_hubs() -> List[Dict[str, Any]]:
    """Returns list of all available hubs for dropdown selectors."""
    return list(LOGISTICS_HUBS.values())

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on the Earth (WGS-84)."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)
