# Machine Learning Datasets Documentation

This directory documents datasets and feature pipelines used by the **AI-Powered Smart Fleet Management & Logistics Optimization System**.

---

## 1. Predictive Maintenance: APS Failure at Scania Trucks

- **Source**: UCI Machine Learning Repository (Dataset ID: 421) / IDA Industrial Challenge 2016.
- **Reference**: G. He, "APS Failure at Scania Trucks", Stockholm, Sweden, 2016.
- **Data Size**: 60,000 training instances, 16,000 test instances, 171 attributes.
- **Problem Formulation**: Binary classification predicting whether heavy vehicle failure is caused by the Air Pressure System (APS) component (`pos` class) or non-APS related components (`neg` class).
- **Target Distribution**: Highly imbalanced (~98.3% negative, ~1.7% positive).
- **Cost Metric**:
  $$\text{Cost} = 10 \times \text{False Positives} + 500 \times \text{False Negatives}$$
  - A **False Positive** ($10 cost): Unnecessary workshop inspection of a healthy vehicle.
  - A **False Negative** ($500 cost): Roadside breakdown causing towing, route disruption, and heavy emergency repair penalties.

---

## 2. Fleet Telematics Operational Feature Mapping

To bridge anonymized sensor counters to real commercial fleet operations in India:
- `km_since_last_service`: Kilometers driven since the previous preventive service.
- `days_since_service`: Days elapsed since last workshop visit.
- `vehicle_age_years`: Overall age of the commercial chassis.
- `past_emergency_repairs`: Number of historical unpredicted breakdown occurrences.
- `cumulative_cost_inr`: Total historical maintenance expenditure in Indian Rupees (₹).
- `avg_daily_km`: Operational duty cycle intensity (km driven per operating day).
- `critical_sensor_pressure_ratio`: Normalized air pressure compressor/accumulator pressure ratio derived from Scania sensor distributions.

---

## 3. Data Integrity & Academic Notice
- **Benchmark Data**: Scania Trucks APS Sensor distribution and failure ratios.
- **Operational Data**: Fleet management database records and telematics log history.
- **Raw Storage**: Raw large datasets belong in `ml/data/raw/` (ignored by Git per project policy). Processed splits are saved in `ml/data/processed/`.
