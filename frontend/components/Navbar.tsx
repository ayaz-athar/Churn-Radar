"use client";

import React from "react";
import { Sliders, Sun, Moon } from "lucide-react";

interface NavbarProps {
  activeTab: "overview" | "radar" | "drift";
  setActiveTab: (tab: "overview" | "radar" | "drift") => void;
  onOpenSimulator: () => void;
  apiOnline: boolean;
  driftStatus?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSimulator,
  apiOnline,
  driftStatus = "STABLE",
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className={`w-full border-b transition-colors duration-200 ${
      isDark ? "bg-[#000000] border-[#161B26]" : "bg-[#F8F6F0] border-[#EBE7DF]"
    }`}>
      <div className="mx-auto flex h-16 w-full max-w-[1580px] items-center justify-between px-6 sm:px-8">
        {/* Brand Logo - CR Icon in #FF0052 */}
        <div className="flex items-center space-x-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF0052] shadow-sm">
            <span className="text-white font-black text-xs font-mono tracking-tighter">CR</span>
          </div>
          <span className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-[#181D27]"}`}>
            ChurnRadar
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`transition-colors ${
              activeTab === "overview"
                ? isDark ? "text-white font-semibold" : "text-[#181D27] font-semibold"
                : isDark ? "text-slate-400 hover:text-white" : "text-[#535862] hover:text-[#181D27]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("radar")}
            className={`transition-colors ${
              activeTab === "radar"
                ? isDark ? "text-white font-semibold" : "text-[#181D27] font-semibold"
                : isDark ? "text-slate-400 hover:text-white" : "text-[#535862] hover:text-[#181D27]"
            }`}
          >
            Customer Radar
          </button>
          <button
            onClick={() => setActiveTab("drift")}
            className={`flex items-center space-x-1.5 transition-colors ${
              activeTab === "drift"
                ? isDark ? "text-white font-semibold" : "text-[#181D27] font-semibold"
                : isDark ? "text-slate-400 hover:text-white" : "text-[#535862] hover:text-[#181D27]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${
              driftStatus === "CRITICAL" ? "bg-[#FF0052]" : driftStatus === "WARNING" ? "bg-[#FFD400]" : "bg-[#00C68D]"
            }`} />
            <span>Drift Monitor</span>
          </button>
        </nav>

        {/* Right CTA & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle (Black Matter vs Light) */}
          <button
            onClick={onToggleTheme}
            className={`flex items-center space-x-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-colors ${
              isDark
                ? "bg-[#0A0E17] border-[#1C2436] text-amber-300 hover:bg-[#111726]"
                : "bg-white border-[#E9E5DC] text-slate-700 hover:bg-[#FAF9F5]"
            }`}
            title={isDark ? "Switch to Warm Light mode" : "Switch to Pure Dark (Black Matter) mode"}
          >
            {isDark ? (
              <>
                <Moon className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden sm:inline text-[11px] font-mono">Black Matter</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline text-[11px] font-mono">Light Mode</span>
              </>
            )}
          </button>

          <div className={`hidden sm:flex items-center space-x-1.5 text-xs mr-1 ${isDark ? "text-slate-400" : "text-[#535862]"}`}>
            <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-[#00C68D]" : "bg-[#FF0052]"}`} />
            <span>{apiOnline ? "Model Live" : "Offline"}</span>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center space-x-2 rounded-xl bg-[#FF0052] hover:bg-[#E00048] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>What-If Simulator</span>
          </button>
        </div>
      </div>
    </header>
  );
};