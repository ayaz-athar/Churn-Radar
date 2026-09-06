"""
Churn Radar Drift Monitoring Module
Implements Kolmogorov-Smirnov (KS-Test) and Population Stability Index (PSI)
to detect data and prediction drift between baseline training distribution and live inference data.
Adapted from the battle-tested architecture of fraud-ml-pipeline.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import numpy as np
import pandas as pd
from scipy import stats

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.preprocess import NUMERICAL_FEATURES, CATEGORICAL_FEATURES


def calculate_psi(
    expected: np.ndarray,
    actual: np.ndarray,
    num_bins: int = 10,
    epsilon: float = 1e-4
) -> float:
    """
    Calculate Population Stability Index (PSI) for continuous numerical variables.
    Formula: PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) )
    """
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]

    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    quantiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(expected, quantiles)
    bin_edges = np.unique(bin_edges)

    if len(bin_edges) < 2:
        return 0.0

    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    expected_counts = np.histogram(expected, bins=bin_edges)[0]
    actual_counts = np.histogram(actual, bins=bin_edges)[0]

    expected_pct = expected_counts / len(expected)
    actual_pct = actual_counts / len(actual)

    expected_pct = np.where(expected_pct == 0, epsilon, expected_pct)
    actual_pct = np.where(actual_pct == 0, epsilon, actual_pct)

    psi_values = (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
    return float(np.sum(psi_values))


def calculate_categorical_psi(
    expected_series: pd.Series,
    actual_series: pd.Series,
    epsilon: float = 1e-4
) -> float:
    """Calculate PSI across discrete categorical distributions."""
    expected_clean = expected_series.dropna().astype(str)
    actual_clean = actual_series.dropna().astype(str)

    if len(expected_clean) == 0 or len(actual_clean) == 0:
        return 0.0

    expected_counts = expected_clean.value_counts(normalize=True)
    actual_counts = actual_clean.value_counts(normalize=True)

    all_categories = sorted(list(set(expected_counts.index).union(set(actual_counts.index))))
    
    expected_pct = np.array([expected_counts.get(cat, epsilon) for cat in all_categories])
    actual_pct = np.array([actual_counts.get(cat, epsilon) for cat in all_categories])

    expected_pct = expected_pct / expected_pct.sum()
    actual_pct = actual_pct / actual_pct.sum()

    psi_values = (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
    return float(np.sum(psi_values))


def calculate_ks_test(
    expected: np.ndarray,
    actual: np.ndarray
) -> Tuple[float, float]:
    """Perform two-sample Kolmogorov-Smirnov test. Returns (ks_statistic, p_value)."""
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]

    if len(expected) == 0 or len(actual) == 0:
        return 0.0, 1.0

    res = stats.ks_2samp(expected, actual)
    return float(res.statistic), float(res.pvalue)


class ChurnDriftMonitor:
    def __init__(
        self,
        baseline_path: Path = BACKEND_DIR / "data" / "churn_data.csv",
        psi_warning_threshold: float = 0.10,
        psi_critical_threshold: float = 0.20,
        ks_alpha: float = 0.05,
        ks_stat_threshold: float = 0.12
    ):
        self.baseline_path = baseline_path
        self.psi_warning_threshold = psi_warning_threshold
        self.psi_critical_threshold = psi_critical_threshold
        self.ks_alpha = ks_alpha
        self.ks_stat_threshold = ks_stat_threshold

        self.baseline_df = pd.read_csv(baseline_path)
        self.num_cols = NUMERICAL_FEATURES
        self.cat_cols = CATEGORICAL_FEATURES

    def test_numerical_feature(
        self,
        feature_name: str,
        ref_values: np.ndarray,
        curr_values: np.ndarray
    ) -> Dict[str, Any]:
        ks_stat, p_val = calculate_ks_test(ref_values, curr_values)
        psi_val = calculate_psi(ref_values, curr_values, num_bins=10)

        ref_clean = ref_values[~np.isnan(ref_values)]
        curr_clean = curr_values[~np.isnan(curr_values)]

        ref_mean = float(np.mean(ref_clean)) if len(ref_clean) > 0 else 0.0
        curr_mean = float(np.mean(curr_clean)) if len(curr_clean) > 0 else 0.0
        mean_shift_pct = float(((curr_mean - ref_mean) / (ref_mean + 1e-6)) * 100.0)

        is_critical = (psi_val >= self.psi_critical_threshold) or (p_val < self.ks_alpha and ks_stat >= self.ks_stat_threshold)
        is_warning = (psi_val >= self.psi_warning_threshold) or (p_val < self.ks_alpha)

        if is_critical:
            status = "CRITICAL"
        elif is_warning:
            status = "WARNING"
        else:
            status = "STABLE"

        return {
            "feature": feature_name,
            "type": "numerical",
            "test_used": "Kolmogorov-Smirnov & PSI",
            "ks_statistic": round(ks_stat, 4),
            "p_value": round(p_val, 6),
            "psi": round(psi_val, 4),
            "status": status,
            "is_drifted": is_critical or is_warning,
            "baseline_mean": round(ref_mean, 2),
            "current_mean": round(curr_mean, 2),
            "mean_shift_pct": round(mean_shift_pct, 2)
        }

    def test_categorical_feature(
        self,
        feature_name: str,
        ref_series: pd.Series,
        curr_series: pd.Series
    ) -> Dict[str, Any]:
        psi_val = calculate_categorical_psi(ref_series, curr_series)

        if psi_val >= self.psi_critical_threshold:
            status = "CRITICAL"
        elif psi_val >= self.psi_warning_threshold:
            status = "WARNING"
        else:
            status = "STABLE"

        return {
            "feature": feature_name,
            "type": "categorical",
            "test_used": "Categorical PSI",
            "ks_statistic": None,
            "p_value": None,
            "psi": round(psi_val, 4),
            "status": status,
            "is_drifted": status != "STABLE",
            "baseline_distribution": ref_series.value_counts(normalize=True).round(3).to_dict(),
            "current_distribution": curr_series.value_counts(normalize=True).round(3).to_dict()
        }

    def run_drift_analysis(self, current_data: pd.DataFrame) -> Dict[str, Any]:
        """Execute full statistical drift analysis across all features."""
        feature_reports = []
        drifted_count = 0
        critical_count = 0
        psi_scores = []

        # 1. Evaluate Numerical Features
        for col in self.num_cols:
            if col in current_data.columns and col in self.baseline_df.columns:
                res = self.test_numerical_feature(
                    col,
                    self.baseline_df[col].values.astype(float),
                    current_data[col].values.astype(float)
                )
                feature_reports.append(res)
                psi_scores.append(res["psi"])
                if res["status"] == "CRITICAL":
                    critical_count += 1
                    drifted_count += 1
                elif res["status"] == "WARNING":
                    drifted_count += 1

        # 2. Evaluate Categorical Features
        for col in self.cat_cols:
            if col in current_data.columns and col in self.baseline_df.columns:
                res = self.test_categorical_feature(
                    col,
                    self.baseline_df[col],
                    current_data[col]
                )
                feature_reports.append(res)
                psi_scores.append(res["psi"])
                if res["status"] == "CRITICAL":
                    critical_count += 1
                    drifted_count += 1
                elif res["status"] == "WARNING":
                    drifted_count += 1

        max_psi = max(psi_scores) if psi_scores else 0.0
        mean_psi = float(np.mean(psi_scores)) if psi_scores else 0.0

        if critical_count >= 2 or max_psi >= self.psi_critical_threshold:
            overall_status = "CRITICAL"
        elif drifted_count >= 2 or max_psi >= self.psi_warning_threshold:
            overall_status = "WARNING"
        else:
            overall_status = "STABLE"

        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_status": overall_status,
            "dataset_drift_detected": overall_status != "STABLE",
            "drifted_features_count": drifted_count,
            "critical_features_count": critical_count,
            "total_features_evaluated": len(feature_reports),
            "max_psi": round(max_psi, 4),
            "mean_psi": round(mean_psi, 4),
            "features": feature_reports,
            "current_batch_size": len(current_data)
        }

    def generate_simulated_drift_batch(self, n_samples: int = 400, drift_severity: str = "moderate") -> pd.DataFrame:
        """
        Synthesize realistic covariate drift scenarios for interactive testing:
        - Sudden surge in support tickets (e.g. platform outage or buggy release)
        - Inactivity spike (days since last login shifts higher)
        - Surge in Month-to-Month contracts
        """
        df_drift = self.baseline_df.sample(n=n_samples, replace=True, random_state=int(datetime.now().timestamp()) % 10000).copy()

        if drift_severity == "moderate":
            # Shift support tickets higher
            df_drift["support_tickets"] = np.clip(df_drift["support_tickets"] + np.random.poisson(1.5, size=n_samples), 0, 8)
            # Shift inactivity
            df_drift["last_login_days"] = np.clip(df_drift["last_login_days"] + np.random.randint(5, 18, size=n_samples), 0, 60)
        elif drift_severity == "critical":
            # Severe shift: 85% month-to-month contracts + support ticket surge
            df_drift["contract_type"] = np.random.choice(["Month-to-Month", "One-Year", "Two-Year"], p=[0.85, 0.10, 0.05], size=n_samples)
            df_drift["support_tickets"] = np.clip(df_drift["support_tickets"] + np.random.poisson(3.0, size=n_samples), 0, 8)
            df_drift["last_login_days"] = np.clip(df_drift["last_login_days"] + np.random.randint(12, 30, size=n_samples), 0, 60)
            df_drift["monthly_usage_gb"] = np.clip(df_drift["monthly_usage_gb"] * 0.65, 10.0, 500.0)

        return df_drift


if __name__ == "__main__":
    monitor = ChurnDriftMonitor()
    # Test on natural sample (stable)
    sample_clean = monitor.baseline_df.sample(300, random_state=123)
    clean_report = monitor.run_drift_analysis(sample_clean)
    print("Natural sample status:", clean_report["overall_status"], "Max PSI:", clean_report["max_psi"])

    # Test on drifted sample
    drift_sample = monitor.generate_simulated_drift_batch(n_samples=400, drift_severity="critical")
    drift_report = monitor.run_drift_analysis(drift_sample)
    print("Drifted sample status:", drift_report["overall_status"], "Max PSI:", drift_report["max_psi"], "Drifted feats:", drift_report["drifted_features_count"])
