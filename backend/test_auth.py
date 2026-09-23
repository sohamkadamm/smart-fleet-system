import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure app package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.db.init_db import init_db

class TestAuthAndRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            init_db(db)
        finally:
            db.close()
        cls.client = TestClient(app)

    def test_01_root_and_health(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "healthy")
        print("✓ Root and Health check passed.")

    def test_02_admin_login(self):
        payload = {
            "email": "admin@fleet.com",
            "password": "Admin@123"
        }
        res = self.client.post("/api/v1/auth/login", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "ADMIN")
        print("✓ Admin Login & JWT issuance passed.")

    def test_03_manager_and_driver_login(self):
        # Manager Login
        res_mgr = self.client.post("/api/v1/auth/login", json={"email": "manager@fleet.com", "password": "Manager@123"})
        self.assertEqual(res_mgr.status_code, 200)
        self.assertEqual(res_mgr.json()["user"]["role"], "FLEET_MANAGER")

        # Driver Login
        res_drv = self.client.post("/api/v1/auth/login", json={"email": "driver@fleet.com", "password": "Driver@123"})
        self.assertEqual(res_drv.status_code, 200)
        self.assertEqual(res_drv.json()["user"]["role"], "DRIVER")
        print("✓ Fleet Manager and Driver logins passed.")

    def test_04_user_registration(self):
        payload = {
            "email": "new.driver@fleet.com",
            "password": "SecurePassword123!",
            "full_name": "New Logistics Driver",
            "phone": "+1-555-9999",
            "role": "DRIVER"
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["user"]["email"], "new.driver@fleet.com")
        self.assertIn("access_token", data)
        print("✓ User self-registration passed.")

    def test_05_rbac_protection(self):
        # 1. Login as Driver
        drv_token = self.client.post("/api/v1/auth/login", json={"email": "driver@fleet.com", "password": "Driver@123"}).json()["access_token"]
        
        # 2. Driver attempts to access Admin-only /api/v1/auth/users -> Should be 403 Forbidden
        drv_headers = {"Authorization": f"Bearer {drv_token}"}
        res_denied = self.client.get("/api/v1/auth/users", headers=drv_headers)
        self.assertEqual(res_denied.status_code, 403)

        # 3. Login as Admin
        admin_token = self.client.post("/api/v1/auth/login", json={"email": "admin@fleet.com", "password": "Admin@123"}).json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 4. Admin accesses /api/v1/auth/users -> Should succeed 200 OK
        res_allowed = self.client.get("/api/v1/auth/users", headers=admin_headers)
        self.assertEqual(res_allowed.status_code, 200)
        users = res_allowed.json()
        self.assertGreaterEqual(len(users), 4)
        print("✓ RBAC route protection & permissions verified (Driver forbidden, Admin allowed).")

    def test_06_current_user_profile(self):
        token = self.client.post("/api/v1/auth/login", json={"email": "manager@fleet.com", "password": "Manager@123"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["email"], "manager@fleet.com")
        print("✓ Auth /me profile endpoint verified.")

    def test_07_stats_endpoint(self):
        token = self.client.post("/api/v1/auth/login", json={"email": "admin@fleet.com", "password": "Admin@123"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res = self.client.get("/api/v1/auth/stats", headers=headers)
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_users", stats)
        self.assertIn("admins", stats)
        self.assertIn("fleet_managers", stats)
        self.assertIn("drivers", stats)
        print("✓ User statistics endpoint verified.")

if __name__ == "__main__":
    print("\n--- Running Module 1 Backend & RBAC Test Suite ---")
    unittest.main()
