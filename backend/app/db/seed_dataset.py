import logging
from sqlalchemy.orm import Session
from app.db.seed_large_dataset import seed_large_fleet_dataset

logger = logging.getLogger(__name__)

def seed_comprehensive_dataset(db: Session, force_reset: bool = False) -> None:
    """Populate database with Indian logistics commercial dataset."""
    seed_large_fleet_dataset(db, num_vehicles=16, num_drivers=16, num_trips=35)
    logger.info("Loaded comprehensive Indian logistics dataset successfully.")
