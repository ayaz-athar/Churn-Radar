"""
Churn Radar Flask REST API
Serves real-time inference, SHAP explanations, drift monitoring reports,
paginated customer catalog, and dual-audit logging.
"""

import sys
import time
import json
import uuid
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify
from flask_cors import CORS

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.explain import ChurnExplainer
from model.drift_monitor import ChurnDriftMonitor
from db import (
    init_db,
    get_connection,
    log_prediction_dual,
    save_drift_report,
    seed_customers_from_dataset,
    seed_initial_drift_history,
    DB_PATH
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Global Singletons
print("[*] Initializing Churn Radar ML & Explainability engines...")
init_db()
explainer = ChurnExplainer()
drift_monitor = ChurnDriftMonitor()


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint confirming model and database readiness."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM customers")
    cust_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM prediction_logs")
    log_count = c.fetchone()[0]
    conn.close()

    return jsonify({
        "status": "healthy",
        "service": "Churn Radar ML & Retention API",
        "model_loaded": True,
        "preprocessor_loaded": True,
        "database_connected": True,
        "records": {
            "total_customers": cust_count,
            "prediction_logs": log_count
        }
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Accepts customer feature payload.
    Returns: churn probability, risk tier, classification, SHAP explanation summary, and latency.
    Logs dual records (raw payload + structured outcome) to SQLite.
    """
    start_time = time.time()
    req_id = f"req-{uuid.uuid4().hex[:12]}"
    raw_payload_str = request.get_data(as_text=True)

    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"error": "Invalid JSON format", "details": str(e)}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        explanation = explainer.explain(data)
        latency_ms = (time.time() - start_time) * 1000.0

        # Dual Logging: raw payload & structured record
        client_ip = request.remote_addr or "127.0.0.1"
        log_prediction_dual(
            request_id=req_id,
            raw_payload_str=raw_payload_str,
            inputs=data,
            explanation_res=explanation,
            latency_ms=latency_ms,
            client_ip=client_ip,
            status_code=200
        )

        response = {
            "request_id": req_id,
            "customer_id": explanation["customer_id"],
            "churn_probability": explanation["churn_probability"],
            "risk_tier": explanation["risk_tier"],
            "predicted_churn": explanation["predicted_churn"],
            "top_risk_drivers": explanation["top_risk_drivers"][:3],
            "explanation_summary": explanation["explanation_summary"],
            "retention_playbook": explanation["retention_playbook"],
            "latency_ms": round(latency_ms, 2)
        }
        return jsonify(response), 200

    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000.0
        return jsonify({"error": "Inference failure", "details": str(e)}), 500


@app.route("/explain/<customer_id>", methods=["GET"])
def explain_customer(customer_id: str):
    """
    GET /explain/<customer_id>
    Retrieves or calculates full local SHAP decomposition, feature weights,
    natural language narrative, and prescriptive playbook for a given customer.
    """
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM customers WHERE customer_id = ?", (customer_id,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": f"Customer '{customer_id}' not found"}), 404

    customer_dict = dict(row)
    explanation = explainer.explain(customer_dict)
    return jsonify(explanation), 200


@app.route("/customers", methods=["GET"])
def list_customers():
    """
    GET /customers
    Paginated, sortable, and filterable catalog of scored customers.
    Params:
      - page (int, default: 1)
      - page_size (int, default: 20)
      - risk_tier (LOW | MEDIUM | HIGH | ALL)
      - search (string: customer_id, contract_type, payment_method)
      - sort_by (churn_probability | tenure_months | monthly_charges | support_tickets | customer_id)
      - order (asc | desc)
    """
    page = max(int(request.args.get("page", 1)), 1)
    page_size = min(max(int(request.args.get("page_size", 20)), 1), 100)
    risk_tier = request.args.get("risk_tier", "ALL").upper()
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort_by", "churn_probability")
    order = request.args.get("order", "desc").lower()

    allowed_sorts = {
        "churn_probability": "churn_probability",
        "tenure_months": "tenure_months",
        "monthly_charges": "monthly_charges",
        "support_tickets": "support_tickets",
        "last_login_days": "last_login_days",
        "customer_id": "customer_id"
    }
    sort_col = allowed_sorts.get(sort_by, "churn_probability")
    sort_dir = "ASC" if order == "asc" else "DESC"

    conditions = []
    params = []

    if risk_tier in ["LOW", "MEDIUM", "HIGH"]:
        conditions.append("risk_tier = ?")
        params.append(risk_tier)

    if search:
        conditions.append("(customer_id LIKE ? OR contract_type LIKE ? OR payment_method LIKE ?)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    conn = get_connection()
    c = conn.cursor()

    # Total count for pagination
    c.execute(f"SELECT COUNT(*) FROM customers {where_clause}", tuple(params))
    total_records = c.fetchone()[0]

    # Paginated query
    offset = (page - 1) * page_size
    query = f"""
        SELECT * FROM customers
        {where_clause}
        ORDER BY {sort_col} {sort_dir}
        LIMIT ? OFFSET ?
    """
    c.execute(query, tuple(params + [page_size, offset]))
    rows = c.fetchall()

    # Calculate summary metrics
    c.execute("SELECT COUNT(*), AVG(churn_probability), SUM(monthly_charges) FROM customers")
    overall_stats = c.fetchone()
    c.execute("SELECT COUNT(*) FROM customers WHERE risk_tier = 'HIGH'")
    high_risk_count = c.fetchone()[0]

    conn.close()

    customers = [dict(r) for r in rows]
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1

    return jsonify({
        "customers": customers,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages
        },
        "summary": {
            "total_customers": overall_stats[0] if overall_stats else 0,
            "avg_churn_probability": round(float(overall_stats[1] or 0.0), 4),
            "high_risk_count": high_risk_count,
            "high_risk_pct": round((high_risk_count / max(overall_stats[0], 1)) * 100.0, 1),
            "total_monthly_revenue_monitored": round(float(overall_stats[2] or 0.0), 2)
        }
    })


@app.route("/drift-report", methods=["GET"])
def get_drift_report():
    """
    GET /drift-report
    Returns the latest KS-Test and PSI drift report, plus historical drift timeline.
    """
    conn = get_connection()
    c = conn.cursor()
    
    # Fetch most recent report
    c.execute("SELECT report_json FROM drift_history ORDER BY id DESC LIMIT 1")
    latest_row = c.fetchone()
    
    # Fetch historical timeline for trend charts
    c.execute("""
        SELECT id, timestamp, overall_status, drifted_features_count, critical_features_count, max_psi, mean_psi
        FROM drift_history
        ORDER BY id ASC
        LIMIT 20
    """)
    history_rows = c.fetchall()
    conn.close()

    if latest_row:
        latest_report = json.loads(latest_row[0])
    else:
        # Generate on the fly from a sample
        sample = drift_monitor.baseline_df.sample(350, random_state=42)
        latest_report = drift_monitor.run_drift_analysis(sample)
        save_drift_report(latest_report)

    trend_history = [dict(r) for r in history_rows]

    return jsonify({
        "latest_report": latest_report,
        "drift_history_timeline": trend_history
    })


@app.route("/simulate-drift", methods=["POST"])
def simulate_drift():
    """
    POST /simulate-drift
    Simulates a production distribution drift event (moderate or critical),
    re-computes KS-Test and PSI metrics against baseline, saves snapshot, and returns the result.
    """
    body = request.get_json(silent=True) or {}
    severity = body.get("severity", "critical")

    drift_batch = drift_monitor.generate_simulated_drift_batch(n_samples=400, drift_severity=severity)
    report = drift_monitor.run_drift_analysis(drift_batch)
    report_id = save_drift_report(report)

    return jsonify({
        "status": "success",
        "message": f"Simulated {severity} drift scenario executed and logged to audit table.",
        "report_id": report_id,
        "drift_report": report
    })


@app.route("/metrics", methods=["GET"])
def get_model_metrics():
    """
    GET /metrics
    Returns model training evaluation metrics (ROC-AUC, Precision, Recall, Confusion Matrix, Hyperparameters).
    """
    metrics_file = BACKEND_DIR / "artifacts" / "metrics.json"
    if metrics_file.exists():
        with open(metrics_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data), 200
    return jsonify({"error": "Metrics file not found"}), 404


@app.route("/log-prediction", methods=["POST"])
def log_external_prediction():
    """
    POST /log-prediction
    Dedicated endpoint to log external prediction results to SQLite.
    """
    body = request.get_json(force=True)
    req_id = body.get("request_id", f"ext-{uuid.uuid4().hex[:12]}")
    raw_payload_str = json.dumps(body)
    
    explanation_res = explainer.explain(body)
    log_prediction_dual(
        request_id=req_id,
        raw_payload_str=raw_payload_str,
        inputs=body,
        explanation_res=explanation_res,
        latency_ms=body.get("latency_ms", 12.5),
        status_code=200
    )
    return jsonify({"status": "logged", "request_id": req_id}), 201


if __name__ == "__main__":
    print("[*] Starting Churn Radar Flask API on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)