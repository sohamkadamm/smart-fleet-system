import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL

# Fix legacy postgres:// URL format if supplied by cloud providers
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}

if db_url.startswith("sqlite"):
    engine_kwargs = {
        "connect_args": {"check_same_thread": False},
        "echo": False
    }
else:
    # PostgreSQL configuration
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "echo": False
    }

try:
    engine = create_engine(db_url, **engine_kwargs)
    logger.info(f"Database engine initialized for: {db_url.split('@')[-1] if '@' in db_url else db_url}")
except Exception as e:
    logger.error(f"Failed to initialize database engine for {db_url}: {e}")
    # Fallback to local SQLite if remote PostgreSQL connection fails
    fallback_url = "sqlite:///./fleet.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
    logger.warning(f"Falling back to local SQLite database at {fallback_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
