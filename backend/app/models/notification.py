import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from app.models.base import Base

class NotificationType(str, enum.Enum):
    MAINTENANCE_DUE = "MAINTENANCE_DUE"
    INSURANCE_EXPIRY = "INSURANCE_EXPIRY"
    PUC_EXPIRY = "PUC_EXPIRY"
    DELIVERY_DELAY = "DELIVERY_DELAY"
    VEHICLE_AVAILABLE = "VEHICLE_AVAILABLE"
    AI_ANOMALY = "AI_ANOMALY"
    SYSTEM = "SYSTEM"

class NotificationSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null means broadcast to all managers/admins
    target_role = Column(String, default="ALL", nullable=False)     # "ADMIN", "FLEET_MANAGER", "DRIVER", "ALL"
    
    notification_type = Column(Enum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    severity = Column(Enum(NotificationSeverity), default=NotificationSeverity.INFO, nullable=False)
    
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link_url = Column(String, nullable=True)
    
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Notification {self.title} [{self.severity}] - Read: {self.is_read}>"
