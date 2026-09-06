"use client";

import React, { useState } from "react";
import { DriftApiResponse } from "@/lib/types";
import { simulateDrift } from "@/lib/api";
import { ShieldCheck, AlertTriangle, RefreshCw, Zap, Activity } from "lucide-react";

interface DriftMonitorViewProps {
  driftData: DriftApiResponse | null;
  onRefreshDrift: () => void;
  isDark?: boolean;
}

export const DriftMonitorView: React.FC<DriftMonitorViewProps> = ({
  driftData,
  onRefreshDrift,
  isDark = true,
}) => {
  const [simulating, setSimulating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "numerical" | "categorical">("all");

  const report = driftData?.latest_report;
  const history = driftData?.drift_history_timeline || [];

  const handleSimulate = async (severity: "moderate" | "critical") => {
    try {
      setSimulating(true);
      await simulateDrift(severity);
      onRefreshDrift();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const filteredFeatures = report?.features.filter((f) => {
    if (activeTab === "all") return true;
    return f.type === activeTab;
  }) || [];

  const getStatusBadge = (status: string) => {
    if (status === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FF0052]/15 px-2.5 py-0.5 text-xs font-bold text-[#FF0052] border border-[#FF0052]/30">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF0052]" />
          CRITICAL
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD400]/25 px-2.5 py-0.5 text-xs font-bold text-[#FFD400] border border-[#FFD400]/40">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFD400]" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#00C68D]/15 px-2.5 py-0.5 text-xs font-bold text-[#00C68D] border border-[#00C68D]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00C68D]" />
        STABLE
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner */}
      <div className={`rounded-2xl p-6 border transition-all ${
        isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold border ${
                report?.overall_status === "CRITICAL"
                  ? "bg-[#FF0052]/15 text-[#FF0052] border-[#FF0052]/30"
                  : report?.overall_status === "WARNING"
                  ? "bg-[#FFD400]/25 text-[#FFD400] border-[#FFD400]/40"
                  : "bg-[#00C68D]/15 text-[#00C68D] border-[#00C68D]/30"
              }`}>
                {report?.overall_status === "CRITICAL" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#FF0052]" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-[#00C68D]" />
                )}
                STATUS: {report?.overall_status || "CHECKING"}
              </span>
              <span className={`text-xs ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                Evaluated: {report ? new Date(report.timestamp).toLocaleTimeString() : "Just now"}
              </span>
            </div>

            <h2 className={`mt-2 text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#181D27]"}`}>
              Statistical Data Drift Monitoring
            </h2>
            <p className={`mt-1 text-xs max-w-2xl leading-relaxed ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
              Compares live production customer distributions against baseline training cohorts using two-sample Kolmogorov-Smirnov test and Population Stability Index (PSI).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulate("critical")}
              disabled={simulating}
              className="flex items-center space-x-1.5 rounded-xl bg-[#FF0052] hover:bg-[#E00048] px-3.5 py-2 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Simulate Drift Shock</span>
            </button>

            <button
              onClick={() => handleSimulate("moderate")}
              disabled={simulating}
              className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all disabled:opacity-40 ${
                isDark
                  ? "bg-[#04060A] text-white border-[#182033] hover:bg-[#141A28]"
                  : "bg-[#FAF9F5] text-[#181D27] border-[#E9E5DC] hover:bg-[#F0ECE3]"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-[#0055DA]" />
              <span>Simulate Mild Shift</span>
            </button>

            <button
              onClick={onRefreshDrift}
              disabled={simulating}
              className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all disabled:opacity-40 ${
                isDark
                  ? "bg-[#04060A] text-white border-[#182033] hover:bg-[#141A28]"
                  : "bg-[#FAF9F5] text-[#181D27] border-[#E9E5DC] hover:bg-[#F0ECE3]"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${simulating ? "animate-spin text-[#0055DA]" : ""}`} />
              <span>Scan Baseline</span>
            </button>
          </div>
        </div>

        {/* Quick Numbers */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t ${
          isDark ? "border-[#182033]" : "border-[#F0ECE3]"
        }`}>
          <div>
            <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Max Feature PSI</span>
            <p className={`mt-1 text-2xl font-black font-mono ${isDark ? "text-white" : "text-[#181D27]"}`}>
              {report?.max_psi !== undefined ? report.max_psi.toFixed(3) : "0.000"}
            </p>
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-[#535862]"}`}>Target: &lt; 0.100</span>
          </div>
          <div>
            <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Mean PSI</span>
            <p className="mt-1 text-2xl font-black font-mono text-[#0055DA]">
              {report?.mean_psi !== undefined ? report.mean_psi.toFixed(3) : "0.000"}
            </p>
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-[#535862]"}`}>Population stability</span>
          </div>
          <div>
            <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Drifted Features</span>
            <p className="mt-1 text-2xl font-black font-mono text-[#FF0052]">
              {report?.drifted_features_count || 0} / {report?.total_features_evaluated || 12}
            </p>
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-[#535862]"}`}>Flagged warning/critical</span>
          </div>
          <div>
            <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Inference Window</span>
            <p className="mt-1 text-2xl font-black font-mono text-[#00C68D]">
              {report?.current_batch_size || 400} accounts
            </p>
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-[#535862]"}`}>Sample size</span>
          </div>
        </div>
      </div>

      {/* Historical Timeline Chart */}
      <div className={`rounded-2xl p-6 border transition-all ${
        isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
      }`}>
        <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-white" : "text-[#181D27]"}`}>Historical Max PSI Drift Trend</h3>
        <p className={`text-xs mb-6 ${isDark ? "text-slate-400" : "text-[#535862]"}`}>Visualizing population stability index across consecutive inference batches.</p>

        <div className={`h-36 w-full flex items-end justify-between gap-3 px-2 border-b pb-2 ${
          isDark ? "border-[#182033]" : "border-[#F0ECE3]"
        }`}>
          {history.map((pt, idx) => {
            const psi = pt.max_psi;
            const heightPct = Math.min(Math.max((psi / 0.35) * 100, 15), 100);
            const isCrit = psi >= 0.20;
            const isWarn = psi >= 0.10;

            return (
              <div key={pt.id || idx} className="flex-1 flex flex-col items-center">
                <div className={`w-full max-w-[28px] h-28 flex items-end justify-center rounded-lg p-1 ${
                  isDark ? "bg-[#04060A]" : "bg-[#FAF9F5]"
                }`}>
                  <div
                    className={`w-full rounded-md transition-all ${
                      isCrit ? "bg-[#FF0052]" : isWarn ? "bg-[#FFD400]" : "bg-[#00C68D]"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`PSI: ${psi.toFixed(3)} (${pt.overall_status})`}
                  />
                </div>
                <span className={`mt-2 text-[10px] font-mono ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
                  {new Date(pt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Drift Matrix Table */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDark ? "bg-[#080B12] border-[#182033]" : "bg-white border-[#E9E5DC] shadow-sm"
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? "border-[#182033]" : "border-[#F0ECE3]"
        }`}>
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>Statistical Feature Divergence Matrix</h3>
          <div className="flex items-center space-x-1">
            {["all", "numerical", "categorical"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`rounded-lg px-3 py-1 text-xs capitalize transition-all ${
                  activeTab === tab
                    ? isDark ? "bg-[#0055DA] text-white font-bold" : "bg-[#181D27] text-white font-bold"
                    : isDark ? "text-slate-400 hover:bg-[#141A28]" : "text-[#535862] hover:bg-[#F6F4ED]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b ${
              isDark ? "bg-[#04060A] text-slate-400 border-[#182033]" : "bg-[#FAF9F5] text-[#535862] border-[#E9E5DC]"
            }`}>
              <tr>
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Test Methodology</th>
                <th className="py-3 px-4">KS-Statistic</th>
                <th className="py-3 px-4">p-value</th>
                <th className="py-3 px-4">PSI Score</th>
                <th className="py-3 px-4 text-right">Drift Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#141A28]" : "divide-[#F0ECE3]"}`}>
              {filteredFeatures.map((f, i) => (
                <tr key={i} className={`transition-colors ${isDark ? "hover:bg-[#101524]" : "hover:bg-[#FAF9F5]"}`}>
                  <td className={`py-3 px-4 font-mono font-bold ${isDark ? "text-white" : "text-[#181D27]"}`}>{f.feature}</td>
                  <td className={`py-3 px-4 uppercase text-[10px] ${isDark ? "text-slate-400" : "text-[#535862]"}`}>{f.type}</td>
                  <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-[#535862]"}`}>{f.test_used}</td>
                  <td className={`py-3 px-4 font-mono ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>{f.ks_statistic !== null ? f.ks_statistic.toFixed(4) : "—"}</td>
                  <td className={`py-3 px-4 font-mono ${isDark ? "text-slate-200" : "text-[#181D27]"}`}>{f.p_value !== null ? f.p_value.toFixed(4) : "—"}</td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={f.psi >= 0.20 ? "text-[#FF0052]" : f.psi >= 0.10 ? "text-[#FFD400]" : "text-[#00C68D]"}>
                      {f.psi.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{getStatusBadge(f.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};