import random
import logging
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleType, FuelType, VehicleStatus
from app.models.driver import Driver, DriverStatus
from app.models.trip import Trip, TripStatus
from app.models.fuel import FuelLog
from app.models.maintenance import MaintenanceRecord, ServiceType, MaintenanceStatus
from app.models.notification import Notification, NotificationType, NotificationSeverity
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# Indian logistics freight hubs & industrial terminals
LOGISTICS_HUBS = [
    {"city": "Delhi NCR", "hub": "Gurugram Bilaspur Logistics Park", "state": "HR/DL", "lat": 28.4595, "lng": 77.0266},
    {"city": "Mumbai", "hub": "JNPT Port Container Terminal (Nhava Sheva)", "state": "MH", "lat": 18.9496, "lng": 72.9510},
    {"city": "Bengaluru", "hub": "Nelamangala Intermodal Freight Terminal", "state": "KA", "lat": 13.0995, "lng": 77.3926},
    {"city": "Pune", "hub": "Chakan Automobile Cluster Depot", "state": "MH", "lat": 18.7522, "lng": 73.8567},
    {"city": "Ahmedabad", "hub": "Sanand & Changodar Freight Hub", "state": "GJ", "lat": 22.9868, "lng": 72.3789},
    {"city": "Chennai", "hub": "Sriperumbudur Auto Logistics Hub", "state": "TN", "lat": 12.9699, "lng": 79.9407},
    {"city": "Hyderabad", "hub": "Shamshabad Air Cargo & Logistics Park", "state": "TS", "lat": 17.2403, "lng": 78.4294},
    {"city": "Kolkata", "hub": "Dankuni Freight Hub (Eastern DFC)", "state": "WB", "lat": 22.6841, "lng": 88.2917},
    {"city": "Surat", "hub": "Hazira Port Logistics Zone", "state": "GJ", "lat": 21.1166, "lng": 72.6457},
    {"city": "Nagpur", "hub": "MIHAN Multimodal Logistics Hub (Zero Mile)", "state": "MH", "lat": 21.0543, "lng": 79.0346},
    {"city": "Jaipur", "hub": "VKI Industrial Transport Hub", "state": "RJ", "lat": 26.9749, "lng": 75.7667},
    {"city": "Ludhiana", "hub": "Sahnewal Inland Container Depot (ICD)", "state": "PB", "lat": 30.8468, "lng": 75.9897},
    {"city": "Kochi", "hub": "Vallarpadam ICTT Container Terminal", "state": "KL", "lat": 9.9926, "lng": 76.2484},
    {"city": "Mundra", "hub": "Adani Mundra Port Logistics SEZ", "state": "GJ", "lat": 22.8396, "lng": 69.7042}
]

# Indian freight cargo types
CARGO_TYPES = [
    {"type": "Automotive Stamping Dies & Spare Parts", "weight_range": (14000, 26000)},
    {"type": "Pharmaceutical Medicines & Active Ingredients (API)", "weight_range": (5000, 12000)},
    {"type": "FMCG Consumer Packaged Goods (Amul / ITC / HUL)", "weight_range": (8000, 18000)},
    {"type": "Textiles, Garments & Raw Cotton Bales", "weight_range": (10000, 22000)},
    {"type": "Industrial Structural Steel & TMT Bars (Tata Steel / JSW)", "weight_range": (18000, 28000)},
    {"type": "E-Commerce Priority Express (Flipkart / Amazon / Delhivery)", "weight_range": (800, 2200)},
    {"type": "Electronics, Mobile Phones & Electrical Appliances", "weight_range": (3500, 9500)},
    {"type": "Refrigerated Milk & Dairy Cold-Chain (+4°C)", "weight_range": (9000, 16000)},
]

# Major Indian commercial vehicle fleet catalog
INDIAN_VEHICLE_CATALOG = [
    {"make": "Tata Motors", "model": "Prima 5530.S Trailer", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 550, "payload": 35000},
    {"make": "Ashok Leyland", "model": "AVTR 4220 HG Truck", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 400, "payload": 28000},
    {"make": "BharatBenz", "model": "3528C Heavy Hauler", "year": 2022, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 430, "payload": 26000},
    {"make": "Eicher", "model": "Pro 6048 Multi-Axle", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 450, "payload": 30000},
    {"make": "Mahindra", "model": "Blazo X 49 Tractor", "year": 2022, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 415, "payload": 32000},
    {"make": "Tata Motors", "model": "Signa 4825.TK Tipper", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 365, "payload": 29000},
    {"make": "BharatBenz", "model": "1217C Medium Freight", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 215, "payload": 8500},
    {"make": "Eicher", "model": "Pro 2049 City Truck", "year": 2024, "type": VehicleType.TRUCK, "fuel": FuelType.CNG, "cap": 180, "payload": 3500},
    {"make": "Tata Motors", "model": "Ace EV Cargo (100% Electric)", "year": 2024, "type": VehicleType.VAN, "fuel": FuelType.ELECTRIC, "cap": 21.3, "payload": 600},
    {"make": "Mahindra", "model": "Treo Zor EV Delivery", "year": 2024, "type": VehicleType.VAN, "fuel": FuelType.ELECTRIC, "cap": 8.0, "payload": 550},
    {"make": "Tata Motors", "model": "407 Gold SFC High-Deck", "year": 2022, "type": VehicleType.TRUCK, "fuel": FuelType.DIESEL, "cap": 60, "payload": 2500},
    {"make": "Ashok Leyland", "model": "Dost+ Strong Commercial", "year": 2023, "type": VehicleType.PICKUP, "fuel": FuelType.DIESEL, "cap": 50, "payload": 1500},
    {"make": "Switch Mobility", "model": "IeV4 Electric Commercial Van", "year": 2024, "type": VehicleType.VAN, "fuel": FuelType.ELECTRIC, "cap": 32.2, "payload": 1700},
    {"make": "Mahindra", "model": "Bolero Maxi Truck Plus", "year": 2023, "type": VehicleType.PICKUP, "fuel": FuelType.DIESEL, "cap": 45, "payload": 1200},
    {"make": "Ashok Leyland", "model": "Ecomet 1615 HE CNG", "year": 2023, "type": VehicleType.TRUCK, "fuel": FuelType.CNG, "cap": 220, "payload": 10500},
    {"make": "Tata Motors", "model": "Ultra T.16 EV Medium Truck", "year": 2024, "type": VehicleType.TRUCK, "fuel": FuelType.ELECTRIC, "cap": 200, "payload": 9000}
]

# Indian State Registration Number Plates
INDIAN_PLATES = [
    "MH 12 QK 4821", # Pune, MH
    "DL 01 AA 9912", # Delhi
    "KA 01 MJ 7720", # Bengaluru, KA
    "TN 09 BX 3341", # Chennai, TN
    "GJ 01 EZ 5519", # Ahmedabad, GJ
    "HR 26 DQ 8812", # Gurugram, HR
    "WB 19 AF 2210", # Kolkata, WB
    "TS 09 UA 4410", # Hyderabad, TS
    "UP 16 CZ 1190", # Noida, UP
    "MH 04 KF 6612", # Thane / Mumbai, MH
    "RJ 14 GC 3310", # Jaipur, RJ
    "KA 05 EM 8840", # Bengaluru South, KA
    "GJ 06 TR 1199", # Vadodara, GJ
    "PB 10 CV 4402", # Ludhiana, PB
    "MH 46 BB 7780", # Navi Mumbai, MH
    "TN 01 AZ 5521"  # Chennai Central, TN
]

# Indian Commercial Drivers
INDIAN_DRIVERS = [
    {"name": "Rajesh Kumar", "email": "driver@fleet.com", "phone": "+91-98112-54011", "city": "Delhi NCR", "state": "DL"},
    {"name": "Suresh Patil", "email": "suresh.patil@fleet.com", "phone": "+91-98220-41829", "city": "Pune", "state": "MH"},
    {"name": "Manpreet Singh", "email": "manpreet.singh@fleet.com", "phone": "+91-98140-99210", "city": "Ludhiana", "state": "PB"},
    {"name": "Rameshwar Yadav", "email": "rameshwar.yadav@fleet.com", "phone": "+91-94520-11823", "city": "Varanasi", "state": "UP"},
    {"name": "Murugan S.", "email": "murugan.s@fleet.com", "phone": "+91-98401-77342", "city": "Chennai", "state": "TN"},
    {"name": "Vikram Sharma", "email": "vikram.sharma@fleet.com", "phone": "+91-94140-55102", "city": "Jaipur", "state": "RJ"},
    {"name": "Mohammed Arif", "email": "mohammed.arif@fleet.com", "phone": "+91-98480-22910", "city": "Hyderabad", "state": "TS"},
    {"name": "Ankit Verma", "email": "ankit.verma@fleet.com", "phone": "+91-98300-88419", "city": "Kolkata", "state": "WB"},
    {"name": "Gurdeep Singh", "email": "gurdeep.singh@fleet.com", "phone": "+91-98720-33109", "city": "Chandigarh", "state": "PB"},
    {"name": "Praveen Gowda", "email": "praveen.gowda@fleet.com", "phone": "+91-98450-66412", "city": "Bengaluru", "state": "KA"},
    {"name": "Bhavesh Patel", "email": "bhavesh.patel@fleet.com", "phone": "+91-98250-11782", "city": "Ahmedabad", "state": "GJ"},
    {"name": "Sunil Shinde", "email": "sunil.shinde@fleet.com", "phone": "+91-98600-44910", "city": "Nagpur", "state": "MH"},
    {"name": "Dinesh Reddy", "email": "dinesh.reddy@fleet.com", "phone": "+91-99890-55219", "city": "Vijayawada", "state": "AP"},
    {"name": "Sanjay Deshmukh", "email": "sanjay.deshmukh@fleet.com", "phone": "+91-98900-77310", "city": "Nashik", "state": "MH"},
    {"name": "Harish Nair", "email": "harish.nair@fleet.com", "phone": "+91-98470-33201", "city": "Kochi", "state": "KL"},
    {"name": "Kuldeep Bishnoi", "email": "kuldeep.bishnoi@fleet.com", "phone": "+91-94160-88219", "city": "Hisar", "state": "HR"}
]

# Major Indian Fuel & Highway Outlets
INDIAN_FUEL_STATIONS = [
    "IndianOil COCO Highway Oasis - NH-48 Expressway",
    "Bharat Petroleum (BPCL) Ghar Highway Hub",
    "HPCL Drive-Track Plus Commercial Plaza",
    "Jio-bp Mobility Station - Express Corridor",
    "Nayara Energy Heavy Haul Fuel Depot",
    "Adani Total Gas Commercial CNG Station",
    "Tata Power Megawatt EV Fleet Depot Charging Bay",
    "Statiq Ultra-Fast Commercial DC Fleet Charger"
]

def seed_large_fleet_dataset(db: Session, num_vehicles: int = 16, num_drivers: int = 16, num_trips: int = 35) -> None:
    """Populate database with real Indian logistics fleet data, vehicles, routes, and INR pricing.
    Only runs if the database is empty (no users exist). Uses random.seed(42) for reproducibility."""
    # Reproducibility: same seed always produces the same demo data
    random.seed(42)

    # Guard: only seed if database is empty
    existing_user_count = db.query(User).count()
    if existing_user_count > 0:
        logger.info("Database already has data. Skipping seed. Use --reset to re-seed.")
        return

    today = date.today()
    now = datetime.utcnow()

    # 1. Base Users (Admins & Managers)
    admin_user = db.query(User).filter(User.email == "admin@fleet.com").first()
    if not admin_user:
        admin_user = User(
            email="admin@fleet.com",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Rajiv Menon (Operations Head)",
            phone="+91-98110-00100",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)

    manager_user = db.query(User).filter(User.email == "manager@fleet.com").first()
    if not manager_user:
        manager_user = User(
            email="manager@fleet.com",
            hashed_password=get_password_hash("Manager@123"),
            full_name="Amitabh Sengupta (Fleet Manager)",
            phone="+91-98110-00102",
            role=UserRole.FLEET_MANAGER,
            is_active=True
        )
        db.add(manager_user)
    db.commit()

    # 2. Indian Commercial Vehicles
    vehicles = []
    for i in range(num_vehicles):
        plate = INDIAN_PLATES[i % len(INDIAN_PLATES)]
        existing_v = db.query(Vehicle).filter(Vehicle.license_plate == plate).first()
        if existing_v:
            vehicles.append(existing_v)
            continue

        template = INDIAN_VEHICLE_CATALOG[i % len(INDIAN_VEHICLE_CATALOG)]
        vin = f"MAT{random.randint(100000, 999999)}PZ{i:06d}"
        
        status = VehicleStatus.AVAILABLE
        if i % 4 == 0:
            status = VehicleStatus.ON_TRIP
        elif i == 3 or i == 9:
            status = VehicleStatus.IN_MAINTENANCE

        ins_days = 14 if i == 3 else random.randint(60, 365)
        puc_days = 10 if i == 3 else random.randint(45, 180)

        v = Vehicle(
            license_plate=plate,
            vin=vin,
            make=template["make"],
            model=template["model"],
            year=template["year"],
            vehicle_type=template["type"],
            fuel_type=template["fuel"],
            fuel_capacity=template["cap"],
            max_payload_kg=template["payload"],
            odometer_km=round(random.uniform(12000.0, 185000.0), 1),
            status=status,
            insurance_number=f"ICICI-LOMBARD-COMM-{random.randint(100000, 999999)}",
            insurance_expiry=today + timedelta(days=ins_days),
            puc_number=f"PUC-IND-{random.randint(1000000, 9999999)}" if template["fuel"] != FuelType.ELECTRIC else "PUC-EV-EXEMPT",
            puc_expiry=today + timedelta(days=puc_days),
        )
        db.add(v)
        vehicles.append(v)
    db.commit()

    # 3. Indian Commercial Drivers (with Indian Heavy Vehicle Driving Licenses)
    drivers = []
    for i in range(num_drivers):
        d_info = INDIAN_DRIVERS[i % len(INDIAN_DRIVERS)]
        email = d_info["email"]

        existing_d = db.query(Driver).filter(Driver.email == email).first()
        if existing_d:
            drivers.append(existing_d)
            continue

        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                hashed_password=get_password_hash("Driver@123"),
                full_name=d_info["name"],
                phone=d_info["phone"],
                role=UserRole.DRIVER,
                is_active=True
            )
            db.add(u)
            db.commit()

        d_status = DriverStatus.AVAILABLE
        if i % 4 == 0:
            d_status = DriverStatus.ON_DUTY
        elif i % 7 == 0:
            d_status = DriverStatus.OFF_DUTY

        assigned_v = vehicles[i % len(vehicles)] if d_status != DriverStatus.OFF_DUTY else None

        tot_trips = random.randint(30, 110)
        on_time = int(tot_trips * random.uniform(0.93, 0.99))

        lic_type = "HMV (Heavy Goods Motor Vehicle)" if i % 2 == 0 else "LMV-TR (Light Commercial Transport)"
        state_code = d_info["state"]

        d = Driver(
            user_id=u.id,
            full_name=d_info["name"],
            email=email,
            phone=d_info["phone"],
            license_number=f"{state_code}-0{random.randint(1,9)}20{random.randint(12,22)}00{random.randint(10000,99999)}",
            license_type=lic_type,
            license_expiry=today + timedelta(days=random.randint(45, 600)),
            experience_years=random.randint(4, 16),
            emergency_contact=f"+91-98700-{random.randint(10000, 99999)}",
            status=d_status,
            assigned_vehicle_id=assigned_v.id if assigned_v else None,
            total_trips=tot_trips,
            on_time_trips=on_time,
            safety_score=round(random.uniform(92.0, 99.5), 1),
            fuel_efficiency_score=round(random.uniform(91.0, 98.5), 1),
            rating=round(random.uniform(4.6, 5.0), 1)
        )
        db.add(d)
        drivers.append(d)
    db.commit()

    # 4. Realistic Indian Freight Trips & Corridors
    trips_created = 0
    for i in range(1, num_trips + 1):
        trip_code = f"TRIP-IND-{1000 + i}"
        existing_t = db.query(Trip).filter(Trip.trip_code == trip_code).first()
        if existing_t:
            continue

        orig_hub = LOGISTICS_HUBS[(i - 1) % len(LOGISTICS_HUBS)]
        dest_hub = LOGISTICS_HUBS[(i + 3) % len(LOGISTICS_HUBS)]
        v = vehicles[i % len(vehicles)]
        d = drivers[i % len(drivers)]

        if v.vehicle_type in [VehicleType.VAN, VehicleType.PICKUP]:
            van_cargos = [c for c in CARGO_TYPES if c["weight_range"][0] <= v.max_payload_kg]
            cargo = random.choice(van_cargos) if van_cargos else CARGO_TYPES[5]
        else:
            cargo = CARGO_TYPES[i % len(CARGO_TYPES)]

        dist = round(random.uniform(220.0, 1420.0), 1)
        duration = round(dist / random.uniform(48.0, 62.0), 1) # Avg 55 km/h on Indian highways
        
        max_allowed = int(min(cargo["weight_range"][1], v.max_payload_kg))
        min_allowed = int(min(cargo["weight_range"][0], max_allowed))
        if min_allowed >= max_allowed:
            weight = float(max(500, max_allowed))
        else:
            weight = float(random.randint(min_allowed, max_allowed))

        if i <= 20:
            t_status = TripStatus.DELIVERED
            sched_dep = now - timedelta(days=random.randint(1, 20), hours=random.randint(2, 10))
            act_dep = sched_dep + timedelta(minutes=random.randint(-15, 20))
            est_arr = sched_dep + timedelta(hours=duration)
            act_arr = est_arr + timedelta(minutes=random.randint(-30, 25))
        elif i <= 28:
            t_status = TripStatus.IN_TRANSIT
            sched_dep = now - timedelta(hours=random.randint(2, 8))
            act_dep = sched_dep
            est_arr = sched_dep + timedelta(hours=duration)
            act_arr = None
        else:
            t_status = TripStatus.SCHEDULED
            sched_dep = now + timedelta(hours=random.randint(3, 48))
            act_dep = None
            est_arr = sched_dep + timedelta(hours=duration)
            act_arr = None

        ewb_number = f"EWB-{random.randint(100000000000, 999999999999)}"

        db.add(Trip(
            trip_code=trip_code,
            origin=f"{orig_hub['city']} ({orig_hub['hub']})",
            destination=f"{dest_hub['city']} ({dest_hub['hub']})",
            cargo_type=cargo["type"],
            cargo_weight_kg=weight,
            distance_km=dist,
            estimated_duration_hours=duration,
            vehicle_id=v.id,
            driver_id=d.id,
            status=t_status,
            scheduled_departure=sched_dep,
            actual_departure=act_dep,
            estimated_arrival=est_arr,
            actual_arrival=act_arr,
            notes=f"GST E-Way Bill: {ewb_number}. FASTag enabled for toll plaza auto-clearance."
        ))
        trips_created += 1
    db.commit()

    # 5. Indian Fuel & Energy Logs (INR Rates)
    # Diesel: ~₹89.50/L, CNG: ~₹78.00/kg, EV: ~₹9.50/kWh
    for v_idx, v in enumerate(vehicles):
        for f_idx in range(1, 3):
            if v.fuel_type == FuelType.ELECTRIC:
                qty = round(random.uniform(25.0, 75.0), 1) # kWh
                unit_c = 9.50 # ₹9.50 / kWh
                eff = round(random.uniform(4.5, 6.2), 2) # km/kWh
            elif v.fuel_type == FuelType.CNG:
                qty = round(random.uniform(30.0, 60.0), 1) # kg
                unit_c = 78.50 # ₹78.50 / kg
                eff = round(random.uniform(6.5, 8.5), 2) # km/kg
            else:
                qty = round(random.uniform(120.0, 260.0), 1) # Liters
                unit_c = 89.62 # ₹89.62 / L
                eff = round(random.uniform(3.8, 4.6), 2) # km/L

            odo = round(v.odometer_km - (f_idx * random.uniform(500.0, 1200.0)), 1)
            station = random.choice(INDIAN_FUEL_STATIONS)

            db.add(FuelLog(
                vehicle_id=v.id,
                driver_id=drivers[v_idx % len(drivers)].id,
                fuel_quantity=qty,
                unit_cost=unit_c,
                total_cost=round(qty * unit_c, 2),
                odometer_km=max(100.0, odo),
                station_name=station,
                fuel_type=v.fuel_type.value,
                efficiency_km_per_unit=eff,
                refill_date=now - timedelta(days=f_idx * 4, hours=random.randint(1, 10))
            ))
    db.commit()

    # 6. Maintenance & Service Ledger (Authorized Indian Service Centers)
    for v in vehicles[:8]:
        st = random.choice([ServiceType.OIL_CHANGE, ServiceType.BRAKE_INSPECTION, ServiceType.TIRE_ROTATION, ServiceType.SCHEDULED_GENERAL])
        m_status = MaintenanceStatus.IN_PROGRESS if v.status == VehicleStatus.IN_MAINTENANCE else MaintenanceStatus.COMPLETED

        # Indian rupee maintenance costs
        cost_inr = round(random.uniform(4500.0, 24500.0), 2)

        service_center_name = f"{v.make} Authorized Commercial Workshop & Depot - NH-48 Corridor"

        db.add(MaintenanceRecord(
            vehicle_id=v.id,
            service_type=st,
            status=m_status,
            description=f"Preventive {st.value.replace('_', ' ').title()} & RTO Safety Fitness Calibration.",
            cost=cost_inr,
            service_center=service_center_name,
            odometer_at_service=v.odometer_km,
            service_date=today - timedelta(days=random.randint(5, 45)),
            completed_date=today - timedelta(days=random.randint(1, 4)) if m_status == MaintenanceStatus.COMPLETED else None,
            next_service_due_date=today + timedelta(days=random.randint(45, 120)),
            next_service_due_odometer=v.odometer_km + 10000.0,
            parts_replaced="OEM Certified Filter Kit, Brake Liners, DEF Fluid Top-up (AdBlue)",
            technician_notes="Engine health and BS-VI SCR emission system verified within MoRTH parameters."
        ))
    db.commit()

    # 7. Indian Compliance Notifications (only real system alerts, no false claims)
    notifs = [
        {"type": NotificationType.INSURANCE_EXPIRY, "sev": NotificationSeverity.WARNING, "title": "Commercial Insurance Expiry Alert: TN 09 BX 3341", "msg": "Comprehensive commercial motor policy expires in 14 days. Upload renewed policy copy for RTO compliance.", "url": "/vehicles"},
        {"type": NotificationType.PUC_EXPIRY, "sev": NotificationSeverity.WARNING, "title": "Pollution Certificate (PUC) Due: TN 09 BX 3341", "msg": "BS-VI Emission certificate expires in 10 days. Vehicle booked at IndianOil PUC center.", "url": "/vehicles"},
        {"type": NotificationType.MAINTENANCE_DUE, "sev": NotificationSeverity.INFO, "title": "Authorized Workshop Active: TN 09 BX 3341", "msg": "Ashok Leyland 4220 is undergoing brake drum & liner replacement in Chakan Bay 2.", "url": "/maintenance"},
        {"type": NotificationType.DELIVERY_DELAY, "sev": NotificationSeverity.WARNING, "title": "Monsoon Freight Advisory: Western Ghats (NH-48)", "msg": "Heavy rainfall near Lonavala ghat section. Estimated transit time extended by 40 mins.", "url": "/trips"},
    ]

    for n in notifs:
        existing = db.query(Notification).filter(Notification.title == n["title"]).first()
        if not existing:
            db.add(Notification(
                notification_type=n["type"],
                severity=n["sev"],
                title=n["title"],
                message=n["msg"],
                link_url=n["url"],
                is_read=False
            ))
    db.commit()
    logger.info(f"Loaded Indian logistics fleet dataset: {len(vehicles)} vehicles, {len(drivers)} drivers, {num_trips} trips.")
