"""
SQLite Storage & Dual Logging Module
Maintains audit trail with dual-logging: raw HTTP request payloads and structured prediction outcomes,
drift history snapshots, and scored customer repository.
"""

import os
import sys
import json
import sqlite3
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "data" / "churn_radar.db"

_lock = threading.Lock()


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DB_PATH):
    """Create all required tables with optimal indexes."""
    os.makedirs(db_path.parent, exist_ok=True)
    with _lock:
        conn = get_connection(db_path)
        cursor = conn.cursor()

        # 1. Raw Prediction Requests Audit Log (Raw Logging)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS raw_prediction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                raw_payload TEXT NOT NULL,
                client_ip TEXT,
                status_code INTEGER DEFAULT 200,
                latency_ms REAL
            )
        """)

        # 2. Structured Prediction Outcomes Log (Structured Logging)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prediction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                tenure_months INTEGER,
                contract_type TEXT,
                monthly_charges REAL,
                total_charges REAL,
                support_tickets INTEGER,
                last_login_days INTEGER,
                monthly_usage_gb REAL,
                payment_method TEXT,
                churn_probability REAL NOT NULL,
                risk_tier TEXT NOT NULL,
                predicted_churn INTEGER NOT NULL,
                top_risk_driver TEXT,
                top_retention_anchor TEXT,
                latency_ms REAL
            )
        """)

        # 3. Drift History Reports
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drift_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                overall_status TEXT NOT NULL,
                drifted_features_count INTEGER NOT NULL,
                critical_features_count INTEGER NOT NULL,
                max_psi REAL NOT NULL,
                mean_psi REAL NOT NULL,
                report_json TEXT NOT NULL
            )
        """)

        # 4. Scored Customer Repository for Dashboard Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                tenure_months INTEGER,
                contract_type TEXT,
                monthly_charges REAL,
                total_charges REAL,
                support_tickets INTEGER,
                last_login_days INTEGER,
                monthly_usage_gb REAL,
                payment_method TEXT,
                paperless_billing TEXT,
                online_security TEXT,
                tech_support TEXT,
                num_products INTEGER,
                actual_churn INTEGER,
                churn_probability REAL NOT NULL,
                risk_tier TEXT NOT NULL,
                top_risk_driver TEXT,
                last_scored_at TEXT NOT NULL
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pred_risk ON prediction_logs(risk_tier)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cust_risk ON customers(risk_tier)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cust_prob ON customers(churn_probability DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_drift_time ON drift_history(timestamp DESC)")

        conn.commit()
        conn.close()


def log_prediction_dual(
    request_id: str,
    raw_payload_str: str,
    inputs: Dict[str, Any],
    explanation_res: Dict[str, Any],
    latency_ms: float,
    client_ip: str = "127.0.0.1",
    status_code: int = 200,
    db_path: Path = DB_PATH
):
    """Log prediction event using dual-logging paradigm."""
    now_str = datetime.utcnow().isoformat() + "Z"
    cust_id = str(inputs.get("customer_id") or explanation_res.get("customer_id") or f"ANON-{request_id[:8]}")

    top_drivers = explanation_res.get("top_risk_drivers", [])
    top_driver_name = top_drivers[0]["display_name"] if top_drivers else "N/A"

    top_anchors = explanation_res.get("top_retention_anchors", [])
    top_anchor_name = top_anchors[0]["display_name"] if top_anchors else "N/A"

    with _lock:
        conn = get_connection(db_path)
        cursor = conn.cursor()

        # 1. Raw Payload Audit Log
        cursor.execute("""
            INSERT INTO raw_prediction_logs (request_id, timestamp, raw_payload, client_ip, status_code, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (request_id, now_str, raw_payload_str, client_ip, status_code, round(latency_ms, 2)))

        # 2. Structured Log
        cursor.execute("""
            INSERT INTO prediction_logs (
                request_id, customer_id, timestamp, tenure_months, contract_type,
                monthly_charges, total_charges, support_tickets, last_login_days,
                monthly_usage_gb, payment_method, churn_probability, risk_tier,
                predicted_churn, top_risk_driver, top_retention_anchor, latency_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request_id,
            cust_id,
            now_str,
            inputs.get("tenure_months"),
            inputs.get("contract_type"),
            inputs.get("monthly_charges"),
            inputs.get("total_charges"),
            inputs.get("support_tickets"),
            inputs.get("last_login_days"),
            inputs.get("monthly_usage_gb"),
            inputs.get("payment_method"),
            explanation_res["churn_probability"],
            explanation_res["risk_tier"],
            explanation_res["predicted_churn"],
            top_driver_name,
            top_anchor_name,
            round(latency_ms, 2)
        ))

        # Also upsert into customers table
        cursor.execute("""
            INSERT INTO customers (
                customer_id, tenure_months, contract_type, monthly_charges, total_charges,
                support_tickets, last_login_days, monthly_usage_gb, payment_method,
                paperless_billing, online_security, tech_support, num_products,
                actual_churn, churn_probability, risk_tier, top_risk_driver, last_scored_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(customer_id) DO UPDATE SET
                churn_probability = excluded.churn_probability,
                risk_tier = excluded.risk_tier,
                top_risk_driver = excluded.top_risk_driver,
                last_scored_at = excluded.last_scored_at
        """, (
            cust_id,
            inputs.get("tenure_months"),
            inputs.get("contract_type"),
            inputs.get("monthly_charges"),
            inputs.get("total_charges"),
            inputs.get("support_tickets"),
            inputs.get("last_login_days"),
            inputs.get("monthly_usage_gb"),
            inputs.get("payment_method"),
            inputs.get("paperless_billing"),
            inputs.get("online_security"),
            inputs.get("tech_support"),
            inputs.get("num_products"),
            inputs.get("churn", None),
            explanation_res["churn_probability"],
            explanation_res["risk_tier"],
            top_driver_name,
            now_str
        ))

        conn.commit()
        conn.close()


def save_drift_report(report: Dict[str, Any], db_path: Path = DB_PATH) -> int:
    """Save drift snapshot to history table."""
    with _lock:
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO drift_history (
                timestamp, overall_status, drifted_features_count,
                critical_features_count, max_psi, mean_psi, report_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            report.get("timestamp", datetime.utcnow().isoformat() + "Z"),
            report.get("overall_status", "UNKNOWN"),
            report.get("drifted_features_count", 0),
            report.get("critical_features_count", 0),
            report.get("max_psi", 0.0),
            report.get("mean_psi", 0.0),
            json.dumps(report)
        ))
        row_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return row_id


def seed_customers_from_dataset(
    csv_path: Path = BACKEND_DIR / "data" / "churn_data.csv",
    db_path: Path = DB_PATH,
    n_records: int = 500
):
    """Pre-score and seed initial customer base into SQLite for fast querying."""
    from model.explain import ChurnExplainer
    
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM customers")
    count = cursor.fetchone()[0]
    
    if count >= n_records:
        conn.close()
        return

    print(f"[*] Pre-scoring and caching initial {n_records} customers into SQLite...")
    df = pd.read_csv(csv_path).head(n_records)
    explainer = ChurnExplainer()
    
    records_to_insert = []
    now_str = datetime.utcnow().isoformat() + "Z"

    for _, row in df.iterrows():
        row_dict = row.to_dict()
        exp = explainer.explain(row_dict)
        top_driver = exp["top_risk_drivers"][0]["display_name"] if exp["top_risk_drivers"] else "N/A"
        records_to_insert.append((
            str(row_dict["customer_id"]),
            int(row_dict["tenure_months"]),
            str(row_dict["contract_type"]),
            float(row_dict["monthly_charges"]),
            float(row_dict["total_charges"]),
            int(row_dict["support_tickets"]),
            int(row_dict["last_login_days"]),
            float(row_dict["monthly_usage_gb"]),
            str(row_dict["payment_method"]),
            str(row_dict["paperless_billing"]),
            str(row_dict["online_security"]),
            str(row_dict["tech_support"]),
            int(row_dict["num_products"]),
            int(row_dict.get("churn", 0)),
            float(exp["churn_probability"]),
            str(exp["risk_tier"]),
            top_driver,
            now_str
        ))

    cursor.executemany("""
        INSERT OR REPLACE INTO customers (
            customer_id, tenure_months, contract_type, monthly_charges, total_charges,
            support_tickets, last_login_days, monthly_usage_gb, payment_method,
            paperless_billing, online_security, tech_support, num_products,
            actual_churn, churn_probability, risk_tier, top_risk_driver, last_scored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records_to_insert)

    conn.commit()
    conn.close()
    print(f"[*] Successfully seeded {len(records_to_insert)} customers.")


def seed_initial_drift_history(db_path: Path = DB_PATH):
    """Seed historical drift checks across past days to visualize trend immediately."""
    from model.drift_monitor import ChurnDriftMonitor
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM drift_history")
    count = cursor.fetchone()[0]
    
    if count >= 3:
        conn.close()
        return

    print("[*] Generating baseline drift history timeline...")
    monitor = ChurnDriftMonitor()
    
    # 1. 3 days ago: Stable
    batch1 = monitor.baseline_df.sample(350, random_state=42)
    rep1 = monitor.run_drift_analysis(batch1)
    rep1["timestamp"] = "2026-09-03T10:00:00Z"
    save_drift_report(rep1, db_path)

    # 2. 1 day ago: Mild shift
    batch2 = monitor.baseline_df.sample(350, random_state=101)
    rep2 = monitor.run_drift_analysis(batch2)
    rep2["timestamp"] = "2026-09-05T14:30:00Z"
    save_drift_report(rep2, db_path)

    # 3. Today: Current check
    batch3 = monitor.baseline_df.sample(350, random_state=999)
    rep3 = monitor.run_drift_analysis(batch3)
    rep3["timestamp"] = datetime.utcnow().isoformat() + "Z"
    save_drift_report(rep3, db_path)

    conn.close()
    print("[*] Seeded 3 drift historical snapshots.")


if __name__ == "__main__":
    init_db()
    seed_customers_from_dataset()
    seed_initial_drift_history()