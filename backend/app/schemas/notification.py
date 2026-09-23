from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType, NotificationSeverity

class NotificationBase(BaseModel):
    target_role: str = "ALL"
    notification_type: NotificationType = NotificationType.SYSTEM
    severity: NotificationSeverity = NotificationSeverity.INFO
    title: str
    message: str
    link_url: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None

class IssueReportCreate(BaseModel):
    title: str
    message: str

class NotificationResponse(NotificationBase):
    id: int
    user_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationSummaryStats(BaseModel):
    total_notifications: int
    unread_count: int
    critical_count: int
    warning_count: int
