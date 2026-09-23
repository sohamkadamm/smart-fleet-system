import io
import csv
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.fuel import FuelLog
from app.models.maintenance import MaintenanceRecord

router = APIRouter(prefix="/reports", tags=["Reports & Data Export Engine"])

@router.get("/summary")
def get_available_reports(current_user: User = Depends(get_current_user)):
    """Returns directory of downloadable report types."""
    return {
        "available_reports": [
            {
                "id": "vehicles",
                "title": "Fleet Vehicles Master Report",
                "description": "Complete vehicle inventory, VINs, payload capacities, fuel types, and compliance records.",
                "format": "CSV / JSON"
            },
            {
                "id": "drivers",
                "title": "Driver Roster & Safety Ratings",
                "description": "Driver certifications, licenses, safety scores, on-time rates, and performance tiers.",
                "format": "CSV / JSON"
            },
            {
                "id": "trips",
                "title": "Logistics Trips & Delivery Manifest",
                "description": "Origin-destination routes, cargo tonnage, departure/arrival timestamps, and completion statuses.",
                "format": "CSV / JSON"
            },
            {
                "id": "fuel",
                "title": "Fuel & Energy Consumption Log",
                "description": "Refill volumes, fuel cost breakdown, odometer readings, and mileage efficiency.",
                "format": "CSV / JSON"
            },
            {
                "id": "maintenance",
                "title": "Maintenance & Workshop Service Ledger",
                "description": "Service categories, repair expenses, parts replaced, and future maintenance schedules.",
                "format": "CSV / JSON"
            },
            {
                "id": "executive_monthly",
                "title": "Executive Monthly Performance Audit",
                "description": "High-level summary of fleet utilization, expenditure, delivery volume, and AI health rating.",
                "format": "CSV / JSON"
            }
        ]
    }

@router.get("/export/csv")
def export_csv_report(
    report_type: str = Query(..., description="vehicles, drivers, trips, fuel, maintenance, executive_monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and stream dynamic CSV report file."""
    output = io.StringIO()
    writer = csv.writer(output)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"smart_fleet_{report_type}_{timestamp_str}.csv"

    if report_type == "vehicles":
        writer.writerow(["ID", "License Plate", "VIN", "Make", "Model", "Year", "Type", "Fuel Type", "Payload Capacity (kg)", "Odometer (km)", "Status", "Insurance Expiry", "PUC Expiry"])
        for v in db.query(Vehicle).all():
            writer.writerow([v.id, v.license_plate, v.vin, v.make, v.model, v.year, v.vehicle_type.value, v.fuel_type.value, v.max_payload_kg, v.odometer_km, v.status.value, v.insurance_expiry, v.puc_expiry])

    elif report_type == "drivers":
        writer.writerow(["ID", "Full Name", "Email", "Phone", "License Number", "License Expiry", "Experience (Years)", "Status", "Safety Score", "Fuel Efficiency Score", "Total Trips"])
        for d in db.query(Driver).all():
            writer.writerow([d.id, d.full_name, d.email, d.phone, d.license_number, d.license_expiry, d.experience_years, d.status.value, d.safety_score, d.fuel_efficiency_score, d.total_trips])

    elif report_type == "trips":
        writer.writerow(["Trip Code", "Origin", "Destination", "Cargo Type", "Cargo Weight (kg)", "Distance (km)", "Vehicle ID", "Driver ID", "Status", "Scheduled Departure", "Actual Arrival"])
        for t in db.query(Trip).all():
            writer.writerow([t.trip_code, t.origin, t.destination, t.cargo_type, t.cargo_weight_kg, t.distance_km, t.vehicle_id, t.driver_id, t.status.value, t.scheduled_departure, t.actual_arrival])

    elif report_type == "fuel":
        writer.writerow(["Log ID", "Vehicle ID", "Driver ID", "Fuel Quantity", "Unit Cost ($)", "Total Cost ($)", "Odometer (km)", "Station", "Fuel Type", "Refill Date"])
        for f in db.query(FuelLog).all():
            writer.writerow([f.id, f.vehicle_id, f.driver_id, f.fuel_quantity, f.unit_cost, f.total_cost, f.odometer_km, f.station_name, f.fuel_type, f.refill_date])

    elif report_type == "maintenance":
        writer.writerow(["Record ID", "Vehicle ID", "Service Type", "Status", "Cost ($)", "Odometer at Service", "Service Date", "Next Due Date", "Description"])
        for m in db.query(MaintenanceRecord).all():
            writer.writerow([m.id, m.vehicle_id, m.service_type.value, m.status.value, m.cost, m.odometer_at_service, m.service_date, m.next_service_due_date, m.description])

    elif report_type == "executive_monthly":
        writer.writerow(["Metric", "Value", "Unit / Notes"])
        v_count = db.query(Vehicle).count()
        d_count = db.query(Driver).count()
        t_count = db.query(Trip).count()
        fuel_cost = sum(f.total_cost for f in db.query(FuelLog).all())
        maint_cost = sum(m.cost for m in db.query(MaintenanceRecord).all())

        writer.writerow(["Total Fleet Vehicles", v_count, "Vehicles"])
        writer.writerow(["Active Driver Personnel", d_count, "Drivers"])
        writer.writerow(["Total Dispatched Deliveries", t_count, "Trips"])
        writer.writerow(["Total Fuel Expenditure", f"${round(fuel_cost, 2)}", "USD"])
        writer.writerow(["Total Maintenance Expenditure", f"${round(maint_cost, 2)}", "USD"])
        writer.writerow(["Audit Timestamp", datetime.now().isoformat(), "UTC"])
    else:
        raise HTTPException(status_code=400, detail="Invalid report type.")

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
