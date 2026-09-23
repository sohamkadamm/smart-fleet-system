import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Fleet Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database Configuration:
    # - SQLite: "sqlite:///./fleet.db" (Zero-friction local dev)
    # - PostgreSQL: "postgresql://username:password@localhost:5432/fleet_db"
    # - Neon/Supabase: "postgresql+psycopg2://user:password@host/database?sslmode=require"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fleet.db")

    # CORS origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
