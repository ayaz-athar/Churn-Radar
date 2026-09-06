"""
SHAP Explainability & Retention Copilot Engine
Computes local SHAP explanations for XGBoost predictions, extracts force values,
generates plain-English narrative summaries, and prescribes actionable retention playbooks.
"""

import sys
from pathlib import Path

# Ensure backend root is in sys.path BEFORE loading pickled models
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
import shap

from model.preprocess import ChurnPreprocessor

ARTIFACTS_DIR = BACKEND_DIR / "artifacts"

FEATURE_DISPLAY_NAMES = {
    "tenure_months": "Tenure (Months)",
    "monthly_charges": "Monthly Charges ($)",
    "total_charges": "Total Lifetime Spend ($)",
    "support_tickets": "Recent Support Tickets",
    "last_login_days": "Days Since Last Login",
    "monthly_usage_gb": "Monthly Usage (GB)",
    "num_products": "Subscribed Products Count",
    "contract_type_Month-to-Month": "Month-to-Month Contract",
    "contract_type_One-Year": "One-Year Contract",
    "contract_type_Two-Year": "Two-Year Contract",
    "payment_method_Electronic Check": "Electronic Check Payment",
    "payment_method_Credit Card": "Credit Card Auto-Pay",
    "payment_method_Bank Transfer": "Bank Transfer Auto-Pay",
    "payment_method_Mailed Check": "Mailed Check Payment",
    "paperless_billing_Yes": "Paperless Billing Active",
    "paperless_billing_No": "Paper Billing Active",
    "online_security_Yes": "Online Security Subscribed",
    "online_security_No": "No Online Security",
    "tech_support_Yes": "Tech Support Subscribed",
    "tech_support_No": "No Tech Support"
}


class ChurnExplainer:
    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self.model = joblib.load(artifacts_dir / "xgb_churn_model.joblib")
        self.preprocessor = joblib.load(artifacts_dir / "preprocessor.joblib")
        self.feature_names = self.preprocessor.feature_names
        
        # TreeExplainer is lightning fast for tree-based ensembles (XGBoost)
        self.explainer = shap.TreeExplainer(self.model)

    def clean_name(self, feat: str) -> str:
        if feat in FEATURE_DISPLAY_NAMES:
            return FEATURE_DISPLAY_NAMES[feat]
        return feat.replace("_", " ").title()

    def prescribe_playbook(
        self,
        risk_tier: str,
        top_driver_name: str,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prescribe targeted retention strategy based on the customer's top churn catalyst."""
        if risk_tier == "LOW":
            return {
                "title": "Nurture & Advocacy Campaign",
                "urgency": "Low (Next 30 Days)",
                "category": "Customer Advocacy",
                "action": "Enroll in VIP Advocacy Program, request case study / review, and offer referral credits.",
                "projected_impact": "Strengthens loyalty anchor; NPS promoter conversion."
            }

        feat_lower = top_driver_name.lower()

        if "support" in feat_lower or int(features.get("support_tickets", 0)) >= 3:
            return {
                "title": "VIP Escalation & Account Health Audit",
                "urgency": "Immediate (Within 4 Hours)",
                "category": "Customer Success & Support",
                "action": "Assign Senior Solutions Engineer to review open tickets, schedule 15-minute executive check-in, and provide dedicated support channel.",
                "projected_impact": "+35% reduction in churn risk once unresolved tickets are cleared."
            }
        elif "contract" in feat_lower or str(features.get("contract_type", "")) == "Month-to-Month":
            return {
                "title": "Annual Commitment Upgrade Offer",
                "urgency": "High (Within 48 Hours)",
                "category": "Contract & Pricing",
                "action": "Send automated personalized offer: 15% discount on 1-year annual lock-in plus 1 month free platform add-on.",
                "projected_impact": "+42% retention stability upon annual contract execution."
            }
        elif "login" in feat_lower or int(features.get("last_login_days", 0)) >= 18:
            return {
                "title": "Proactive Value Re-Engagement",
                "urgency": "High (Within 24 Hours)",
                "category": "Product Engagement",
                "action": "Trigger personalized re-engagement sequence highlighting unused workspace features and deliver weekly digest report.",
                "projected_impact": "+28% activity recovery within 7 days."
            }
        elif "charges" in feat_lower or float(features.get("monthly_charges", 0)) > 75.0:
            return {
                "title": "Plan Optimization & Rightsizing Review",
                "urgency": "Medium (Within 3 Days)",
                "category": "Billing & Tier Optimization",
                "action": "Offer free account rightsizing audit to adjust license tier to actual consumption and bundle free security tools.",
                "projected_impact": "+30% bill satisfaction increase."
            }
        elif "check" in feat_lower or str(features.get("payment_method", "")) == "Electronic Check":
            return {
                "title": "Auto-Pay Payment Method Incentive",
                "urgency": "Medium (Next Billing Cycle)",
                "category": "Billing Operations",
                "action": "Offer a one-time $15 credit upon switching billing method to Credit Card or Direct ACH Auto-Pay.",
                "projected_impact": "+22% reduction in involuntary billing churn."
            }
        else:
            return {
                "title": "Executive Success Outreach",
                "urgency": "High (Within 48 Hours)",
                "category": "Account Management",
                "action": "Schedule proactive 1-on-1 customer review call to assess satisfaction and unblock ongoing operational goals.",
                "projected_impact": "+25% general retention boost."
            }

    def explain(self, customer_record: Dict[str, Any]) -> Dict[str, Any]:
        """Generate complete SHAP explanation for a customer record."""
        # 1. Transform input features
        X = self.preprocessor.transform(customer_record)

        # 2. Model Prediction
        prob = float(self.model.predict_proba(X)[0, 1])
        pred_class = int(prob >= 0.5)

        if prob >= 0.65:
            risk_tier = "HIGH"
        elif prob >= 0.35:
            risk_tier = "MEDIUM"
        else:
            risk_tier = "LOW"

        # 3. Compute SHAP values
        shap_explanation = self.explainer(X)
        shap_values = shap_explanation.values[0]
        base_value = float(self.explainer.expected_value)

        # 4. Format all feature contributions
        contributions = []
        for i, feat in enumerate(self.feature_names):
            val = float(shap_values[i])
            disp = self.clean_name(feat)
            
            orig_val = customer_record.get(feat, None)
            if orig_val is None:
                for k, v in customer_record.items():
                    if feat.startswith(k):
                        orig_val = v
                        break

            contributions.append({
                "feature": feat,
                "display_name": disp,
                "shap_value": round(val, 4),
                "original_value": orig_val,
                "direction": "risk_increase" if val > 0 else "retention_anchor"
            })

        contributions_sorted = sorted(contributions, key=lambda x: abs(x["shap_value"]), reverse=True)
        top_risk_drivers = [c for c in contributions_sorted if c["shap_value"] > 0][:5]
        top_retention_anchors = [c for c in contributions_sorted if c["shap_value"] < 0][:5]

        # 5. Generate Plain-Language Human Explanation
        top_risk_str = ", ".join(
            [f"{c['display_name']} (+{c['shap_value']:.2f} impact)" for c in top_risk_drivers[:3]]
        )
        anchor_str = ", ".join(
            [f"{c['display_name']} ({c['shap_value']:.2f} impact)" for c in top_retention_anchors[:2]]
        )

        if risk_tier == "HIGH":
            narrative = (
                f"High churn risk ({prob:.1%}) is predominantly driven by {top_risk_str}."
            )
            if anchor_str:
                narrative += f" Key stabilizing retention factors include {anchor_str}."
        elif risk_tier == "MEDIUM":
            narrative = (
                f"Moderate churn risk ({prob:.1%}). Elevated concern from {top_risk_str}, "
                f"mitigated by positive customer signals from {anchor_str}."
            )
        else:
            narrative = (
                f"Low churn risk ({prob:.1%}) with strong account health. Primary retention anchors: "
                f"{anchor_str}."
            )

        top_driver_name = top_risk_drivers[0]["display_name"] if top_risk_drivers else "Account Longevity"
        playbook = self.prescribe_playbook(risk_tier, top_driver_name, customer_record)

        return {
            "customer_id": customer_record.get("customer_id", "ANON-001"),
            "churn_probability": round(prob, 4),
            "risk_tier": risk_tier,
            "predicted_churn": pred_class,
            "base_value": round(base_value, 4),
            "explanation_summary": narrative,
            "top_risk_drivers": top_risk_drivers,
            "top_retention_anchors": top_retention_anchors,
            "all_contributions": contributions_sorted,
            "retention_playbook": playbook
        }


if __name__ == "__main__":
    explainer = ChurnExplainer()
    sample = {
        "customer_id": "CR-TEST",
        "tenure_months": 2,
        "contract_type": "Month-to-Month",
        "monthly_charges": 85.50,
        "total_charges": 171.0,
        "support_tickets": 4,
        "last_login_days": 25,
        "monthly_usage_gb": 45.0,
        "payment_method": "Electronic Check",
        "paperless_billing": "Yes",
        "online_security": "No",
        "tech_support": "No",
        "num_products": 1
    }
    result = explainer.explain(sample)
    print("Probability:", result["churn_probability"])
    print("Risk Tier:", result["risk_tier"])
    print("Summary:", result["explanation_summary"])
    print("Playbook:", result["retention_playbook"]["title"])
