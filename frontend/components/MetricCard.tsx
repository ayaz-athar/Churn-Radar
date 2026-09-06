"use client";

import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  deltaText?: string;
  deltaType?: "positive" | "warning" | "neutral";
  icon?: React.ReactNode;
  iconBgColor?: string;
  isDark?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  deltaText,
  deltaType = "positive",
  icon,
  iconBgColor = "bg-[#00C68D]/10 text-[#00C68D]",
  isDark = true,
}) => {
  const deltaStyles = {
    positive: "text-[#00C68D]",
    warning: "text-[#FF0052]",
    neutral: isDark ? "text-slate-400" : "text-[#535862]",
  }[deltaType];

  return (
    <div className={`rounded-2xl p-5 border transition-all ${
      isDark
        ? "bg-[#080B12] border-[#182033] shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
        : "bg-white border-[#E9E5DC] shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-[#535862]"}`}>{title}</p>
          <p className={`mt-2 text-3xl font-extrabold tracking-tight font-mono tabular-nums ${isDark ? "text-white" : "text-[#181D27]"}`}>
            {value}
          </p>
          {deltaText && (
            <p className={`mt-1.5 text-xs font-medium ${deltaStyles}`}>
              {deltaText}
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};