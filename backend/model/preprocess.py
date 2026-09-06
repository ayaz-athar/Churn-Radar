"""
Churn Radar Preprocessing Pipeline
Handles missing values, categorical one-hot encoding, numerical scaling,
feature name preservation, and SMOTE balancing.
"""

from typing import Tuple, List, Dict, Any, Union, Optional
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE

NUMERICAL_FEATURES: List[str] = [
    "tenure_months",
    "monthly_charges",
    "total_charges",
    "support_tickets",
    "last_login_days",
    "monthly_usage_gb",
    "num_products"
]

CATEGORICAL_FEATURES: List[str] = [
    "contract_type",
    "payment_method",
    "paperless_billing",
    "online_security",
    "tech_support"
]

TARGET_COLUMN = "churn"
ID_COLUMN = "customer_id"


class ChurnPreprocessor(BaseEstimator, TransformerMixin):
    """
    Production preprocessor preserving explicit feature names for explainable AI (SHAP).
    """

    def __init__(self):
        self.num_cols = NUMERICAL_FEATURES
        self.cat_cols = CATEGORICAL_FEATURES
        self.target_col = TARGET_COLUMN
        self.id_col = ID_COLUMN

        self.column_transformer: Optional[ColumnTransformer] = None
        self.feature_names: List[str] = []
        self.is_fitted = False

    def _build_transformer(self) -> ColumnTransformer:
        from sklearn.pipeline import Pipeline
        
        num_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler())
        ])

        cat_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
        ])

        return ColumnTransformer(
            transformers=[
                ("num", num_pipeline, self.num_cols),
                ("cat", cat_pipeline, self.cat_cols)
            ]
        )

    def fit(self, X: pd.DataFrame, y: Optional[pd.Series] = None):
        """Fit preprocessor pipelines on input DataFrame."""
        df = X.copy()
        self.column_transformer = self._build_transformer()
        self.column_transformer.fit(df)

        # Extract generated feature names
        cat_encoder = self.column_transformer.named_transformers_["cat"].named_steps["encoder"]
        cat_encoded_names = cat_encoder.get_feature_names_out(self.cat_cols).tolist()
        
        # Clean names for SHAP readability (e.g. "contract_type_Month-to-Month" -> "Contract: Month-to-Month")
        self.feature_names = self.num_cols + cat_encoded_names
        self.is_fitted = True
        return self

    def transform(self, X: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """Transform raw customer records into scaled numerical array."""
        if not self.is_fitted or self.column_transformer is None:
            raise RuntimeError("Preprocessor has not been fitted yet.")

        if isinstance(X, dict):
            df = pd.DataFrame([X])
        elif isinstance(X, list):
            df = pd.DataFrame(X)
        else:
            df = X.copy()

        # Fill any missing expected columns with default placeholders
        for col in self.num_cols:
            if col not in df.columns:
                df[col] = np.nan
        for col in self.cat_cols:
            if col not in df.columns:
                df[col] = "Missing"

        return self.column_transformer.transform(df)

    def fit_transform(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> np.ndarray:
        return self.fit(X, y).transform(X)

    def apply_smote(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Synthesize minority churn class samples using SMOTE.
        Must only be applied on the training split!
        """
        smote = SMOTE(random_state=random_state, sampling_strategy="auto")
        X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
        return X_resampled, y_resampled

    def save(self, filepath: Union[str, Path]):
        """Serialize preprocessor to disk."""
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: Union[str, Path]) -> "ChurnPreprocessor":
        """Load preprocessor from disk."""
        return joblib.load(filepath)
