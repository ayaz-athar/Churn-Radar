"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Customer, ExplanationResponse } from "@/lib/types";
import { fetchCustomerExplanation } from "@/lib/api";
import { X, Check, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface CustomerDrawerProps {
  customer: Customer | null;
  onClose: () => void;
  isDark?: boolean;
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({ customer, onClose, isDark = true }) => {
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [playExecuted, setPlayExecuted] = useState<boolean>(false);

  useEffect(() => {
    if (!customer) {
      setExplanation(null);
      setPlayExecuted(false);
      return;
    }

    setLoading(true);
    setPlayExecuted(false);
    fetchCustomerExplanation(customer.customer_id)
      .then((res) => {
        setExplanation(res);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customer]);

  if (!customer) return null;

  const prob = explanation ? explanation.churn_probability : customer.churn_probability;
  const probPct = Math.round(prob * 100);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probPct / 100) * circumference;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={`relative w-full max-w-xl border-l p-6 shadow-2xl flex flex-col h-full overflow-y-auto ${
            isDark ? "bg-[#05070D] border-[#182033]" : "bg-white border-[#E9E5DC]"
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b pb-4 ${isDark ? "border-[#182033]" : "border-[#F0ECE3]"}`}>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold font-mono ${isDark ? "text-white" : "text-[#181D27]"}`}>{customer.customer_id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                  customer.risk_tier === "HIGH"
                    ? "bg-[#FF0052]/15 text-[#FF0052] border border-[#FF0052]/30"
                    : customer.risk_tier === "MEDIUM"
                    ? "bg-[#FFD400]/20 text-[#FFD400] border border-[#FFD400]/30"
                    : "bg-[#00C68D]/15 text-[#00C68D] border border-[#00C68D]/30"
                }`}>
                  {customer.risk_tier} RISK
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                {customer.contract_type} • {customer.tenure_months}mo tenure • ${customer.monthly_charges}/mo
              </p>
            </div>

            <button
              onClick={onClose}
              className={`rounded-lg p-1.5 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.05]" : "text-[#535862] hover:text-[#181D27] hover:bg-[#F6F4ED]"}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className={`my-auto text-center py-20 text-xs ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
              Computing local SHAP values...
            </div>
          ) : (
            <div className="mt-6 space-y-6 flex-1">
              {/* Radial Probability Gauge Card */}
              <div className={`rounded-2xl p-5 border flex items-center justify-between ${
                isDark ? "bg-[#080B12] border-[#182033]" : "bg-[#FAF9F5] border-[#E9E5DC]"
              }`}>
                <div>
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Predicted Churn Probability</span>
                  <p className={`mt-1 text-3xl font-black font-mono tabular-nums ${isDark ? "text-white" : "text-[#181D27]"}`}>{probPct}%</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                    Base Log-Odds: <span className={`font-mono ${isDark ? "text-white" : "text-[#181D27]"}`}>{explanation?.base_value.toFixed(2)}</span>
                  </p>
                </div>

                <div className="relative flex items-center justify-center">
                  <svg className="h-28 w-28 -rotate-90 transform">
                    <circle cx="56" cy="56" r={radius} stroke={isDark ? "#141A28" : "#EBE7DF"} strokeWidth="8" fill="transparent" />
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      stroke={probPct >= 65 ? "#FF0052" : probPct >= 35 ? "#FFD400" : "#00C68D"}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className={`absolute font-mono text-lg font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>{probPct}%</span>
                </div>
              </div>

              {/* Natural Language Synthesis */}
              <div className={`rounded-2xl p-4 border ${
                isDark ? "bg-[#14080D] border-[#2C1019]" : "bg-[#FFF0F4] border-[#FFE0E8]"
              }`}>
                <p className="text-xs font-bold text-[#FF0052] mb-1">Copilot Synthesis</p>
                <p className={`text-xs leading-relaxed ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                  {explanation?.explanation_summary}
                </p>
              </div>

              {/* SHAP Attribution Bars */}
              <div className={`rounded-2xl p-5 border ${
                isDark ? "bg-[#080B12] border-[#182033]" : "bg-[#FAF9F5] border-[#E9E5DC]"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>Feature Attribution (SHAP Margin)</span>
                  <span className={`text-[10px] font-mono ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Contribution</span>
                </div>

                <div className="space-y-3">
                  {explanation?.all_contributions.slice(0, 6).map((c, i) => {
                    const isPos = c.shap_value > 0;
                    const barWidth = Math.min(Math.abs(c.shap_value) * 100, 100);

                    return (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-medium flex items-center gap-1 text-[11px] ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                            {isPos ? (
                              <ArrowUpRight className="h-3 w-3 text-[#FF0052]" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-[#00C68D]" />
                            )}
                            {c.display_name}
                          </span>
                          <span className={`font-mono text-[11px] font-bold ${isPos ? "text-[#FF0052]" : "text-[#00C68D]"}`}>
                            {isPos ? `+${c.shap_value.toFixed(2)}` : c.shap_value.toFixed(2)}
                          </span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? "bg-[#141A28]" : "bg-[#EBE7DF]"}`}>
                          <div
                            className={`h-full rounded-full ${isPos ? "bg-[#FF0052]" : "bg-[#00C68D]"}`}
                            style={{ width: `${Math.max(barWidth, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Retention Playbook */}
              {explanation?.retention_playbook && (
                <div className={`rounded-2xl p-5 border ${
                  isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>
                      {explanation.retention_playbook.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#FFD400] bg-[#FFD400]/15 px-2 py-0.5 rounded font-semibold border border-[#FFD400]/30">
                      {explanation.retention_playbook.urgency}
                    </span>
                  </div>
                  <p className={`mt-2 text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-[#535862]"}`}>
                    {explanation.retention_playbook.action}
                  </p>
                  <p className={`mt-2 text-[11px] ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                    Expected Impact: <strong className="text-[#00C68D] font-bold">{explanation.retention_playbook.projected_impact}</strong>
                  </p>

                  <button
                    onClick={() => setPlayExecuted(true)}
                    disabled={playExecuted}
                    className={`mt-4 w-full rounded-xl py-2.5 text-xs font-bold transition-all ${
                      playExecuted
                        ? "bg-[#00C68D]/20 text-[#00C68D] border border-[#00C68D]/40 cursor-default"
                        : "bg-[#FF0052] hover:bg-[#E00048] text-white shadow-sm"
                    }`}
                  >
                    {playExecuted ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="h-4 w-4 text-[#00C68D]" /> Retention Play Dispatched to CRM
                      </span>
                    ) : (
                      "Execute Retention Play"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};