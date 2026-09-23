# Changelog

All notable changes to the **AI-Powered Smart Fleet Management & Logistics Optimization System** are documented in this file.

---

## [Phase 2] - Business Logic, Role-Based Access Control, Alembic & Validation

### Database & Migrations (G.1 & 2.4)
- **Alembic Database Migrations:** Initialized Alembic migration environment (`backend/alembic/`) with `alembic.ini`. Configured `env.py` to bind automatically to application models and SQLite/PostgreSQL configuration.
- **Driver Model Migration (`3f39ce8a4ec2`):** Added `is_active` (`Boolean`, default=True, nullable=False) column to `drivers` table to support soft delete and suspension workflows.

### Trip Lifecycle & State Machine (2.1, 2.2, 2.3)
- **Strict Status Transitions:** Enforced state transition rules:
  - `SCHEDULED` $\rightarrow$ `IN_TRANSIT` or `CANCELLED`
  - `IN_TRANSIT` $\rightarrow$ `DELIVERED`
  - Rejects invalid transitions (e.g. `SCHEDULED` $\rightarrow$ `DELIVERED` or `DELIVERED` $\rightarrow$ `CANCELLED`) with HTTP 400 Bad Request.
- **Driver Trip Ownership:** Drivers can only update status for trips assigned to them. Attempting to update other drivers' trips returns HTTP 403 Forbidden.
- **Accurate On-Time Arrival:** When a trip is marked `DELIVERED`, `driver.on_time_trips` is only incremented if `actual_arrival <= estimated_arrival`. Late arrivals increment `total_trips` without inflating `on_time_trips`.
- **Double-Booking & Availability Guardrails:** Prevented assigning vehicles or drivers that are not `AVAILABLE`, drivers that are inactive (`is_active=False`), or drivers whose CDL license has expired.
- **Driver Self-Service Endpoint:** Added `GET /api/v1/trips/my` returning trips assigned to the currently authenticated driver.

### Vehicle & Driver Lifecycle & Soft Deletes (2.4, G.2)
- **Vehicle Soft Delete:** `DELETE /api/v1/vehicles/{id}` sets vehicle status to `DECOMMISSIONED` instead of hard deletion. Blocks decommissioning if vehicle is on an active `IN_TRANSIT` trip. Excludes decommissioned vehicles from general lists by default.
- **Vehicle Status Protection:** Prevented manual assignment to `ON_TRIP` (handled solely via dispatch) and prohibited status modifications when vehicle is currently `IN_TRANSIT`.
- **Driver Soft Delete:** `DELETE /api/v1/drivers/{id}` sets `is_active=False` and status to `SUSPENDED`. Blocks deletion if driver is on an active trip. Excludes inactive drivers from rosters by default.

### Maintenance & Due Detection (2.5, 2.9)
- **Multi-Factor Service Due Check:** A vehicle is marked due for service if `next_service_due_date <= today` OR `odometer_km >= next_service_due_odometer`.
- **Currency Standardization:** Renamed summary fields to `total_maintenance_cost_inr` and unified all calculations in Indian Rupees (₹).

### Alerts & Notifications Scoping (2.6)
- **Role-Based Notification Isolation:** Scoped notification feeds and mark-as-read actions so Drivers only see notifications targeted to `DRIVER` or `ALL`.
- **System Alert Sync Security:** Restricted `POST /api/v1/notifications/sync-system-alerts` to Fleet Managers and Admins (returns HTTP 403 for Drivers).
- **Automated Issue Reporting:** Added `POST /api/v1/notifications/report-issue` enabling drivers to flag vehicle breakdowns, cargo damage, and delay hazards directly to managers.

### Driver Role Restrictions & Personal Scorecard (2.7, 2.8)
- **Roster Privacy:** Restricted `GET /api/v1/drivers` so Drivers cannot browse the fleet driver directory (HTTP 403 Forbidden). Restricted `GET /api/v1/drivers/{id}` to the driver's own profile.
- **Fuel Log Restrictions:** Restricted driver fuel logging to their currently assigned vehicle. Rejects odometer readings lower than vehicle's current odometer.
- **Driver Scorecard Endpoint:** Added `GET /api/v1/performance/my` returning live composite performance metrics, safety score, on-time rate, and AI tier for the authenticated driver.
- **Driver Dashboard UI:** Revamped driver frontend cockpit with assigned trip actions (Dispatch / Complete Delivery), live scorecard, shift status toggle, and emergency issue reporting modal.

### Security, Validation & Profile Management (G.2, G.4, 2.9)
- **Pydantic Validation (G.2):**
  - Enforced `EmailStr` and minimum 8-character password length on registration.
  - Positive numeric constraints (`gt=0`) on cargo weight, distance, duration, fuel volume, and fuel cost.
  - Enforced `estimated_arrival > scheduled_departure` validation on trips.
  - Verified driver license expiry date must be in the future.
- **User Profile & Admin Management (G.4):**
  - Added `PUT /api/v1/auth/me` for profile updates (name, phone).
  - Added `POST /api/v1/auth/change-password` with old password verification.
  - Added `POST /api/v1/auth/users` for Admin staff user creation.
- **CORS & Environment Security (2.9):**
  - Restricted CORS allowed origins strictly to `settings.BACKEND_CORS_ORIGINS`.
  - Enforced required `SECRET_KEY` from `.env`. Added root `.gitignore`.

---

## [Phase 1] - Critical Bug Fixes & Baseline Stability

- **1.1 Dependency Standardization:** Cleaned `backend/requirements.txt` with pinned versions (`alembic`, `email-validator`, `fastapi`, `pydantic`, `sqlalchemy`, etc.).
- **1.2 Public Registration Role Security:** Prevented privilege escalation via public `POST /api/v1/auth/register`; all public signups default strictly to `UserRole.DRIVER`.
- **1.3 Seed Idempotency:** Added existence checks (`first()`) on vehicles, drivers, trips, fuel logs, and maintenance records to prevent record duplication on repeated seed script execution.
- **1.4 True Computed Analytics:** Removed hardcoded floors and static numbers (`1250.0`, `1280.0`, `94.6`, `14.2%`) across analytics and AI endpoints. All values are now dynamically computed from database records with zero-division protection.
- **1.5 Maintenance Status Validation:** Handled invalid maintenance status strings with HTTP 422 Unprocessable Entity instead of unhandled 500 crashes.
