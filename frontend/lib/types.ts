export interface Customer {
  customer_id: string;
  tenure_months: number;
  contract_type: string;
  monthly_charges: number;
  total_charges: number;
  support_tickets: number;
  last_login_days: number;
  monthly_usage_gb: number;
  payment_method: string;
  paperless_billing: string;
  online_security: string;
  tech_support: string;
  num_products: number;
  actual_churn?: number;
  churn_probability: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  top_risk_driver: string;
  last_scored_at: string;
}

export interface ShapContribution {
  feature: string;
  display_name: string;
  shap_value: number;
  original_value: any;
  direction: "risk_increase" | "retention_anchor";
}

export interface RetentionPlaybook {
  title: string;
  urgency: string;
  category: string;
  action: string;
  projected_impact: string;
}

export interface ExplanationResponse {
  customer_id: string;
  churn_probability: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  predicted_churn: number;
  base_value: number;
  explanation_summary: string;
  top_risk_drivers: ShapContribution[];
  top_retention_anchors: ShapContribution[];
  all_contributions: ShapContribution[];
  retention_playbook: RetentionPlaybook;
}

export interface FeatureDrift {
  feature: string;
  type: "numerical" | "categorical";
  test_used: string;
  ks_statistic: number | null;
  p_value: number | null;
  psi: number;
  status: "STABLE" | "WARNING" | "CRITICAL";
  is_drifted: boolean;
  baseline_mean?: number;
  current_mean?: number;
  mean_shift_pct?: number;
}

export interface DriftReport {
  timestamp: string;
  overall_status: "STABLE" | "WARNING" | "CRITICAL";
  dataset_drift_detected: boolean;
  drifted_features_count: number;
  critical_features_count: number;
  total_features_evaluated: number;
  max_psi: number;
  mean_psi: number;
  features: FeatureDrift[];
  current_batch_size: number;
}

export interface DriftHistoryPoint {
  id: number;
  timestamp: string;
  overall_status: string;
  drifted_features_count: number;
  critical_features_count: number;
  max_psi: number;
  mean_psi: number;
}

export interface DriftApiResponse {
  latest_report: DriftReport;
  drift_history_timeline: DriftHistoryPoint[];
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
  };
  summary: {
    total_customers: number;
    avg_churn_probability: number;
    high_risk_count: number;
    high_risk_pct: number;
    total_monthly_revenue_monitored: number;
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  best_hyperparameters: Record<string, any>;
  feature_importances: Array<{ feature: string; importance: number }>;
}