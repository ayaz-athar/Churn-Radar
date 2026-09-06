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
}) => {
  const getRiskBadge = (tier: string, prob: number) => {
    if (tier === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF0052]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FF0052] border border-[#FF0052]/20 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF0052]" />
          {(prob * 100).toFixed(0)}% High
        </span>
      );
    }
    if (tier === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD400]/20 px-2.5 py-0.5 text-xs font-semibold text-[#B45309] border border-[#FFD400]/40 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFD400]" />
          {(prob * 100).toFixed(0)}% Med
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C68D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00C68D] border border-[#00C68D]/20 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00C68D]" />
        {(prob * 100).toFixed(0)}% Low
      </span>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 border border-[#E9E5DC] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search customer ID, contract, payment..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl bg-[#FAF9F5] pl-10 pr-4 py-2 text-xs text-[#181D27] placeholder-[#9CA3AF] border border-[#E9E5DC] focus:border-[#0055DA] focus:outline-none transition-all"
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
                  ? "bg-[#181D27] text-white shadow-sm font-semibold"
                  : "text-[#535862] hover:text-[#181D27] hover:bg-[#F6F4ED]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white border border-[#E9E5DC] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-[11px] uppercase tracking-wider text-[#535862] border-b border-[#E9E5DC]">
              <tr>
                <th
                  onClick={() => onSortChange("customer_id")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange("churn_probability")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Churn Risk</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold">Top Driver (SHAP)</th>
                <th className="py-3.5 px-4 font-bold">Contract</th>
                <th
                  onClick={() => onSortChange("tenure_months")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Tenure</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange("monthly_charges")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Monthly Spend</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange("support_tickets")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Tickets</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange("last_login_days")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-[#181D27]"
                >
                  <div className="flex items-center gap-1">
                    <span>Inactivity</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE3]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#535862]">
                    Loading records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#535862]">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr
                    key={cust.customer_id}
                    onClick={() => onSelectCustomer(cust)}
                    className="cursor-pointer hover:bg-[#FAF9F5] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#181D27]">
                      {cust.customer_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {getRiskBadge(cust.risk_tier, cust.churn_probability)}
                    </td>
                    <td className="py-3.5 px-4 text-[#181D27] font-medium">
                      <span className="truncate block max-w-[220px]">{cust.top_risk_driver}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#535862] font-mono text-[11px]">
                      {cust.contract_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#535862]">
                      {cust.tenure_months} mo
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#181D27] font-semibold">
                      ${cust.monthly_charges.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={cust.support_tickets >= 3 ? "text-[#FF0052] font-bold" : "text-[#535862]"}>
                        {cust.support_tickets}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#535862]">
                      {cust.last_login_days}d ago
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(cust);
                        }}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-[#0055DA] hover:bg-[#0055DA]/10 transition-colors"
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
        <div className="flex items-center justify-between border-t border-[#E9E5DC] bg-[#FAF9F5] px-4 py-3 text-xs text-[#535862]">
          <div>
            Showing <span className="font-semibold text-[#181D27]">{customers.length}</span> of{" "}
            <span className="font-semibold text-[#181D27]">{totalRecords}</span> customers
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg px-3 py-1 text-xs text-[#535862] disabled:opacity-30 hover:bg-[#F0ECE3]"
            >
              Previous
            </button>
            <span className="font-mono text-[#181D27] text-xs font-semibold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg px-3 py-1 text-xs text-[#535862] disabled:opacity-30 hover:bg-[#F0ECE3]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};