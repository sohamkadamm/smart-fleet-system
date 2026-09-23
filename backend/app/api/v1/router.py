from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.vehicles import router as vehicle_router
from app.api.v1.drivers import router as driver_router
from app.api.v1.trips import router as trip_router
from app.api.v1.gps import router as gps_router
from app.api.v1.fuel import router as fuel_router
from app.api.v1.maintenance import router as maintenance_router
from app.api.v1.performance import router as performance_router
from app.api.v1.ai import router as ai_router
from app.api.v1.notifications import router as notification_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.reports import router as reports_router

api_router = APIRouter()

# Register All 12 Project Modules
api_router.include_router(auth_router)          # Module 1: User & Role Management
api_router.include_router(vehicle_router)       # Module 2: Vehicle Management
api_router.include_router(driver_router)        # Module 3: Driver Management
api_router.include_router(trip_router)          # Module 4: Trip & Delivery Management
api_router.include_router(gps_router)           # Module 5: GPS & Route Ops
api_router.include_router(fuel_router)          # Module 6: Fuel Management
api_router.include_router(maintenance_router)   # Module 7: Maintenance Management
api_router.include_router(performance_router)   # Module 8: Driver Performance
api_router.include_router(ai_router)            # Module 9: AI & Predictive Analytics
api_router.include_router(notification_router)  # Module 10: Alerts & Notifications
api_router.include_router(analytics_router)     # Module 11: BI Analytics Dashboard
api_router.include_router(reports_router)       # Module 12: Reports & Data Export
