"""
Unit tests for Kolmogorov-Smirnov and Population Stability Index (PSI) drift detection.
"""

import pytest
import numpy as np
import pandas as pd
from model.drift_monitor import calculate_psi, calculate_categorical_psi, calculate_ks_test, ChurnDriftMonitor


def test_psi_identical_distributions():
    np.random.seed(42)
    dist1 = np.random.normal(100, 15, 1000)
    dist2 = np.random.normal(100, 15, 1000)
    psi = calculate_psi(dist1, dist2, num_bins=10)
    assert psi < 0.10, f"Expected stable PSI < 0.10, got {psi}"


def test_psi_shifted_distribution():
    np.random.seed(42)
    baseline = np.random.normal(100, 15, 1000)
    shifted = np.random.normal(150, 25, 1000)  # Significant shift
    psi = calculate_psi(baseline, shifted, num_bins=10)
    assert psi > 0.20, f"Expected critical PSI > 0.20, got {psi}"


def test_ks_test_detection():
    np.random.seed(42)
    base = np.random.normal(50, 5, 500)
    shifted = np.random.normal(65, 5, 500)
    stat, p_val = calculate_ks_test(base, shifted)
    assert p_val < 0.001
    assert stat > 0.3


def test_categorical_psi():
    s1 = pd.Series(["Month-to-Month"] * 50 + ["Two-Year"] * 50)
    s2 = pd.Series(["Month-to-Month"] * 95 + ["Two-Year"] * 5)
    psi = calculate_categorical_psi(s1, s2)
    assert psi > 0.20


def test_drift_monitor_run():
    monitor = ChurnDriftMonitor()
    sample = monitor.baseline_df.sample(200, random_state=42)
    rep = monitor.run_drift_analysis(sample)
    assert "overall_status" in rep
    assert "max_psi" in rep
    assert len(rep["features"]) > 0