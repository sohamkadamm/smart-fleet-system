import sys
import os

# Ensure app package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.db.init_db import init_db

def main():
    print("===================================================================")
    print("  Initializing Smart Fleet Database & Seeding Real-World Dataset   ")
    print("===================================================================")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        init_db(db)
        print("✓ Database initialized and populated with comprehensive dataset!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
