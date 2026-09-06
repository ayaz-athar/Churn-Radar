"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { predictCustomer } from "@/lib/api";
import { X, Sliders, Zap, ArrowUpRight } from "lucide-react";

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({ isOpen, onClose, isDark = true }) => {
  const [tenure, setTenure] = useState<number>(3);
  const [contractType, setContractType] = useState<string>("Month-to-Month");
  const [monthlyCharges, setMonthlyCharges] = useState<number>(85);
  const [supportTickets, setSupportTickets] = useState<number>(4);
  const [lastLoginDays, setLastLoginDays] = useState<number>(25);
  const [monthlyUsageGb, setMonthlyUsageGb] = useState<number>(45);
  const [paymentMethod, setPaymentMethod] = useState<string>("Electronic Check");
  const [techSupport, setTechSupport] = useState<string>("No");
  const [onlineSecurity, setOnlineSecurity] = useState<string>("No");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const payload = {
        customer_id: "SIMULATED-01",
        tenure_months: tenure,
        contract_type: contractType,
        monthly_charges: monthlyCharges,
        total_charges: monthlyCharges * tenure,
        support_tickets: supportTickets,
        last_login_days: lastLoginDays,
        monthly_usage_gb: monthlyUsageGb,
        payment_method: paymentMethod,
        paperless_billing: "Yes",
        online_security: onlineSecurity,
        tech_support: techSupport,
        num_products: 1,
      };

      const res = await predictCustomer(payload);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className={`relative w-full max-w-4xl rounded-3xl border p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
            isDark ? "bg-[#05070D] border-[#182033]" : "bg-white border-[#E9E5DC]"
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b pb-4 ${isDark ? "border-[#182033]" : "border-[#F0ECE3]"}`}>
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF0052]/15 text-[#FF0052]">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>
                  What-If Churn Risk Simulator
                </h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                  Adjust parameters and observe real-time XGBoost inference and SHAP response.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`rounded-lg p-1.5 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.05]" : "text-[#535862] hover:text-[#181D27] hover:bg-[#F6F4ED]"}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12 overflow-y-auto flex-1 pr-1">
            {/* Controls (7 cols) */}
            <div className="space-y-4 md:col-span-7">
              <div>
                <label className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Contract Commitment</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {["Month-to-Month", "One-Year", "Two-Year"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setContractType(c)}
                      className={`rounded-xl py-2 text-xs font-semibold border transition-all ${
                        contractType === c
                          ? "bg-[#0055DA] text-white border-[#0055DA] shadow-sm"
                          : isDark
                          ? "bg-[#0A0E17] text-slate-300 border-[#182033] hover:bg-[#111726]"
                          : "bg-[#FAF9F5] text-[#535862] border-[#E9E5DC] hover:bg-[#F0ECE3]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Recent Support Tickets</span>
                  <span className="font-mono font-bold text-[#FF0052]">{supportTickets} tickets</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={supportTickets}
                  onChange={(e) => setSupportTickets(parseInt(e.target.value))}
                  className="w-full accent-[#FF0052] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Days Since Last Active Login</span>
                  <span className="font-mono font-bold text-[#FFD400]">{lastLoginDays} days</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={lastLoginDays}
                  onChange={(e) => setLastLoginDays(parseInt(e.target.value))}
                  className="w-full accent-[#FFD400] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Account Tenure</span>
                  <span className="font-mono font-bold text-[#00C68D]">{tenure} months</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="72"
                  value={tenure}
                  onChange={(e) => setTenure(parseInt(e.target.value))}
                  className="w-full accent-[#00C68D] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Monthly Spend</span>
                  <span className="font-mono font-bold text-[#0055DA]">${monthlyCharges}/mo</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="125"
                  value={monthlyCharges}
                  onChange={(e) => setMonthlyCharges(parseInt(e.target.value))}
                  className="w-full accent-[#0055DA] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-xs ${
                      isDark
                        ? "bg-[#0A0E17] text-white border-[#182033]"
                        : "bg-[#FAF9F5] text-[#181D27] border-[#E9E5DC]"
                    }`}
                  >
                    <option value="Electronic Check">Electronic Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mailed Check">Mailed Check</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>Tech Support Add-on</label>
                  <select
                    value={techSupport}
                    onChange={(e) => setTechSupport(e.target.value)}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-xs ${
                      isDark
                        ? "bg-[#0A0E17] text-white border-[#182033]"
                        : "bg-[#FAF9F5] text-[#181D27] border-[#E9E5DC]"
                    }`}
                  >
                    <option value="No">No Tech Support</option>
                    <option value="Yes">Tech Support Active</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center space-x-2 rounded-xl bg-[#0055DA] hover:bg-[#0047B8] py-3 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-40"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Run Real-Time Prediction & Explain</span>
                  </>
                )}
              </button>
            </div>

            {/* Results (5 cols) */}
            <div className={`rounded-2xl p-5 border md:col-span-5 flex flex-col justify-between ${
              isDark ? "bg-[#080B12] border-[#182033]" : "bg-[#FAF9F5] border-[#E9E5DC]"
            }`}>
              {result ? (
                <div className="space-y-4">
                  <div>
                    <span className={`text-[11px] font-bold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                      Predicted Churn Risk
                    </span>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className={`text-4xl font-black font-mono ${isDark ? "text-white" : "text-[#181D27]"}`}>
                        {(result.churn_probability * 100).toFixed(0)}%
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${
                        result.risk_tier === "HIGH"
                          ? "bg-[#FF0052]/15 text-[#FF0052] border border-[#FF0052]/30"
                          : result.risk_tier === "MEDIUM"
                          ? "bg-[#FFD400]/20 text-[#FFD400] border border-[#FFD400]/30"
                          : "bg-[#00C68D]/15 text-[#00C68D] border border-[#00C68D]/30"
                      }`}>
                        {result.risk_tier} RISK
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-xl p-3 border ${
                    isDark ? "bg-[#14080D] border-[#2C1019]" : "bg-[#FFF0F4] border-[#FFE0E8]"
                  }`}>
                    <span className="text-[11px] font-bold text-[#FF0052]">Copilot Synthesis</span>
                    <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                      {result.explanation_summary}
                    </p>
                  </div>

                  <div>
                    <span className={`text-[11px] font-bold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Top Accelerators</span>
                    <div className="mt-2 space-y-1.5">
                      {result.top_risk_drivers?.map((d: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className={`font-medium flex items-center gap-1 ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>
                            <ArrowUpRight className="h-3 w-3 text-[#FF0052]" />
                            {d.display_name}
                          </span>
                          <span className="font-mono text-[#FF0052] font-bold">
                            +{d.shap_value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.retention_playbook && (
                    <div className={`rounded-xl p-3 border ${
                      isDark ? "bg-[#0A0E17] border-[#182033]" : "bg-white border-[#E9E5DC]"
                    }`}>
                      <span className="text-[10px] font-bold text-[#0055DA] uppercase">Recommended Play</span>
                      <p className={`mt-1 text-xs font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>{result.retention_playbook.title}</p>
                      <p className={`mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-[#535862]"}`}>{result.retention_playbook.action}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`my-auto text-center text-xs py-12 ${isDark ? "text-slate-500" : "text-[#535862]"}`}>
                  <Sliders className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p>Adjust the sliders on the left and click "Run Real-Time Prediction".</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};