"""
Synthetic SaaS / Telco Customer Churn Dataset Generator
Creates a realistic 4,000-customer dataset with non-linear churn dynamics,
realistic correlations, and natural class imbalance (~26% churn).
"""

import numpy as np
import pandas as pd
from pathlib import Path

def generate_dataset(n_samples: int = 4000, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)

    customer_ids = [f"CR-{1000 + i}" for i in range(n_samples)]
    
    # Core tenure (months): mix of newer customers and long-term loyalists
    n_new = int(n_samples * 0.35)
    n_mid = int(n_samples * 0.35)
    n_long = n_samples - n_new - n_mid
    
    tenure_months = np.concatenate([
        np.random.randint(1, 12, size=n_new),
        np.random.randint(12, 36, size=n_mid),
        np.random.randint(36, 73, size=n_long)
    ])
    np.random.shuffle(tenure_months)

    # Contract type correlated with tenure
    contract_probs = []
    for t in tenure_months:
        if t < 12:
            contract_probs.append([0.75, 0.20, 0.05])
        elif t < 36:
            contract_probs.append([0.40, 0.45, 0.15])
        else:
            contract_probs.append([0.15, 0.35, 0.50])
            
    contracts = ["Month-to-Month", "One-Year", "Two-Year"]
    contract_type = [np.random.choice(contracts, p=p) for p in contract_probs]

    # Support tickets in past 90 days (Poisson distribution skewed towards 0-2)
    support_tickets = np.random.poisson(lam=1.5, size=n_samples)
    support_tickets = np.clip(support_tickets, 0, 8)

    # Days since last active login (0 to 60 days)
    last_login_days = np.random.exponential(scale=11, size=n_samples).astype(int)
    last_login_days = np.clip(last_login_days, 0, 60)

    # Monthly usage in GB
    monthly_usage_gb = np.random.normal(loc=160, scale=80, size=n_samples)
    monthly_usage_gb = np.clip(np.round(monthly_usage_gb, 1), 12.0, 550.0)

    # Base pricing & services
    num_products = np.random.choice([1, 2, 3, 4], p=[0.30, 0.40, 0.20, 0.10], size=n_samples)
    base_charge = 25.0 + (num_products * 18.0)
    noise_charge = np.random.normal(0, 10.0, size=n_samples)
    monthly_charges = np.clip(np.round(base_charge + noise_charge, 2), 18.50, 125.00)

    # Total charges with realistic noise
    total_charges = np.round(monthly_charges * tenure_months + np.random.normal(0, 30.0, size=n_samples), 2)
    total_charges = np.maximum(total_charges, monthly_charges)

    # Categorical services
    payment_methods = ["Electronic Check", "Bank Transfer", "Credit Card", "Mailed Check"]
    payment_method = np.random.choice(payment_methods, p=[0.38, 0.26, 0.24, 0.12], size=n_samples)

    paperless_billing = np.random.choice(["Yes", "No"], p=[0.62, 0.38], size=n_samples)
    online_security = np.random.choice(["Yes", "No"], p=[0.42, 0.58], size=n_samples)
    tech_support = np.random.choice(["Yes", "No"], p=[0.39, 0.61], size=n_samples)

    # Ground Truth Churn Logit calibrated for realistic ~26% churn rate
    logit = -0.45  # Intercept
    
    # Contract impact
    logit += np.where(np.array(contract_type) == "Month-to-Month", 1.45, 0.0)
    logit -= np.where(np.array(contract_type) == "Two-Year", 1.65, 0.0)
    logit -= np.where(np.array(contract_type) == "One-Year", 0.60, 0.0)
    
    # Support tickets: steep non-linear increase when support tickets >= 3
    logit += np.where(support_tickets >= 3, 1.40 + (support_tickets - 3) * 0.40, -0.30)

    # Last login inactivity: strong abandonment signal if > 18 days
    logit += np.where(last_login_days > 18, 1.25 + (last_login_days - 18) * 0.035, -0.30)

    # Tenure impact: loyal customers churn much less
    logit -= np.log1p(tenure_months) * 0.65

    # Monthly charges vs tech support: high bills without tech support cause churn
    high_bill_no_support = (monthly_charges > 70.0) & (tech_support == "No")
    logit += np.where(high_bill_no_support, 0.95, 0.0)

    # Payment method friction
    logit += np.where(payment_method == "Electronic Check", 0.55, -0.15)

    # Multi-product stickiness
    logit -= (num_products - 1) * 0.35

    # Low usage drop-off
    logit += np.where(monthly_usage_gb < 60.0, 0.70, -0.15)

    # Convert logit to probability
    prob = 1.0 / (1.0 + np.exp(-logit))
    
    # Sample actual churn labels
    churn = (np.random.rand(n_samples) < prob).astype(int)

    df = pd.DataFrame({
        "customer_id": customer_ids,
        "tenure_months": tenure_months,
        "contract_type": contract_type,
        "monthly_charges": monthly_charges,
        "total_charges": total_charges,
        "support_tickets": support_tickets,
        "last_login_days": last_login_days,
        "monthly_usage_gb": monthly_usage_gb,
        "payment_method": payment_method,
        "paperless_billing": paperless_billing,
        "online_security": online_security,
        "tech_support": tech_support,
        "num_products": num_products,
        "churn": churn
    })

    return df

if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    df = generate_dataset(n_samples=4000)
    csv_path = out_dir / "churn_data.csv"
    df.to_csv(csv_path, index=False)
    churn_rate = df["churn"].mean()
    print(f"Generated {len(df)} customer records saved to {csv_path}")
    print(f"Class distribution: Churned = {df['churn'].sum()} ({churn_rate:.1%}), Retained = {(1 - df['churn']).sum()} ({(1-churn_rate):.1%})")
