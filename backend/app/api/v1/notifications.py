from datetime import datetime, date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_manager_or_admin
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationSeverity
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip, TripStatus
from app.models.maintenance import MaintenanceRecord, MaintenanceStatus
from app.core.ai_engine import ai_engine
from app.schemas.notification import (
    NotificationResponse,
    NotificationSummaryStats,
    IssueReportCreate
)

router = APIRouter(prefix="/notifications", tags=["Alerts & Notifications Engine"])

def get_user_scoped_notifications_query(db: Session, current_user: User):
    """Filter notifications visible to the current user based on user_id or target_role."""
    return db.query(Notification).filter(
        (Notification.user_id == current_user.id) |
        (Notification.target_role == current_user.role.value) |
        (Notification.target_role == "ALL")
    )

@router.get("/stats/summary", response_model=NotificationSummaryStats)
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    base_query = get_user_scoped_notifications_query(db, current_user)
    total = base_query.count()
    unread = base_query.filter(Notification.is_read == False).count()
    critical = base_query.filter(Notification.severity == NotificationSeverity.CRITICAL).count()
    warning = base_query.filter(Notification.severity == NotificationSeverity.WARNING).count()

    return {
        "total_notifications": total,
        "unread_count": unread,
        "critical_count": critical,
        "warning_count": warning
    }

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all alerts and notifications scoped for the current user."""
    notifications = get_user_scoped_notifications_query(db, current_user).order_by(
        Notification.is_read.asc(),
        Notification.id.desc()
    ).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    # Enforce scoping: user cannot read another user's private notification
    is_visible = (
        notif.user_id == current_user.id or
        notif.target_role == current_user.role.value or
        notif.target_role == "ALL"
    )
    if not is_visible:
        raise HTTPException(status_code=403, detail="Not authorized to access this notification.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark only the current user's visible notifications as read."""
    scoped = get_user_scoped_notifications_query(db, current_user)
    scoped.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All visible notifications marked as read."}

@router.post("/report-issue", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def report_issue(
    issue: IssueReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Driver / Any User) Report an operational or route issue to fleet managers."""
    notif = Notification(
        user_id=None,
        target_role="FLEET_MANAGER",
        notification_type=NotificationType.SYSTEM,
        severity=NotificationSeverity.WARNING,
        title=f"Driver Issue: {issue.title.strip()}",
        message=f"Reported by {current_user.full_name} ({current_user.email}): {issue.message.strip()}",
        link_url="/drivers"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/sync-system-alerts")
def sync_system_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Scan fleet for document renewals, maintenance, delayed deliveries, and generate alerts (Admin & Manager only)."""
    today = date.today()
    threshold = today + timedelta(days=30)
    alerts_created = 0

    # 1. Check Vehicle Insurance & PUC
    vehicles = db.query(Vehicle).all()
    for v in vehicles:
        if v.insurance_expiry and v.insurance_expiry <= threshold:
            title = f"Vehicle Insurance Due: {v.license_plate}"
            msg = f"Insurance policy for {v.make} {v.model} ({v.license_plate}) expires on {v.insurance_expiry}."
            if not db.query(Notification).filter(Notification.title == title).first():
                db.add(Notification(
                    notification_type=NotificationType.INSURANCE_EXPIRY,
                    severity=NotificationSeverity.WARNING if v.insurance_expiry >= today else NotificationSeverity.CRITICAL,
                    title=title,
                    message=msg,
                    link_url="/vehicles"
                ))
                alerts_created += 1

        if v.puc_expiry and v.puc_expiry <= threshold:
            title = f"Vehicle PUC Expiry Alert: {v.license_plate}"
            msg = f"Pollution Certificate for {v.license_plate} expires on {v.puc_expiry}."
            if not db.query(Notification).filter(Notification.title == title).first():
                db.add(Notification(
                    notification_type=NotificationType.PUC_EXPIRY,
                    severity=NotificationSeverity.WARNING if v.puc_expiry >= today else NotificationSeverity.CRITICAL,
                    title=title,
                    message=msg,
                    link_url="/vehicles"
                ))
                alerts_created += 1

    # 2. Check Driver Licenses
    drivers = db.query(Driver).all()
    for d in drivers:
        if d.license_expiry and d.license_expiry <= threshold:
            title = f"Driver License Expiry: {d.full_name}"
            msg = f"Commercial driver license for {d.full_name} ({d.license_number}) expires on {d.license_expiry}."
            if not db.query(Notification).filter(Notification.title == title).first():
                db.add(Notification(
                    notification_type=NotificationType.SYSTEM,
                    severity=NotificationSeverity.WARNING,
                    title=title,
                    message=msg,
                    link_url="/drivers"
                ))
                alerts_created += 1

    # 3. Check Scheduled Maintenance Records Due (by date or odometer)
    scheduled_maint = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.status == MaintenanceStatus.SCHEDULED
    ).all()
    for m in scheduled_maint:
        is_date_due = bool(m.next_service_due_date and m.next_service_due_date <= today)
        is_odo_due = bool(m.vehicle and m.next_service_due_odometer and m.vehicle.odometer_km >= m.next_service_due_odometer)
        if is_date_due or is_odo_due:
            plate = m.vehicle.license_plate if m.vehicle else f"Vehicle #{m.vehicle_id}"
            title = f"Maintenance Due: {plate} ({m.service_type.value})"
            reason = "due date reached" if is_date_due else f"odometer reached {m.next_service_due_odometer} km"
            msg = f"Scheduled service '{m.service_type.value}' is due for {plate} ({reason})."
            if not db.query(Notification).filter(Notification.title == title).first():
                db.add(Notification(
                    notification_type=NotificationType.MAINTENANCE_DUE,
                    severity=NotificationSeverity.CRITICAL if (m.next_service_due_date and m.next_service_due_date < today) else NotificationSeverity.WARNING,
                    title=title,
                    message=msg,
                    link_url="/maintenance"
                ))
                alerts_created += 1

    # 4. Check Delayed Deliveries (IN_TRANSIT past estimated_arrival)
    now = datetime.utcnow()
    delayed_trips = db.query(Trip).filter(
        Trip.status == TripStatus.IN_TRANSIT,
        Trip.estimated_arrival < now
    ).all()
    for t in delayed_trips:
        title = f"Delayed Delivery: Trip {t.trip_code}"
        msg = f"Trip {t.trip_code} ({t.origin} -> {t.destination}) is in transit past its estimated arrival ({t.estimated_arrival})."
        if not db.query(Notification).filter(Notification.title == title).first():
            db.add(Notification(
                notification_type=NotificationType.DELIVERY_DELAY,
                severity=NotificationSeverity.WARNING,
                title=title,
                message=msg,
                link_url="/trips"
            ))
            alerts_created += 1

    # 5. Check High Maintenance Risk Vehicles
    for v in vehicles:
        pred = ai_engine.predict_maintenance_risk(
            odometer_km=v.odometer_km,
            year=v.year,
            days_since_last_service=90,
            vehicle_type=v.vehicle_type.value,
            fuel_type=v.fuel_type.value
        )
        if pred["risk_level"] == "CRITICAL":
            title = f"AI Risk Alert: {v.license_plate} High Breakdown Risk"
            msg = f"Predictive engine flagged {v.license_plate} ({v.make} {v.model}) with {pred['failure_probability_pct']}% failure probability."
            if not db.query(Notification).filter(Notification.title == title).first():
                db.add(Notification(
                    notification_type=NotificationType.AI_ANOMALY,
                    severity=NotificationSeverity.CRITICAL,
                    title=title,
                    message=msg,
                    link_url="/ai"
                ))
                alerts_created += 1

    db.commit()
    return {"message": f"System alerts synchronized. Created {alerts_created} new notifications."}
