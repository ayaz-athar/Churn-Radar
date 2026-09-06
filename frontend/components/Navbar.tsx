"use client";

import React from "react";
import { Sliders, ShieldCheck, Activity } from "lucide-react";

interface NavbarProps {
  activeTab: "overview" | "radar" | "drift";
  setActiveTab: (tab: "overview" | "radar" | "drift") => void;
  onOpenSimulator: () => void;
  apiOnline: boolean;
  driftStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSimulator,
  apiOnline,
  driftStatus = "STABLE",
}) => {
  return (
    <header className="w-full bg-[#F8F6F0] border-b border-[#EBE7DF]">
      <div className="mx-auto flex h-16 w-full max-w-[1580px] items-center justify-between px-6 sm:px-8">
        {/* Brand Logo - Matching Reference CR Icon */}
        <div className="flex items-center space-x-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF0052] shadow-sm">
            <span className="text-white font-extrabold text-xs font-mono tracking-tighter">CR</span>
          </div>
          <span className="text-base font-bold tracking-tight text-[#181D27]">
            ChurnRadar
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-[#535862]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`transition-colors ${
              activeTab === "overview" ? "text-[#181D27] font-semibold" : "hover:text-[#181D27]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("radar")}
            className={`transition-colors ${
              activeTab === "radar" ? "text-[#181D27] font-semibold" : "hover:text-[#181D27]"
            }`}
          >
            Customer Radar
          </button>
          <button
            onClick={() => setActiveTab("drift")}
            className={`flex items-center space-x-1.5 transition-colors ${
              activeTab === "drift" ? "text-[#181D27] font-semibold" : "hover:text-[#181D27]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${
              driftStatus === "CRITICAL" ? "bg-[#FF0052]" : driftStatus === "WARNING" ? "bg-[#FFD400]" : "bg-[#00C68D]"
            }`} />
            <span>Drift Monitor</span>
          </button>
        </nav>

        {/* Right CTA Button */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#535862] mr-1">
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