import logging
from sqlalchemy.orm import Session
from app.db.session import engine
from app.models.base import Base

logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    """Initialize database tables only. Seeding is done via `python seed.py`."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created / verified successfully.")
