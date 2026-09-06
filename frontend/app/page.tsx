"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { OverviewView } from "@/components/OverviewView";
import { CustomerTableView } from "@/components/CustomerTableView";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import { DriftMonitorView } from "@/components/DriftMonitorView";
import { SimulatorModal } from "@/components/SimulatorModal";

import {
  fetchHealth,
  fetchCustomers,
  fetchDriftReport,
  fetchModelMetrics,
} from "@/lib/api";
import {
  Customer,
  CustomerListResponse,
  DriftApiResponse,
  ModelMetrics,
} from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "radar" | "drift">("overview");
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  
  // Pure Dark (Black Matter) default
  const [isDark, setIsDark] = useState<boolean>(true);

  // Customer List State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [riskTier, setRiskTier] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("churn_probability");
  const [order, setOrder] = useState<string>("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Summary and Metrics State
  const [summary, setSummary] = useState({
    total_customers: 503,
    avg_churn_probability: 0.245,
    high_risk_count: 80,
    high_risk_pct: 15.9,
    total_monthly_revenue_monitored: 38420.0,
  });
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);

  // Drift State
  const [driftData, setDriftData] = useState<DriftApiResponse | null>(null);

  // Load Initial Data
  const loadCustomersData = async (
    p = page,
    tier = riskTier,
    s = search,
    sb = sortBy,
    ord = order
  ) => {
    try {
      setLoadingCustomers(true);
      const res: CustomerListResponse = await fetchCustomers(p, 15, tier, s, sb, ord);
      setCustomers(res.customers);
      setTotalPages(res.pagination.total_pages);
      setTotalRecords(res.pagination.total_records);
      if (res.summary) {
        setSummary(res.summary);
      }
      setApiOnline(true);
    } catch (err) {
      console.error(err);
      setApiOnline(false);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadDriftData = async () => {
    try {
      const res = await fetchDriftReport();
      setDriftData(res);
      setApiOnline(true);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMetricsData = async () => {
    try {
      const res = await fetchModelMetrics();
      setModelMetrics(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHealth().then((res) => setApiOnline(res.status === "healthy"));
    loadCustomersData(1, "ALL", "", "churn_probability", "desc");
    loadDriftData();
    loadMetricsData();
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadCustomersData(newPage, riskTier, search, sortBy, order);
  };

  const handleRiskTierChange = (tier: string) => {
    setRiskTier(tier);
    setPage(1);
    loadCustomersData(1, tier, search, sortBy, order);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    loadCustomersData(1, riskTier, val, sortBy, order);
  };

  const handleSortChange = (col: string) => {
    const newOrder = sortBy === col && order === "desc" ? "asc" : "desc";
    setSortBy(col);
    setOrder(newOrder);
    loadCustomersData(page, riskTier, search, col, newOrder);
  };

  const highRiskCohort = customers.filter((c) => c.risk_tier === "HIGH");

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col ${
      isDark ? "bg-[#000000] text-white" : "bg-[#F8F6F0] text-[#181D27]"
    }`}>
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        apiOnline={apiOnline}
        driftStatus={driftData?.latest_report.overall_status || "STABLE"}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Main Elevated Card Canvas with Window Dots */}
      <main className="flex-1 mx-auto w-full max-w-[1580px] px-4 sm:px-6 lg:px-8 py-6">
        <div className={`rounded-3xl border p-6 sm:p-8 transition-colors duration-200 ${
          isDark
            ? "bg-[#04060A] border-[#182033] shadow-[0_4px_32px_rgba(0,0,0,0.6)]"
            : "bg-[#FAF9F5] border-[#E9E5DC] shadow-[0_4px_24px_rgba(0,0,0,0.03)]"
        }`}>
          {/* Window Header Dots */}
          <div className={`flex items-center space-x-2 pb-6 mb-6 border-b ${
            isDark ? "border-[#141A28]" : "border-[#EBE7DF]"
          }`}>
            <span className="h-3 w-3 rounded-full bg-[#FF5F56] inline-block" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E] inline-block" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F] inline-block" />
            <span className={`text-[11px] font-mono ml-2 ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
              churnradar.internal / copilot-dashboard {isDark ? "• [pure-dark / black-matter]" : ""}
            </span>
          </div>

          {activeTab === "overview" && (
            <OverviewView
              summary={summary}
              metrics={modelMetrics}
              driftStatus={driftData?.latest_report.overall_status || "STABLE"}
              maxPsi={driftData?.latest_report.max_psi || 0.041}
              highRiskCustomers={highRiskCohort}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              onOpenRadar={() => setActiveTab("radar")}
              isDark={isDark}
            />
          )}

          {activeTab === "radar" && (
            <CustomerTableView
              customers={customers}
              loading={loadingCustomers}
              page={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
              riskTier={riskTier}
              onRiskTierChange={handleRiskTierChange}
              search={search}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              order={order}
              onSortChange={handleSortChange}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              isDark={isDark}
            />
          )}

          {activeTab === "drift" && (
            <DriftMonitorView
              driftData={driftData}
              onRefreshDrift={loadDriftData}
              isDark={isDark}
            />
          )}
        </div>
      </main>

      {/* Slide-In Customer Drawer */}
      <CustomerDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        isDark={isDark}
      />

      {/* What-If Simulator Sandbox Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        isDark={isDark}
      />

      {/* Footer */}
      <footer className={`py-6 text-center text-xs border-t transition-colors ${
        isDark ? "bg-[#000000] border-[#141A28] text-slate-400" : "bg-[#F8F6F0] border-[#EBE7DF] text-[#535862]"
      }`}>
        <p>ChurnRadar • Pure Dark Black Matter • XGBoost • SHAP • KS-Test & PSI Drift Monitoring</p>
      </footer>
    </div>
  );
}