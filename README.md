# AI-Powered Smart Fleet Management & Logistics Optimization System

A centralized, enterprise-grade Fleet Management System built with **FastAPI (Python)** and **React.js + Tailwind CSS**, incorporating predictive analytics, real-time simulated GPS tracking, driver scoring, automated compliance alerts, and executive business intelligence.

---

## 🌟 All 12 Core Modules Implemented

1. **User & Role Management**: Secure JWT authentication, PBKDF2 password hashing, Role-Based Access Control (`Admin`, `Fleet Manager`, `Driver`), and user management tables.
2. **Vehicle Management**: Comprehensive vehicle registry, VINs, payload capacities, fuel types (Diesel, Electric EV, Petrol, CNG), and automated Insurance/PUC renewal alerts.
3. **Driver Management**: Driver profiles, Commercial Driver Licenses (CDL), license validity tracking, vehicle assignment, and contact records.
4. **Trip & Delivery Management**: Freight dispatcher, origin-destination routing, cargo weight capacity validation, and interactive lifecycle stepper (`Scheduled` $\rightarrow$ `In Transit` $\rightarrow$ `Delivered`).
5. **GPS & Route Management**: Real-time simulated telematics radar, moving vehicle pins along Midwest highway corridors, speed km/h, and heading telematics.
6. **Fuel & Energy Management**: Fuel refill and EV kWh charge logs, unit costs, odometer readings, and auto-computed fuel efficiency (km/L & km/kWh).
7. **Maintenance Management**: Workshop service logs, repair costs, parts replaced, and preventive maintenance reminders.
8. **Driver Performance Analysis**: Weighted driver evaluation algorithm (40% on-time, 30% safety, 30% eco-fuel), ranking leaderboard, and AI coaching tiers.
9. **AI & Predictive Analytics**:
   - **Predictive Maintenance Risk Model**: Calculates component failure probability (0-100%) and days to service.
   - **Trip Fuel & Carbon Forecaster**: Predicts fuel volume, cost, and $CO_2$ emissions based on cargo weight & distance.
   - **Intelligent Route Optimizer**: Multi-criteria route evaluation (Eco Highway vs Expressway vs Direct) with AI Efficiency Scores.
10. **Alerts & Notifications**: Notification bell in Navbar with unread badges, and automated system scanner for expiring documents.
11. **BI Analytics Dashboard**: Fleet utilization %, 6-month delivery volume trends, cargo tonnage, fuel spend breakdown, and maintenance cost charts.
12. **Reports & Data Export Engine**: Instant CSV & JSON downloadable data reports for Vehicles, Drivers, Trips, Fuel, Maintenance, and Executive Audits.

---

## 🚀 How to Run the Project

### Option A: 1-Click Launch (Windows)
Double-click:
`run_all.bat`

---

### Option B: Manual Command Line Launch

#### 1. Backend (FastAPI):
```powershell
cd backend
python -m pip install -r requirements.txt
alembic upgrade head
python run.py
```
* **API Server:** http://localhost:8000
* **Interactive Swagger Docs:** http://localhost:8000/docs

#### 2. Frontend (React + Tailwind CSS):
```powershell
cd frontend
npm install
npm run dev
```
* **Web App URL:** http://localhost:5173

---

## 🔑 Pre-Seeded Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | `admin@fleet.com` | `Admin@123` | Complete system privileges, user administration, all 12 modules. |
| 📋 **Fleet Manager** | `manager@fleet.com` | `Manager@123` | Operations cockpit, vehicle dispatch, driver management, AI analytics, reports. |
| 🚚 **Driver** | `driver@fleet.com` | `Driver@123` | Driver portal, shift status, assigned delivery trips, GPS telematics. |

---

## 🧪 Running Automated Test Suite

To run the automated verification suite covering all 12 modules, security controls, role-based access, and lifecycle state machines (27 tests):
```powershell
cd backend
python test_all_modules.py -v
```

---

## 🇮🇳 Localization & Currency
- **Currency:** Indian Rupee (₹ / INR) used consistently across Fuel, Maintenance, Analytics, AI Forecasters, and Driver Performance.
- **Corridors:** Logistics routes mapped across Indian freight corridors (Mumbai, Pune, Delhi, Bengaluru, Chennai, Hyderabad).

