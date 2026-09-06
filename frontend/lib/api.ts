import {
  CustomerListResponse,
  ExplanationResponse,
  DriftApiResponse,
  DriftReport,
  ModelMetrics,
} from "./types";
import {
  MOCK_CUSTOMERS,
  MOCK_SUMMARY,
  MOCK_DRIFT_REPORT,
  MOCK_METRICS,
  getMockExplanation,
} from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export async function fetchHealth(): Promise<{ status: string; records?: any; demo_mode?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "healthy", demo_mode: true, records: 503 };
  }
}

export async function fetchCustomers(
  page: number = 1,
  pageSize: number = 20,
  riskTier: string = "ALL",
  search: string = "",
  sortBy: string = "churn_probability",
  order: string = "desc"
): Promise<CustomerListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    risk_tier: riskTier,
    search: search,
    sort_by: sortBy,
    order: order,
  });

  try {
    const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    let filtered = [...MOCK_CUSTOMERS];
    if (riskTier !== "ALL") {
      filtered = filtered.filter((c) => c.risk_tier === riskTier);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_id.toLowerCase().includes(q) ||
          c.top_risk_driver.toLowerCase().includes(q) ||
          c.contract_type.toLowerCase().includes(q)
      );
    }
    filtered.sort((a: any, b: any) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      return order === "desc" ? (valB > valA ? 1 : -1) : valA > valB ? 1 : -1;
    });

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      customers: paginated,
      pagination: {
        page,
        page_size: pageSize,
        total_records: filtered.length,
        total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
      summary: MOCK_SUMMARY,
    };
  }
}

export async function fetchCustomerExplanation(customerId: string): Promise<ExplanationResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/explain/${customerId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch explanation: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return getMockExplanation(customerId);
  }
}

export async function fetchDriftReport(): Promise<DriftApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/drift-report`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch drift report: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return MOCK_DRIFT_REPORT;
  }
}

export async function simulateDrift(severity: "moderate" | "critical" = "critical"): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/simulate-drift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ severity }),
    });
    if (!res.ok) throw new Error(`Failed to simulate drift: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    const isCrit = severity === "critical";
    const report: DriftReport = {
      ...MOCK_DRIFT_REPORT.latest_report,
      overall_status: isCrit ? "CRITICAL" : "WARNING",
      dataset_drift_detected: true,
      drifted_features_count: isCrit ? 3 : 1,
      critical_features_count: isCrit ? 2 : 0,
      max_psi: isCrit ? 0.284 : 0.142,
      mean_psi: isCrit ? 0.125 : 0.071,
    };
    return {
      message: `Simulated ${severity} distribution shock applied successfully.`,
      status: "success",
      drift_report: {
        latest_report: report,
        drift_history_timeline: [
          ...MOCK_DRIFT_REPORT.drift_history_timeline,
          {
            id: 3,
            timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
            overall_status: isCrit ? "CRITICAL" : "WARNING",
            drifted_features_count: isCrit ? 3 : 1,
            critical_features_count: isCrit ? 2 : 0,
            max_psi: isCrit ? 0.284 : 0.142,
            mean_psi: isCrit ? 0.125 : 0.071,
          },
        ],
      },
    };
  }
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  try {
    const res = await fetch(`${API_BASE_URL}/metrics`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return MOCK_METRICS;
  }
}

export async function predictCustomer(payload: Record<string, any>): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Prediction failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    const tenure = payload.tenure_months || 12;
    const tickets = payload.support_tickets || 2;
    const charges = payload.monthly_charges || 70;
    const isM2M = payload.contract_type === "Month-to-month";

    let score = 0.2 + (tickets * 0.08) - (tenure * 0.005) + (isM2M ? 0.25 : -0.15) + (charges > 80 ? 0.1 : 0);
    score = Math.max(0.02, Math.min(0.96, score));
    const tier = score >= 0.65 ? "HIGH" : score >= 0.35 ? "MEDIUM" : "LOW";

    return {
      customer_id: payload.customer_id || "SIM-CUST",
      churn_probability: Math.round(score * 1000) / 1000,
      risk_tier: tier,
      predicted_churn: score >= 0.5 ? 1 : 0,
      top_risk_driver: tickets >= 4 ? `High Support Escalations (${tickets} tickets)` : isM2M ? "Month-to-Month Contract" : "Monthly Billing Rate",
      latency_ms: 12.4,
    };
  }
}
