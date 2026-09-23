import math
from datetime import datetime, date
from typing import Dict, List, Any

class FleetAIEngine:
    """
    AI & Predictive Analytics Engine for Indian Commercial Logistics:
    - Predictive Component Failure & Maintenance Risk (MoRTH / BS-VI standards)
    - Trip Fuel & Carbon Forecaster (INR ₹ Pricing)
    - Intelligent Multi-Route Optimizer & Recommendation (National Highway Corridors)
    - Multi-Factor Commercial Driver Performance Scoring
    """

    @staticmethod
    def predict_maintenance_risk(
        odometer_km: float,
        year: int,
        days_since_last_service: int,
        vehicle_type: str,
        fuel_type: str
    ) -> Dict[str, Any]:
        """Predict component failure risk and estimated days until required maintenance."""
        current_year = datetime.now().year
        vehicle_age = max(0, current_year - year)

        # Baseline risk factors
        odo_factor = min(40.0, (odometer_km / 140000.0) * 40.0)
        age_factor = min(25.0, (vehicle_age / 10.0) * 25.0)
        service_gap_factor = min(35.0, (days_since_last_service / 180.0) * 35.0)

        # Type weighting
        type_multiplier = 1.1 if vehicle_type in ["TRUCK", "CONTAINER", "TRAILER"] else 0.95
        if fuel_type == "ELECTRIC":
            # EVs have fewer mechanical moving parts
            type_multiplier *= 0.85

        raw_probability = (odo_factor + age_factor + service_gap_factor) * type_multiplier
        failure_prob_pct = min(98.5, max(4.0, round(raw_probability, 1)))

        # Risk Category
        if failure_prob_pct >= 70.0:
            risk_level = "CRITICAL"
            predicted_days = max(2, int((100.0 - failure_prob_pct) * 0.5))
            recommendation = "Immediate authorized workshop inspection required. High risk of highway breakdown."
            critical_component = "Braking System Liners & Transmission Clutch"
        elif failure_prob_pct >= 40.0:
            risk_level = "MODERATE"
            predicted_days = int((100.0 - failure_prob_pct) * 0.9)
            recommendation = "Schedule routine service & BS-VI AdBlue inspection within 2 weeks."
            critical_component = "Suspension Bushings & Diesel Particulate Filter (DPF)"
        else:
            risk_level = "HEALTHY"
            predicted_days = int((100.0 - failure_prob_pct) * 1.8)
            recommendation = "Vehicle health optimal. Standard preventive schedule applies."
            critical_component = "No anomalous wear detected"

        health_score = round(100.0 - failure_prob_pct, 1)

        return {
            "failure_probability_pct": failure_prob_pct,
            "health_score": health_score,
            "risk_level": risk_level,
            "predicted_days_to_service": predicted_days,
            "critical_component": critical_component,
            "recommendation": recommendation,
            "factors": {
                "mileage_wear_pct": round(odo_factor, 1),
                "age_depreciation_pct": round(age_factor, 1),
                "service_interval_pct": round(service_gap_factor, 1)
            }
        }

    @staticmethod
    def forecast_trip_fuel_consumption(
        distance_km: float,
        cargo_weight_kg: float,
        vehicle_type: str,
        fuel_type: str,
        avg_speed_kmh: float = 55.0
    ) -> Dict[str, Any]:
        """Predict fuel / energy consumption and cost in INR (₹) for a given trip."""
        # Base consumption per 100km by vehicle type
        base_rates = {
            "TRUCK": 26.0,      # L / 100km (e.g. Tata Prima / Ashok Leyland)
            "CONTAINER": 30.0,
            "TRAILER": 28.0,
            "VAN": 9.5,
            "PICKUP": 8.5
        }
        base_rate = base_rates.get(vehicle_type, 16.0)

        # Weight penalty: +1.5% per 1000kg of payload
        weight_penalty = 1.0 + ((cargo_weight_kg / 1000.0) * 0.018)

        # Speed aerodynamic factor
        speed_factor = 1.0 + max(0, (avg_speed_kmh - 60.0) * 0.008)

        if fuel_type == "ELECTRIC":
            ev_base_kwh_per_100km = 38.0 if vehicle_type in ["TRUCK", "CONTAINER"] else 18.0
            predicted_units = (distance_km / 100.0) * ev_base_kwh_per_100km * weight_penalty * speed_factor
            unit_name = "kWh"
            price_per_unit = 9.50 # ₹9.50 per kWh in India
            est_cost_inr = round(predicted_units * price_per_unit, 2)
            co2_kg = round(predicted_units * 0.12, 2)
        elif fuel_type == "CNG":
            cng_base_kg_per_100km = 14.0 if vehicle_type in ["TRUCK", "CONTAINER"] else 7.5
            predicted_units = (distance_km / 100.0) * cng_base_kg_per_100km * weight_penalty * speed_factor
            unit_name = "kg"
            price_per_unit = 78.50 # ₹78.50 per kg CNG in India
            est_cost_inr = round(predicted_units * price_per_unit, 2)
            co2_kg = round(predicted_units * 1.95, 2)
        else:
            # Diesel
            liters_per_100km = base_rate * weight_penalty * speed_factor
            predicted_units = (distance_km / 100.0) * liters_per_100km
            unit_name = "Liters"
            price_per_unit = 89.62 # ₹89.62 per Liter in India
            est_cost_inr = round(predicted_units * price_per_unit, 2)
            co2_kg = round(predicted_units * 2.68, 2)

        predicted_units = round(predicted_units, 2)
        mileage_km_per_unit = round(distance_km / max(0.1, predicted_units), 2)

        return {
            "distance_km": distance_km,
            "cargo_weight_kg": cargo_weight_kg,
            "predicted_consumption": predicted_units,
            "unit": unit_name,
            "predicted_mileage_efficiency": mileage_km_per_unit,
            "estimated_fuel_cost_usd": est_cost_inr, # keeping key compatible with frontend, displaying ₹
            "estimated_fuel_cost_inr": est_cost_inr,
            "estimated_co2_emissions_kg": co2_kg,
            "eco_rating": "A+ (Green Clean)" if fuel_type in ["ELECTRIC", "CNG"] or mileage_km_per_unit > 4.5 else "B (BS-VI Diesel Heavy)"
        }

    @staticmethod
    def recommend_optimized_routes(
        origin: str,
        destination: str,
        distance_km: float,
        cargo_weight_kg: float,
        fuel_type: str
    ) -> List[Dict[str, Any]]:
        """Generate and evaluate Indian National Highway route options with AI efficiency scoring."""
        # 1. Eco Express Corridor (e.g. Samruddhi Mahamarg / Dedicated Expressway)
        eco_dist = round(distance_km * 1.03, 1)
        eco_dur_hours = round(eco_dist / 65.0, 2)
        eco_score = 95 if fuel_type == "ELECTRIC" else 90

        # 2. Fastest National Highway
        fast_dist = round(distance_km * 1.0, 1)
        fast_dur_hours = round(fast_dist / 70.0, 2)
        fast_score = 86

        # 3. State Highway / Traditional Arterial
        direct_dist = round(distance_km * 0.95, 1)
        direct_dur_hours = round(direct_dist / 42.0, 2)
        direct_score = 70

        return [
            {
                "route_id": "ECO_OPT_01",
                "name": "🌿 AI Recommended: Access-Controlled Expressway Bypass",
                "tag": "Lowest Fuel & FASTag Toll",
                "distance_km": eco_dist,
                "duration_hours": eco_dur_hours,
                "estimated_delay_risk": "Low",
                "ai_efficiency_score": eco_score,
                "is_recommended": True,
                "highlights": "Consistent 65 km/h cruise, bypasses city congestion & toll gate queues, highest fuel economy."
            },
            {
                "route_id": "EXPRESS_02",
                "name": "⚡ National Highway (NH-48 / NH-44 Multi-Lane)",
                "tag": "Time Critical Delivery",
                "distance_km": fast_dist,
                "duration_hours": fast_dur_hours,
                "estimated_delay_risk": "Moderate (Ghat Sections / Toll Plazas)",
                "ai_efficiency_score": fast_score,
                "is_recommended": False,
                "highlights": "Direct route connecting major logistics hub depots with automated FASTag lanes."
            },
            {
                "route_id": "DIRECT_03",
                "name": "📍 State Highway & Local Arterial",
                "tag": "Shortest Physical Distance",
                "distance_km": direct_dist,
                "duration_hours": direct_dur_hours,
                "estimated_delay_risk": "High (Town Traffic & Speed Breakers)",
                "ai_efficiency_score": direct_score,
                "is_recommended": False,
                "highlights": "Fewer kilometers but higher clutch wear, gear shifts, and diesel consumption."
            }
        ]

    @staticmethod
    def calculate_driver_performance(
        total_trips: int,
        on_time_trips: int,
        safety_score: float,
        fuel_efficiency_score: float
    ) -> Dict[str, Any]:
        """Compute composite performance score and tier for a commercial driver."""
        if total_trips == 0:
            on_time_pct = 100.0
        else:
            on_time_pct = round((on_time_trips / total_trips) * 100.0, 1)

        composite_score = round((on_time_pct * 0.4) + (safety_score * 0.3) + (fuel_efficiency_score * 0.3), 1)

        if composite_score >= 93.0:
            grade = "A+"
            tier = "Senior Heavy Transport Lead (HMV)"
            badge = "🏆 Star Driver"
        elif composite_score >= 85.0:
            grade = "A"
            tier = "Commercial Fleet Driver"
            badge = "⭐ High Efficiency"
        elif composite_score >= 75.0:
            grade = "B"
            tier = "Standard Fleet Driver"
            badge = "✓ Reliable"
        else:
            grade = "C"
            tier = "Refresher Training Recommended"
            badge = "⚠️ Coaching Needed"

        return {
            "composite_score": composite_score,
            "on_time_rate_pct": on_time_pct,
            "safety_score": safety_score,
            "fuel_efficiency_score": fuel_efficiency_score,
            "grade": grade,
            "tier": tier,
            "badge": badge
        }

ai_engine = FleetAIEngine()
