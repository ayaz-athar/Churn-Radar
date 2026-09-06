"""
Churn Radar Model Training & Evaluation Pipeline
Trains an XGBoost classifier with SMOTE class imbalance mitigation,
stratified cross-validation, hyperparameter tuning, and comprehensive evaluation metrics.
Saves model artifacts, preprocessor, metrics, and baseline feature distributions.
"""

import os
import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report
)
from xgboost import XGBClassifier

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.preprocess import ChurnPreprocessor, TARGET_COLUMN, ID_COLUMN


def train_model(
    data_path: Path = BACKEND_DIR / "data" / "churn_data.csv",
    artifacts_dir: Path = BACKEND_DIR / "artifacts",
    random_state: int = 42
):
    print("=" * 65)
    print("  CHURN RADAR: PRODUCTION XGBOOST TRAINING PIPELINE")
    print("=" * 65)

    artifacts_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load dataset
    print(f"[*] Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"    Loaded {len(df)} records. Churn rate: {df[TARGET_COLUMN].mean():.2%}")

    # 2. Train / Test Stratified Split (80/20)
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        stratify=df[TARGET_COLUMN],
        random_state=random_state
    )
    print(f"[*] Train set: {len(train_df)} rows | Test set: {len(test_df)} rows")

    # 3. Fit Preprocessor
    print("[*] Fitting preprocessor and encoding features...")
    preprocessor = ChurnPreprocessor()
    preprocessor.fit(train_df)

    X_train_raw = preprocessor.transform(train_df)
    y_train = train_df[TARGET_COLUMN].values

    X_test = preprocessor.transform(test_df)
    y_test = test_df[TARGET_COLUMN].values

    feature_names = preprocessor.feature_names
    print(f"    Engineered {len(feature_names)} features: {feature_names[:4]}...")

    # Save baseline distribution dataframe (training set) for drift monitoring
    baseline_path = artifacts_dir / "baseline_features.csv"
    train_features_df = pd.DataFrame(X_train_raw, columns=feature_names)
    train_features_df.to_csv(baseline_path, index=False)
    print(f"[*] Saved baseline distribution to {baseline_path}")

    # 4. Address Class Imbalance with SMOTE on Training Split
    print("[*] Applying SMOTE to balance minority churn class in training split...")
    before_counts = np.bincount(y_train)
    print(f"    Prior balance: Retained={before_counts[0]}, Churned={before_counts[1]}")
    
    X_train_smote, y_train_smote = preprocessor.apply_smote(
        X_train_raw, y_train, random_state=random_state
    )
    after_counts = np.bincount(y_train_smote)
    print(f"    Post-SMOTE balance: Retained={after_counts[0]}, Churned={after_counts[1]}")

    # 5. XGBoost Hyperparameter Tuning with Stratified 5-Fold CV
    print("[*] Hyperparameter tuning with Stratified 5-Fold Cross-Validation...")
    param_grid = {
        "max_depth": [3, 4, 5],
        "learning_rate": [0.03, 0.08, 0.15],
        "n_estimators": [100, 180],
        "subsample": [0.8, 1.0],
        "colsample_bytree": [0.8, 1.0]
    }

    base_xgb = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=random_state,
        n_jobs=-1
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    grid_search = GridSearchCV(
        estimator=base_xgb,
        param_grid=param_grid,
        cv=cv,
        scoring="roc_auc",
        n_jobs=-1,
        verbose=0
    )
    grid_search.fit(X_train_smote, y_train_smote)

    best_model: XGBClassifier = grid_search.best_estimator_
    print(f"    Optimal Hyperparameters: {grid_search.best_params_}")
    print(f"    Best 5-Fold CV ROC-AUC: {grid_search.best_score_:.4f}")

    # 6. Comprehensive Test Set Evaluation
    print("[*] Evaluating on held-out test set (unbalanced real-world test distribution)...")
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_proba))
    pr_auc = float(average_precision_score(y_test, y_proba))
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("-" * 50)
    print(f"  Accuracy:          {acc:.4f}")
    print(f"  Precision (Churn): {prec:.4f}")
    print(f"  Recall (Churn):    {rec:.4f}")
    print(f"  F1-Score (Churn):  {f1:.4f}")
    print(f"  ROC-AUC:           {roc_auc:.4f}")
    print(f"  PR-AUC (Avg Prec): {pr_auc:.4f}")
    print(f"  Confusion Matrix:  TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
    print("-" * 50)

    # 7. Extract Feature Importances
    importances = best_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    feature_importance_list = [
        {"feature": feature_names[idx], "importance": round(float(importances[idx]), 4)}
        for idx in sorted_idx
    ]

    metrics_payload = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": {
            "true_negative": cm[0][0],
            "false_positive": cm[0][1],
            "false_negative": cm[1][0],
            "true_positive": cm[1][1]
        },
        "best_hyperparameters": grid_search.best_params_,
        "feature_importances": feature_importance_list,
        "test_samples": len(y_test),
        "train_samples_post_smote": len(y_train_smote)
    }

    # 8. Save Artifacts
    model_path = artifacts_dir / "xgb_churn_model.joblib"
    prep_path = artifacts_dir / "preprocessor.joblib"
    metrics_path = artifacts_dir / "metrics.json"
    feat_path = artifacts_dir / "feature_names.json"

    joblib.dump(best_model, model_path)
    preprocessor.save(prep_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)
    with open(feat_path, "w", encoding="utf-8") as f:
        json.dump(feature_names, f, indent=2)

    print(f"[*] Artifacts successfully serialized to {artifacts_dir}:")
    print(f"    - {model_path.name}")
    print(f"    - {prep_path.name}")
    print(f"    - {metrics_path.name}")
    print(f"    - {feat_path.name}")
    print("=" * 65)
    return metrics_payload

if __name__ == "__main__":
    train_model()
