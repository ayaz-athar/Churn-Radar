"""
Unit tests for Churn Radar ML Preprocessing, XGBoost Model, and SHAP Explainer.
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from model.preprocess import ChurnPreprocessor, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
from model.explain import ChurnExplainer


@pytest.fixture
def sample_customer():
    return {
        "customer_id": "TEST-CUST-999",
        "tenure_months": 3,
        "contract_type": "Month-to-Month",
        "monthly_charges": 89.50,
        "total_charges": 268.50,
        "support_tickets": 4,
        "last_login_days": 28,
        "monthly_usage_gb": 35.0,
        "payment_method": "Electronic Check",
        "paperless_billing": "Yes",
        "online_security": "No",
        "tech_support": "No",
        "num_products": 1
    }


def test_preprocessor_transformation(sample_customer):
    prep = ChurnPreprocessor.load(Path(__file__).resolve().parent.parent / "artifacts" / "preprocessor.joblib")
    X = prep.transform(sample_customer)
    assert isinstance(X, np.ndarray)
    assert X.shape[0] == 1
    assert X.shape[1] == len(prep.feature_names)
    assert not np.isnan(X).any()


def test_shap_explainer_output(sample_customer):
    explainer = ChurnExplainer()
    res = explainer.explain(sample_customer)

    assert "churn_probability" in res
    assert 0.0 <= res["churn_probability"] <= 1.0
    assert res["risk_tier"] in ["LOW", "MEDIUM", "HIGH"]
    assert "explanation_summary" in res
    assert len(res["top_risk_drivers"]) > 0
    assert "retention_playbook" in res
    assert "title" in res["retention_playbook"]
    assert "action" in res["retention_playbook"]