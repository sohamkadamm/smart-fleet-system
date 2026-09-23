import os
import sys
import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.db.init_db import init_db

class TestVehicleManagement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            init_db(db)
        finally:
            db.close()
        cls.client = TestClient(app)

        # Obtain Admin token
        res_admin = cls.client.post("/api/v1/auth/login", json={"email": "admin@fleet.com", "password": "Admin@123"})
        cls.admin_token = res_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Obtain Manager token
        res_mgr = cls.client.post("/api/v1/auth/login", json={"email": "manager@fleet.com", "password": "Manager@123"})
        cls.manager_token = res_mgr.json()["access_token"]
        cls.manager_headers = {"Authorization": f"Bearer {cls.manager_token}"}

        # Obtain Driver token
        res_drv = cls.client.post("/api/v1/auth/login", json={"email": "driver@fleet.com", "password": "Driver@123"})
        cls.driver_token = res_drv.json()["access_token"]
        cls.driver_headers = {"Authorization": f"Bearer {cls.driver_token}"}

    def test_01_list_vehicles(self):
        res = self.client.get("/api/v1/vehicles", headers=self.driver_headers)
        self.assertEqual(res.status_code, 200)
        vehicles = res.json()
        self.assertGreaterEqual(len(vehicles), 4)
        print("✓ Listed seeded fleet vehicles successfully.")

    def test_02_vehicle_summary_stats(self):
        res = self.client.get("/api/v1/vehicles/stats/summary", headers=self.manager_headers)
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_vehicles", stats)
        self.assertIn("available_vehicles", stats)
        self.assertIn("on_trip_vehicles", stats)
        self.assertIn("in_maintenance_vehicles", stats)
        self.assertIn("compliance_alerts", stats)
        print(f"✓ Summary stats verified (Total: {stats['total_vehicles']}, Compliance Alerts: {stats['compliance_alerts']}).")

    def test_03_create_new_vehicle(self):
        today = date.today()
        payload = {
            "license_plate": "TEST-EV-999",
            "vin": "1TESTVIN999888777",
            "make": "Tesla",
            "model": "Semi Logistics",
            "year": 2024,
            "vehicle_type": "TRUCK",
            "fuel_type": "ELECTRIC",
            "fuel_capacity": 500.0,
            "max_payload_kg": 36000.0,
            "odometer_km": 500.0,
            "status": "AVAILABLE",
            "insurance_number": "POL-TEST-999",
            "insurance_expiry": (today + timedelta(days=365)).isoformat(),
            "puc_number": "PUC-TEST-999",
            "puc_expiry": (today + timedelta(days=365)).isoformat()
        }
        res = self.client.post("/api/v1/vehicles", json=payload, headers=self.manager_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["license_plate"], "TEST-EV-999")
        self.__class__.created_vehicle_id = data["id"]
        print("✓ Created new vehicle via Fleet Manager credentials.")

    def test_04_status_toggle(self):
        v_id = self.__class__.created_vehicle_id
        res = self.client.patch(
            f"/api/v1/vehicles/{v_id}/status",
            json={"status": "ON_TRIP"},
            headers=self.manager_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ON_TRIP")
        print("✓ Updated vehicle operational status to ON_TRIP.")

    def test_05_search_and_filter(self):
        # Filter by ELECTRIC
        res = self.client.get("/api/v1/vehicles?fuel_type=ELECTRIC", headers=self.manager_headers)
        self.assertEqual(res.status_code, 200)
        for v in res.json():
            self.assertEqual(v["fuel_type"], "ELECTRIC")
        print("✓ Fuel type filter verified.")

    def test_06_rbac_delete_protection(self):
        v_id = self.__class__.created_vehicle_id

        # Driver cannot delete
        res_drv = self.client.delete(f"/api/v1/vehicles/{v_id}", headers=self.driver_headers)
        self.assertEqual(res_drv.status_code, 403)

        # Admin can delete
        res_admin = self.client.delete(f"/api/v1/vehicles/{v_id}", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 204)
        print("✓ Vehicle deletion RBAC verified (Driver denied, Admin allowed).")

if __name__ == "__main__":
    print("\n--- Running Module 2 Vehicle Management Test Suite ---")
    unittest.main()
