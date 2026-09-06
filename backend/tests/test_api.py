"""
Integration tests for Churn Radar Flask REST endpoints.
"""

import pytest
import json
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True


def test_predict_endpoint(client):
    payload = {
        "customer_id": "CR-INTEGRATION-1",
        "tenure_months": 1,
        "contract_type": "Month-to-Month",
        "monthly_charges": 95.0,
        "total_charges": 95.0,
        "support_tickets": 5,
        "last_login_days": 30,
        "monthly_usage_gb": 20.0,
        "payment_method": "Electronic Check",
        "paperless_billing": "Yes",
        "online_security": "No",
        "tech_support": "No",
        "num_products": 1
    }
    res = client.post("/predict", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    assert "churn_probability" in data
    assert data["risk_tier"] == "HIGH"
    assert "retention_playbook" in data
    assert "request_id" in data


def test_customers_pagination(client):
    res = client.get("/customers?page=1&page_size=10")
    assert res.status_code == 200
    data = res.get_json()
    assert "customers" in data
    assert len(data["customers"]) <= 10
    assert "pagination" in data
    assert "summary" in data


def test_explain_customer_endpoint(client):
    # Fetch first customer
    cust_res = client.get("/customers?page=1&page_size=1")
    first_cust_id = cust_res.get_json()["customers"][0]["customer_id"]

    res = client.get(f"/explain/{first_cust_id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["customer_id"] == first_cust_id
    assert "all_contributions" in data
    assert "top_risk_drivers" in data


def test_drift_report_and_simulation(client):
    # 1. Get drift report
    res = client.get("/drift-report")
    assert res.status_code == 200
    data = res.get_json()
    assert "latest_report" in data
    assert "drift_history_timeline" in data

    # 2. Simulate drift
    sim_res = client.post("/simulate-drift", data=json.dumps({"severity": "critical"}), content_type="application/json")
    assert sim_res.status_code == 200
    sim_data = sim_res.get_json()
    assert sim_data["status"] == "success"
    assert "drift_report" in sim_data


def test_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    data = res.get_json()
    assert "roc_auc" in data
    assert "accuracy" in data