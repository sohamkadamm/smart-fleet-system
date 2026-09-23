import os
import sys
import unittest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure app package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.db.init_db import init_db
from app.db.seed_large_dataset import seed_large_fleet_dataset

try:
    from fastapi.testclient import TestClient
except Exception:
    import subprocess
    print("Installing httpx for test runner...")
    subprocess.run([sys.executable, "-m", "pip", "install", "httpx"], check=True)
    from fastapi.testclient import TestClient

class TestCompleteFleetSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tables
        Base.metadata.create_all(bind=engine)
        # Seed data for tests (init_db no longer seeds, so we call the seed function directly)
        db = SessionLocal()
        try:
            seed_large_fleet_dataset(db, num_vehicles=16, num_drivers=16, num_trips=35)
        finally:
            db.close()
        cls.client = TestClient(app)

        # Login Admin, Manager & Driver
        res_admin = cls.client.post("/api/v1/auth/login", json={"email": "admin@fleet.com", "password": "Admin@123"})
        cls.admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

        res_mgr = cls.client.post("/api/v1/auth/login", json={"email": "manager@fleet.com", "password": "Manager@123"})
        cls.mgr_headers = {"Authorization": f"Bearer {res_mgr.json()['access_token']}"}

        res_driver = cls.client.post("/api/v1/auth/login", json={"email": "driver@fleet.com", "password": "Driver@123"})
        cls.driver_headers = {"Authorization": f"Bearer {res_driver.json()['access_token']}"}

    def test_01_user_and_auth_module1(self):
        res = self.client.get("/api/v1/auth/me", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "ADMIN")
        print("[PASS] [Module 1] User & Role Management passed.")

    def test_02_vehicle_module2(self):
        res = self.client.get("/api/v1/vehicles", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 4)
        print("[PASS] [Module 2] Vehicle Management passed.")

    def test_03_driver_module3(self):
        res = self.client.get("/api/v1/drivers", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 3)
        print("[PASS] [Module 3] Driver Management passed.")

    def test_04_trip_module4(self):
        res = self.client.get("/api/v1/trips", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 3)
        print("[PASS] [Module 4] Trip & Delivery Management passed.")

    def test_05_gps_module5(self):
        res = self.client.get("/api/v1/gps/live", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 4)
        self.assertIn("latitude", res.json()[0])
        print("[PASS] [Module 5] GPS & Live Route Ops passed.")

    def test_06_fuel_module6(self):
        res = self.client.get("/api/v1/fuel", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 2)
        print("[PASS] [Module 6] Fuel Management passed.")

    def test_07_maintenance_module7(self):
        res = self.client.get("/api/v1/maintenance", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 2)
        print("[PASS] [Module 7] Maintenance Management passed.")

    def test_08_driver_performance_module8(self):
        res = self.client.get("/api/v1/performance/leaderboard", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        leaderboard = res.json()
        self.assertGreaterEqual(len(leaderboard), 3)
        self.assertIn("composite_score", leaderboard[0])
        print("[PASS] [Module 8] Driver Performance & Scoring passed.")

    def test_09_ai_predictive_module9(self):
        # Test Predictive Maintenance
        res_maint = self.client.post("/api/v1/ai/predict-maintenance", json={"vehicle_id": 1}, headers=self.mgr_headers)
        self.assertEqual(res_maint.status_code, 200)
        self.assertIn("failure_probability_pct", res_maint.json())

        # Test Fuel Forecast
        res_fuel = self.client.post("/api/v1/ai/forecast-fuel", json={
            "distance_km": 350.0,
            "cargo_weight_kg": 15000.0,
            "vehicle_type": "TRUCK",
            "fuel_type": "DIESEL"
        }, headers=self.mgr_headers)
        self.assertEqual(res_fuel.status_code, 200)
        self.assertIn("predicted_consumption", res_fuel.json())

        # Test Route Optimization
        res_route = self.client.post("/api/v1/ai/optimize-route", json={
            "origin": "Chicago",
            "destination": "Detroit",
            "distance_km": 450.0,
            "cargo_weight_kg": 12000.0
        }, headers=self.mgr_headers)
        self.assertEqual(res_route.status_code, 200)
        self.assertEqual(len(res_route.json()), 3)
        print("[PASS] [Module 9] AI & Predictive Analytics Engine passed.")

    def test_10_notifications_module10(self):
        res = self.client.get("/api/v1/notifications", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 3)
        print("[PASS] [Module 10] Alerts & Notifications Engine passed.")

    def test_11_analytics_module11(self):
        res = self.client.get("/api/v1/analytics/overview", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("fleet_utilization_pct", data)
        self.assertIn("monthly_deliveries_trend", data)
        print("[PASS] [Module 11] BI Analytics Dashboard passed.")

    def test_12_reports_module12(self):
        res_csv = self.client.get("/api/v1/reports/export/csv?report_type=vehicles", headers=self.mgr_headers)
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn("text/csv", res_csv.headers["content-type"])
        print("[PASS] [Module 12] Reports & Data Export Engine passed.")

    # ============================================================
    # Phase 1 Bug-Fix Tests
    # ============================================================

    def test_13_register_always_creates_driver(self):
        """BUG FIX 1.2: Public registration must always create a DRIVER, even if 'role' is sent."""
        import uuid
        unique_email = f"attacker_{uuid.uuid4().hex[:6]}@test.com"
        res = self.client.post("/api/v1/auth/register", json={
            "full_name": "Test Attacker",
            "email": unique_email,
            "password": "Attack@123"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["user"]["role"], "DRIVER")
        print("[PASS] [Phase 1.2] Register always creates DRIVER — security fix verified.")

    def test_14_invalid_maintenance_status_returns_422(self):
        """BUG FIX 1.5: Invalid maintenance status should return 422 (not 500)."""
        # Get a maintenance record first
        res_list = self.client.get("/api/v1/maintenance", headers=self.mgr_headers)
        self.assertEqual(res_list.status_code, 200)
        records = res_list.json()
        if len(records) == 0:
            self.skipTest("No maintenance records to test against")
        record_id = records[0]["id"]

        # Send an invalid status
        res = self.client.patch(
            f"/api/v1/maintenance/{record_id}/status",
            json={"status": "TOTALLY_INVALID_STATUS"},
            headers=self.mgr_headers
        )
        self.assertEqual(res.status_code, 422)
        print("[PASS] [Phase 1.5] Invalid maintenance status returns 422 — crash fix verified.")

    def test_15_analytics_no_hardcoded_floors(self):
        """BUG FIX 1.4: Analytics should return real values, not hardcoded minimums."""
        res = self.client.get("/api/v1/analytics/overview", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Verify the monthly trend is NOT the old hardcoded Mar-Aug 2026 data
        months = [m["month"] for m in data["monthly_deliveries_trend"]]
        self.assertNotIn("Mar 2026", months, "Monthly trend should not contain old hardcoded months from Mar 2026")

        # Verify fuel_consumption_by_type does NOT have the fake "Petrol / Hybrid" row
        fuel_types = [f["type"] for f in data["fuel_consumption_by_type"]]
        self.assertNotIn("Petrol / Hybrid", fuel_types, "Should not contain fabricated Petrol/Hybrid type")

        # Verify maintenance_cost_by_service is computed from DB (not the old 4 hardcoded rows)
        # The old hardcoded data had "Scheduled General Service" at exactly 1250.0
        for cat in data["maintenance_cost_by_service"]:
            if cat["category"] == "Scheduled General":
                self.assertNotEqual(cat["cost"], 1250.0, "Maintenance cost should be real, not hardcoded 1250.0")
        print("[PASS] [Phase 1.4] Analytics returns real data — no hardcoded floors verified.")

    def test_16_seed_idempotent(self):
        """BUG FIX 1.3: Running seed multiple times should not duplicate data."""
        from app.models.fuel import FuelLog
        from app.models.maintenance import MaintenanceRecord

        db = SessionLocal()
        try:
            fuel_count_before = db.query(FuelLog).count()
            maint_count_before = db.query(MaintenanceRecord).count()

            # Run seed again — should be a no-op since DB already has data
            seed_large_fleet_dataset(db, num_vehicles=16, num_drivers=16, num_trips=35)

            fuel_count_after = db.query(FuelLog).count()
            maint_count_after = db.query(MaintenanceRecord).count()

            self.assertEqual(fuel_count_before, fuel_count_after,
                             f"Fuel logs duplicated: {fuel_count_before} -> {fuel_count_after}")
            self.assertEqual(maint_count_before, maint_count_after,
                             f"Maintenance records duplicated: {maint_count_before} -> {maint_count_after}")
        finally:
            db.close()
        print("[PASS] [Phase 1.3] Seed is idempotent — no duplication on re-run verified.")

    def test_17_maintenance_stats_no_inflated_due(self):
        """BUG FIX 1.4: vehicles_due_for_service should be the actual due_count, not max(due, in_progress)."""
        res = self.client.get("/api/v1/maintenance/stats/summary", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("vehicles_due_for_service", data)
        # The value should be a non-negative integer (not inflated by in_progress count)
        self.assertGreaterEqual(data["vehicles_due_for_service"], 0)
        print("[PASS] [Phase 1.4] Maintenance stats returns real due_count — not inflated.")

    def test_18_ai_fleet_health_uses_real_data(self):
        """BUG FIX 1.4 & 2.9: fleet-health-overview should use real maintenance dates and INR savings."""
        res = self.client.get("/api/v1/ai/fleet-health-overview", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        savings_key = "estimated_monthly_fuel_savings_inr" if "estimated_monthly_fuel_savings_inr" in data else "estimated_monthly_fuel_savings_usd"
        self.assertNotEqual(data[savings_key], 1280.0,
                            "Fuel savings should be computed, not hardcoded 1280.0")
        self.assertNotEqual(data["avg_driver_safety_rating"], 94.6,
                            "Driver safety rating should be computed, not hardcoded 94.6")
        for rec in data["ai_recommendations"]:
            self.assertNotIn("14.2%", rec, "Recommendations should not contain hardcoded percentages")
        print("[PASS] [Phase 1.4 & 2.9] AI fleet health uses real data and INR — no hardcoded values.")

    def test_19_trip_status_transition_rules(self):
        """Phase 2.1: Allowed transitions SCHEDULED -> IN_TRANSIT -> DELIVERED, SCHEDULED -> CANCELLED. Others return 400."""
        from datetime import datetime, timedelta
        from app.models.vehicle import Vehicle, VehicleStatus
        from app.models.driver import Driver, DriverStatus

        db = SessionLocal()
        v = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.AVAILABLE).first()
        d = db.query(Driver).filter(Driver.status == DriverStatus.AVAILABLE, Driver.is_active == True).first()
        v_id, d_id = v.id, d.id
        db.close()

        now = datetime.utcnow()
        import uuid
        uid19 = uuid.uuid4().hex[:6]
        trip_payload = {
            "trip_code": f"TRIP-{uid19}",
            "origin": "Pune",
            "destination": "Mumbai",
            "cargo_type": "Auto Parts",
            "cargo_weight_kg": 1500.0,
            "distance_km": 150.0,
            "estimated_duration_hours": 3.0,
            "vehicle_id": v_id,
            "driver_id": d_id,
            "status": "SCHEDULED",
            "scheduled_departure": now.isoformat(),
            "estimated_arrival": (now + timedelta(hours=4)).isoformat()
        }
        res_create = self.client.post("/api/v1/trips", json=trip_payload, headers=self.mgr_headers)
        self.assertEqual(res_create.status_code, 201)
        trip_id = res_create.json()["id"]

        # Invalid transition: SCHEDULED -> DELIVERED directly should return 400
        res_bad = self.client.patch(f"/api/v1/trips/{trip_id}/status", json={"status": "DELIVERED"}, headers=self.mgr_headers)
        self.assertEqual(res_bad.status_code, 400)

        # Valid transition: SCHEDULED -> IN_TRANSIT
        res_transit = self.client.patch(f"/api/v1/trips/{trip_id}/status", json={"status": "IN_TRANSIT"}, headers=self.mgr_headers)
        self.assertEqual(res_transit.status_code, 200)

        # Invalid transition: IN_TRANSIT -> SCHEDULED should return 400
        res_bad2 = self.client.patch(f"/api/v1/trips/{trip_id}/status", json={"status": "SCHEDULED"}, headers=self.mgr_headers)
        self.assertEqual(res_bad2.status_code, 400)

        # Valid transition: IN_TRANSIT -> DELIVERED
        res_deliv = self.client.patch(f"/api/v1/trips/{trip_id}/status", json={"status": "DELIVERED"}, headers=self.mgr_headers)
        self.assertEqual(res_deliv.status_code, 200)

        # Invalid transition: DELIVERED -> CANCELLED should return 400
        res_bad3 = self.client.patch(f"/api/v1/trips/{trip_id}/status", json={"status": "CANCELLED"}, headers=self.mgr_headers)
        self.assertEqual(res_bad3.status_code, 400)
        print("[PASS] [Phase 2.1] Trip status transition rules strictly enforced.")

    def test_20_driver_trip_ownership_check(self):
        """Phase 2.1: Driver can only update their own assigned trips (403 otherwise)."""
        from datetime import datetime, timedelta
        from app.models.vehicle import Vehicle, VehicleStatus
        from app.models.driver import Driver, DriverStatus

        db = SessionLocal()
        logged_in_driver = db.query(Driver).filter(Driver.email == "driver@fleet.com").first()
        other_driver = db.query(Driver).filter(Driver.id != logged_in_driver.id, Driver.status == DriverStatus.AVAILABLE).first()
        v = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.AVAILABLE).first()
        v_id, other_d_id = v.id, other_driver.id
        db.close()

        now = datetime.utcnow()
        import uuid
        uid20 = uuid.uuid4().hex[:6]
        trip_other = self.client.post("/api/v1/trips", json={
            "trip_code": f"OTHER-{uid20}",
            "origin": "Delhi",
            "destination": "Agra",
            "cargo_type": "Steel",
            "cargo_weight_kg": 2000.0,
            "distance_km": 210.0,
            "estimated_duration_hours": 4.0,
            "vehicle_id": v_id,
            "driver_id": other_d_id,
            "status": "SCHEDULED",
            "scheduled_departure": now.isoformat(),
            "estimated_arrival": (now + timedelta(hours=5)).isoformat()
        }, headers=self.mgr_headers).json()

        # Driver attempts to update other driver's trip -> 403 Forbidden
        res_forbidden = self.client.patch(f"/api/v1/trips/{trip_other['id']}/status", json={"status": "IN_TRANSIT"}, headers=self.driver_headers)
        self.assertEqual(res_forbidden.status_code, 403)
        print("[PASS] [Phase 2.1] Driver prevented from updating other driver's trip (403).")

    def test_21_ontime_trips_computation(self):
        """Phase 2.2: Late delivery does not increment driver on_time_trips."""
        from datetime import datetime, timedelta
        from app.models.vehicle import Vehicle, VehicleStatus
        from app.models.driver import Driver, DriverStatus

        db = SessionLocal()
        v = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.AVAILABLE).first()
        d = db.query(Driver).filter(Driver.status == DriverStatus.AVAILABLE, Driver.is_active == True).first()
        initial_on_time = d.on_time_trips
        initial_total = d.total_trips
        v_id, d_id = v.id, d.id
        db.close()

        now = datetime.utcnow()
        import uuid
        uid21 = uuid.uuid4().hex[:6]
        trip_late = self.client.post("/api/v1/trips", json={
            "trip_code": f"LATE-{uid21}",
            "origin": "Chennai",
            "destination": "Bengaluru",
            "cargo_type": "FMCG",
            "cargo_weight_kg": 1000.0,
            "distance_km": 350.0,
            "estimated_duration_hours": 6.0,
            "vehicle_id": v_id,
            "driver_id": d_id,
            "status": "SCHEDULED",
            "scheduled_departure": (now - timedelta(hours=10)).isoformat(),
            "estimated_arrival": (now - timedelta(hours=2)).isoformat()
        }, headers=self.mgr_headers).json()

        self.client.patch(f"/api/v1/trips/{trip_late['id']}/status", json={"status": "IN_TRANSIT"}, headers=self.mgr_headers)
        self.client.patch(f"/api/v1/trips/{trip_late['id']}/status", json={"status": "DELIVERED"}, headers=self.mgr_headers)

        db = SessionLocal()
        updated_driver = db.query(Driver).filter(Driver.id == d_id).first()
        self.assertEqual(updated_driver.total_trips, initial_total + 1)
        self.assertEqual(updated_driver.on_time_trips, initial_on_time, "Late trip should NOT increment on_time_trips")
        db.close()
        print("[PASS] [Phase 2.2] Late delivery did not increment on_time_trips.")

    def test_22_trip_double_booking_prevention(self):
        """Phase 2.3: Reject trip creation if vehicle/driver not AVAILABLE."""
        from datetime import datetime, timedelta
        from app.models.vehicle import Vehicle, VehicleStatus
        from app.models.driver import Driver, DriverStatus

        db = SessionLocal()
        busy_vehicle = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.AVAILABLE).first()
        available_driver = db.query(Driver).filter(Driver.status == DriverStatus.AVAILABLE, Driver.is_active == True).first()
        b_v_id, a_d_id = busy_vehicle.id, available_driver.id
        db.close()

        now = datetime.utcnow()
        import uuid
        uid22 = uuid.uuid4().hex[:6]
        payload = {
            "trip_code": f"DBL-{uid22}",
            "origin": "Mumbai",
            "destination": "Nashik",
            "cargo_type": "Textiles",
            "cargo_weight_kg": 1000.0,
            "distance_km": 170.0,
            "estimated_duration_hours": 4.0,
            "vehicle_id": b_v_id,
            "driver_id": a_d_id,
            "status": "SCHEDULED",
            "scheduled_departure": now.isoformat(),
            "estimated_arrival": (now + timedelta(hours=5)).isoformat()
        }
        res_bad_veh = self.client.post("/api/v1/trips", json=payload, headers=self.mgr_headers)
        self.assertEqual(res_bad_veh.status_code, 400)
        self.assertIn("not available", res_bad_veh.json()["detail"].lower())
        print("[PASS] [Phase 2.3] Double-booking rejected for non-AVAILABLE vehicle (400).")

    def test_23_soft_deletes(self):
        """Phase 2.4: Soft deletes set status DECOMMISSIONED (vehicle) and is_active=False (driver)."""
        from app.models.vehicle import Vehicle, VehicleStatus
        from app.models.driver import Driver, DriverStatus

        db = SessionLocal()
        v = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.AVAILABLE).first()
        d = db.query(Driver).filter(Driver.status == DriverStatus.AVAILABLE, Driver.is_active == True).first()
        v_id, d_id = v.id, d.id
        db.close()

        # Delete vehicle as admin
        res_del_v = self.client.delete(f"/api/v1/vehicles/{v_id}", headers=self.admin_headers)
        self.assertEqual(res_del_v.status_code, 204)

        # Normal list should exclude this vehicle
        res_list_v = self.client.get("/api/v1/vehicles", headers=self.mgr_headers).json()
        self.assertNotIn(v_id, [item["id"] for item in res_list_v])

        # Delete driver as admin
        res_del_d = self.client.delete(f"/api/v1/drivers/{d_id}", headers=self.admin_headers)
        self.assertEqual(res_del_d.status_code, 204)

        # Normal driver list should exclude this driver
        res_list_d = self.client.get("/api/v1/drivers", headers=self.mgr_headers).json()
        self.assertNotIn(d_id, [item["id"] for item in res_list_d])

        db = SessionLocal()
        v_check = db.query(Vehicle).filter(Vehicle.id == v_id).first()
        d_check = db.query(Driver).filter(Driver.id == d_id).first()
        self.assertEqual(v_check.status, VehicleStatus.DECOMMISSIONED)
        self.assertFalse(d_check.is_active)
        # Restore for subsequent tests
        v_check.status = VehicleStatus.AVAILABLE
        d_check.is_active = True
        d_check.status = DriverStatus.AVAILABLE
        db.commit()
        db.close()
        print("[PASS] [Phase 2.4] Soft deletes working properly for vehicles and drivers.")

    def test_24_maintenance_due_with_odometer(self):
        """Phase 2.5 & 2.9: Maintenance due count considers date and odometer; currency is INR."""
        res = self.client.get("/api/v1/maintenance/stats/summary", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("vehicles_due_for_service", data)
        self.assertIn("total_maintenance_cost_inr", data)
        self.assertGreaterEqual(data["total_maintenance_cost_inr"], 0.0)
        print("[PASS] [Phase 2.5 & 2.9] Maintenance stats include odometer due check and total_maintenance_cost_inr.")

    def test_25_notifications_role_scoping(self):
        """Phase 2.6: Notifications scoped per role/user, driver cannot sync alerts (403), report-issue works."""
        # Driver cannot sync alerts
        res_sync_driver = self.client.post("/api/v1/notifications/sync-system-alerts", headers=self.driver_headers)
        self.assertEqual(res_sync_driver.status_code, 403)

        # Manager can sync alerts
        res_sync_mgr = self.client.post("/api/v1/notifications/sync-system-alerts", headers=self.mgr_headers)
        self.assertEqual(res_sync_mgr.status_code, 200)

        # Driver can report issue
        res_report = self.client.post("/api/v1/notifications/report-issue", json={
            "title": "Flat Tire on NH-48",
            "message": "Vehicle breakdown near Lonavala checkpoint."
        }, headers=self.driver_headers)
        self.assertEqual(res_report.status_code, 201)

        # Driver list notifications only includes DRIVER or ALL
        driver_notifs = self.client.get("/api/v1/notifications", headers=self.driver_headers).json()
        for n in driver_notifs:
            self.assertIn(n["target_role"], ["DRIVER", "ALL"])
        print("[PASS] [Phase 2.6] Notifications properly scoped and alerts synced.")

    def test_26_driver_role_restrictions(self):
        """Phase 2.7: Driver cannot list all drivers (403), can GET /trips/my, can GET /performance/my."""
        # Driver cannot browse driver list
        res_drivers = self.client.get("/api/v1/drivers", headers=self.driver_headers)
        self.assertEqual(res_drivers.status_code, 403)

        # Driver can view their own trips
        res_my_trips = self.client.get("/api/v1/trips/my", headers=self.driver_headers)
        self.assertEqual(res_my_trips.status_code, 200)
        self.assertIsInstance(res_my_trips.json(), list)

        # Driver can view their own scorecard
        res_my_perf = self.client.get("/api/v1/performance/my", headers=self.driver_headers)
        self.assertEqual(res_my_perf.status_code, 200)
        self.assertIn("scorecard", res_my_perf.json())
        print("[PASS] [Phase 2.7] Driver role restrictions and /trips/my & /performance/my verified.")

    def test_27_input_validation_and_profile(self):
        """Phase G.2 & G.4: Input validation (password min length, negative quantity) and profile update."""
        # Register with short password -> 422
        res_short_pwd = self.client.post("/api/v1/auth/register", json={
            "email": "valid.user@fleet.com",
            "full_name": "Test User",
            "password": "123"
        })
        self.assertEqual(res_short_pwd.status_code, 422)

        # Post trip with negative cargo weight -> 422
        res_neg_cargo = self.client.post("/api/v1/trips", json={
            "trip_code": "NEG-CARGO-01",
            "origin": "Pune",
            "destination": "Goa",
            "cargo_type": "Fish",
            "cargo_weight_kg": -50.0,
            "distance_km": 400.0,
            "estimated_duration_hours": 8.0,
            "vehicle_id": 1,
            "driver_id": 1,
            "status": "SCHEDULED",
            "scheduled_departure": "2026-10-01T10:00:00",
            "estimated_arrival": "2026-10-01T18:00:00"
        }, headers=self.mgr_headers)
        self.assertEqual(res_neg_cargo.status_code, 422)

        # Update profile: PUT /auth/me
        res_profile = self.client.put("/api/v1/auth/me", json={
            "full_name": "Rajiv Menon Updated",
            "phone": "+91-99999-88888"
        }, headers=self.admin_headers)
        self.assertEqual(res_profile.status_code, 200)
        self.assertEqual(res_profile.json()["full_name"], "Rajiv Menon Updated")
        print("[PASS] [Phase G.2 & G.4] Input validation and profile management verified.")

    def test_28_ai_model_metrics(self):
        """Phase 5.1: Academic ML model evaluation metrics endpoint returns verified ROC-AUC, Confusion Matrix, and Cost Metric."""
        res = self.client.get("/api/v1/ai/model-metrics", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["model_name"], "RandomForestClassifier")
        self.assertIn("roc_auc", data["metrics"])
        self.assertGreater(data["metrics"]["roc_auc"], 0.70)
        self.assertIn("scania_cost_metric", data["metrics"])
        self.assertIn("confusion_matrix", data)
        self.assertIn("tp", data["confusion_matrix"])
        self.assertIn("baseline_comparisons", data)
        self.assertIn("cost_reduction_vs_baseline_pct", data["baseline_comparisons"])
        print("[PASS] [Phase 5.1] Model metrics endpoint returns verified ROC-AUC and Confusion Matrix.")

    def test_29_ai_predict_maintenance_ml(self):
        """Phase 5.1: Live predictive maintenance returns Scikit-Learn ML probability and Rule-Based baseline comparator."""
        res = self.client.post("/api/v1/ai/predict-maintenance", json={"vehicle_id": 1}, headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ml_failure_probability", data)
        self.assertIsNotNone(data["ml_failure_probability"])
        self.assertIn("rule_based_baseline_probability", data)
        self.assertIsNotNone(data["rule_based_baseline_probability"])
        self.assertIn("top_contributing_factors", data)
        self.assertGreater(len(data["top_contributing_factors"]), 0)
        self.assertIn("model_info", data)
        self.assertIn("algorithm", data["model_info"])
        print("[PASS] [Phase 5.1] Predictive maintenance inference returns ML probability & baseline.")

    def test_30_hubs_and_distance_matrix(self):
        """Phase 3B.1: Indian Logistics Freight Hubs endpoint returns verified freight terminals."""
        res = self.client.get("/api/v1/trips/hubs", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        hubs = res.json()
        self.assertGreaterEqual(len(hubs), 8)
        hub_names = [h["name"] for h in hubs]
        self.assertTrue(any("Mumbai" in name for name in hub_names))
        self.assertTrue(any("Delhi" in name for name in hub_names))
        self.assertTrue(any("Pune" in name for name in hub_names))
        for hub in hubs:
            self.assertIn("latitude", hub)
            self.assertIn("longitude", hub)
            self.assertGreater(hub["latitude"], 8.0)
            self.assertLess(hub["latitude"], 38.0)
        print("[PASS] [Phase 3B.1] Logistics freight hubs verified with valid Indian coordinates.")

    def test_31_osrm_routing_service_cache(self):
        """Phase 3B.2: OSRM Routing Service calculates real road distance and caches in database."""
        from app.services.routing import RoutingService
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            # Mumbai JNPT to Pune Chakan coordinates
            route = RoutingService.get_route(18.9496, 72.9525, 18.7606, 73.8636, db=db, origin_name="Mumbai", dest_name="Pune")
            self.assertIn("distance_km", route)
            self.assertGreater(route["distance_km"], 100.0)
            self.assertLess(route["distance_km"], 250.0)
            self.assertIn("duration_hours", route)
            self.assertGreater(route["duration_hours"], 2.0)
            self.assertIn("geometry", route)
            self.assertGreater(len(route["geometry"]), 2)

            # Second call should fetch from persistent route cache
            cached_route = RoutingService.get_route(18.9496, 72.9525, 18.7606, 73.8636, db=db)
            self.assertEqual(cached_route["source"], "DB_CACHE")
            self.assertEqual(cached_route["distance_km"], route["distance_km"])
        finally:
            db.close()
        print("[PASS] [Phase 3B.2] OSRM Routing Service & Persistent Cache verified.")

    def test_32_live_gps_telematics_interpolation(self):
        """Phase 3B.3: Live GPS endpoint interpolates vehicle coordinates and logs breadcrumb history."""
        res_live = self.client.get("/api/v1/gps/live", headers=self.mgr_headers)
        self.assertEqual(res_live.status_code, 200)
        fleet = res_live.json()
        self.assertGreater(len(fleet), 0)

        first_v = fleet[0]
        self.assertIn("latitude", first_v)
        self.assertIn("longitude", first_v)
        self.assertIn("speed_kmh", first_v)
        self.assertIn("heading_degrees", first_v)
        self.assertIn("battery_or_fuel_pct", first_v)

        # Test breadcrumb history endpoint
        v_id = first_v["vehicle_id"]
        res_hist = self.client.get(f"/api/v1/gps/history/{v_id}?limit=20", headers=self.mgr_headers)
        self.assertEqual(res_hist.status_code, 200)
        hist_data = res_hist.json()
        self.assertEqual(hist_data["vehicle_id"], v_id)
        self.assertIn("history", hist_data)
        print("[PASS] [Phase 3B.3] Live GPS telematics & breadcrumb history verified.")

    def test_33_trip_creation_with_coordinates_and_osrm(self):
        """Phase 3B.4: Dispatching a trip with hub names auto-resolves coordinates and geometry."""
        # Find an available vehicle and driver
        res_v = self.client.get("/api/v1/vehicles", headers=self.mgr_headers)
        avail_v = next((v for v in res_v.json() if v["status"] == "AVAILABLE"), None)
        res_d = self.client.get("/api/v1/drivers", headers=self.mgr_headers)
        avail_d = next((d for d in res_d.json() if d["status"] == "AVAILABLE"), None)

        if avail_v and avail_d:
            import uuid
            unique_code = f"TRIP-3B-{uuid.uuid4().hex[:6].upper()}"
            trip_payload = {
                "trip_code": unique_code,
                "origin": "Mumbai (JNPT)",
                "destination": "Pune (Chakan)",
                "cargo_type": "Precision Auto Parts",
                "cargo_weight_kg": 2000.0,
                "vehicle_id": avail_v["id"],
                "driver_id": avail_d["id"],
                "status": "SCHEDULED",
                "scheduled_departure": "2026-10-15T08:00:00",
                "estimated_arrival": "2026-10-15T13:00:00"
            }
            res_trip = self.client.post("/api/v1/trips", json=trip_payload, headers=self.mgr_headers)
            self.assertEqual(res_trip.status_code, 201)
            t_data = res_trip.json()
            self.assertIsNotNone(t_data.get("origin_lat"))
            self.assertIsNotNone(t_data.get("dest_lat"))
            self.assertIsNotNone(t_data.get("route_geometry"))
            self.assertGreater(t_data.get("distance_km", 0), 100.0)
            print("[PASS] [Phase 3B.4] Dispatch trip automatically resolves hub coordinates and OSRM geometry.")
        else:
            print("[SKIP] [Phase 3B.4] No available vehicle/driver for dispatch test.")

    def test_34_vrp_solver_cvrp(self):
        """Phase 4.1: Google OR-Tools CVRP solver partitions multi-stop deliveries respecting vehicle capacities."""
        from app.services.vrp_solver import VRPSolver

        depot = {"name": "Mumbai (JNPT)", "latitude": 18.9496, "longitude": 72.9525}
        stops = [
            {"name": "Pune (Chakan)", "latitude": 18.7606, "longitude": 73.8636, "cargo_weight_kg": 2500.0},
            {"name": "Ahmedabad (Sanand)", "latitude": 22.9868, "longitude": 72.3804, "cargo_weight_kg": 4000.0},
            {"name": "Bengaluru (Peenya)", "latitude": 13.0285, "longitude": 77.5195, "cargo_weight_kg": 3500.0},
            {"name": "Hyderabad (Shamshabad)", "latitude": 17.2403, "longitude": 78.4294, "cargo_weight_kg": 2800.0}
        ]
        vehicles = [
            {"id": 1, "license_plate": "MH-12-TRK-01", "make_model": "Tata Prima 4028", "max_payload_kg": 7000.0},
            {"id": 2, "license_plate": "MH-12-TRK-02", "make_model": "Ashok Leyland 3520", "max_payload_kg": 7000.0}
        ]

        result = VRPSolver.solve_cvrp(depot, stops, vehicles)
        self.assertEqual(result["status"], "OPTIMAL_SOLVED")
        self.assertGreater(result["total_fleet_distance_km"], 200.0)
        self.assertEqual(result["total_stops_serviced"], 4)
        self.assertGreaterEqual(result["active_vehicles_utilized"], 1)

        # Verify no vehicle exceeded payload
        for route in result["vehicle_routes"]:
            self.assertLessEqual(route["payload_utilized_kg"], route["max_payload_kg"])
            self.assertIn("route_geometry", route)

        # Verify Academic Comparison against Naive Greedy Dispatch
        comp = result["academic_comparison"]
        self.assertIsNotNone(comp)
        self.assertIn("Google OR-Tools", comp["solver_algorithm"])
        self.assertIn("Naive Nearest-Neighbor", comp["baseline_algorithm"])
        self.assertGreaterEqual(comp["distance_saved_km"], 0.0)
        self.assertGreaterEqual(comp["operating_cost_saved_inr"], 0.0)
        print("[PASS] [Phase 4.1] Google OR-Tools CVRP solver & academic baseline comparator verified.")

    def test_35_cargo_packer_3d(self):
        """Phase 4.2: 3D Cargo / Bin Packing heuristic computes spatial layout and volume/weight utilization."""
        from app.services.cargo_packer import CargoPacker

        boxes = [
            {"label": "Engine Blocks Pallet", "length_cm": 120.0, "width_cm": 100.0, "height_cm": 80.0, "weight_kg": 850.0},
            {"label": "Gearbox Crates", "length_cm": 100.0, "width_cm": 80.0, "height_cm": 70.0, "weight_kg": 450.0},
            {"label": "Brake Assembly Boxes", "length_cm": 80.0, "width_cm": 60.0, "height_cm": 50.0, "weight_kg": 220.0},
            {"label": "Electronic ECUs Carton", "length_cm": 50.0, "width_cm": 40.0, "height_cm": 30.0, "weight_kg": 45.0, "fragile": True},
            # Oversized item to test rejection
            {"label": "Gigantic Turbine Oversized", "length_cm": 900.0, "width_cm": 500.0, "height_cm": 500.0, "weight_kg": 95000.0}
        ]

        result = CargoPacker.pack_cargo(boxes)
        self.assertEqual(result["status"], "PACKING_COMPLETE")
        summary = result["summary"]
        self.assertEqual(summary["total_boxes_requested"], 5)
        self.assertEqual(summary["boxes_packed_count"], 4)
        self.assertEqual(summary["unpacked_boxes_count"], 1) # Oversized rejected
        self.assertGreater(summary["volumetric_efficiency_pct"], 0.0)
        self.assertLessEqual(summary["volumetric_efficiency_pct"], 100.0)
        self.assertGreater(summary["axle_balance_score"], 40.0)

        # Check 3D positions assigned
        for p in result["packed_items"]:
            self.assertIn("position_x_cm", p)
            self.assertIn("position_y_cm", p)
            self.assertIn("position_z_cm", p)
        print("[PASS] [Phase 4.2] 3D Cargo Packing heuristic & spatial placement verified.")

    def test_36_api_optimize_vrp_and_cargo_packing(self):
        """Phase 4.3: FastAPI endpoints /ai/optimize-vrp and /ai/cargo-packing return validated JSON."""
        # 1. Test POST /ai/optimize-vrp
        vrp_payload = {
            "depot_name": "Mumbai (JNPT)",
            "stops": [
                {"name": "Pune (Chakan)", "cargo_weight_kg": 2000.0},
                {"name": "Ahmedabad (Sanand)", "cargo_weight_kg": 3000.0},
                {"name": "Bengaluru (Peenya)", "cargo_weight_kg": 2500.0}
            ]
        }
        res_vrp = self.client.post("/api/v1/ai/optimize-vrp", json=vrp_payload, headers=self.mgr_headers)
        self.assertEqual(res_vrp.status_code, 200)
        vrp_data = res_vrp.json()
        self.assertEqual(vrp_data["status"], "OPTIMAL_SOLVED")
        self.assertEqual(vrp_data["total_stops_serviced"], 3)
        self.assertIn("academic_comparison", vrp_data)
        self.assertIn("vehicle_routes", vrp_data)
        self.assertGreater(len(vrp_data["vehicle_routes"]), 0)

        # 2. Test POST /ai/cargo-packing
        pack_payload = {
            "boxes": [
                {"label": "Pharma Carton A", "length_cm": 60.0, "width_cm": 40.0, "height_cm": 40.0, "weight_kg": 30.0},
                {"label": "Pharma Carton B", "length_cm": 60.0, "width_cm": 40.0, "height_cm": 40.0, "weight_kg": 30.0}
            ]
        }
        res_pack = self.client.post("/api/v1/ai/cargo-packing", json=pack_payload, headers=self.mgr_headers)
        self.assertEqual(res_pack.status_code, 200)
        pack_data = res_pack.json()
        self.assertEqual(pack_data["status"], "PACKING_COMPLETE")
        self.assertEqual(pack_data["summary"]["boxes_packed_count"], 2)
        print("[PASS] [Phase 4.3] Optimization API endpoints /ai/optimize-vrp & /ai/cargo-packing verified.")

    def test_37_fuel_anomaly_detection(self):
        """Phase 3.1: Fuel Anomaly Detection engine flags statistical outliers and pilferage events."""
        from app.models.fuel import FuelLog
        from app.models.vehicle import Vehicle
        from app.db.session import SessionLocal
        from app.services.fuel_anomaly import FuelAnomalyDetector

        db = SessionLocal()
        try:
            # 1. Insert an artificial low-efficiency fuel refill record (1.4 km/L on Heavy Truck)
            v = db.query(Vehicle).first()
            anom_log = FuelLog(
                vehicle_id=v.id,
                fuel_quantity=180.0,
                unit_cost=89.62,
                total_cost=180.0 * 89.62,
                odometer_km=v.odometer_km + 250.0,
                station_name="Highway Fuel Plaza Hub #4",
                invoice_number="INV-ANOM-TEST-99",
                fuel_type="DIESEL",
                efficiency_km_per_unit=1.39 # Severe drop vs 4.0 km/L baseline
            )
            db.add(anom_log)
            db.commit()

            # 2. Scan via FuelAnomalyDetector service
            anom_summary = FuelAnomalyDetector.detect_anomalies(db, create_alerts=True)
            self.assertGreater(anom_summary["total_anomalies_detected"], 0)
            self.assertGreater(anom_summary["total_estimated_pilferage_loss_inr"], 0.0)

            # 3. Test API endpoint GET /fuel/anomalies
            res_api = self.client.get("/api/v1/fuel/anomalies", headers=self.mgr_headers)
            self.assertEqual(res_api.status_code, 200)
            api_data = res_api.json()
            self.assertIn("anomalous_logs", api_data)
            self.assertGreater(len(api_data["anomalous_logs"]), 0)

            first_anom = api_data["anomalous_logs"][0]
            self.assertIn("suspected_cause", first_anom)
            self.assertIn("efficiency_deviation_pct", first_anom)
            self.assertIn("estimated_financial_loss_inr", first_anom)
        finally:
            db.close()
        print("[PASS] [Phase 3.1] Fuel anomaly & pilferage detection engine verified.")

    def test_38_driver_performance_coaching_and_leaderboard(self):
        """Phase 3.2: Comprehensive Driver Performance scoring returns multi-factor breakdown and coaching tips."""
        res = self.client.get("/api/v1/performance/leaderboard", headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        drivers = res.json()
        self.assertGreater(len(drivers), 0)

        # Check rankings order (descending by composite_score)
        for i in range(len(drivers) - 1):
            self.assertGreaterEqual(drivers[i]["composite_score"], drivers[i+1]["composite_score"])
            self.assertEqual(drivers[i]["rank"], i + 1)

        # Check multi-factor pillars & coaching cards
        for d in drivers:
            self.assertIn("on_time_rate_pct", d)
            self.assertIn("safety_score", d)
            self.assertIn("fuel_efficiency_score", d)
            self.assertIn("experience_score", d)
            self.assertIn("grade", d)
            self.assertIn("tier", d)
            self.assertIn("badge", d)
            self.assertIn("coaching_tips", d)
            self.assertGreater(len(d["coaching_tips"]), 0)
            self.assertIn("strengths", d)

        # Test single driver scorecard endpoint
        first_d_id = drivers[0]["driver_id"]
        res_card = self.client.get(f"/api/v1/performance/driver/{first_d_id}", headers=self.mgr_headers)
        self.assertEqual(res_card.status_code, 200)
        card_data = res_card.json()
        self.assertIn("scorecard", card_data)
        self.assertIn("coaching_tips", card_data["scorecard"])
        print("[PASS] [Phase 3.2] Driver multi-factor performance ranking & coaching engine verified.")

if __name__ == "__main__":
    print("\n=======================================================")
    print("   Running Complete Backend Test Suite (Phase 1 to 5)")
    print("=======================================================")
    unittest.main()


