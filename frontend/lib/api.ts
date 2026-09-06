import {
  CustomerListResponse,
  ExplanationResponse,
  DriftApiResponse,
  ModelMetrics
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export async function fetchHealth(): Promise<{ status: string; records?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "offline" };
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

  const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch customers: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCustomerExplanation(customerId: string): Promise<ExplanationResponse> {
  const res = await fetch(`${API_BASE_URL}/explain/${customerId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch SHAP explanation: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchDriftReport(): Promise<DriftApiResponse> {
  const res = await fetch(`${API_BASE_URL}/drift-report`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch drift report: ${res.statusText}`);
  }
  return await res.json();
}

export async function simulateDrift(severity: "moderate" | "critical" = "critical"): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/simulate-drift`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ severity }),
  });
  if (!res.ok) {
    throw new Error(`Failed to simulate drift: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  const res = await fetch(`${API_BASE_URL}/metrics`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch model metrics: ${res.statusText}`);
  }
  return await res.json();
}

export async function predictCustomer(payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Prediction failed: ${res.statusText}`);
  }
  return await res.json();
}