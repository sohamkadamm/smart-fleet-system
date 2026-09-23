from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.fuel import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.notification import Notification, NotificationType, NotificationSeverity

class FuelAnomalyDetector:
    """
    Statistical Fuel Consumption & Pilferage Anomaly Detection Engine:
    - Benchmarks each refill log against empirical vehicle-type fuel efficiency distributions.
    - Flags statistical outliers (< 60% of baseline efficiency, sudden drops, or invoice volume surges).
    - Identifies suspected root causes: Fuel Siphoning / Pilferage, Injector Leak, or Meter Tampering.
    - Computes estimated financial loss in INR (₹).
    - Automatically syncs critical events with the Fleet Alert Notification stream.
    """

    BASELINE_EFFICIENCY_KM_PER_L = {
        "TRUCK": 4.0,       # Commercial Heavy HMV (e.g. Tata Prima / Ashok Leyland)
        "CONTAINER": 3.4,   # Heavy 40ft Container Hauler
        "TRAILER": 3.1,     # Multi-axle Heavy Trailer
        "VAN": 10.5,        # Light Commercial Vehicle
        "PICKUP": 12.0      # Utility / Pickup
    }

    TANK_CAPACITY_LITERS = {
        "TRUCK": 380.0,
        "CONTAINER": 400.0,
        "TRAILER": 450.0,
        "VAN": 80.0,
        "PICKUP": 75.0
    }

    @classmethod
    def detect_anomalies(
        cls,
        db: Session,
        create_alerts: bool = True
    ) -> Dict[str, Any]:
        """
        Scans all fuel logs across the fleet and returns detected anomalies with financial impact.
        """
        logs = (
            db.query(FuelLog)
            .join(Vehicle, FuelLog.vehicle_id == Vehicle.id)
            .order_by(FuelLog.refill_date.desc(), FuelLog.id.desc())
            .all()
        )

        anomalies = []
        total_pilferage_loss_inr = 0.0
        critical_count = 0

        for log in logs:
            vehicle = log.vehicle
            driver = log.driver
            if not vehicle:
                continue

            v_type = vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else str(vehicle.vehicle_type)
            baseline_eff = cls.BASELINE_EFFICIENCY_KM_PER_L.get(v_type, 4.0)
            max_tank = cls.TANK_CAPACITY_LITERS.get(v_type, 380.0)

            is_anomaly = False
            suspected_cause = ""
            severity = NotificationSeverity.WARNING
            loss_inr = 0.0
            deviation_pct = 0.0

            # 1. Check severe low mileage (Fuel Siphoning / Mechanical Leak)
            if log.efficiency_km_per_unit is not None and log.efficiency_km_per_unit > 0:
                eff = float(log.efficiency_km_per_unit)
                if eff < (baseline_eff * 0.65):
                    is_anomaly = True
                    deviation_pct = round(((baseline_eff - eff) / baseline_eff) * 100.0, 1)

                    # Compute estimated excess liters consumed/siphoned
                    # Expected liters = (Distance traveled) / baseline_efficiency
                    # Distance traveled = efficiency * log.fuel_quantity
                    distance_traveled = eff * log.fuel_quantity
                    expected_liters = distance_traveled / baseline_eff
                    excess_liters = max(0.0, log.fuel_quantity - expected_liters)
                    loss_inr = round(excess_liters * log.unit_cost, 2)

                    if deviation_pct >= 45.0 or eff < 2.0:
                        suspected_cause = "Suspected Fuel Siphoning / Pilferage"
                        severity = NotificationSeverity.CRITICAL
                    else:
                        suspected_cause = "Fuel Injector Leak / Excessive Idling"
                        severity = NotificationSeverity.WARNING

            # 2. Check Over-capacity Invoice Tampering
            elif log.fuel_quantity > (max_tank * 1.15):
                is_anomaly = True
                excess_liters = round(log.fuel_quantity - max_tank, 1)
                loss_inr = round(excess_liters * log.unit_cost, 2)
                deviation_pct = round(((log.fuel_quantity - max_tank) / max_tank) * 100.0, 1)
                suspected_cause = "Invoice Over-billing / Tank Capacity Overflow"
                severity = NotificationSeverity.CRITICAL if loss_inr > 2500 else NotificationSeverity.WARNING

            if is_anomaly:
                if severity == NotificationSeverity.CRITICAL:
                    critical_count += 1
                total_pilferage_loss_inr += loss_inr

                anomaly_record = {
                    "fuel_log_id": log.id,
                    "vehicle_id": vehicle.id,
                    "license_plate": vehicle.license_plate,
                    "vehicle_type": v_type,
                    "driver_id": driver.id if driver else None,
                    "driver_name": driver.full_name if driver else "Unassigned",
                    "refill_date": log.refill_date.isoformat() if log.refill_date else None,
                    "station_name": log.station_name,
                    "invoice_number": log.invoice_number,
                    "fuel_quantity_liters": log.fuel_quantity,
                    "recorded_efficiency_km_l": log.efficiency_km_per_unit,
                    "expected_baseline_km_l": baseline_eff,
                    "efficiency_deviation_pct": deviation_pct,
                    "suspected_cause": suspected_cause,
                    "estimated_financial_loss_inr": loss_inr,
                    "severity": severity.value
                }
                anomalies.append(anomaly_record)

                # Auto-generate notification alert for critical fuel loss
                if create_alerts and severity == NotificationSeverity.CRITICAL:
                    alert_title = f"⚠️ Fuel Anomaly on {vehicle.license_plate}"
                    existing = (
                        db.query(Notification)
                        .filter(
                            Notification.title == alert_title,
                            Notification.notification_type == NotificationType.AI_ANOMALY
                        )
                        .first()
                    )
                    if not existing:
                        new_alert = Notification(
                            notification_type=NotificationType.AI_ANOMALY,
                            severity=NotificationSeverity.CRITICAL,
                            title=alert_title,
                            message=(
                                f"{suspected_cause} detected on {vehicle.license_plate}. "
                                f"Efficiency dropped by {deviation_pct}% at {log.station_name}. "
                                f"Estimated loss: ₹{loss_inr:,.0f}."
                            ),
                            link_url="/fuel",
                            created_at=datetime.utcnow()
                        )
                        db.add(new_alert)

        if create_alerts:
            try:
                db.commit()
            except Exception:
                db.rollback()

        return {
            "total_anomalies_detected": len(anomalies),
            "critical_anomalies_count": critical_count,
            "total_estimated_pilferage_loss_inr": round(total_pilferage_loss_inr, 2),
            "anomalous_logs": anomalies
        }
