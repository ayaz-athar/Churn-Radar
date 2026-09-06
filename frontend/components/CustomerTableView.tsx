"use client";

import React from "react";
import { Customer } from "@/lib/types";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface CustomerTableViewProps {
  customers: Customer[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (newPage: number) => void;
  riskTier: string;
  onRiskTierChange: (tier: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: string;
  order: string;
  onSortChange: (column: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  isDark?: boolean;
}

export const CustomerTableView: React.FC<CustomerTableViewProps> = ({
  customers,
  loading,
  page,
  totalPages,
  totalRecords,
  onPageChange,
  riskTier,
  onRiskTierChange,
  search,
  onSearchChange,
  sortBy,
  order,
  onSortChange,
  onSelectCustomer,
  isDark = true,
}) => {
  const getRiskBadge = (tier: string, prob: number) => {
    if (tier === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF0052]/15 px-2.5 py-0.5 text-xs font-semibold text-[#FF0052] border border-[#FF0052]/30 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF0052]" />
          {(prob * 100).toFixed(0)}% High
        </span>
      );
    }
    if (tier === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD400]/20 px-2.5 py-0.5 text-xs font-semibold text-[#FFD400] border border-[#FFD400]/40 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFD400]" />
          {(prob * 100).toFixed(0)}% Med
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C68D]/15 px-2.5 py-0.5 text-xs font-semibold text-[#00C68D] border border-[#00C68D]/30 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00C68D]" />
        {(prob * 100).toFixed(0)}% Low
      </span>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Search & Filter Header */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl p-4 border transition-all ${
        isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
      }`}>
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-slate-500" : "text-[#9CA3AF]"}`} />
          <input
            type="text"
            placeholder="Search customer ID, contract, payment..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs border focus:border-[#0055DA] focus:outline-none transition-all ${
              isDark
                ? "bg-[#04060A] text-white placeholder-slate-500 border-[#182033]"
                : "bg-[#FAF9F5] text-[#181D27] placeholder-[#9CA3AF] border-[#E9E5DC]"
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5">
          {[
            { id: "ALL", label: "All" },
            { id: "HIGH", label: "High Risk (#FF0052)" },
            { id: "MEDIUM", label: "Medium (#FFD400)" },
            { id: "LOW", label: "Low Risk (#00C68D)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onRiskTierChange(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                riskTier === tab.id
                  ? isDark
                    ? "bg-[#0055DA] text-white shadow-sm font-semibold border border-[#0055DA]"
                    : "bg-[#181D27] text-white shadow-sm font-semibold"
                  : isDark
                  ? "text-slate-400 hover:text-white hover:bg-[#141A28]"
                  : "text-[#535862] hover:text-[#181D27] hover:bg-[#F6F4ED]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={`overflow-hidden rounded-2xl border transition-all ${
        isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b ${
              isDark
                ? "bg-[#04060A] text-slate-400 border-[#182033]"
                : "bg-[#FAF9F5] text-[#535862] border-[#E9E5DC]"
            }`}>
              <tr>
                <th onClick={() => onSortChange("customer_id")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Customer ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => onSortChange("churn_probability")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Churn Risk</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold">Top Driver (SHAP)</th>
                <th className="py-3.5 px-4 font-bold">Contract</th>
                <th onClick={() => onSortChange("tenure_months")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Tenure</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => onSortChange("monthly_charges")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Monthly Spend</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => onSortChange("support_tickets")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Tickets</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => onSortChange("last_login_days")} className="cursor-pointer py-3.5 px-4 font-bold hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Inactivity</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#141A28]" : "divide-[#F0ECE3]"}`}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">No customers match the active filters.</td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr
                    key={cust.customer_id}
                    onClick={() => onSelectCustomer(cust)}
                    className={`cursor-pointer transition-colors ${
                      isDark ? "hover:bg-[#101524]" : "hover:bg-[#FAF9F5]"
                    }`}
                  >
                    <td className={`py-3.5 px-4 font-mono font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>
                      {cust.customer_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {getRiskBadge(cust.risk_tier, cust.churn_probability)}
                    </td>
                    <td className={`py-3.5 px-4 font-medium ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                      <span className="truncate block max-w-[220px]">{cust.top_risk_driver}</span>
                    </td>
                    <td className={`py-3.5 px-4 font-mono text-[11px] ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                      {cust.contract_type}
                    </td>
                    <td className={`py-3.5 px-4 font-mono ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                      {cust.tenure_months} mo
                    </td>
                    <td className={`py-3.5 px-4 font-mono font-semibold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                      ${cust.monthly_charges.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={cust.support_tickets >= 3 ? "text-[#FF0052] font-bold" : isDark ? "text-slate-400" : "text-[#535862]"}>
                        {cust.support_tickets}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-mono ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                      {cust.last_login_days}d ago
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(cust);
                        }}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-[#0055DA] hover:bg-[#0055DA]/15 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between border-t px-4 py-3 text-xs ${
          isDark
            ? "border-[#182033] bg-[#04060A] text-slate-400"
            : "border-[#E9E5DC] bg-[#FAF9F5] text-[#535862]"
        }`}>
          <div>
            Showing <span className={`font-semibold ${isDark ? "text-white" : "text-[#181D27]"}`}>{customers.length}</span> of{" "}
            <span className={`font-semibold ${isDark ? "text-white" : "text-[#181D27]"}`}>{totalRecords}</span> customers
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={`rounded-lg px-3 py-1 text-xs disabled:opacity-30 ${isDark ? "hover:bg-[#141A28]" : "hover:bg-[#F0ECE3]"}`}
            >
              Previous
            </button>
            <span className={`font-mono text-xs font-semibold ${isDark ? "text-white" : "text-[#181D27]"}`}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={`rounded-lg px-3 py-1 text-xs disabled:opacity-30 ${isDark ? "hover:bg-[#141A28]" : "hover:bg-[#F0ECE3]"}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};