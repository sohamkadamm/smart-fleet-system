import argparse
import sys
import os

# Ensure app package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.db.seed_large_dataset import seed_large_fleet_dataset
from app.core.config import settings

def main():
    parser = argparse.ArgumentParser(description="Smart Fleet Database Initializer & Dataset Seeder")
    parser.add_argument("--reset", action="store_true", help="Drop all existing tables and re-create from scratch")
    args = parser.parse_args()

    print("===================================================================")
    print("  Smart Fleet Management - Database Connector & Dataset Loader")
    print(f"  Target Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print("===================================================================")

    if args.reset:
        print("[!] Dropping existing tables for clean database reset...")
        Base.metadata.drop_all(bind=engine)
        print("✓ Existing tables dropped.")

    print("Creating database schema tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("✓ Schema initialized successfully.")

    db = SessionLocal()
    try:
        # The seed function itself checks if the DB is already populated.
        # It will only seed if no users exist (or if tables were just dropped via --reset).
        print("Seeding commercial fleet logistics dataset...")
        seed_large_fleet_dataset(db, num_vehicles=16, num_drivers=16, num_trips=35)
        print("✓ Dataset seeding completed!")

        from app.models.user import User
        from app.models.vehicle import Vehicle
        from app.models.driver import Driver
        from app.models.trip import Trip
        from app.models.fuel import FuelLog
        from app.models.maintenance import MaintenanceRecord
        from app.models.notification import Notification

        print("\n--- Summary of Data in Database ---")
        print(f"  • Registered Users:       {db.query(User).count()}")
        print(f"  • Fleet Vehicles:         {db.query(Vehicle).count()}")
        print(f"  • Commercial Drivers:     {db.query(Driver).count()}")
        print(f"  • Freight Delivery Trips: {db.query(Trip).count()}")
        print(f"  • Fuel / EV Charge Logs:  {db.query(FuelLog).count()}")
        print(f"  • Maintenance Records:    {db.query(MaintenanceRecord).count()}")
        print(f"  • System Notifications:   {db.query(Notification).count()}")
        print("===================================================================")
        print("[OK] Database connection and dataset are active and ready!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
