# Sales Anomaly Dashboard (PRJ-100)

Comprehensive monitoring system designed to detect, visualize, and track anomalies in daily sales and order data.

## 🏗️ Architecture Overview
This project implement a full-stack web architecture for professional data monitoring.

- **Backend:** Node.js + Express (Modern alternative to FastAPI)
- **ML Engine:** Isolation Forest (via `ml-isolation-forest`)
- **Frontend:** React + Tailwind CSS + Framer Motion
- **Visualization:** Recharts (High-performance SVG charting)
- **Data Handling:** PapaParse (Client-side CSV processing)

## 🧠 Machine Learning Logic
The system uses the **Isolation Forest** algorithm for anomaly detection. Unlike standard statistical methods (like Z-score), Isolation Forest works by isolating observations:
- It constructs randomized decision trees.
- Anomalies are "easy" to isolate and thus have shorter path lengths in the trees.
- Each data point is assigned an **Anomaly Score** (0 to 1).
- A user-defined **Threshold** determines if a point is flagged as an anomaly.

## 🚀 Key Features
1. **Interactive Visualization:** Dynamic charts with anomaly overlays and tooltips.
2. **Sensitivity Control:** Real-time threshold adjustment to tune detection precision.
3. **CSV Support:** Seamless historical data import.
4. **Investigation Log:** Ability to add persistent notes to specific anomaly incidents for audit records.

## 🛠️ Setup Instructions

### Local Development (Node.js)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Access the dashboard at `http://localhost:3000`.

### Python Equivalent (Defense Prep)
If you need to discuss the Python version of this project:
- **Backend:** Use `FastAPI` with `uvicorn`.
- **ML:** Use `scikit-learn`'s `IsolationForest`.
- **Frontend:** Use `Streamlit`.
- Check `requirements.txt` for the Python package list.

---
*Created for PRJ-100 Project Evaluation.*
